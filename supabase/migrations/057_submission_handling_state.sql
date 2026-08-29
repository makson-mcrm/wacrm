-- P0: persistent, account-scoped handling state for website submissions.
-- Additive only: no rows or existing values are changed.
BEGIN;

ALTER TABLE public.public_lead_submissions
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE public.financial_questionnaire_submissions
  ADD COLUMN IF NOT EXISTS contact_created BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE public.public_booking_submissions
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_public_lead_submissions_unhandled
  ON public.public_lead_submissions(account_id, created_at DESC)
  WHERE handled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_questionnaires_unhandled
  ON public.financial_questionnaire_submissions(account_id, created_at DESC)
  WHERE handled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_public_booking_unhandled
  ON public.public_booking_submissions(account_id, created_at DESC)
  WHERE handled_at IS NULL;

COMMIT;
