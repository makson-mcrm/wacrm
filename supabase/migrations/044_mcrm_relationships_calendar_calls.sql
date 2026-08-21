-- mCRM 4.0: relacje wielu osób z Dealem, wygodny kalendarz i rejestr działań.
-- Migracja rozszerza schemat i nie usuwa istniejących danych.
BEGIN;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS pesel TEXT,
  ADD COLUMN IF NOT EXISTS identity_document TEXT,
  ADD COLUMN IF NOT EXISTS bik_status TEXT,
  ADD COLUMN IF NOT EXISTS income_type TEXT,
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS employer_name TEXT,
  ADD COLUMN IF NOT EXISTS employment_from DATE,
  ADD COLUMN IF NOT EXISTS contract_until DATE;

UPDATE contacts
SET first_name = split_part(trim(name), ' ', 1),
    last_name = NULLIF(trim(substr(trim(name), length(split_part(trim(name), ' ', 1)) + 1)), '')
WHERE first_name IS NULL AND name IS NOT NULL AND length(trim(name)) > 0;

CREATE TABLE IF NOT EXISTS deal_contacts (
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (deal_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_contact ON deal_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_account ON deal_contacts(account_id);
ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deal_contacts_select ON deal_contacts;
DROP POLICY IF EXISTS deal_contacts_modify ON deal_contacts;
CREATE POLICY deal_contacts_select ON deal_contacts FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY deal_contacts_modify ON deal_contacts FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_id AND d.account_id = deal_contacts.account_id)
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.account_id = deal_contacts.account_id)
  );

INSERT INTO deal_contacts (deal_id, contact_id, account_id, role, is_primary)
SELECT id, contact_id, account_id, 'Wnioskodawca 1', TRUE
FROM deals WHERE contact_id IS NOT NULL
ON CONFLICT (deal_id, contact_id) DO NOTHING;

INSERT INTO deal_contacts (deal_id, contact_id, account_id, role, is_primary)
SELECT id, co_applicant_contact_id, account_id, 'Wnioskodawca 2', FALSE
FROM deals WHERE co_applicant_contact_id IS NOT NULL
ON CONFLICT (deal_id, contact_id) DO NOTHING;

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'zaplanowane',
  ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS sales_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('telefon', 'wartosciowa_rozmowa', 'spotkanie', 'zadanie')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_activities_day ON sales_activities(account_id, user_id, occurred_at DESC);
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_activities_select ON sales_activities;
DROP POLICY IF EXISTS sales_activities_modify ON sales_activities;
CREATE POLICY sales_activities_select ON sales_activities FOR SELECT USING (is_account_member(account_id));
CREATE POLICY sales_activities_modify ON sales_activities FOR ALL
  USING (user_id = auth.uid() AND is_account_member(account_id, 'agent'))
  WITH CHECK (user_id = auth.uid() AND is_account_member(account_id, 'agent'));

COMMIT;
