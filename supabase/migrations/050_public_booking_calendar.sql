-- Rezerwacja ze strony tworzy/odnajduje Kontakt i termin wewnętrzny.
-- Nigdy nie tworzy automatycznie Deala.
BEGIN;

CREATE TABLE IF NOT EXISTS public_booking_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  submitted_name TEXT NOT NULL,
  submitted_phone TEXT NOT NULL,
  submitted_email TEXT,
  submitted_company TEXT,
  topic TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'zaplanowana',
  consent_to_contact BOOLEAN NOT NULL CHECK (consent_to_contact),
  consented_at TIMESTAMPTZ NOT NULL,
  contact_created BOOLEAN NOT NULL DEFAULT FALSE,
  request_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_booking_account_start
  ON public_booking_submissions(account_id, starts_at);
ALTER TABLE public_booking_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_booking_select ON public_booking_submissions FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY public_booking_modify ON public_booking_submissions FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

COMMIT;
