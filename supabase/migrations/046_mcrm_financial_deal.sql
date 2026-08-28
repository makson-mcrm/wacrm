-- mCRM 4.0 financial Deal fields.
-- Mirrors the operational Bigin card while keeping questionnaire data structured.

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS additional_contact_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expected_commission NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS financial_goal TEXT,
  ADD COLUMN IF NOT EXISTS deal_type TEXT,
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_dispatch TEXT,
  ADD COLUMN IF NOT EXISTS missing_items TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS folder_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_1 TEXT,
  ADD COLUMN IF NOT EXISTS bank_1_status TEXT,
  ADD COLUMN IF NOT EXISTS bank_2 TEXT,
  ADD COLUMN IF NOT EXISTS bank_2_status TEXT,
  ADD COLUMN IF NOT EXISTS bank_3 TEXT,
  ADD COLUMN IF NOT EXISTS bank_3_status TEXT,
  ADD COLUMN IF NOT EXISTS associated_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS questionnaire_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS questionnaire_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
  ADD COLUMN IF NOT EXISTS meeting_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deals_questionnaire_status_check'
      AND conrelid = 'deals'::regclass
  ) THEN
    ALTER TABLE deals
      ADD CONSTRAINT deals_questionnaire_status_check
      CHECK (questionnaire_status IN ('not_started', 'partial', 'submitted'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deals_associated_products_array_check'
      AND conrelid = 'deals'::regclass
  ) THEN
    ALTER TABLE deals
      ADD CONSTRAINT deals_associated_products_array_check
      CHECK (jsonb_typeof(associated_products) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deals_questionnaire_data_object_check'
      AND conrelid = 'deals'::regclass
  ) THEN
    ALTER TABLE deals
      ADD CONSTRAINT deals_questionnaire_data_object_check
      CHECK (jsonb_typeof(questionnaire_data) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON deals(account_id, lead_source);
CREATE INDEX IF NOT EXISTS idx_deals_financial_goal ON deals(account_id, financial_goal);
CREATE INDEX IF NOT EXISTS idx_deals_questionnaire_status
  ON deals(account_id, questionnaire_status);

CREATE TABLE IF NOT EXISTS financial_questionnaire_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  submitted_name TEXT NOT NULL,
  submitted_phone TEXT NOT NULL,
  submitted_email TEXT,
  submitted_company TEXT,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  preparation_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'partial',
  missing_items TEXT[] NOT NULL DEFAULT '{}',
  preliminary_analysis TEXT,
  consent_to_analysis BOOLEAN NOT NULL CHECK (consent_to_analysis),
  consented_at TIMESTAMPTZ NOT NULL,
  request_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_questionnaire_responses_object_check
    CHECK (jsonb_typeof(responses) = 'object'),
  CONSTRAINT financial_questionnaire_preparation_object_check
    CHECK (jsonb_typeof(preparation_plan) = 'object'),
  CONSTRAINT financial_questionnaire_status_check
    CHECK (status IN ('partial', 'submitted'))
);

CREATE INDEX IF NOT EXISTS idx_financial_questionnaires_account_created
  ON financial_questionnaire_submissions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_questionnaires_contact_created
  ON financial_questionnaire_submissions(contact_id, created_at DESC);

ALTER TABLE financial_questionnaire_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_questionnaires_select
  ON financial_questionnaire_submissions;
DROP POLICY IF EXISTS financial_questionnaires_update
  ON financial_questionnaire_submissions;
CREATE POLICY financial_questionnaires_select
  ON financial_questionnaire_submissions FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY financial_questionnaires_update
  ON financial_questionnaire_submissions FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON financial_questionnaire_submissions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON financial_questionnaire_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS questionnaire_id UUID
    REFERENCES financial_questionnaire_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_questionnaire
  ON deals(questionnaire_id)
  WHERE questionnaire_id IS NOT NULL;
