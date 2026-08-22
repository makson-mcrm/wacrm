export const LEAD_SOURCE_OPTIONS = [
  'Własny kontakt',
  'Polecenie',
  'Podajnik mBank',
  'Formularz mFinanse',
  'makson.space',
  'Meta Ads',
  'Google Ads',
  'Partner',
  'Inne',
] as const;

export const FINANCIAL_GOAL_OPTIONS = [
  'NOWE ŚRODKI',
  'ZAKUP NIERUCHOMOŚCI',
  'BUDOWA DOMU',
  'REFINANSOWANIE',
  'KONSOLIDACJA',
  'FINANSOWANIE FIRMY',
  'LEASING',
  'AUDYT FINANSOWY',
  'INNY CEL',
] as const;

export const DEAL_TYPE_OPTIONS = [
  'ML OF',
  'ML BC',
  'NML OF',
  'NML BC',
  'LEASING BC',
  'AUDYT',
  'INNY',
] as const;

export const BANK_OPTIONS = [
  'mBank',
  'PKO BP',
  'ING',
  'Santander',
  'Pekao SA',
  'Alior Bank',
  'BNP Paribas',
  'Millennium',
  'BOŚ',
  'Inny bank',
] as const;

export const BANK_STATUS_OPTIONS = [
  'Do wyboru',
  'Kompletacja',
  'Wniosek przygotowany',
  'Wniosek złożony',
  'Analiza banku',
  'Uzupełnienie',
  'Decyzja pozytywna',
  'Decyzja negatywna',
  'Umowa',
  'Uruchomienie',
  'Rezygnacja',
] as const;

export const PRODUCT_OPTIONS = [
  '1_HIPO_OF_ML',
  '2_FIRMA_BC_ML',
  '3_FIRMA_BC_NML',
  '4_GOTOWKA_OF_NML',
  '5_LEASING_BC_ML',
] as const;

export const MISSING_ITEM_OPTIONS = [
  'Dochody',
  'Koszty gospodarstwa',
  'Salda i raty zobowiązań',
  'Środki własne',
  'Dokumenty dochodowe',
  'Umowy lub harmonogramy kredytów',
  'Dokumenty firmy',
  'Dokumenty nieruchomości',
  'Polisy do audytu',
  'Termin realizacji',
  'Inne dane',
] as const;

export type QuestionnaireStatus = 'not_started' | 'partial' | 'submitted';

export interface AssociatedProduct {
  code: string;
  amount: number;
}

export interface DealFinancialValues {
  questionnaireId: string | null;
  companyName: string;
  additionalContactIds: string[];
  expectedCommission: string;
  leadSource: string;
  financialGoal: string;
  dealType: string;
  nextStep: string;
  whatsappDispatch: string;
  missingItems: string[];
  folderUrl: string;
  bank1: string;
  bank1Status: string;
  bank2: string;
  bank2Status: string;
  bank3: string;
  bank3Status: string;
  products: AssociatedProduct[];
  questionnaireData: Record<string, unknown>;
  questionnaireStatus: QuestionnaireStatus;
  aiAnalysis: string;
  meetingNotes: string;
}

export const EMPTY_DEAL_FINANCIAL_VALUES: DealFinancialValues = {
  questionnaireId: null,
  companyName: '',
  additionalContactIds: [],
  expectedCommission: '',
  leadSource: '',
  financialGoal: '',
  dealType: '',
  nextStep: '',
  whatsappDispatch: '',
  missingItems: [],
  folderUrl: '',
  bank1: '',
  bank1Status: '',
  bank2: '',
  bank2Status: '',
  bank3: '',
  bank3Status: '',
  products: [],
  questionnaireData: {},
  questionnaireStatus: 'not_started',
  aiAnalysis: '',
  meetingNotes: '',
};

export function questionnaireStatusLabel(status: QuestionnaireStatus): string {
  return {
    not_started: 'Nie rozpoczęto',
    partial: 'Częściowo wypełniona',
    submitted: 'Przesłana',
  }[status];
}
