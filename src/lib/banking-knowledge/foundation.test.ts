import { describe, expect, it } from 'vitest';
import {
  buildBankingKnowledgeAnswer,
  parseAllowedDriveFolderIds,
  routeBankingKnowledgeProblem,
} from './foundation';

const deal = {
  id: 'deal-1',
  title: 'Zakup mieszkania',
  product_type: 'ML — HIPOTEKA',
  next_action: 'Skompletować dokumenty dochodowe',
  next_action_at: '2026-09-10T08:00:00.000Z',
  contact: { name: 'Jan Kowalski' },
  company: null,
  stage: { name: '5. WNIOSKI / DECYZJA' },
};

const process = [{ bank_name: 'mBank', status: 'analiza', position: 1 }];
const currentDate = new Date('2026-09-09T10:00:00.000Z');

function answer(
  overrides: Partial<Parameters<typeof buildBankingKnowledgeAnswer>[0]> = {}
) {
  return buildBankingKnowledgeAnswer({
    deal,
    bankProcesses: process,
    documents: [],
    indexedChunks: [],
    allowedDriveFolderIds: new Set(),
    now: currentDate,
    ...overrides,
  });
}

describe('M4 — routing problemu', () => {
  it.each([
    ['Jakich dokumentów brakuje?', 'documents'],
    ['Jak złożyć wniosek?', 'application'],
    ['Co z decyzją kredytową?', 'decision'],
    ['Jak uruchomić wypłatę?', 'activation'],
  ] as const)('rozpoznaje %s jako %s', (question, expected) => {
    expect(routeBankingKnowledgeProblem({ question })).toBe(expected);
  });

  it('traktuje pytanie jako ważniejsze od etapu Deala', () => {
    expect(answer({ question: 'Jak uruchomić kredyt?' }).problem).toBe(
      'activation'
    );
  });
});

describe('M4 — źródła i pewność', () => {
  it('każde ważne twierdzenie wiąże z istniejącym źródłem', () => {
    const result = answer({ question: 'Jakich dokumentów brakuje?' });
    const sourceIds = new Set(result.sources.map((source) => source.id));
    expect(result.claims.length).toBeGreaterThan(0);
    expect(
      result.claims.every(
        (claim) =>
          claim.sourceIds.length > 0 &&
          claim.sourceIds.every((sourceId) => sourceIds.has(sourceId))
      )
    ).toBe(true);
    expect(result.primarySourceIds).not.toContain('ai-deal-1-documents');
    expect(result.quality).toBe('CZĘŚCIOWE');
  });

  it('fail-closed: brak źródła dla uruchomienia wymaga weryfikacji', () => {
    const result = answer({
      deal: { ...deal, next_action: null },
      question: 'Jak uruchomić kredyt?',
    });
    expect(result.problem).toBe('activation');
    expect(result.quality).toBe('WYMAGA WERYFIKACJI');
    expect(result.primarySourceIds).toEqual([]);
    expect(result.summary).toContain('Nie wykonuj kroku');
    expect(
      result.claims.find((claim) => claim.id.startsWith('recommended-action'))
        ?.quality
    ).toBe('WNIOSEK AI');
  });

  it('nie podstawia wiedzy mBanku do nieobsługiwanego banku', () => {
    const result = answer({ bankProcesses: [{ bank_name: 'ING' }] });
    expect(result.supported).toBe(false);
    expect(result.sources).toEqual([]);
    expect(result.quality).toBe('WYMAGA WERYFIKACJI');
  });

  it('nie obsługuje niezdefiniowanego produktu', () => {
    const result = answer({
      deal: { ...deal, product_type: 'Kredyt firmowy' },
      bankProcesses: [
        { bank_name: 'mBank', product_variant: 'Kredyt firmowy' },
      ],
    });
    expect(result.supported).toBe(false);
    expect(result.quality).toBe('WYMAGA WERYFIKACJI');
  });
});

describe('M4 — Zero Trust Google Drive', () => {
  const document = {
    id: 'doc-1',
    title: 'Instrukcja dokumentów mBank hipoteczny',
    bank: 'mBank',
    product: 'ML — HIPOTEKA',
    document_type: 'google_drive_internal',
    source_name: 'gdrive://allowed-folder/file-1',
    source_version: '2026-09',
  };
  const indexedChunks = [
    {
      document_id: 'doc-1',
      chunk_index: 0,
      content: 'Dokumenty do wniosku: sprawdź listę wymaganą dla klienta.',
    },
  ];

  it('odrzuca próbę wyjścia poza allowlistę', () => {
    const result = answer({
      documents: [document],
      indexedChunks,
      allowedDriveFolderIds: new Set(['other-folder']),
    });
    expect(result.internalSourceAvailable).toBe(false);
  });

  it('nie ufa samej metadanej dokumentu bez indeksu', () => {
    const result = answer({
      documents: [document],
      indexedChunks: [],
      allowedDriveFolderIds: new Set(['allowed-folder']),
    });
    expect(result.internalSourceAvailable).toBe(false);
  });

  it('używa źródła tylko z allowlisty, indeksu i właściwej dziedziny', () => {
    const result = answer({
      documents: [document],
      indexedChunks,
      allowedDriveFolderIds: new Set(['allowed-folder']),
      question: 'Jakich dokumentów brakuje?',
    });
    const internal = result.sources.find(
      (source) => source.type === 'internal_drive'
    );
    expect(internal).toMatchObject({
      quality: 'POTWIERDZONE',
      confidentiality: 'internal',
    });
    expect(internal).not.toHaveProperty('publicUrl');
    expect(result.internalSourceAvailable).toBe(true);
    expect(result.primarySourceIds).toEqual(['doc-1']);
  });

  it('czyści konfigurację allowlisty', () => {
    expect([...parseAllowedDriveFolderIds(' folder-a,folder-b, ,')]).toEqual([
      'folder-a',
      'folder-b',
    ]);
  });
});

