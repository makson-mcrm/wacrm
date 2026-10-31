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
function string(value: unknown, max: number, field?: string): string {
  if (typeof value !== 'string' || value.length > max)
    fail(field ? `Pole ${field}: wymagany tekst, maksymalnie ${max} znaków.` : undefined);
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
  if (string(raw.website === undefined ? '' : raw.website, 200, 'website')) fail('Ankieta została odrzucona.');
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
      string(fields[field], 4000, field),
    ])
  ) as Record<(typeof QUESTIONNAIRE_TEXT_FIELDS)[number], string>;
  for (const field of ['adults', 'children'] as const) {
    if (
      texts[field] &&
      (!/^\d+$/.test(texts[field]) ||
        !Number.isSafeInteger(Number(texts[field])) ||
        (field === 'adults' && Number(texts[field]) < 1))
    )
      fail(`Pole ${field}: wymagana nieujemna liczba całkowita${field === 'adults' ? ', co najmniej 1' : ''}.`);
  }
  if (!Array.isArray(fields.documents) || fields.documents.length > 20)
    fail('Pole documents: wymagana tablica, maksymalnie 20 pozycji.');
  const documents = fields.documents.map((value) => string(value, 160, 'documents'));
  if (documents.some((value) => !value)) fail('Pole documents: pozycje nie mogą być puste.');
  if (
    raw.startedAt !== undefined &&
    (typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt))
  )
    fail('Pole startedAt: wymagany skończony znacznik czasu w milisekundach.');
  for (const field of [...PUBLIC_TEXT_FIELDS, ...PREPARATION_FIELDS]) {
    if (fields[field] !== undefined) string(fields[field], 4000, field);
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

function questionnaireSource(origin?: string | null, referer?: string | null) {
  const url = (value?: string | null) => {
    try {
      const parsed = new URL(value ?? '');
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
    } catch {
      return null;
    }
  };
  const originUrl = url(origin);
  const refererUrl = url(referer);
  // Origin takes precedence; Referer supplies attribution when Origin is absent.
  const host = (originUrl ?? refererUrl)?.hostname;
  const sources: Record<string, string> = {
    'makson.space': 'makson.space',
    'mediumseagreen-pelican-353577.hostingersite.com': 'formularz',
    'crm.makson.space': 'crm',
  };
  const utm = new URLSearchParams();
  refererUrl?.searchParams.forEach((value, key) => {
    if (key.startsWith('utm_')) utm.append(key, value);
  });
  return {
    source: host && Object.hasOwn(sources, host) ? sources[host] : 'ankieta',
    source_details: utm.toString() || null,
    // Retain only the URL origin, never credentials, path or unrelated query data.
    origin: (originUrl ?? refererUrl)?.origin ?? null,
  };
}

function activityFailureDiagnostic(error: unknown) {
  const record = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : {};
  const code = typeof record.code === 'string' &&
    /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(record.code)
    ? record.code : 'UNKNOWN';
  const reasons: Record<string, string> = {
    '23502': 'not_null', '23503': 'foreign_key', '23505': 'unique',
    '23514': 'check_constraint', '42501': 'permission_or_rls',
    '42703': 'missing_column', '42P01': 'missing_table',
    '22P02': 'invalid_type', PGRST204: 'schema_cache_column',
  };
  // Extract identifiers only in database-generated positions, then allowlist.
  // Never emit raw message/details/hint: these may contain the submitted row.
  const message = typeof record.message === 'string' ? record.message : '';
  const column = message.match(/(?:column|find the) ["']([a-z_]+)["']/)?.[1];
  const table = message.match(/(?:relation|table|column of) ["']([a-z_]+)["']/)?.[1];
  const constraint = message.match(/constraint ["']([a-z_]+)["']/)?.[1];
  const columns = [
    'id', 'account_id', 'user_id', 'contact_id', 'company_id', 'deal_id',
    'activity_type', 'activity_status', 'completed', 'title', 'source',
    'next_action', 'occurred_at', 'scheduled_at', 'next_action_date', 'metric_date',
  ];
  const constraints = [
    'sales_activities_activity_type_check', 'sales_activities_activity_status_check',
    'sales_activities_contact_context_check', 'sales_activities_company_context_check',
    'sales_activities_deal_context_check', 'sales_activities_deal_contact_check',
    'sales_activities_deal_company_check', 'sales_activities_user_id_fkey',
    'sales_activities_account_id_fkey', 'sales_activities_contact_id_fkey',
    'daily_sales_metrics_user_id_fkey', 'daily_sales_metrics_account_id_fkey',
  ];
  return {
    code,
    reason: reasons[code] ?? 'unknown',
    ...(column && columns.includes(column) ? { column } : {}),
    ...(table && ['sales_activities', 'daily_sales_metrics'].includes(table)
      ? { table } : {}),
    ...(constraint && constraints.includes(constraint) ? { constraint } : {}),
  };
}

// Postgres errors may embed an entire customer row, including in hints or
// custom trigger messages. Emit all four diagnostic fields, but only retain
// recognized database grammar and known schema identifiers, never arbitrary text.
function questionnaireWriteDiagnostic(error: unknown) {
  const record = error && typeof error === 'object'
    ? error as Record<string, unknown> : {};
  const safeText = (value: unknown) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return '[REDACTED]';
    if (/^Failing row contains /.test(value)) return 'Failing row contains [REDACTED].';
    if (/^Key \(/.test(value)) return 'Key [REDACTED].';
    const identifiers = ['contacts', 'source', 'source_details', 'contact_consent',
      'contact_notes', 'account_id', 'contact_id', 'user_id', 'note_text', 'public',
      'contacts_source_check', 'update_updated_at_column'];
    const safe = value.replace(/["']([^"']*)["']/g, (_match, name: string) =>
      `"${identifiers.includes(name) ? name : '[REDACTED]'}"`);
    const identifier = '"(?:[a-z_]+|\\[REDACTED\\])"';
    const patterns = [
      `permission denied for (?:table|schema|function) (?:${identifier}|contacts|contact_notes|public|update_updated_at_column)`,
      `(?:new row violates|new row violates forced) row-level security policy for table ${identifier}`,
      `Could not find the ${identifier} column of ${identifier} in the schema cache`,
      `column ${identifier}(?: of relation ${identifier})? does not exist`,
      `null value in column ${identifier} of relation ${identifier} violates not-null constraint`,
      `new row(?: for relation ${identifier})? violates check constraint ${identifier}`,
      `Perhaps you meant (?:to reference )?the column ${identifier}\\.`,
    ];
    return patterns.some((pattern) => new RegExp(`^${pattern}$`).test(safe))
      ? safe : '[REDACTED]';
  };
  const { code, reason } = activityFailureDiagnostic(error);
  return { code, reason: code === 'P0001' ? 'raised_exception' : reason, details: safeText(record.details),
    hint: safeText(record.hint), message: safeText(record.message) };
}

export async function saveFinancialQuestionnaire(
  db: SupabaseClient,
  input: FinancialQuestionnaireInput,
  metadata: {
    fingerprint: string;
    userAgent: string;
    origin?: string | null;
    referer?: string | null;
    // Server-resolved session only; never parsed from the public payload.
    crm?: { accountId: string; userId: string; contactId: string };
  }
): Promise<SavedFinancialQuestionnaire> {
  // Keep this boundary safe even if a caller bypasses the public parser.
  if (input.consent !== true) fail('Zgoda na przygotowanie analizy jest wymagana.');
  const receivedAt = new Date().toISOString();
  const sourceRecord = {
    ...questionnaireSource(metadata.origin, metadata.referer),
    received_at: receivedAt,
  };
  const consentRecord = {
    granted: true,
    scope: 'analiza',
    text_version: 'v1-2026-10',
    stated_at: receivedAt,
  };
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
  // Attribution on the contact is best-effort; the authoritative per-request
  // source/consent records are always included in the submission below.
  let attribution: { source?: unknown; source_details?: unknown } | null = null;
  try {
    const { data, error } = await db.from('contacts')
      .select('source,source_details')
      .eq('account_id', accountId).eq('id', contact.id).single();
    if (error) throw error;
    if (!data) throw new Error('Missing contact attribution');
    attribution = data;
  } catch (error) {
    console.error('financial_questionnaire_source_failed', {
      operation: 'select', ...questionnaireWriteDiagnostic(error),
    });
  }
  for (const field of ['source', 'source_details'] as const) {
    if (!attribution || String(attribution[field] ?? '').trim() || !sourceRecord[field]) continue;
    try {
      let update = db.from('contacts')
        .update({ [field]: sourceRecord[field] })
        .eq('account_id', accountId).eq('id', contact.id);
      // Preserve the first acquisition even with a concurrent writer.
      update = attribution[field] == null
        ? update.is(field, null) : update.eq(field, attribution[field]);
      const { error } = await update;
      if (error) throw error;
    } catch (error) {
      console.error('financial_questionnaire_source_failed', {
        operation: 'update', field, ...questionnaireWriteDiagnostic(error),
      });
    }
  }
  try {
    const { error } = await db.from('contacts')
      .update({ contact_consent: true })
      .eq('account_id', accountId).eq('id', contact.id);
    if (error) throw error;
  } catch (error) {
    console.error('financial_questionnaire_consent_failed', {
      operation: 'update', ...questionnaireWriteDiagnostic(error),
    });
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
    'source_record',
    'consent_record',
  ].some((key) => Object.hasOwn(input.responses, key))
    ? { ...input.responses, original_answers: input.responses }
    : input.responses;
  const lookup = async () => {
    const { data, error } = await db
      .from('financial_questionnaire_submissions')
      .select('id,responses,consented_at')
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
        source_record: sourceRecord,
        consent_record: consentRecord,
        submitted_by: metadata.crm?.userId ?? null,
      },
      preparation_plan: input.preparationPlan,
      status,
      missing_items: missingItems,
      preliminary_analysis: preliminaryAnalysis,
      contact_created: contact.created,
      consent_to_analysis: true,
      consented_at: receivedAt,
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
  // Use the persisted record on retry, including after a partially saved request.
  const savedConsent = submission.responses?.consent_record;
  const consentLine = savedConsent?.granted === true &&
    savedConsent.scope === 'analiza' && savedConsent.text_version === 'v1-2026-10' &&
    savedConsent.stated_at === submission.consented_at
    ? `\nZgoda na analizę (v1-2026-10) — ${savedConsent.stated_at}` : '';
  const noteText = `Ankieta ${submission.id}\n${preliminaryAnalysis}${consentLine}${input.company ? `\nFirma zgłoszona: ${input.company}` : ''}`;
  let noteOperation: 'select' | 'insert' = 'select';
  try {
    const { data: existingNote, error: noteLookupError } = await db
      .from('contact_notes')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contact.id)
      .like('note_text', `Ankieta ${submission.id}\n%`)
      .limit(1)
      .maybeSingle();
    if (noteLookupError) throw noteLookupError;
    // Never insert blindly after a failed lookup; retry can repair the note.
    if (!existingNote) {
      noteOperation = 'insert';
      const { error } = await db.from('contact_notes').insert({
        account_id: accountId,
        contact_id: contact.id,
        user_id: auditUserId,
        note_text: noteText,
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error('financial_questionnaire_note_failed', {
      operation: noteOperation, ...questionnaireWriteDiagnostic(error),
    });
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
  // Follow-up is best-effort: its failure must not reject a saved questionnaire.
  // Keep the lookup on retries; never insert blindly after a failed read.
  let activityOperation: 'select' | 'insert' = 'select';
  try {
    const activityTitle = `Ankieta ${submission.id}`;
    const { data: activity, error: activityLookupError } = await db
      .from('sales_activities')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contact.id)
      .eq('title', activityTitle)
      .limit(1)
      .maybeSingle();
    if (activityLookupError) throw activityLookupError;
    if (!activity) {
      activityOperation = 'insert';
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
        occurred_at: receivedAt,
        scheduled_at: receivedAt,
        next_action_date: receivedAt,
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error('financial_questionnaire_activity_failed', {
      operation: activityOperation,
      ...activityFailureDiagnostic(error),
    });
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
