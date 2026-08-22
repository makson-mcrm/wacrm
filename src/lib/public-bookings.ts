import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ContactError,
  findOrCreateContact,
  resolveAuditUserId,
} from '@/lib/api/v1/contacts';
import {
  PublicLeadError,
  resolvePublicFormAccountId,
} from '@/lib/public-leads';

export interface PublicBookingInput {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  topic: string;
  startsAt: string;
  note: string | null;
  consent: true;
  startedAt: number | null;
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export function parsePublicBooking(body: unknown): PublicBookingInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new PublicLeadError('Nieprawidłowe dane rezerwacji.', 400);
  const raw = body as Record<string, unknown>;
  if (text(raw.website, 200))
    throw new PublicLeadError('Rezerwacja została odrzucona.', 400);
  const name = text(raw.name, 120);
  const phone = text(raw.phone, 40);
  const email = text(raw.email, 254);
  const company = text(raw.company, 160);
  const topic = text(raw.topic, 160);
  const startsAt = text(raw.startsAt, 40);
  const note = text(raw.note, 2000);
  if (name.length < 2) throw new PublicLeadError('Podaj imię i nazwisko.', 400);
  if (!phone) throw new PublicLeadError('Podaj numer telefonu.', 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new PublicLeadError('Podaj poprawny adres e-mail.', 400);
  if (!topic) throw new PublicLeadError('Wybierz temat rozmowy.', 400);
  const timestamp = +new Date(startsAt);
  if (!startsAt || !Number.isFinite(timestamp) || timestamp < Date.now())
    throw new PublicLeadError('Wybierz przyszły termin spotkania.', 400);
  if (raw.consent !== true)
    throw new PublicLeadError('Zgoda na kontakt jest wymagana.', 400);
  return {
    name,
    phone,
    email: email || null,
    company: company || null,
    topic,
    startsAt: new Date(timestamp).toISOString(),
    note: note || null,
    consent: true,
    startedAt:
      typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt)
        ? raw.startedAt
        : null,
  };
}

export async function savePublicBooking(
  db: SupabaseClient,
  input: PublicBookingInput,
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
  const { data: booking, error } = await db
    .from('public_booking_submissions')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      submitted_name: input.name,
      submitted_phone: input.phone,
      submitted_email: input.email,
      submitted_company: input.company,
      topic: input.topic,
      starts_at: input.startsAt,
      note: input.note,
      consent_to_contact: true,
      consented_at: new Date().toISOString(),
      contact_created: created,
      request_fingerprint: metadata.fingerprint,
      user_agent: metadata.userAgent.slice(0, 500) || null,
    })
    .select('id')
    .single();
  if (error || !booking)
    throw new PublicLeadError('Nie udało się zapisać rezerwacji.', 500);

  const { error: calendarError } = await db.from('calendar_events').insert({
    account_id: accountId,
    user_id: auditUserId,
    contact_id: contactId,
    title: `${input.topic}: ${input.name}`,
    event_type: 'spotkanie',
    starts_at: input.startsAt,
    ends_at: new Date(+new Date(input.startsAt) + 60 * 60 * 1000).toISOString(),
    description: [
      'Rezerwacja ze strony makson.space.',
      input.company ? `Firma: ${input.company}` : null,
      input.note ? `Uwagi: ${input.note}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    status: 'zaplanowane',
  });
  if (calendarError) {
    await db
      .from('public_booking_submissions')
      .update({ status: 'blad_kalendarza' })
      .eq('id', booking.id);
    throw new PublicLeadError(
      'Rezerwacja została zapisana, ale termin wymaga potwierdzenia.',
      503
    );
  }

  await db.from('client_intakes').insert({
    account_id: accountId,
    contact_id: contactId,
    intake_type: 'rezerwacja',
    source: 'makson.space',
    status: 'nowe',
    raw_payload: {
      booking_id: booking.id,
      topic: input.topic,
      starts_at: input.startsAt,
      note: input.note,
    },
  });
}

export function publicBookingErrorResponse(error: unknown) {
  if (error instanceof PublicLeadError)
    return { message: error.message, status: error.status };
  if (error instanceof ContactError && error.status === 400)
    return {
      message: 'Podaj poprawny numer telefonu z kodem kraju.',
      status: 400,
    };
  console.error('[public-bookings] unexpected error:', error);
  return { message: 'Nie udało się zapisać rezerwacji.', status: 500 };
}
