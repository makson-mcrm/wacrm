# KM1.14 — ręczny zapis aktywności

Pierwsza bezpieczna paczka potwierdza istniejący kontrakt zwykłego CRM bez AI i bez połączenia z bazą. Formularz `/quick-call` przekazuje do `sales_activities`:

- telefon/rozmowę: `activity_type`, `phone_number`;
- krótki opis: `description`;
- wynik: `call_result`;
- następny krok: `next_action`;
- termin: `next_action_date`.

Wspólny, czysty helper `buildActivityCoreFields` jest używany przez rzeczywistą ścieżkę formularza i testowany na jawnie sztucznych danych. Paczka nie wykonuje zapisu do Supabase, nie używa AI i nie zmienia LIVE. Techniczny test nie zastępuje odbioru rzeczywistego zapisu i ponownego odczytu na LIVE.
