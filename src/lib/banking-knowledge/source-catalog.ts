export type BankingKnowledgeProblem =
  'documents' | 'application' | 'decision' | 'activation';

export type KnowledgeSourceConfidentiality = 'public' | 'internal';
export type KnowledgeSourceFreshness = 'current' | 'requires_review';

export type CatalogClaim = {
  id: string;
  text: string;
  problems: readonly BankingKnowledgeProblem[];
  quality: 'POTWIERDZONE' | 'CZĘŚCIOWE';
};

export type BankSourceDefinition = {
  id: string;
  type: 'official_bank';
  bank: 'mBank';
  product: 'Kredyt hipoteczny';
  productRoute: 'mortgage';
  domains: readonly BankingKnowledgeProblem[];
  label: string;
  url: string;
  version: string;
  effectiveDate: string | null;
  verifiedAt: string;
  reviewAfter: string;
  confidentiality: KnowledgeSourceConfidentiality;
  freshness: KnowledgeSourceFreshness;
  claims: readonly CatalogClaim[];
};

/**
 * Minimal, reviewed source map for the first production M4 slice.
 * Dynamic product parameters must never be added here without a dated source.
 */
export const MBANK_SOURCE_CATALOG = [
  {
    id: 'mbank-mortgage-documents',
    type: 'official_bank',
    bank: 'mBank',
    product: 'Kredyt hipoteczny',
    productRoute: 'mortgage',
    domains: ['documents'],
    label: 'mBank — kredyt hipoteczny: regulaminy i dokumenty',
    url: 'https://www.mbank.pl/pomoc/dokumenty/oferta-indywidualna/kredyty/kredyt-hipoteczny/',
    version: 'regulamin obowiązuje od 28.05.2025',
    effectiveDate: '2025-05-28',
    verifiedAt: '2026-09-09',
    reviewAfter: '2026-10-09',
    confidentiality: 'public',
    freshness: 'current',
    claims: [
      {
        id: 'mbank-mortgage-current-documents',
        text: 'mBank publikuje na tej stronie bieżące regulaminy i dokumenty kredytu hipotecznego.',
        problems: ['documents'],
        quality: 'POTWIERDZONE',
      },
    ],
  },
  {
    id: 'mbank-mortgage-guide',
    type: 'official_bank',
    bank: 'mBank',
    product: 'Kredyt hipoteczny',
    productRoute: 'mortgage',
    domains: ['documents', 'application', 'decision'],
    label: 'mBank — poradnik kredytu hipotecznego',
    url: 'https://www.mbank.pl/indywidualny/kredyty/kredyty-hipoteczne/poradnik/',
    version: 'strona bieżąca',
    effectiveDate: null,
    verifiedAt: '2026-09-09',
    reviewAfter: '2026-10-09',
    confidentiality: 'public',
    freshness: 'current',
    claims: [
      {
        id: 'mbank-mortgage-document-list',
        text: 'Oficjalny poradnik mBanku udostępnia dobieraną do sytuacji klienta listę dokumentów potrzebnych do wydania decyzji kredytowej.',
        problems: ['documents'],
        quality: 'POTWIERDZONE',
      },
      {
        id: 'mbank-mortgage-application-support',
        text: 'Poradnik może pomóc przygotować dokumenty do wniosku, ale nie potwierdza statusu ani następnego kroku konkretnej sprawy.',
        problems: ['application', 'decision'],
        quality: 'CZĘŚCIOWE',
      },
    ],
  },
] as const satisfies readonly BankSourceDefinition[];

export function sourceFreshness(
  source: BankSourceDefinition,
  now: Date
): KnowledgeSourceFreshness {
  if (source.freshness !== 'current') return source.freshness;
  return now.getTime() <= new Date(`${source.reviewAfter}T23:59:59Z`).getTime()
    ? 'current'
    : 'requires_review';
}

