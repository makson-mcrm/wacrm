-- Paczka 2: spójność dokumentów oraz niezawodna historia zmian etapu Deala.
BEGIN;

ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS requirement_id UUID
    REFERENCES public.deal_document_requirements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deal_documents_requirement
  ON public.deal_documents(requirement_id)
  WHERE requirement_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_deal_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO public.deal_stage_history (
      account_id, deal_id, from_stage_id, to_stage_id, changed_by
    ) VALUES (
      NEW.account_id, NEW.id, OLD.stage_id, NEW.stage_id, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_deal_stage_change ON public.deals;
CREATE TRIGGER trg_record_deal_stage_change
AFTER UPDATE OF stage_id ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.record_deal_stage_change();

REVOKE ALL ON FUNCTION public.record_deal_stage_change() FROM PUBLIC, anon, authenticated;

COMMIT;
