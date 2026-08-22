import { describe, expect, it } from 'vitest';
import {
  buildClientJourneyChecks,
  canRepresentTwoProductHousehold,
  hasCompleteStagePath,
  REQUIRED_SALES_STAGES,
} from './client-journey';

describe('pełna ścieżka obsługi klienta', () => {
  it('prowadzi kompletną sprawę od Kontaktu do faktury', () => {
    const checks = buildClientJourneyChecks({
      contactId: 'grzegorz',
      companyId: 'firma-grzegorza',
      peopleCount: 2,
      description: 'Przedsiębiorca na ryczałcie, kredyt firmowy i hipoteka.',
      nextAction: 'Zebrać dokumenty i przygotować analizę.',
      nextActionAt: '2026-08-24T10:00:00Z',
      analysisSummary: 'Analiza dochodu i zobowiązań zakończona.',
      analysisRecommendation: 'Wnioski do dwóch banków.',
      bankCount: 2,
      requiredDocumentsCount: 4,
      missingRequiredDocuments: 0,
      launchedAmount: 500000,
      launchedAt: '2026-10-20',
      invoiceNumber: 'FV/08/2026/1',
      invoiceDate: '2026-10-20',
      invoiceStatus: 'wystawiona',
      settlementVerified: true,
    });

    expect(checks).toHaveLength(7);
    expect(checks.every((check) => check.complete)).toBe(true);
  });

  it('przechodzi kolejno przez sześć etapów sprzedaży do uruchomienia i faktury', () => {
    expect(hasCompleteStagePath([...REQUIRED_SALES_STAGES])).toBe(true);
    expect(
      hasCompleteStagePath([
        '1. KONTAKT POZYSKOWY',
        '2. SPOTKANIE / AUDYT',
        '4. KOMPLETACJA / OFERTA',
        '5. WNIOSKI / DECYZJA',
        '6. URUCHOMIENIE / FV',
      ])
    ).toBe(false);
  });

  it('obsługuje jednego klienta, firmę i dwa różne Deale z żoną tylko w hipotece', () => {
    expect(
      canRepresentTwoProductHousehold({
        samePrimaryContact: true,
        companyLinkedToBusinessDeal: true,
        businessDealPeopleCount: 1,
        mortgageDealPeopleCount: 2,
        mortgageBankCount: 3,
      })
    ).toBe(true);
  });

  it('pokazuje dokładnie brakujące elementy niedokończonej sprawy', () => {
    const checks = buildClientJourneyChecks({
      contactId: 'grzegorz',
      peopleCount: 1,
      description: 'Pierwsza rozmowa.',
      bankCount: 0,
      requiredDocumentsCount: 3,
      missingRequiredDocuments: 3,
    });

    expect(
      checks.filter((check) => !check.complete).map((check) => check.key)
    ).toEqual([
      'next-action',
      'analysis',
      'banks',
      'documents',
      'launch',
      'invoice',
    ]);
  });
});
