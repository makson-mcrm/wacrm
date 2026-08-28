-- Paczka 3A: regułowa Analiza AI Deala, metadane RAG i prowizje mFinanse.
BEGIN;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS mandatory_bank TEXT,
  ADD COLUMN IF NOT EXISTS preferred_bank TEXT,
  ADD COLUMN IF NOT EXISTS excluded_banks TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis_include_banks TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.ai_knowledge_documents
  ADD COLUMN IF NOT EXISTS bank TEXT,
  ADD COLUMN IF NOT EXISTS product TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE;

CREATE INDEX IF NOT EXISTS ai_knowledge_documents_bank_product_idx
  ON public.ai_knowledge_documents(account_id, bank, product);

CREATE TABLE IF NOT EXISTS public.ai_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  bank TEXT NOT NULL,
  product TEXT NOT NULL,
  rate NUMERIC(8,4) NOT NULL CHECK (rate >= 0),
  valid_from DATE NOT NULL,
  valid_to DATE,
  source_name TEXT NOT NULL,
  source_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS ai_commission_rates_lookup_idx
  ON public.ai_commission_rates(account_id, bank, product, valid_from DESC);
ALTER TABLE public.ai_commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_commission_rates_select ON public.ai_commission_rates FOR SELECT TO authenticated
  USING (is_account_member(account_id));
CREATE POLICY ai_commission_rates_insert ON public.ai_commission_rates FOR INSERT TO authenticated
  WITH CHECK (is_account_member(account_id, 'admin'));
CREATE POLICY ai_commission_rates_update ON public.ai_commission_rates FOR UPDATE TO authenticated
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));
CREATE POLICY ai_commission_rates_delete ON public.ai_commission_rates FOR DELETE TO authenticated
  USING (is_account_member(account_id, 'admin'));

CREATE TABLE IF NOT EXISTS public.deal_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  chunk_count INTEGER NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_amount NUMERIC(14,6),
  cost_currency TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deal_ai_analyses_deal_created_idx
  ON public.deal_ai_analyses(deal_id, created_at DESC);
ALTER TABLE public.deal_ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_ai_analyses_select ON public.deal_ai_analyses FOR SELECT TO authenticated
  USING (is_account_member(account_id));
CREATE POLICY deal_ai_analyses_insert ON public.deal_ai_analyses FOR INSERT TO authenticated
  WITH CHECK (is_account_member(account_id, 'agent'));

-- New public-schema tables are explicitly opted into the Data API.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_commission_rates TO authenticated;
GRANT SELECT, INSERT ON public.deal_ai_analyses TO authenticated;

COMMIT;

