-- HOTFIX A6: global company NIP validation.
-- Existing companies without NIP remain untouched and must be completed manually.

begin;

create or replace function public.normalize_company_nip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nip := regexp_replace(coalesce(new.nip, ''), '\D', '', 'g');
  return new;
end;
$$;

drop trigger if exists normalize_company_nip_trigger on public.companies;
create trigger normalize_company_nip_trigger
  before insert or update of nip on public.companies
  for each row execute function public.normalize_company_nip();

-- NOT VALID preserves historical rows such as PEC without guessing their NIP,
-- while PostgreSQL still enforces the rule for every new or updated row.
alter table public.companies
  add constraint companies_nip_required
  check (length(nip_normalized) = 10) not valid;

comment on constraint companies_nip_required on public.companies is
  'A6: new and updated companies require a digits-only 10-character NIP; historical invalid rows require manual completion.';

commit;

