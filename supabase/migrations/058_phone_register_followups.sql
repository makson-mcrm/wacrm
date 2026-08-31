-- P0: universal phone register and one follow-up source for Deal/dashboard/calendar.
-- Additive only: existing activities and customer data are preserved.
BEGIN;

ALTER TABLE sales_activities
  ADD COLUMN IF NOT EXISTS call_type TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS product_group TEXT,
  ADD COLUMN IF NOT EXISTS next_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_contact_reason TEXT,
  ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES sales_activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_activities_next_contact
  ON sales_activities(account_id, next_contact_at)
  WHERE activity_type = 'telefon' AND completed = FALSE;

CREATE TABLE IF NOT EXISTS crm_catalog_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  catalog_type TEXT NOT NULL,
  value TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, catalog_type, value)
);
ALTER TABLE crm_catalog_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_catalog_options_select ON crm_catalog_options;
DROP POLICY IF EXISTS crm_catalog_options_modify ON crm_catalog_options;
CREATE POLICY crm_catalog_options_select ON crm_catalog_options FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY crm_catalog_options_modify ON crm_catalog_options FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

INSERT INTO crm_catalog_options (account_id, catalog_type, value, position)
SELECT a.id, 'product_group', option.value, option.position
FROM accounts a
CROSS JOIN (VALUES
  ('1_HIPO_OF_ML', 1),
  ('2_FIRMA_BC_ML', 2),
  ('3_FIRMA_BC_NML', 3),
  ('4_GOTÓWKA_OF_NML', 4),
  ('5_LEASING_BC_ML', 5)
) AS option(value, position)
ON CONFLICT (account_id, catalog_type, value) DO NOTHING;

ALTER TABLE sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_call_result_check;
ALTER TABLE sales_activities
  ADD CONSTRAINT sales_activities_call_result_check
  CHECK (call_result IS NULL OR call_result IN (
    'odebral', 'nie_odebral', 'niezainteresowany', 'oddzwonic',
    'przelozone_dzis', 'follow_up', 'serwis_zakonczony'
  )) NOT VALID;

ALTER TABLE sales_activities
  ADD CONSTRAINT sales_activities_call_type_check
  CHECK (call_type IS NULL OR call_type IN (
    'nowe_pozyskanie', 'follow_up', 'obsluga_serwis',
    'spotkanie_telefoniczne', 'przychodzacy', 'inne'
  )) NOT VALID;

COMMIT;

