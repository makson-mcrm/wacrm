-- Paczka 1 P0: reject cross-account and cross-Deal activity contexts.
-- Existing tables remain the source of truth; this protects future writes only.
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_sales_activity_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  deal_company_id UUID;
BEGIN
  IF NEW.contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.contacts contact_row
    WHERE contact_row.id = NEW.contact_id
      AND contact_row.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'sales_activities_contact_context_check',
      MESSAGE = 'Activity and Contact must belong to the same account';
  END IF;

  IF NEW.company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.companies company_row
    WHERE company_row.id = NEW.company_id
      AND company_row.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'sales_activities_company_context_check',
      MESSAGE = 'Activity and Company must belong to the same account';
  END IF;

  IF NEW.deal_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.contact_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'sales_activities_deal_contact_check',
      MESSAGE = 'A Deal activity requires an explicit Contact';
  END IF;

  SELECT deal_row.company_id
  INTO deal_company_id
  FROM public.deals deal_row
  WHERE deal_row.id = NEW.deal_id
    AND deal_row.account_id = NEW.account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'sales_activities_deal_context_check',
      MESSAGE = 'Activity and Deal must belong to the same account';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.deals deal_row
    WHERE deal_row.id = NEW.deal_id
      AND deal_row.account_id = NEW.account_id
      AND (
        deal_row.contact_id = NEW.contact_id
        OR EXISTS (
          SELECT 1
          FROM public.deal_contacts deal_contact
          WHERE deal_contact.deal_id = deal_row.id
            AND deal_contact.contact_id = NEW.contact_id
            AND deal_contact.account_id = NEW.account_id
        )
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'sales_activities_deal_contact_check',
      MESSAGE = 'Selected Deal is not linked to the selected Contact';
  END IF;

  IF NEW.company_id IS NOT NULL
    AND deal_company_id IS NOT NULL
    AND NEW.company_id IS DISTINCT FROM deal_company_id
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'sales_activities_deal_company_check',
      MESSAGE = 'Selected Company does not match the selected Deal';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sales_activity_context
  ON public.sales_activities;
CREATE TRIGGER trg_validate_sales_activity_context
BEFORE INSERT
ON public.sales_activities
FOR EACH ROW
EXECUTE FUNCTION public.validate_sales_activity_context();

CREATE OR REPLACE FUNCTION public.validate_deal_note_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.deals deal_row
    WHERE deal_row.id = NEW.deal_id
      AND deal_row.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'deal_notes_deal_context_check',
      MESSAGE = 'Note and Deal must belong to the same account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_deal_note_context ON public.deal_notes;
CREATE TRIGGER trg_validate_deal_note_context
BEFORE INSERT
ON public.deal_notes
FOR EACH ROW
EXECUTE FUNCTION public.validate_deal_note_context();

REVOKE ALL ON FUNCTION public.validate_sales_activity_context()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_deal_note_context()
  FROM PUBLIC, anon, authenticated;

COMMIT;
