-- Server-side public lead intake uses the Supabase service role.
-- RLS bypass alone does not grant table privileges, so grant only the
-- reads/writes required by POST /api/public/leads.
grant select on table
  public.accounts,
  public.profiles,
  public.whatsapp_config,
  public.contacts
to service_role;

grant insert on table
  public.contacts,
  public.contact_notes,
  public.public_lead_submissions
to service_role;


