-- Three-attempt outbound prospecting queue.
ALTER TABLE sales_activities
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS call_result TEXT,
  ADD COLUMN IF NOT EXISTS call_category TEXT,
  ADD COLUMN IF NOT EXISTS call_product TEXT,
  ADD COLUMN IF NOT EXISTS call_channel TEXT,
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sales_activities_call_queue
  ON sales_activities(account_id, phone_number, occurred_at DESC)
  WHERE activity_type = 'telefon';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_activities_call_result_check'
      AND conrelid = 'sales_activities'::regclass
  ) THEN
    ALTER TABLE sales_activities
      ADD CONSTRAINT sales_activities_call_result_check
      CHECK (call_result IS NULL OR call_result IN (
        'odebral', 'nie_odebral', 'niezainteresowany', 'oddzwonic'
      ));
  END IF;
END $$;
