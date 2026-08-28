export type ClientJourneyInput = {
  contactId?: string | null;
  companyId?: string | null;
  peopleCount: number;
  description?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  analysisSummary?: string | null;
  analysisRecommendation?: string | null;
  bankCount: number;
  requiredDocumentsCount: number;
  missingRequiredDocuments: number;
  launchedAmount?: number | null;
  launchedAt?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceStatus?: string | null;
  settlementVerified?: boolean;
};

export type JourneyCheck = {
  key: string;
  label: string;
  complete: boolean;
  missing: string;
};

export function buildClientJourneyChecks(
  input: ClientJourneyInput
): JourneyCheck[] {
  return [
    {
      key: 'contact',
      label: 'Kontakt i opis sprawy',
      complete: Boolean(input.contactId && input.description?.trim()),
      missing: 'Powiąż Kontakt i zapisz opis sytuacji klienta.',
    },
    {
      key: 'next-action',
      label: 'Następny krok i termin',
      complete: Boolean(input.nextAction?.trim() && input.nextActionAt),
      missing: 'Ustal następne działanie oraz jego termin.',
    },
    {
      key: 'analysis',
      label: 'Analiza i rekomendacja',
      complete: Boolean(
        input.analysisSummary?.trim() && input.analysisRecommendation?.trim()
      ),
      missing: 'Zapisz wynik analizy i rekomendowane rozwiązanie.',
    },
    {
      key: 'banks',
      label: 'Banki i warianty',
      complete: input.bankCount > 0,
      missing: 'Dodaj przynajmniej jeden bank i wariant produktu.',
    },
    {
      key: 'documents',
      label: 'Kompletacja dokumentów',
      complete:
        input.requiredDocumentsCount > 0 &&
        input.missingRequiredDocuments === 0,
      missing:
        input.requiredDocumentsCount === 0
          ? 'Utwórz checklistę dokumentów wymaganych w tej sprawie.'
          : `Brakuje ${input.missingRequiredDocuments} wymaganych dokumentów.`,
    },
    {
      key: 'launch',
      label: 'Uruchomienie produktu',
      complete:
        Number(input.launchedAmount || 0) > 0 && Boolean(input.launchedAt),
      missing: 'Wpisz uruchomioną kwotę i datę uruchomienia.',
    },
    {
      key: 'invoice',
      label: 'Faktura i rozliczenie',
      complete: Boolean(
        input.invoiceNumber?.trim() &&
        input.invoiceDate &&
        input.invoiceStatus &&
        input.settlementVerified
      ),
      missing: 'Wpisz numer faktury i jej status.',
    },
  ];
}

export function canRepresentTwoProductHousehold(input: {
  samePrimaryContact: boolean;
  companyLinkedToBusinessDeal: boolean;
  businessDealPeopleCount: number;
  mortgageDealPeopleCount: number;
  mortgageBankCount: number;
}) {
  return (
    input.samePrimaryContact &&
    input.companyLinkedToBusinessDeal &&
    input.businessDealPeopleCount === 1 &&
    input.mortgageDealPeopleCount >= 2 &&
    input.mortgageBankCount >= 2
  );
}

export const REQUIRED_SALES_STAGES = [
  '1. KONTAKT POZYSKOWY',
  '2. SPOTKANIE / AUDYT',
  '3. POCZEKALNIA',
  '4. KOMPLETACJA / OFERTA',
  '5. WNIOSKI / DECYZJA',
  '6. URUCHOMIENIE / FV',
] as const;

export function hasCompleteStagePath(stageNames: string[]) {
  let cursor = 0;
  for (const stage of stageNames)
    if (stage === REQUIRED_SALES_STAGES[cursor]) cursor += 1;
  return cursor === REQUIRED_SALES_STAGES.length;
}
