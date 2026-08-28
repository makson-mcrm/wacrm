-- mCRM 4.0: intake ze strony, kontrola procesu mFinanse,
-- analiza bankowa oparta na wersjonowanych źródłach i kompletacja dokumentów.
-- Migracja jest rozszerzająca i nie usuwa istniejących danych.
BEGIN;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS mfinanse_status TEXT NOT NULL DEFAULT 'do_sprawdzenia',
  ADD COLUMN IF NOT EXISTS blocker TEXT,
  ADD COLUMN IF NOT EXISTS blocker_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intake_source TEXT,
  ADD COLUMN IF NOT EXISTS intake_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intake_payload JSONB,
  ADD COLUMN IF NOT EXISTS questionnaire_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS questionnaire_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'nie_rozpoczeta',
  ADD COLUMN IF NOT EXISTS analysis_summary TEXT,
  ADD COLUMN IF NOT EXISTS analysis_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS analysis_source_url TEXT,
  ADD COLUMN IF NOT EXISTS analysis_source_version TEXT,
  ADD COLUMN IF NOT EXISTS analysis_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS post_consultation_report TEXT,
  ADD COLUMN IF NOT EXISTS benefit_report TEXT,
  ADD COLUMN IF NOT EXISTS measured_benefit NUMERIC(14,2);

ALTER TABLE bank_processes
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS instruction_url TEXT,
  ADD COLUMN IF NOT EXISTS instruction_version TEXT,
  ADD COLUMN IF NOT EXISTS application_form_url TEXT,
  ADD COLUMN IF NOT EXISTS application_form_version TEXT;

ALTER TABLE deal_notes
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'tekst',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS client_intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  intake_type TEXT NOT NULL CHECK (intake_type IN ('kontakt', 'ankieta', 'rezerwacja')),
  source TEXT NOT NULL DEFAULT 'makson.space',
  status TEXT NOT NULL DEFAULT 'nowe',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_intakes_account_status
  ON client_intakes(account_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_intakes_deal
  ON client_intakes(deal_id, submitted_at DESC);
ALTER TABLE client_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_intakes_select ON client_intakes FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY client_intakes_modify ON client_intakes FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS deal_document_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  bank_process_id UUID REFERENCES bank_processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'brak'
    CHECK (status IN ('brak', 'poproszono', 'otrzymany', 'do_poprawy', 'zaakceptowany', 'wyslany')),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  requested_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_document_requirements_deal
  ON deal_document_requirements(deal_id, status, created_at);
ALTER TABLE deal_document_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_document_requirements_select ON deal_document_requirements FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY deal_document_requirements_modify ON deal_document_requirements FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

COMMIT;
