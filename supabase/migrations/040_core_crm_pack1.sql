-- 040_core_crm_pack1.sql
-- WaCRM Pack 1: Deal-centred CRM core.
-- Safe additive migration. Does not touch DNS/hosting/mail settings.

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  nip TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_account_nip_unique
  ON companies(account_id, nip) WHERE nip IS NOT NULL AND btrim(nip) <> '';
CREATE INDEX IF NOT EXISTS companies_account_name_idx ON companies(account_id, name);

CREATE TABLE IF NOT EXISTS contact_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, company_id)
);
CREATE INDEX IF NOT EXISTS contact_companies_company_idx ON contact_companies(company_id);
CREATE INDEX IF NOT EXISTS contact_companies_contact_idx ON contact_companies(contact_id);

ALTER TABLE deals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_type TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS blocker TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS blocker_since TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS deals_company_idx ON deals(company_id);
CREATE INDEX IF NOT EXISTS deals_next_action_idx ON deals(account_id, next_action_at);

CREATE TABLE IF NOT EXISTS deal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deal_notes_deal_idx ON deal_notes(deal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  activity_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (activity_type IN ('follow_up','meeting','task','call')),
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crm_activities_due_idx ON crm_activities(account_id, due_at);
CREATE INDEX IF NOT EXISTS crm_activities_deal_idx ON crm_activities(deal_id);

-- Intake queue for makson.space. The public endpoint is wired separately;
-- this table is intentionally RLS-protected and not directly writable by anon.
CREATE TABLE IF NOT EXISTS web_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','rejected','converted')),
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  source TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS web_leads_account_status_idx ON web_leads(account_id, status, created_at DESC);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_read" ON companies;
DROP POLICY IF EXISTS "companies_write" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "companies_write" ON companies FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS "contact_companies_read" ON contact_companies;
DROP POLICY IF EXISTS "contact_companies_write" ON contact_companies;
CREATE POLICY "contact_companies_read" ON contact_companies FOR SELECT USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "contact_companies_write" ON contact_companies FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS "deal_notes_read" ON deal_notes;
DROP POLICY IF EXISTS "deal_notes_write" ON deal_notes;
CREATE POLICY "deal_notes_read" ON deal_notes FOR SELECT USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "deal_notes_write" ON deal_notes FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS "crm_activities_read" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_write" ON crm_activities;
CREATE POLICY "crm_activities_read" ON crm_activities FOR SELECT USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "crm_activities_write" ON crm_activities FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS "web_leads_read" ON web_leads;
DROP POLICY IF EXISTS "web_leads_write" ON web_leads;
CREATE POLICY "web_leads_read" ON web_leads FOR SELECT USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "web_leads_write" ON web_leads FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON companies;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON crm_activities;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON web_leads;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON web_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
