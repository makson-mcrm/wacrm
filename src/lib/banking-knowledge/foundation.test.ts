import { describe, expect, it } from 'vitest';
import {
  buildBankingKnowledgeAnswer,
  parseAllowedDriveFolderIds,
} from './foundation';

const deal = {
  id: 'deal-1',
  title: 'Zakup mieszkania',
  product_type: 'Kredyt hipoteczny',
  next_action: 'Skompletować dokumenty dochodowe',
  contact: { name: 'Jan Kowalski' },
  company: null,
  stage: { name: 'Kompletowanie dokumentów' },
};

describe('Wiedza Bankowa — fundament mBank', () => {
  it('nie zgaduje banku bez przypisania w Dealu', () => {
    const answer = buildBankingKnowledgeAnswer({
      deal,
      bankProcesses: [],
      documents: [],
      allowedDriveFolderIds: new Set(),
    });
    expect(answer.supported).toBe(false);
    expect(answer.quality).toBe('WYMAGA WERYFIKACJI');
  });

  it('prowadzi po następnym kroku i zachowuje kontekst Deala', () => {
    const answer = buildBankingKnowledgeAnswer({
      deal,
      bankProcesses: [{ bank_name: 'mBank', status: 'analiza' }],
      documents: [],
      allowedDriveFolderIds: new Set(),
    });
    expect(answer.context).toMatchObject({
      id: 'deal-1',
      bank: 'mBank',
      product: 'Kredyt hipoteczny',
      stage: 'Kompletowanie dokumentów',
      nextAction: 'Skompletować dokumenty dochodowe',
    });
    expect(answer.steps.join(' ')).toContain(
      'Skompletować dokumenty dochodowe'
    );
    expect(
      answer.sources.some((source) => source.type === 'official_bank')
    ).toBe(true);
    const official = answer.sources.find(
      (source) => source.type === 'official_bank'
    );
    expect(official).toMatchObject({
      quality: 'POTWIERDZONE ZE ŹRÓDŁA',
      bank: 'mBank',
    });
    expect(official?.publicUrl).toMatch(/^https:\/\/www\.mbank\.pl\//);
    expect(official?.facts?.length).toBeGreaterThan(0);
    expect(answer.quality).toBe('CZĘŚCIOWE');
  });

  it('nie podstawia wiedzy mBanku do nieobsługiwanego banku', () => {
    const answer = buildBankingKnowledgeAnswer({
      deal,
      bankProcesses: [{ bank_name: 'ING', status: 'analiza' }],
      documents: [],
      allowedDriveFolderIds: new Set(),
    });
    expect(answer.supported).toBe(false);
    expect(answer.sources).toEqual([]);
    expect(answer.quality).toBe('WYMAGA WERYFIKACJI');
  });

  it('dopuszcza prywatne źródło Drive wyłącznie z allowlisty folderów', () => {
    const document = {
      id: 'doc-1',
      title: 'Instrukcja mBank hipoteczny',
      bank: 'mBank',
      product: 'Kredyt hipoteczny',
      document_type: 'google_drive_internal',
      source_name: 'gdrive://allowed-folder/file-1',
      source_version: '2026-09',
    };
    const blocked = buildBankingKnowledgeAnswer({
      deal,
      bankProcesses: [{ bank_name: 'mBank' }],
      documents: [document],
      allowedDriveFolderIds: new Set(['other-folder']),
    });
    expect(
      blocked.sources.some((source) => source.type === 'internal_drive')
    ).toBe(false);

    const allowed = buildBankingKnowledgeAnswer({
      deal,
      bankProcesses: [{ bank_name: 'mBank' }],
      documents: [document],
      allowedDriveFolderIds: new Set(['allowed-folder']),
    });
    const internal = allowed.sources.find(
      (source) => source.type === 'internal_drive'
    );
    expect(internal).toMatchObject({
      quality: 'POTWIERDZONE ZE ŹRÓDŁA',
    });
    expect(internal).not.toHaveProperty('publicUrl');
    expect(allowed.quality).toBe('POTWIERDZONE ZE ŹRÓDŁA');
  });

  it('czyści pustą konfigurację folderów i rozdziela przecinki', () => {
    expect([...parseAllowedDriveFolderIds(' folder-a,folder-b, ,')]).toEqual([
      'folder-a',
      'folder-b',
    ]);
  });
});
