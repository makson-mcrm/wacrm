import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ContactError, resolveAuditUserId } from '@/lib/api/v1/contacts';
import {
  completePublicFormContact,
  PublicLeadError,
  resolvePublicFormAccountId,
} from '@/lib/public-leads';
import { parseCrmPhone } from '@/lib/contacts/phone';
import { findExistingContact } from '@/lib/contacts/dedupe';
import {
  QUESTIONNAIRE_TEXT_FIELDS,
  type QuestionnaireAnswers,
} from '@/lib/questionnaires/contract';

export interface FinancialQuestionnaireInput {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  responses: QuestionnaireAnswers & Record<string, unknown>;
  preparationPlan: Record<string, unknown>;
  consent: true;
  startedAt: number | null;
}
export interface SavedFinancialQuestionnaire {
  id: string;
  contactId: string;
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
function fail(message = 'Nieprawidłowe lub niekompletne dane ankiety.'): never {
  throw new FinancialQuestionnaireError(message, 400);
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) fail();
  return value.trim();
}
function envelope(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
}
// Existing public questionnaire fields, beyond the unchanged CRM contract.
const PUBLIC_TEXT_FIELDS = [
  'expectedOutcome',
  'applicationMode',
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
  'debtPlan',
  'realEstate',
  'reserveMonths',
  'financialGoal',
] as const;
const PREPARATION_FIELDS = [
  'incomePreparation',
  'costsPreparation',
  'debtsPreparation',
  'assetsPreparation',
  'documentsPreparation',
] as const;
export function parseFinancialQuestionnaire(
  body: unknown
): FinancialQuestionnaireInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail();
  const raw = body as Record<string, unknown>;
  const responses = envelope(raw.responses);
  const preparationPlan = envelope(raw.preparationPlan);
  const fields = { ...raw, ...responses, ...preparationPlan };
  // A nested empty value must never hide a populated top-level honeypot.
  if (string(raw.website, 200)) fail('Ankieta została odrzucona.');
  for (const nested of [responses, preparationPlan]) {
    if (nested.website !== undefined && string(nested.website, 200))
      fail('Ankieta została odrzucona.');
  }
  const contact = raw.contact === undefined ? raw : envelope(raw.contact);
  const name = string(contact.name ?? '', 120);
  const phone = parseCrmPhone(string(contact.phone ?? '', 40));
  const email = string(contact.email ?? '', 254);
  const company = string(contact.company ?? '', 160);
  if (name.length < 2) fail('Podaj imię i nazwisko.');
  if (!phone.valid)
    fail('Podaj poprawny numer telefonu z kodem kraju (np. +48).');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail('Podaj poprawny adres e-mail.');
  if (fields.consent !== true)
    fail('Zgoda na przygotowanie analizy jest wymagana.');
  const texts = Object.fromEntries(
    QUESTIONNAIRE_TEXT_FIELDS.map((field) => [
      field,
      string(fields[field], 4000),
    ])
  ) as Record<(typeof QUESTIONNAIRE_TEXT_FIELDS)[number], string>;
  for (const field of ['adults', 'children'] as const) {
    if (
      texts[field] &&
      (!/^\d+$/.test(texts[field]) ||
        !Number.isSafeInteger(Number(texts[field])) ||
        (field === 'adults' && Number(texts[field]) < 1))
    )
      fail();
  }
  if (!Array.isArray(fields.documents) || fields.documents.length > 20) fail();
  const documents = fields.documents.map((value) => string(value, 160));
  if (documents.some((value) => !value)) fail();
  if (
    raw.startedAt !== undefined &&
    (typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt))
  )
    fail();
  for (const field of [...PUBLIC_TEXT_FIELDS, ...PREPARATION_FIELDS]) {
    if (fields[field] !== undefined) string(fields[field], 4000);
  }
  const structuralFields = new Set([
    'contact',
    'name',
    'phone',
    'email',
    'company',
    'responses',
    'preparationPlan',
    'website',
    'startedAt',
  ]);
  // Keep arbitrary JSON answers for history; validate only known fields.
  // Sort extras so duplicate envelopes/key order do not change the retry key.
  const extras = Object.fromEntries(
    Object.entries({
      ...Object.fromEntries(
        Object.entries(raw).filter(([key]) => !structuralFields.has(key))
      ),
      ...responses,
      ...preparationPlan,
    })
      .filter(
        ([key, value]) =>
          key !== 'website' &&
          !Object.hasOwn(texts, key) &&
          key !== 'documents' &&
          key !== 'consent' &&
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !(Array.isArray(value) && value.length === 0)
      )
      .sort(([a], [b]) => a.localeCompare(b))
  );
  return {
    name,
    phone: phone.canonical,
    email: email || null,
    company: company || null,
    responses: { ...texts, documents, consent: true, ...extras },
    preparationPlan,
    consent: true,
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null,
  };
}
const LABELS: Record<keyof QuestionnaireAnswers, string> = {
  adults: 'Liczba dorosłych',
  amount: 'Potrzebna kwota',
  children: 'Liczba dzieci',
  city: 'Miejscowość',
  consent: 'Zgoda na analizę',
  debts: 'Zobowiązania',
  documents: 'Dokumenty do analizy',
  goal: 'Cel sprawy',
  insurance: 'Ubezpieczenia',
  investments: 'Inwestycje',
  savings: 'Oszczędności i środki własne',
  timeline: 'Termin realizacji',
};
export function questionnaireMissingItems(
  input: FinancialQuestionnaireInput
): string[] {
  return [...QUESTIONNAIRE_TEXT_FIELDS, 'documents' as const].flatMap(
    (field) => {
      const value = input.responses[field];
      return value === '' || (Array.isArray(value) && !value.length)
        ? [LABELS[field]]
        : [];
    }
  );
}
export function buildPreliminaryAnalysis(
  input: FinancialQuestionnaireInput,
  missingItems: string[]
): string {
  return [
    ...Object.entries(input.responses).map(
      ([field, value]) =>
        `${LABELS[field as keyof QuestionnaireAnswers] ?? field}: ${Array.isArray(value) ? value.join(', ') || 'brak danych' : value === true ? 'tak' : typeof value === 'object' ? JSON.stringify(value) : String(value ?? '') || 'brak danych'}.`
    ),
    `Braki: ${missingItems.join(', ') || 'brak'}.`,
    'To jest wstępne podsumowanie danych klienta, a nie decyzja kredytowa ani rekomendacja bankowa.',
  ].join('\n');
}
export async function saveFinancialQuestionnaire(
  db: SupabaseClient,
  input: FinancialQuestionnaireInput,
  metadata: {
    fingerprint: string;
    userAgent: string;
    // Server-resolved session only; never parsed from the public payload.
    crm?: { accountId: string; userId: string; contactId: string };
  }
): Promise<SavedFinancialQuestionnaire> {
  const accountId =
    metadata.crm?.accountId ?? (await resolvePublicFormAccountId(db));
  const auditUserId =
    metadata.crm?.userId ?? (await resolveAuditUserId(db, accountId));
  const source = metadata.crm ? 'crm' : 'makson.space/ankieta';
  let contact: { id: string; created: boolean };
  if (metadata.crm) {
    const { data: selected, error } = await db
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .eq('id', metadata.crm.contactId)
      .maybeSingle();
    if (error)
      throw new FinancialQuestionnaireError('Nie odczytano kontaktu.', 500);
    if (!selected)
      throw new FinancialQuestionnaireError('Kontakt jest niedostępny.', 404);
    const existing = await findExistingContact(db, accountId, input.phone);
    if (existing && existing.id !== selected.id) {
      throw new FinancialQuestionnaireError(
        'Ten numer telefonu należy do innego kontaktu. Popraw telefon lub wybierz właściwy kontakt.',
        409
      );
    }
    const { data: updated, error: updateError } = await db
      .from('contacts')
      .update({ name: input.name, phone: input.phone, email: input.email })
      .eq('account_id', accountId)
      .eq('id', selected.id)
      .select('id')
      .maybeSingle();
    if (updateError || !updated)
      throw new FinancialQuestionnaireError(
        'Nie zapisano danych kontaktu.',
        500
      );
    contact = { id: selected.id, created: false };
  } else {
    contact = await completePublicFormContact(
      db,
      accountId,
      auditUserId,
      input
    );
  }
  const missingItems = questionnaireMissingItems(input);
  const status = missingItems.length ? 'partial' : 'submitted';
  const preliminaryAnalysis = buildPreliminaryAnalysis(input, missingItems);
  // Canonical phone and fixed answer order make formatted-phone retries identical.
  const submissionKey = createHash('sha256')
    .update(
      JSON.stringify([
        input.phone,
        input.name,
        input.email,
        input.company,
        input.responses,
        ...(metadata.crm ? ['crm', auditUserId, contact.id] : []),
      ])
    )
    .digest('hex');
  // Server metadata remains authoritative. Retain conflicting client answers
  // in the history too, rather than silently discarding them on spread.
  const historicalAnswers = [
    'submission_key',
    'source',
    'submitted_by',
    'submission_id',
    'contact',
    'consent_to_analysis',
  ].some((key) => Object.hasOwn(input.responses, key))
    ? { ...input.responses, original_answers: input.responses }
    : input.responses;
  const lookup = async () => {
    const { data, error } = await db
      .from('financial_questionnaire_submissions')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contact.id)
      .eq('responses->>submission_key', submissionKey)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error)
      throw new FinancialQuestionnaireError(
        'Nie odczytano zapisanej ankiety.',
        500
      );
    return data;
  };
  let submission = await lookup();
  if (!submission) {
    await db.from('financial_questionnaire_submissions').insert({
      account_id: accountId,
      contact_id: contact.id,
      submitted_name: input.name,
      submitted_phone: input.phone,
      submitted_email: input.email,
      submitted_company: input.company,
      responses: {
        ...historicalAnswers,
        submission_key: submissionKey,
        source,
        submitted_by: metadata.crm?.userId ?? null,
      },
      preparation_plan: input.preparationPlan,
      status,
      missing_items: missingItems,
      preliminary_analysis: preliminaryAnalysis,
      contact_created: contact.created,
      consent_to_analysis: true,
      consented_at: new Date().toISOString(),
      request_fingerprint: metadata.fingerprint,
      user_agent: metadata.userAgent.slice(0, 500) || null,
    });
    // Existing schema has no unique submission constraint. Prefer the earliest
    // visible row after writing, even if the INSERT response was lost. This is
    // best effort across workers, not a transaction or a uniqueness guarantee.
    submission = await lookup();
    if (!submission)
      throw new FinancialQuestionnaireError(
        'Nie udało się zapisać ankiety.',
        500
      );
  }
  const noteText = `Ankieta ${submission.id}\n${preliminaryAnalysis}${input.company ? `\nFirma zgłoszona: ${input.company}` : ''}`;
  const { data: existingNote, error: noteLookupError } = await db
    .from('contact_notes')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contact.id)
    .like('note_text', `Ankieta ${submission.id}\n%`)
    .limit(1)
    .maybeSingle();
  if (noteLookupError)
    throw new FinancialQuestionnaireError(
      'Nie odczytano wyników ankiety przy kontakcie.',
      500
    );
  if (!existingNote) {
    const { error: noteError } = await db.from('contact_notes').insert({
      account_id: accountId,
      contact_id: contact.id,
      user_id: auditUserId,
      note_text: noteText,
    });
    if (noteError)
      throw new FinancialQuestionnaireError(
        'Nie zapisano wyników ankiety przy kontakcie.',
        500
      );
  }
  // Retry repairs a partial save without overwriting a processed intake/note.
  // These check-then-insert steps can also race across independent workers.
  const { data: existingIntake, error: intakeLookupError } = await db
    .from('client_intakes')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contact.id)
    .eq('intake_type', 'ankieta')
    .eq('raw_payload->>submission_key', submissionKey)
    .limit(1)
    .maybeSingle();
  if (intakeLookupError)
    throw new FinancialQuestionnaireError(
      'Nie odczytano powiązania ankiety z kontaktem.',
      500
    );
  if (!existingIntake) {
    const { error: intakeError } = await db.from('client_intakes').insert({
      account_id: accountId,
      contact_id: contact.id,
      intake_type: 'ankieta',
      source,
      status: 'nowe',
      raw_payload: {
        ...historicalAnswers,
        source,
        submitted_by: metadata.crm?.userId ?? null,
        consent_to_analysis: true,
        submission_key: submissionKey,
        submission_id: submission.id,
        contact: {
          name: input.name,
          phone: input.phone,
          email: input.email,
          company: input.company,
        },
      },
    });
    if (intakeError)
      throw new FinancialQuestionnaireError(
        'Nie zapisano powiązania ankiety z kontaktem.',
        500
      );
  }
  // Use the existing follow-up fields without inventing a deadline or a Deal.
  const activityTitle = `Ankieta ${submission.id}`;
  const { data: activity, error: activityLookupError } = await db
    .from('sales_activities')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contact.id)
    .eq('title', activityTitle)
    .limit(1)
    .maybeSingle();
  if (activityLookupError)
    throw new FinancialQuestionnaireError(
      'Nie odczytano kolejnego działania.',
      500
    );
  if (!activity) {
    const nextAction = missingItems.length
      ? `Uzupełnić ankietę: ${missingItems.join(', ')}.`
      : 'Omówić ankietę i przygotować spotkanie.';
    const { error } = await db.from('sales_activities').insert({
      account_id: accountId,
      user_id: auditUserId,
      contact_id: contact.id,
      activity_type: 'zadanie',
      activity_status: 'PLANOWANE',
      completed: false,
      title: activityTitle,
      source,
      next_action: nextAction,
    });
    if (error)
      throw new FinancialQuestionnaireError(
        'Nie zapisano kolejnego działania.',
        500
      );
  }
  return {
    id: submission.id as string,
    contactId: contact.id,
    status,
    missingItems,
    preparationItems: [],
  };
}
export function financialQuestionnaireErrorResponse(error: unknown): {
  message: string;
  status: number;
} {
  if (
    error instanceof FinancialQuestionnaireError ||
    error instanceof PublicLeadError
  )
    return { message: error.message, status: error.status };
  if (error instanceof ContactError && error.status === 400)
    return {
      message: 'Podaj poprawny numer telefonu z kodem kraju.',
      status: 400,
    };
  return { message: 'Nie udało się zapisać ankiety.', status: 500 };
}
