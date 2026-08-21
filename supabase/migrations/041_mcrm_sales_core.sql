-- mCRM 4.0 sales core: complete deal intake, entity-specific tags,
-- calendar, notes, bank processes and Google Drive document folder links.
BEGIN;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_channel TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS product_type TEXT,
  ADD COLUMN IF NOT EXISTS applicant_mode TEXT,
  ADD COLUMN IF NOT EXISTS co_applicant_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS income_type TEXT,
  ADD COLUMN IF NOT EXISTS company_nip TEXT,
  ADD COLUMN IF NOT EXISTS accounting_type TEXT,
  ADD COLUMN IF NOT EXISTS liabilities TEXT,
  ADD COLUMN IF NOT EXISTS bik_status TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire_text TEXT,
  ADD COLUMN IF NOT EXISTS meeting_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_place TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expected_commission NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS whatsapp_sent_status TEXT,
  ADD COLUMN IF NOT EXISTS missing_documents TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal')),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_tags_unique
  ON entity_tags(account_id, entity_type, lower(trim(name)));

CREATE TABLE IF NOT EXISTS entity_tag_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES entity_tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tag_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS deal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL CHECK (length(trim(note_text)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
  bank_name TEXT,
  status TEXT,
  remote_process BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at DATE,
  decision TEXT,
  conditions TEXT,
  missing_documents TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deal_id, position)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_next_action ON deals(account_id, next_action_at);
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal ON deal_notes(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_processes_deal ON bank_processes(deal_id, position);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(account_id, starts_at);

ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_tags_select ON entity_tags FOR SELECT USING (is_account_member(account_id));
CREATE POLICY entity_tags_modify ON entity_tags FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY entity_tag_links_select ON entity_tag_links FOR SELECT USING (is_account_member(account_id));
CREATE POLICY entity_tag_links_modify ON entity_tag_links FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_notes_select ON deal_notes FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_notes_modify ON deal_notes FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY bank_processes_select ON bank_processes FOR SELECT USING (is_account_member(account_id));
CREATE POLICY bank_processes_modify ON bank_processes FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY calendar_events_select ON calendar_events FOR SELECT USING (is_account_member(account_id));
CREATE POLICY calendar_events_modify ON calendar_events FOR ALL USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));

COMMIT;
