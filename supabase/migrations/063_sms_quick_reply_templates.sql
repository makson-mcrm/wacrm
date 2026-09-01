-- A9 part 1: editable SMS drafts reuse the existing quick_replies catalogue.
-- They only prepare an iPhone sms: link; no message is sent by the CRM.
insert into public.quick_replies (account_id, user_id, title, kind, content_text)
select a.id, a.owner_user_id, template.title, 'text', template.content_text
from public.accounts a
cross join (values
  ('SMS — Brak dokumentów', 'Dzień dobry [IMIĘ_KLIENTA], do dalszej analizy brakuje jeszcze dokumentów wskazanych w naszej rozmowie. Proszę o ich przesłanie lub informację, kiedy będą dostępne. Pozdrawiam, Tomasz Maksoń'),
  ('SMS — Spotkanie', 'Dzień dobry [IMIĘ_KLIENTA], potwierdzam nasze spotkanie. Jeśli termin przestał być aktualny, proszę o krótką wiadomość. Pozdrawiam, Tomasz Maksoń'),
  ('SMS — Prośba o kontakt', 'Dzień dobry [IMIĘ_KLIENTA], próbowałem się skontaktować. Proszę o telefon lub wiadomość, kiedy będzie dogodny moment na rozmowę. Pozdrawiam, Tomasz Maksoń'),
  ('SMS — Status / decyzja', 'Dzień dobry [IMIĘ_KLIENTA], proszę o kontakt w sprawie aktualnego statusu i dalszej decyzji. Pozdrawiam, Tomasz Maksoń'),
  ('SMS — Follow-up', 'Dzień dobry [IMIĘ_KLIENTA], wracam do naszej ostatniej rozmowy. Czy możemy przejść do kolejnego kroku? Pozdrawiam, Tomasz Maksoń'),
  ('SMS — Prośba o opinię', 'Dzień dobry [IMIĘ_KLIENTA], dziękuję za współpracę. Będę wdzięczny za krótką opinię o naszej współpracy. Pozdrawiam, Tomasz Maksoń')
) as template(title, content_text)
where not exists (
  select 1 from public.quick_replies existing
  where existing.account_id = a.id and existing.title = template.title
);

