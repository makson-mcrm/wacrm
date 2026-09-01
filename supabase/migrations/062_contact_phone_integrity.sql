-- A7: one canonical representation and a database backstop for every writer.
create or replace function public.canonical_contact_phone(raw_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw_trimmed text := btrim(coalesce(raw_phone, ''));
  digits text := regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g');
  canonical_digits text;
  explicit_international boolean;
begin
  explicit_international := left(raw_trimmed, 1) = '+' or left(digits, 2) = '00';
  canonical_digits := case when left(digits, 2) = '00' then substr(digits, 3) else digits end;
  if not explicit_international then
    if length(digits) <> 9 then raise exception using errcode = '22023', message = 'Polski numer telefonu musi mieć dokładnie 9 cyfr'; end if;
    canonical_digits := '48' || digits;
  end if;
  if left(canonical_digits, 2) = '48' and length(canonical_digits) <> 11 then
    raise exception using errcode = '22023', message = 'Polski numer telefonu musi mieć dokładnie 9 cyfr po prefiksie +48';
  end if;
  if canonical_digits !~ '^[1-9][0-9]{6,14}$' then
    raise exception using errcode = '22023', message = 'Niepoprawny numer międzynarodowy';
  end if;
  return '+' || canonical_digits;
end;
$$;

create or replace function public.enforce_contact_phone_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.canonical_contact_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists contacts_phone_integrity on public.contacts;
create trigger contacts_phone_integrity before insert or update of phone on public.contacts
for each row execute function public.enforce_contact_phone_integrity();

