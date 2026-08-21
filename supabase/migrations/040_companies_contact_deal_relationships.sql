-- 040_companies_contact_deal_relationships.sql
-- First mCRM 4.0 domain extension: a real company directory and links
-- Contact <-> Company plus optional Deal -> Company.

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nip TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT companies_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_companies_account_name
  ON companies(account_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_account_name_unique
  ON companies(account_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_account_nip_unique
  ON companies(account_id, nip)
  WHERE nip IS NOT NULL AND length(trim(nip)) > 0;

CREATE TABLE IF NOT EXISTS contact_companies (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_companies_company
  ON contact_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_contact_companies_account
  ON contact_companies(account_id);

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);

-- Preserve the old contacts.company text values by turning each distinct
-- account-local name into a real company and linking the original contact.
INSERT INTO companies (account_id, user_id, name)
SELECT DISTINCT ON (c.account_id, lower(trim(c.company)))
  c.account_id, c.user_id, trim(c.company)
FROM contacts c
WHERE c.company IS NOT NULL
  AND length(trim(c.company)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM companies co
    WHERE co.account_id = c.account_id
      AND lower(trim(co.name)) = lower(trim(c.company))
  )
ORDER BY c.account_id, lower(trim(c.company)), c.created_at;

INSERT INTO contact_companies (contact_id, company_id, account_id, is_primary)
SELECT c.id, co.id, c.account_id, TRUE
FROM contacts c
JOIN companies co
  ON co.account_id = c.account_id
 AND lower(trim(co.name)) = lower(trim(c.company))
WHERE c.company IS NOT NULL AND length(trim(c.company)) > 0
ON CONFLICT (contact_id, company_id) DO NOTHING;

CREATE OR REPLACE FUNCTION validate_deal_company_account()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM companies co
    WHERE co.id = NEW.company_id AND co.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'Deal and company must belong to the same account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_deal_company_account_trigger ON deals;
CREATE TRIGGER validate_deal_company_account_trigger
  BEFORE INSERT OR UPDATE OF company_id, account_id ON deals
  FOR EACH ROW EXECUTE FUNCTION validate_deal_company_account();

DROP TRIGGER IF EXISTS set_updated_at ON companies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select ON companies;
DROP POLICY IF EXISTS companies_insert ON companies;
DROP POLICY IF EXISTS companies_update ON companies;
DROP POLICY IF EXISTS companies_delete ON companies;
CREATE POLICY companies_select ON companies FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY companies_insert ON companies FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY companies_update ON companies FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY companies_delete ON companies FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS contact_companies_select ON contact_companies;
DROP POLICY IF EXISTS contact_companies_modify ON contact_companies;
CREATE POLICY contact_companies_select ON contact_companies FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY contact_companies_modify ON contact_companies FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_id AND c.account_id = contact_companies.account_id
    )
    AND EXISTS (
      SELECT 1 FROM companies co
      WHERE co.id = company_id AND co.account_id = contact_companies.account_id
    )
  );
