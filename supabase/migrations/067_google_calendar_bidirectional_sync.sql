-- B1.2: one durable Google Calendar connection and sync metadata for calendar_events.
-- Additive only: existing events and CRM relations are preserved.
BEGIN;

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  account_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  sync_token TEXT,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'disconnected')),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS google_calendar_connections_select ON google_calendar_connections;
DROP POLICY IF EXISTS google_calendar_connections_modify ON google_calendar_connections;
DROP POLICY IF EXISTS google_calendar_connections_insert ON google_calendar_connections;
DROP POLICY IF EXISTS google_calendar_connections_update ON google_calendar_connections;
DROP POLICY IF EXISTS google_calendar_connections_delete ON google_calendar_connections;
CREATE POLICY google_calendar_connections_select ON google_calendar_connections
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_account_member(account_id));
CREATE POLICY google_calendar_connections_insert ON google_calendar_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_account_member(account_id, 'agent'));
CREATE POLICY google_calendar_connections_update ON google_calendar_connections
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_account_member(account_id, 'agent'))
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_account_member(account_id, 'agent'));
CREATE POLICY google_calendar_connections_delete ON google_calendar_connections
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_account_member(account_id, 'agent'));

GRANT SELECT, INSERT, UPDATE, DELETE ON google_calendar_connections TO authenticated;
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_user
  ON google_calendar_connections(user_id);

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS google_etag TEXT,
  ADD COLUMN IF NOT EXISTS google_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS local_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_conflict BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sync_conflict_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_google_unique
  ON calendar_events(account_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

COMMIT;

