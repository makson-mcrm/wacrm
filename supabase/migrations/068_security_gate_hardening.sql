-- Security gate: keep helper resolution deterministic and prevent anonymous
-- callers from invoking the account-membership SECURITY DEFINER helper.
--
-- This migration changes privileges/function configuration only. It does not
-- alter tables or customer data.

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;
ALTER FUNCTION public._bcast_cols_for_status(text)
  SET search_path = public;
ALTER FUNCTION public.update_ai_configs_updated_at()
  SET search_path = public;
ALTER FUNCTION public.update_ai_knowledge_documents_updated_at()
  SET search_path = public;
ALTER FUNCTION public.validate_deal_company_account()
  SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_account_member(uuid, public.account_role_enum)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_member(uuid, public.account_role_enum)
  TO authenticated, service_role;

