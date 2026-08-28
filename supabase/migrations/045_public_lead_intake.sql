-- makson.space form submissions are separate from sales deals.
CREATE TABLE IF NOT EXISTS public_lead_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  submitted_name TEXT NOT NULL,
  submitted_phone TEXT NOT NULL,
  submitted_email TEXT,
  submitted_company TEXT,
  message TEXT NOT NULL CHECK (char_length(btrim(message)) >= 10),
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN (
    'financial-audit', 'mortgage', 'mortgage-refinancing',
    'business-financing', 'cash-loan', 'leasing', 'other-financial'
  )),
  callback_preference TEXT NOT NULL CHECK (callback_preference IN (
    '09:00-12:00', '12:00-15:00', 'after-15:00', 'any-time'
  )),
  source TEXT NOT NULL DEFAULT 'makson_space_form',
  consent_to_contact BOOLEAN NOT NULL CHECK (consent_to_contact),
  consented_at TIMESTAMPTZ NOT NULL,
  contact_created BOOLEAN NOT NULL DEFAULT FALSE,
  request_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_lead_submissions_account_created
  ON public_lead_submissions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_lead_submissions_contact
  ON public_lead_submissions(contact_id, created_at DESC);
ALTER TABLE public_lead_submissions ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated write policy. Only the server-side service role writes here.
