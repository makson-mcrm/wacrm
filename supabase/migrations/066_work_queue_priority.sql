-- A9.4 part 2: user override wins over transparent rule-based priority.
BEGIN;
ALTER TABLE public.work_queue_items
  ADD COLUMN IF NOT EXISTS manual_priority SMALLINT NOT NULL DEFAULT 0
    CHECK (manual_priority BETWEEN -5 AND 5);
ALTER TABLE public.work_queue_events DROP CONSTRAINT IF EXISTS work_queue_events_event_type_check;
ALTER TABLE public.work_queue_events ADD CONSTRAINT work_queue_events_event_type_check
  CHECK (event_type IN ('UTWORZONO','OTWARTO','ODLOZONO','ZALATWIONO','PRIORYTET_PODNIESIONO','PRIORYTET_OBNIZONO'));
COMMIT;

