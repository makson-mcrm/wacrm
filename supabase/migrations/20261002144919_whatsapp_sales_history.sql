-- P1: mirror WhatsApp traffic into the shared CRM activity timeline.
-- Additive only: no customer or message data is modified or removed.
BEGIN;

ALTER TABLE public.sales_activities
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS message_direction TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS external_message_id TEXT,
  ADD COLUMN IF NOT EXISTS requires_deal_assignment BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_channel_check;
ALTER TABLE public.sales_activities
  ADD CONSTRAINT sales_activities_channel_check
  CHECK (channel IS NULL OR channel IN ('WHATSAPP')) NOT VALID;

ALTER TABLE public.sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_message_direction_check;
ALTER TABLE public.sales_activities
  ADD CONSTRAINT sales_activities_message_direction_check
  CHECK (message_direction IS NULL OR message_direction IN ('outbound', 'inbound')) NOT VALID;

ALTER TABLE public.sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_delivery_status_check;
ALTER TABLE public.sales_activities
  ADD CONSTRAINT sales_activities_delivery_status_check
  CHECK (delivery_status IS NULL OR delivery_status IN ('sent', 'delivered', 'read', 'failed')) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_activities_whatsapp_message
  ON public.sales_activities(account_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_activities_unassigned_whatsapp
  ON public.sales_activities(account_id, occurred_at DESC)
  WHERE requires_deal_assignment = TRUE;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ;

COMMIT;
