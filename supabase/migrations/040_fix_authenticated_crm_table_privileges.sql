-- mCRM 4.0 — fix privileges for audited CRM tables.
-- RLS remains the authorization boundary; these grants only allow the
-- authenticated application role to reach the tables so RLS can decide.

grant select, insert, update, delete on table
  public.companies,
  public.contact_companies,
  public.bank_processes,
  public.calendar_events,
  public.client_intakes,
  public.daily_priorities,
  public.daily_sales_metrics,
  public.deal_contacts,
  public.deal_document_requirements,
  public.deal_documents,
  public.deal_notes,
  public.entity_tag_links,
  public.entity_tags,
  public.financial_questionnaire_submissions,
  public.public_booking_submissions,
  public.public_lead_submissions,
  public.sales_activities
to authenticated;

grant select, insert on table public.deal_stage_history to authenticated;
grant update on table public.notifications to authenticated;

drop policy if exists public_lead_submissions_select on public.public_lead_submissions;
create policy public_lead_submissions_select
on public.public_lead_submissions
for select
to authenticated
using (is_account_member(account_id));

drop policy if exists public_lead_submissions_update on public.public_lead_submissions;
create policy public_lead_submissions_update
on public.public_lead_submissions
for update
to authenticated
using (is_account_member(account_id, 'agent'::account_role_enum))
with check (is_account_member(account_id, 'agent'::account_role_enum));
