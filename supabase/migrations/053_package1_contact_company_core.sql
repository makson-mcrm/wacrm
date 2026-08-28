-- Paczka 1: operational Contact fields and format-independent NIP deduplication.

alter table public.contacts
  add column if not exists product_category text,
  add column if not exists contact_result text,
  add column if not exists next_step text,
  add column if not exists follow_up_at timestamptz;

alter table public.companies
  add column if not exists nip_normalized text
  generated always as (regexp_replace(coalesce(nip, ''), '\\D', '', 'g')) stored;

drop index if exists public.idx_companies_account_nip_unique;
create unique index if not exists idx_companies_account_nip_normalized_unique
  on public.companies (account_id, nip_normalized)
  where nip_normalized <> '';

alter policy contacts_update on public.contacts
  using (public.is_account_member(account_id, 'agent'))
  with check (public.is_account_member(account_id, 'agent'));

alter policy deals_update on public.deals
  using (public.is_account_member(account_id, 'agent'))
  with check (public.is_account_member(account_id, 'agent'));

-- Migration 052 revoked only the direct `anon` grants, but PostgreSQL's
-- default PUBLIC EXECUTE grant remained inherited. Close that path and grant
-- back only the RPCs intentionally called by trusted application roles.
revoke execute on function public._bcast_bump(uuid,text,integer) from public, anon;
revoke execute on function public.broadcast_recipient_aggregate_trigger() from public, anon;
revoke execute on function public.claim_ai_reply_slot(uuid,integer) from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.notify_conversation_assigned() from public, anon;
revoke execute on function public.recompute_broadcast_counts(uuid) from public, anon;
revoke execute on function public.record_webhook_failure(uuid,integer) from public, anon;
revoke execute on function public.touch_presence(text) from public, anon;

grant execute on function public.claim_ai_reply_slot(uuid,integer) to service_role;
grant execute on function public.recompute_broadcast_counts(uuid) to service_role;
grant execute on function public.record_webhook_failure(uuid,integer) to service_role;
grant execute on function public.touch_presence(text) to authenticated;

