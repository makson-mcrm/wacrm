import { createHash } from 'node:crypto';

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
}

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
  };
}

export function isAllowedPublicFormOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const allowed = new Set([
    'https://makson.space',
    'https://www.makson.space',
    'https://darkslateblue-mallard-102045.hostingersite.com',
  ]);
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }
  return allowed.has(origin);
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

export async function savePublicLead(
  db: SupabaseClient,
  input: PublicLeadInput,
  metadata: { fingerprint: string; userAgent: string }
): Promise<void> {
  const accountId = await resolvePublicFormAccountId(db);
  const auditUserId = await resolveAuditUserId(db, accountId);
  const { id: contactId, created } = await findOrCreateContact(
    db,
    accountId,
    auditUserId,
    input
  );

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
    consented_at: new Date().toISOString(),
    contact_created: created,
    request_fingerprint: metadata.fingerprint,
    user_agent: metadata.userAgent.slice(0, 500) || null,
  });
  if (error) {
    console.error('[public-leads] submission log failed:', error);
    throw new PublicLeadError('Nie udało się zapisać zgłoszenia.', 500);
  }

  const noteLines = [
    'Nowe zgłoszenie z formularza makson.space.',
    `Rodzaj potrzeby: ${inquiryTypeLabel(input.inquiryType)}`,
    `Preferowany kontakt: ${callbackPreferenceLabel(input.callbackPreference)}`,
    input.company ? `Firma: ${input.company}` : null,
    input.email ? `E-mail: ${input.email}` : null,
    `Treść: ${input.message}`,
  ].filter((line): line is string => Boolean(line));
  const { error: noteError } = await db.from('contact_notes').insert({
    contact_id: contactId,
    user_id: auditUserId,
    note_text: noteLines.join('\n'),
  });
  if (noteError)
    console.error('[public-leads] contact note failed:', noteError);
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
