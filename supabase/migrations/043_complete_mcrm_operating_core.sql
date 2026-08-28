-- mCRM 4.0: kompletny rdzeń operacyjny zgodny z procesem Tomasza.
-- Migracja jest wyłącznie rozszerzająca: nie usuwa istniejących danych.
BEGIN;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS phone_secondary TEXT,
  ADD COLUMN IF NOT EXISTS source_details TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS regon TEXT,
  ADD COLUMN IF NOT EXISTS krs TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS pkd TEXT,
  ADD COLUMN IF NOT EXISTS accounting_type TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS business_started_on DATE;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS source_details TEXT,
  ADD COLUMN IF NOT EXISTS need_summary TEXT,
  ADD COLUMN IF NOT EXISTS qualification_status TEXT,
  ADD COLUMN IF NOT EXISTS qualification_reason TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS monthly_costs NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS monthly_installments NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS household_size INTEGER,
  ADD COLUMN IF NOT EXISTS employment_from DATE,
  ADD COLUMN IF NOT EXISTS contract_until DATE,
  ADD COLUMN IF NOT EXISTS property_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS own_contribution NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS loan_term_months INTEGER,
  ADD COLUMN IF NOT EXISTS property_location TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS loan_purpose_details TEXT,
  ADD COLUMN IF NOT EXISTS current_bank TEXT,
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS current_installment NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS estimated_savings NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS documents_ready BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signed_forms_ready BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS launched_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS launched_at DATE,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS actual_commission NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_status TEXT,
  ADD COLUMN IF NOT EXISTS settlement_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS settlement_notes TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS archived_at DATE;

ALTER TABLE bank_processes
  ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS decision_at DATE,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS contract_signed_at DATE,
  ADD COLUMN IF NOT EXISTS launched_at DATE;

CREATE TABLE IF NOT EXISTS deal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT,
  status TEXT NOT NULL DEFAULT 'otrzymany',
  source_channel TEXT,
  notes TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal ON deal_documents(deal_id, created_at DESC);
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_documents_select ON deal_documents FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_documents_modify ON deal_documents FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS daily_sales_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_calls INTEGER NOT NULL DEFAULT 0,
  meaningful_conversations INTEGER NOT NULL DEFAULT 0,
  meetings INTEGER NOT NULL DEFAULT 0,
  new_deals INTEGER NOT NULL DEFAULT 0,
  moved_deals INTEGER NOT NULL DEFAULT 0,
  applications INTEGER NOT NULL DEFAULT 0,
  UNIQUE(account_id, user_id, metric_date)
);
ALTER TABLE daily_sales_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_sales_metrics_select ON daily_sales_metrics FOR SELECT USING (is_account_member(account_id));
CREATE POLICY daily_sales_metrics_modify ON daily_sales_metrics FOR ALL USING (user_id = auth.uid() AND is_account_member(account_id, 'agent')) WITH CHECK (user_id = auth.uid() AND is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS daily_priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority_date DATE NOT NULL DEFAULT CURRENT_DATE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 6),
  title TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  UNIQUE(account_id, user_id, priority_date, position)
);
ALTER TABLE daily_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_priorities_select ON daily_priorities FOR SELECT USING (is_account_member(account_id));
CREATE POLICY daily_priorities_modify ON daily_priorities FOR ALL USING (user_id = auth.uid() AND is_account_member(account_id, 'agent')) WITH CHECK (user_id = auth.uid() AND is_account_member(account_id, 'agent'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-documents', 'deal-documents', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP POLICY IF EXISTS deal_documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS deal_documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS deal_documents_storage_update ON storage.objects;
DROP POLICY IF EXISTS deal_documents_storage_delete ON storage.objects;
CREATE POLICY deal_documents_storage_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deal-documents' AND is_account_member((storage.foldername(name))[1]::uuid));
CREATE POLICY deal_documents_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deal-documents' AND is_account_member((storage.foldername(name))[1]::uuid, 'agent'));
CREATE POLICY deal_documents_storage_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'deal-documents' AND is_account_member((storage.foldername(name))[1]::uuid, 'agent'));
CREATE POLICY deal_documents_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'deal-documents' AND is_account_member((storage.foldername(name))[1]::uuid, 'agent'));

-- Zachowujemy identyfikatory etapów i wszystkie Deale; zmieniamy tylko polskie nazwy.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY pipeline_id ORDER BY position, created_at, id) AS nr
  FROM pipeline_stages
)
UPDATE pipeline_stages ps SET name = CASE ranked.nr
  WHEN 1 THEN '1. KONTAKT POZYSKOWY'
  WHEN 2 THEN '2. SPOTKANIE / AUDYT'
  WHEN 3 THEN '3. POCZEKALNIA'
  WHEN 4 THEN '4. KOMPLETACJA / OFERTA'
  WHEN 5 THEN '5. WNIOSKI / DECYZJA'
  WHEN 6 THEN '6. URUCHOMIENIE / FV'
  WHEN 7 THEN '7. ARCHIWUM'
  ELSE ps.name END
FROM ranked WHERE ranked.id = ps.id AND ranked.nr <= 7;

COMMIT;
