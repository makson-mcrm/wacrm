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
    ['Jak rozliczyć prowizję?', 'commission'],
    ['Jak wystawić fakturę?', 'invoice'],
    ['Kiedy będzie wpływ cash flow?', 'cashflow'],
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

  it('po terminie przeglądu nie oznacza źródła jako aktualnego ani potwierdzonego', () => {
    const result = answer({
      question: 'Jakich dokumentów brakuje?',
      now: new Date('2027-01-01T10:00:00.000Z'),
    });
    const official = result.sources.filter(
      (source) => source.type === 'official_bank'
    );
    expect(official.length).toBeGreaterThan(0);
    expect(
      official.every(
        (source) =>
          source.freshness === 'requires_review' &&
          source.quality === 'WYMAGA WERYFIKACJI'
      )
    ).toBe(true);
    expect(result.quality).toBe('WYMAGA WERYFIKACJI');
  });

  it('nie podstawia wiedzy mBanku do nieobsługiwanego banku', () => {
    const result = answer({ bankProcesses: [{ bank_name: 'ING' }] });
    expect(result.supported).toBe(false);
    expect(result.sources).toEqual([]);
    expect(result.quality).toBe('WYMAGA WERYFIKACJI');
  });

  it('nie obsługuje niezdefiniowanego produktu', () => {
    const result = answer({
      deal: { ...deal, product_type: 'Leasing konsumencki' },
      bankProcesses: [
        { bank_name: 'mBank', product_variant: 'Leasing konsumencki' },
      ],
    });
    expect(result.supported).toBe(false);
    expect(result.quality).toBe('WYMAGA WERYFIKACJI');
  });

  it('obsługuje mBank FIRMA na zatwierdzonym źródle publicznym', () => {
    const result = answer({
      deal: { ...deal, product_type: 'Kredyt firmowy' },
      bankProcesses: [
        { bank_name: 'mBank', product_variant: 'Kredyt firmowy' },
      ],
      question: 'Jakich dokumentów brakuje do kredytu firmy?',
    });
    expect(result.supported).toBe(true);
    expect(result.problem).toBe('documents');
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mbank-business-credit-documents',
          product: 'Kredyt firmowy',
          quality: 'POTWIERDZONE',
        }),
      ])
    );
    expect(result.quality).toBe('CZĘŚCIOWE');
  });
});

describe('M4 — Zero Trust Google Drive', () => {
  const document = {
    id: 'doc-1',
    title: 'Instrukcja dokumentów mBank hipoteczny',
    bank: 'mBank',
    product: 'ML — HIPOTEKA',
    document_type: 'google_drive_internal:mortgage:documents',
    source_name: 'gdrive://allowed-folder/file-1',
    source_version: '2026-09',
    effective_date: '2026-09-01',
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
      quality: 'CZĘŚCIOWE',
      confidentiality: 'internal',
    });
    expect(internal).not.toHaveProperty('publicUrl');
    expect(result.internalSourceAvailable).toBe(true);
    expect(result.primarySourceIds).toEqual(['doc-1']);
  });

  it('nie używa fragmentu poza dziedziną zatwierdzoną dla korzenia', () => {
    const result = answer({
      documents: [document],
      indexedChunks: [
        {
          document_id: 'doc-1',
          chunk_index: 0,
          content: 'Uruchomienie kredytu wymaga dodatkowej kontroli.',
        },
      ],
      allowedDriveFolderIds: new Set(['allowed-folder']),
      question: 'Jak uruchomić kredyt?',
    });
    expect(result.internalSourceAvailable).toBe(false);
  });

  it('oznacza stary fragment Drive jako wymagający przeglądu', () => {
    const result = answer({
      documents: [{ ...document, effective_date: '2025-01-01' }],
      indexedChunks,
      allowedDriveFolderIds: new Set(['allowed-folder']),
      question: 'Jakich dokumentów brakuje?',
    });
    expect(
      result.sources.find((source) => source.type === 'internal_drive')
        ?.freshness
    ).toBe('requires_review');
    expect(
      result.sources.find((source) => source.type === 'internal_drive')?.quality
    ).toBe('WYMAGA WERYFIKACJI');
    expect(result.warnings).not.toEqual([]);
  });

  it('mBank FIRMA wybiera aktualny, pasujący fragment Drive przed publicznym', () => {
    const businessDocument = {
      ...document,
      id: 'business-doc',
      title: 'Instrukcja dokumentów mBank firma',
      product: 'Kredyt firmowy',
      document_type:
        'google_drive_internal:business:documents+application:instruction',
      source_name: 'gdrive://1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g/business-file',
      effective_date: '2026-07-20',
    };
    const result = answer({
      deal: { ...deal, product_type: 'Kredyt firmowy' },
      bankProcesses: [
        { bank_name: 'mBank', product_variant: 'Kredyt firmowy' },
      ],
      documents: [businessDocument],
      indexedChunks: [
        {
          document_id: 'business-doc',
          chunk_index: 0,
          content: 'Dokumenty do wniosku firmy należy sprawdzić przed analizą.',
        },
      ],
      allowedDriveFolderIds: new Set(['1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g']),
      question: 'Jakich dokumentów brakuje do wniosku firmy?',
    });
    expect(result.internalSourceAvailable).toBe(true);
    expect(result.primarySourceIds).toEqual(['business-doc']);
    expect(result.quality).not.toBe('POTWIERDZONE');
  });

  it('pytanie o prowizję korzysta wyłącznie z drugiego korzenia', () => {
    const settlementDocument = {
      ...document,
      id: 'settlement-doc',
      bank: 'mFinanse',
      product: 'Prowizje i rozliczenia',
      document_type:
        'google_drive_internal:settlements:commission+invoice+cashflow:agreement',
      source_name: 'gdrive://1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN/settlement-file',
      effective_date: '2026-07-02',
    };
    const result = answer({
      documents: [document, settlementDocument],
      indexedChunks: [
        ...indexedChunks,
        {
          document_id: 'settlement-doc',
          chunk_index: 0,
          content: 'Prowizja i termin rozliczenia wynikają z aktualnej umowy.',
        },
      ],
      allowedDriveFolderIds: new Set([
        'allowed-folder',
        '1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN',
      ]),
      question: 'Jak rozliczyć prowizję?',
    });
    expect(result.problem).toBe('commission');
    expect(result.primarySourceIds).toEqual(['settlement-doc']);
    expect(
      result.sources.find((source) => source.id === 'settlement-doc')?.bank
    ).toBe('mFinanse');
  });

  it('czyści konfigurację allowlisty', () => {
    expect([...parseAllowedDriveFolderIds(' folder-a,folder-b, ,')]).toEqual([
      'folder-a',
      'folder-b',
    ]);
  });
});

