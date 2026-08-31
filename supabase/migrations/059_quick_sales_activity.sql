-- P0: one mobile sales activity register based on the existing sales_activities table.
-- Additive only: existing activities and customer data are preserved.
BEGIN;

ALTER TABLE sales_activities
  ADD COLUMN IF NOT EXISTS activity_status TEXT,
  ADD COLUMN IF NOT EXISTS objective_type TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ;

ALTER TABLE sales_activities DROP CONSTRAINT IF EXISTS sales_activities_activity_type_check;
ALTER TABLE sales_activities ADD CONSTRAINT sales_activities_activity_type_check
  CHECK (activity_type IN ('telefon','spotkanie','follow_up','wiadomosc','zadanie','inny_kontakt','wartosciowa_rozmowa')) NOT VALID;
ALTER TABLE sales_activities ADD CONSTRAINT sales_activities_activity_status_check
  CHECK (activity_status IS NULL OR activity_status IN ('PLANOWANE','WYKONANE','NIE_ODBYLO_SIE','PRZELOZONE','ANULOWANE')) NOT VALID;
ALTER TABLE sales_activities ADD CONSTRAINT sales_activities_objective_type_check
  CHECK (objective_type IS NULL OR objective_type IN ('NOWE_POZYSKANIE','OBSLUGA_SERWIS','FOLLOW_UP')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_sales_activities_schedule
  ON sales_activities(account_id, activity_status, scheduled_at) WHERE scheduled_at IS NOT NULL;

ALTER TABLE daily_sales_metrics
  ADD COLUMN IF NOT EXISTS follow_ups INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_activities INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_activities INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS postponed_activities INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_activities INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acquisition_activities INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_activities INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION refresh_daily_sales_metrics_for_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  target_account UUID := COALESCE(NEW.account_id, OLD.account_id);
  target_user UUID := COALESCE(NEW.user_id, OLD.user_id);
  target_date DATE := (COALESCE(NEW.occurred_at, OLD.occurred_at) AT TIME ZONE 'Europe/Warsaw')::date;
BEGIN
  INSERT INTO daily_sales_metrics (
    account_id,user_id,metric_date,new_calls,meaningful_conversations,meetings,
    follow_ups,tasks,planned_activities,completed_activities,postponed_activities,
    missed_activities,acquisition_activities,service_activities
  )
  SELECT target_account,target_user,target_date,
    count(*) FILTER (WHERE activity_type='telefon' AND completed)::integer,
    count(*) FILTER (WHERE call_result='odebral' AND completed)::integer,
    count(*) FILTER (WHERE activity_type='spotkanie' AND completed)::integer,
    count(*) FILTER (WHERE activity_type='follow_up')::integer,
    count(*) FILTER (WHERE activity_type='zadanie')::integer,
    count(*) FILTER (WHERE activity_status='PLANOWANE')::integer,
    count(*) FILTER (WHERE activity_status='WYKONANE')::integer,
    count(*) FILTER (WHERE activity_status='PRZELOZONE')::integer,
    count(*) FILTER (WHERE activity_status='NIE_ODBYLO_SIE')::integer,
    count(*) FILTER (WHERE objective_type='NOWE_POZYSKANIE')::integer,
    count(*) FILTER (WHERE objective_type='OBSLUGA_SERWIS')::integer
  FROM sales_activities
  WHERE account_id=target_account AND user_id=target_user
    AND (occurred_at AT TIME ZONE 'Europe/Warsaw')::date=target_date
  ON CONFLICT (account_id,user_id,metric_date) DO UPDATE SET
    new_calls=EXCLUDED.new_calls, meaningful_conversations=EXCLUDED.meaningful_conversations,
    meetings=EXCLUDED.meetings, follow_ups=EXCLUDED.follow_ups, tasks=EXCLUDED.tasks,
    planned_activities=EXCLUDED.planned_activities, completed_activities=EXCLUDED.completed_activities,
    postponed_activities=EXCLUDED.postponed_activities, missed_activities=EXCLUDED.missed_activities,
    acquisition_activities=EXCLUDED.acquisition_activities, service_activities=EXCLUDED.service_activities;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sales_activities_refresh_daily_metrics ON sales_activities;
CREATE TRIGGER sales_activities_refresh_daily_metrics AFTER INSERT OR UPDATE OR DELETE ON sales_activities
FOR EACH ROW EXECUTE FUNCTION refresh_daily_sales_metrics_for_activity();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_sales_metrics TO authenticated;
COMMIT;

