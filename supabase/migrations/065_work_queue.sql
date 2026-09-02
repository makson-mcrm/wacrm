BEGIN;
CREATE TABLE IF NOT EXISTS public.work_queue_items (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 source_type TEXT NOT NULL CHECK(source_type IN('STRONA','SZYBKI_WPIS','FOLLOW_UP','ALERT_CRM')), source_table TEXT NOT NULL, source_id UUID NOT NULL,
 status TEXT NOT NULL DEFAULT 'NOWE' CHECK(status IN('NOWE','W_TOKU','ODLOZONE','ZALATWIONE')), snoozed_until TIMESTAMPTZ,
 contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, company_id UUID REFERENCES companies(id) ON DELETE SET NULL, deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(account_id,source_table,source_id),
 CHECK(status<>'ODLOZONE' OR snoozed_until IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.work_queue_events (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 queue_item_id UUID NOT NULL REFERENCES work_queue_items(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type IN('UTWORZONO','OTWARTO','ODLOZONO','ZALATWIONO')),
 contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, company_id UUID REFERENCES companies(id) ON DELETE SET NULL, deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_queue_active ON work_queue_items(account_id,status,snoozed_until,created_at DESC);
ALTER TABLE work_queue_items ENABLE ROW LEVEL SECURITY; ALTER TABLE work_queue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_queue_items_select ON work_queue_items FOR SELECT USING(is_account_member(account_id));
CREATE POLICY work_queue_items_modify ON work_queue_items FOR ALL USING(is_account_member(account_id,'agent')) WITH CHECK(is_account_member(account_id,'agent'));
CREATE POLICY work_queue_events_select ON work_queue_events FOR SELECT USING(is_account_member(account_id));
CREATE POLICY work_queue_events_insert ON work_queue_events FOR INSERT WITH CHECK(user_id=auth.uid() AND is_account_member(account_id,'agent'));
GRANT SELECT,INSERT,UPDATE,DELETE ON work_queue_items TO authenticated; GRANT SELECT,INSERT ON work_queue_events TO authenticated;
COMMIT;

