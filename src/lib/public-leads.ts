import { createHash } from 'node:crypto';

import { isAllowedPublicFormOrigin } from '@/lib/public-origin';
export { isAllowedPublicFormOrigin } from '@/lib/public-origin';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ContactError,
  findOrCreateContact,
  resolveAuditUserId,
} from '@/lib/api/v1/contacts';

export const CALLBACK_PREFERENCES = [
  '09:00-12:00',
  '12:00-15:00',
  'after-15:00',
  'any-time',
] as const;
export type CallbackPreference = (typeof CALLBACK_PREFERENCES)[number];

export const INQUIRY_TYPES = [
  'financial-audit',
  'mortgage',
  'mortgage-refinancing',
  'business-financing',
  'cash-loan',
  'leasing',
  'other-financial',
] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export interface PublicLeadInput {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  message: string;
  inquiryType: InquiryType;
  callbackPreference: CallbackPreference;
  consent: true;
  startedAt: number | null;
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  segment?: string;
  selected_home_project?: string;
}

const ATTRIBUTION_FIELDS = [
  'source_page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'segment',
  'selected_home_project',
] as const;
const CONTACT_CONSENT_VERSION = 'makson.space/contact-v1';
const EDUCATION_TAG = 'EDUKACJA — BUDŻET';

export class PublicLeadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'PublicLeadError';
  }
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parsePublicLead(body: unknown): PublicLeadInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PublicLeadError('Nieprawidłowe dane formularza.', 400);
  }
  const raw = body as Record<string, unknown>;
  if (text(raw.website, 200)) {
    throw new PublicLeadError('Zgłoszenie zostało odrzucone.', 400);
  }

  const name = text(raw.name, 120);
  const phone = text(raw.phone, 40);
  const email = text(raw.email, 254);
  const company = text(raw.company, 160);
  const message = text(raw.message, 4000);
  const inquiryType = text(raw.inquiryType, 40);
  const callbackPreference = text(raw.callbackPreference, 40);

  if (name.length < 2) throw new PublicLeadError('Podaj imię i nazwisko.', 400);
  if (!phone) throw new PublicLeadError('Podaj numer telefonu.', 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PublicLeadError('Podaj poprawny adres e-mail.', 400);
  }
  if (message.length < 10) {
    throw new PublicLeadError(
      'Opis potrzeby musi zawierać co najmniej 10 znaków.',
      400
    );
  }
  if (!INQUIRY_TYPES.includes(inquiryType as InquiryType)) {
    throw new PublicLeadError('Wybierz rodzaj potrzeby finansowej.', 400);
  }
  if (
    !CALLBACK_PREFERENCES.includes(callbackPreference as CallbackPreference)
  ) {
    throw new PublicLeadError('Wybierz preferowaną godzinę kontaktu.', 400);
  }
  if (raw.consent !== true) {
    throw new PublicLeadError('Zgoda na kontakt jest wymagana.', 400);
  }

  const startedAt =
    typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt)
      ? raw.startedAt
      : null;
  return {
    name,
    phone,
    email: email || null,
    company: company || null,
    message,
    inquiryType: inquiryType as InquiryType,
    callbackPreference: callbackPreference as CallbackPreference,
    consent: true,
    startedAt,
    // Optional attribution never changes whether a submission is accepted.
    ...Object.fromEntries(
      ATTRIBUTION_FIELDS.map(field => [field, text(raw[field], 500)])
    ),
  };
}

export function publicFormCorsHeaders(
  request: Request,
  methods = 'POST, OPTIONS'
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': methods,
    Vary: 'Origin',
  };
  const origin = request.headers.get('origin');
  if (origin && isAllowedPublicFormOrigin(origin, request.url)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function publicFormOptionsResponse(request: Request): Response {
  return new Response(null, {
    status: isAllowedPublicFormOrigin(
      request.headers.get('origin'),
      request.url
    )
      ? 204
      : 403,
    headers: publicFormCorsHeaders(request),
  });
}

export function requestFingerprint(ip: string, userAgent: string): string {
  const salt =
    process.env.PUBLIC_LEAD_FINGERPRINT_SALT ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'mcrm-public-lead';
  return createHash('sha256')
    .update(`${salt}\n${ip}\n${userAgent}`)
    .digest('hex');
}

export async function resolvePublicFormAccountId(
  db: SupabaseClient
): Promise<string> {
  const configured = process.env.MCRM_PUBLIC_FORM_ACCOUNT_ID?.trim();
  if (configured) return configured;
  const { data, error } = await db.from('accounts').select('id').limit(2);
  if (error || !data || data.length !== 1) {
    console.error('[public-leads] target account resolution failed:', error);
    throw new PublicLeadError('Formularz jest chwilowo niedostępny.', 503);
  }
  return data[0].id as string;
}

/** Phone is the identity key. Only fill empty identity fields, with a compare-and-set
 * filter so a concurrent CRM edit cannot be overwritten by a public form. */
export async function completePublicFormContact(
  db: SupabaseClient,
  accountId: string,
  auditUserId: string,
  input: { name: string; phone: string; email: string | null }
) {
  const contact = await findOrCreateContact(db, accountId, auditUserId, input);
  const { data: current, error } = await db
    .from('contacts')
    .select('name,email')
    .eq('account_id', accountId)
    .eq('id', contact.id)
    .single();
  if (error || !current)
    throw new PublicLeadError('Nie odczytano kontaktu.', 500);
  for (const field of ['name', 'email'] as const) {
    const value = input[field];
    if (!value || String(current[field] ?? '').trim()) continue;
    let query = db
      .from('contacts')
      .update({ [field]: value })
      .eq('account_id', accountId)
      .eq('id', contact.id);
    query =
      current[field] == null
        ? query.is(field, null)
        : query.eq(field, current[field]);
    const { error: updateError } = await query;
    if (updateError)
      throw new PublicLeadError('Nie uzupełniono kontaktu.', 500);
  }
  return contact;
}

export async function savePublicLead(
  db: SupabaseClient,
  input: PublicLeadInput,
  metadata: { fingerprint: string; userAgent: string }
): Promise<void> {
  const accountId = await resolvePublicFormAccountId(db);
  const auditUserId = await resolveAuditUserId(db, accountId);
  let contactId: string | undefined;
  if (input.email) {
    const { data: emailMatch, error: emailLookupError } = await db
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .ilike('email', input.email)
      .limit(1)
      .maybeSingle();
    if (emailLookupError) {
      console.error(
        '[public-leads] email dedupe lookup failed:',
        emailLookupError
      );
      throw new PublicLeadError('Nie udało się zapisać zgłoszenia.', 500);
    }
    contactId = emailMatch?.id as string | undefined;
  }
  const contact = contactId
    ? { id: contactId, created: false }
    : await findOrCreateContact(db, accountId, auditUserId, input);
  contactId = contact.id;
  const receivedAt = new Date().toISOString();
  const attribution = ATTRIBUTION_FIELDS.map(field =>
    input[field] ? `${field}=${input[field]}` : null
  )
    .filter(Boolean)
    .join('\n');

  const { error } = await db.from('public_lead_submissions').insert({
    account_id: accountId,
    contact_id: contactId,
    submitted_name: input.name,
    submitted_phone: input.phone,
    submitted_email: input.email,
    submitted_company: input.company,
    message: input.message,
    inquiry_type: input.inquiryType,
    callback_preference: input.callbackPreference,
    source: 'makson_space_form',
    consent_to_contact: true,
    consented_at: receivedAt,
    contact_created: contact.created,
    request_fingerprint: metadata.fingerprint,
    user_agent: metadata.userAgent.slice(0, 500) || null,
  });
  if (error) {
    console.error('[public-leads] submission log failed:', error);
    throw new PublicLeadError('Nie udało się zapisać zgłoszenia.', 500);
  }

  // Set the first source atomically; preserve any existing source, including ''.
  const { error: sourceError } = await db
    .from('contacts')
    .update({ source: 'makson.space' })
    .eq('account_id', accountId)
    .eq('id', contactId)
    .is('source', null);
  if (sourceError) console.error('[public-leads] contact source update failed');
  const { error: consentError } = await db
    .from('contacts')
    .update({
      contact_consent: true,
      ...(attribution ? { source_details: attribution.slice(0, 500) } : {}),
    })
    .eq('account_id', accountId)
    .eq('id', contactId);
  if (consentError)
    console.error('[public-leads] contact consent/attribution update failed');

  const noteLines = [
    'Nowe zgłoszenie z formularza makson.space.',
    `Rodzaj potrzeby: ${inquiryTypeLabel(input.inquiryType)}`,
    `Preferowany kontakt: ${callbackPreferenceLabel(input.callbackPreference)}`,
    input.company ? `Firma: ${input.company}` : null,
    input.email ? `E-mail: ${input.email}` : null,
    `Zgoda na kontakt: tak; wersja: ${CONTACT_CONSENT_VERSION}; kanał: formularz WWW; czas: ${receivedAt}`,
    attribution || null,
    `Treść: ${input.message}`,
  ].filter((line): line is string => Boolean(line));
  const { error: noteError } = await db.from('contact_notes').insert({
    account_id: accountId,
    contact_id: contactId,
    user_id: auditUserId,
    note_text: noteLines.join('\n'),
  });
  if (noteError)
    console.error('[public-leads] contact note failed:', noteError);

  const { error: activityError } = await db.from('sales_activities').insert({
    account_id: accountId,
    user_id: auditUserId,
    contact_id: contactId,
    activity_type: 'zadanie',
    activity_status: 'PLANOWANE',
    completed: false,
    title: `Zgłoszenie: ${inquiryTypeLabel(input.inquiryType)}`,
    description: noteLines.join('\n'),
    source: 'makson.space',
    occurred_at: receivedAt,
    next_action: `Skontaktować się w sprawie zgłoszenia; preferowany kontakt: ${callbackPreferenceLabel(input.callbackPreference)}.`,
  });
  if (activityError) console.error('[public-leads] contact activity insert failed');

  if (input.segment === EDUCATION_TAG) {
    const { data: existingTag, error: lookupError } = await db
      .from('tags')
      .select('id')
      .eq('account_id', accountId)
      .eq('name', EDUCATION_TAG)
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      console.error('[public-leads] education tag lookup failed');
      return;
    }
    let tagId = existingTag?.id as string | undefined;
    if (!tagId) {
      // tags has no unique(account_id, name). A stable UUID makes concurrent
      // submissions from this path converge on the same primary key.
      const hash = createHash('sha256')
        .update(`${accountId}\n${EDUCATION_TAG}`)
        .digest('hex');
      tagId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const { error: tagError } = await db.from('tags').insert({
        id: tagId,
        account_id: accountId,
        user_id: auditUserId,
        name: EDUCATION_TAG,
      });
      if (tagError && tagError.code !== '23505') {
        console.error('[public-leads] education tag insert failed');
        return;
      }
    }
    const { error: linkError } = await db.from('contact_tags').upsert(
      { contact_id: contactId, tag_id: tagId },
      { onConflict: 'contact_id,tag_id', ignoreDuplicates: true }
    );
    if (linkError) console.error('[public-leads] education tag assignment failed');
  }
}

export function callbackPreferenceLabel(value: CallbackPreference): string {
  return {
    '09:00-12:00': '9:00–12:00',
    '12:00-15:00': '12:00–15:00',
    'after-15:00': 'po 15:00',
    'any-time': 'bez znaczenia',
  }[value];
}

export function inquiryTypeLabel(value: InquiryType): string {
  return {
    'financial-audit': 'audyt finansowy / sprawdzenie możliwości',
    mortgage: 'kredyt hipoteczny',
    'mortgage-refinancing': 'refinansowanie kredytu hipotecznego',
    'business-financing': 'finansowanie firmy',
    'cash-loan': 'kredyt gotówkowy',
    leasing: 'leasing',
    'other-financial': 'inna potrzeba finansowa',
  }[value];
}

export function publicLeadErrorResponse(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof PublicLeadError)
    return { message: error.message, status: error.status };
  if (error instanceof ContactError && error.status === 400) {
    return {
      message: 'Podaj poprawny numer telefonu z kodem kraju.',
      status: 400,
    };
  }
  console.error('[public-leads] unexpected error:', error);
  return { message: 'Nie udało się zapisać zgłoszenia.', status: 500 };
}
