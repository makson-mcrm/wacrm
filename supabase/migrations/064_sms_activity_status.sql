-- A9.1: persist prepared iPhone SMS actions in the shared sales activity register.
ALTER TABLE public.sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_activity_status_check;

ALTER TABLE public.sales_activities
  ADD CONSTRAINT sales_activities_activity_status_check
  CHECK (
    activity_status IS NULL OR activity_status IN (
      'PLANOWANE',
      'WYKONANE',
      'NIE_ODBYLO_SIE',
      'PRZELOZONE',
      'ANULOWANE',
      'PRZYGOTOWANO_SMS'
    )
  ) NOT VALID;

