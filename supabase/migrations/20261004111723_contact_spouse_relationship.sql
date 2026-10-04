-- Additive, account-scoped Contact <-> Spouse relationship.
-- Existing contacts remain untouched; deleting either contact removes only the link.

begin;

create table if not exists public.contact_spouses (
  contact_a_id uuid not null references public.contacts(id) on delete cascade,
  contact_b_id uuid not null references public.contacts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_a_id, contact_b_id),
  constraint contact_spouses_distinct_contacts check (contact_a_id <> contact_b_id),
  constraint contact_spouses_canonical_order check (contact_a_id::text < contact_b_id::text)
);

create index if not exists idx_contact_spouses_contact_b
  on public.contact_spouses (contact_b_id);
create index if not exists idx_contact_spouses_account
  on public.contact_spouses (account_id);

create or replace function public.validate_contact_spouse_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serialize spouse-link writes so one contact cannot be assigned twice by
  -- two concurrent requests that place it on different sides of the pair.
  lock table public.contact_spouses in share row exclusive mode;

  if not exists (
    select 1
    from public.contacts a
    join public.contacts b on b.id = new.contact_b_id
    where a.id = new.contact_a_id
      and a.account_id = new.account_id
      and b.account_id = new.account_id
  ) then
    raise exception 'Spouses must be contacts in the same account';
  end if;

  if exists (
    select 1
    from public.contact_spouses existing
    where (existing.contact_a_id in (new.contact_a_id, new.contact_b_id)
        or existing.contact_b_id in (new.contact_a_id, new.contact_b_id))
      and (tg_op = 'INSERT'
        or (existing.contact_a_id, existing.contact_b_id)
          <> (old.contact_a_id, old.contact_b_id))
  ) then
    raise exception 'A contact can have only one spouse';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_contact_spouse_relationship_trigger
  on public.contact_spouses;
create trigger validate_contact_spouse_relationship_trigger
  before insert or update on public.contact_spouses
  for each row execute function public.validate_contact_spouse_relationship();

alter table public.contact_spouses enable row level security;

revoke all on table public.contact_spouses from anon, authenticated;
grant select, insert, delete on table public.contact_spouses to authenticated;

drop policy if exists contact_spouses_select on public.contact_spouses;
drop policy if exists contact_spouses_insert on public.contact_spouses;
drop policy if exists contact_spouses_delete on public.contact_spouses;

create policy contact_spouses_select on public.contact_spouses
  for select to authenticated
  using (public.is_account_member(account_id));

create policy contact_spouses_insert on public.contact_spouses
  for insert to authenticated
  with check (public.is_account_member(account_id, 'agent'));

create policy contact_spouses_delete on public.contact_spouses
  for delete to authenticated
  using (public.is_account_member(account_id, 'agent'));

revoke all on function public.validate_contact_spouse_relationship() from public, anon, authenticated;

commit;
