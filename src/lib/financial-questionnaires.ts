import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ContactError,
  findOrCreateContact,
  resolveAuditUserId,
} from '@/lib/api/v1/contacts';
import { resolvePublicFormAccountId } from '@/lib/public-leads';

const PREPARATION_STATUSES = [
  'provided',
  'check_before_meeting',
  'discuss_at_meeting',
  'not_applicable',
] as const;

type PreparationStatus = (typeof PREPARATION_STATUSES)[number];

const RESPONSE_FIELDS = [
  'goal',
  'amount',
  'timeline',
  'expectedOutcome',
  'applicationMode',
  'adults',
  'children',
  'city',
  'propertyRegime',
  'incomeSource1',
  'incomeNet1',
  'incomeSince1',
  'businessTaxation1',
  'businessSince1',
  'secondPersonName',
  'secondPersonPhone',
  'incomeSource2',
  'incomeNet2',
  'incomeSince2',
  'businessTaxation2',
  'businessSince2',
  'otherIncome',
  'livingCosts',
  'monthlyBalance',
  'debts',
  'debtPlan',
  'savings',
  'investments',
  'realEstate',
  'reserveMonths',
  'insurance',
  'financialGoal',
] as const;

const PREPARATION_FIELDS = [
  'incomePreparation',
  'costsPreparation',
  'debtsPreparation',
  'assetsPreparation',
  'documentsPreparation',
] as const;

const PREPARATION_LABELS: Record<(typeof PREPARATION_FIELDS)[number], string> =
  {
    incomePreparation: 'dochody gospodarstwa',
    costsPreparation: 'miesięczne koszty życia',
    debtsPreparation: 'raty, salda kredytów i dostępne limity',
    assetsPreparation: 'oszczędności, majątek i środki własne',
    documentsPreparation: 'umowy, harmonogramy i dokumenty finansowe',
  };

export interface FinancialQuestionnaireInput {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  responses: Record<string, string | string[]>;
  preparationPlan: Record<string, PreparationStatus>;
  documents: string[];
  consent: true;
  startedAt: number | null;
}

export interface SavedFinancialQuestionnaire {
  id: string;
  status: 'partial' | 'submitted';
  missingItems: string[];
  preparationItems: string[];
}

export class FinancialQuestionnaireError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'FinancialQuestionnaireError';
  }
}

function text(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, 160))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function parseFinancialQuestionnaire(
  body: unknown
): FinancialQuestionnaireInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new FinancialQuestionnaireError('Nieprawidłowe dane ankiety.', 400);
  }
  const raw = body as Record<string, unknown>;
  if (text(raw.website, 200)) {
    throw new FinancialQuestionnaireError('Ankieta została odrzucona.', 400);
  }

  const name = text(raw.name, 120);
  const phone = text(raw.phone, 40);
  const email = text(raw.email, 254);
  const company = text(raw.company, 160);
  if (name.length < 2)
    throw new FinancialQuestionnaireError('Podaj imię i nazwisko.', 400);
  if (!phone)
    throw new FinancialQuestionnaireError('Podaj numer telefonu.', 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new FinancialQuestionnaireError('Podaj poprawny adres e-mail.', 400);
  }
  if (raw.consent !== true) {
    throw new FinancialQuestionnaireError(
      'Zgoda na przygotowanie analizy jest wymagana.',
      400
    );
  }

  const responses: Record<string, string | string[]> = {};
  for (const field of RESPONSE_FIELDS) responses[field] = text(raw[field]);
  responses.documents = stringArray(raw.documents);

  const preparationPlan: Record<string, PreparationStatus> = {};
  for (const field of PREPARATION_FIELDS) {
    const candidate = text(raw[field], 40);
    preparationPlan[field] = PREPARATION_STATUSES.includes(
      candidate as PreparationStatus
    )
      ? (candidate as PreparationStatus)
      : 'discuss_at_meeting';
  }

  return {
    name,
    phone,
    email: email || null,
    company: company || null,
    responses,
    preparationPlan,
    documents: stringArray(raw.documents),
    consent: true,
    startedAt:
      typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt)
        ? raw.startedAt
        : null,
  };
}

export function questionnaireMissingItems(
  input: FinancialQuestionnaireInput
): string[] {
  const value = (field: string) => text(input.responses[field]);
  const missing = [
    !value('goal') && 'Cel sprawy',
    !value('amount') && 'Potrzebna kwota',
    !value('timeline') && 'Termin realizacji',
    !value('incomeSource1') && 'Źródło dochodu',
    !value('incomeNet1') && 'Wysokość dochodu netto',
    !value('livingCosts') && 'Koszty gospodarstwa',
    !value('debts') && 'Salda i raty zobowiązań lub potwierdzenie ich braku',
    !value('savings') && 'Oszczędności i środki własne',
    input.documents.length === 0 && 'Dokumenty do analizy',
  ].filter((item): item is string => Boolean(item));
  return [...new Set(missing)];
}

export function questionnairePreparationItems(
  plan: Record<string, PreparationStatus>
): string[] {
  return PREPARATION_FIELDS.flatMap((field) => {
    const status = plan[field];
    const label = PREPARATION_LABELS[field];
    if (status === 'check_before_meeting')
      return [`Sprawdź przed spotkaniem: ${label}.`];
    if (status === 'discuss_at_meeting')
      return [`Przygotuj informacje, omówimy na spotkaniu: ${label}.`];
    return [];
  });
}

export function buildPreliminaryAnalysis(
  input: FinancialQuestionnaireInput,
  missingItems: string[]
): string {
  const value = (field: string, fallback = 'brak danych') =>
    text(input.responses[field]) || fallback;
  return [
    `CEL I POTRZEBA: ${value('goal')}; kwota: ${value('amount')}; termin: ${value('timeline')}.`,
    `OCZEKIWANY EFEKT: ${value('expectedOutcome')}.`,
    `GOSPODARSTWO: tryb analizy: ${value('applicationMode')}; dorośli: ${value('adults')}; dzieci: ${value('children')}.`,
    `DOCHODY: ${value('incomeSource1')}; netto: ${value('incomeNet1')}; pozostałe: ${value('otherIncome')}.`,
    `BUDŻET: koszty życia: ${value('livingCosts')}; miesięczne saldo: ${value('monthlyBalance')}.`,
    `ZOBOWIĄZANIA: ${value('debts')}.`,
    `MAJĄTEK: oszczędności: ${value('savings')}; inwestycje: ${value('investments')}; nieruchomości: ${value('realEstate')}.`,
    `BRAKI DO UZUPEŁNIENIA: ${missingItems.join(', ') || 'brak wykrytych braków'}.`,
    'To jest wstępne podsumowanie danych klienta, a nie decyzja kredytowa ani rekomendacja bankowa.',
  ].join('\n');
}

export async function saveFinancialQuestionnaire(
  db: SupabaseClient,
  input: FinancialQuestionnaireInput,
  metadata: { fingerprint: string; userAgent: string }
): Promise<SavedFinancialQuestionnaire> {
  const accountId = await resolvePublicFormAccountId(db);
  const auditUserId = await resolveAuditUserId(db, accountId);
  const { id: contactId } = await findOrCreateContact(
    db,
    accountId,
    auditUserId,
    input
  );
  const missingItems = questionnaireMissingItems(input);
  const preparationItems = questionnairePreparationItems(input.preparationPlan);
  const status = missingItems.length > 0 ? 'partial' : 'submitted';
  const preliminaryAnalysis = buildPreliminaryAnalysis(input, missingItems);

  const { data, error } = await db
    .from('financial_questionnaire_submissions')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      submitted_name: input.name,
      submitted_phone: input.phone,
      submitted_email: input.email,
      submitted_company: input.company,
      responses: input.responses,
      preparation_plan: input.preparationPlan,
      status,
      missing_items: missingItems,
      preliminary_analysis: preliminaryAnalysis,
      consent_to_analysis: true,
      consented_at: new Date().toISOString(),
      request_fingerprint: metadata.fingerprint,
      user_agent: metadata.userAgent.slice(0, 500) || null,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[financial-questionnaire] save failed:', error);
    throw new FinancialQuestionnaireError(
      'Nie udało się zapisać ankiety.',
      500
    );
  }

  const noteLines = [
    'Klient przesłał ankietę przygotowującą spotkanie.',
    `Stan ankiety: ${status === 'submitted' ? 'kompletna' : 'częściowa'}.`,
    `Braki: ${missingItems.join(', ') || 'brak'}.`,
    preliminaryAnalysis,
  ];
  const { error: noteError } = await db.from('contact_notes').insert({
    account_id: accountId,
    contact_id: contactId,
    user_id: auditUserId,
    note_text: noteLines.join('\n'),
  });
  if (noteError)
    console.error('[financial-questionnaire] contact note failed:', noteError);

  return {
    id: data.id as string,
    status,
    missingItems,
    preparationItems,
  };
}

export function financialQuestionnaireErrorResponse(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof FinancialQuestionnaireError)
    return { message: error.message, status: error.status };
  if (error instanceof ContactError && error.status === 400) {
    return {
      message: 'Podaj poprawny numer telefonu z kodem kraju.',
      status: 400,
    };
  }
  console.error('[financial-questionnaire] unexpected error:', error);
  return { message: 'Nie udało się zapisać ankiety.', status: 500 };
}
