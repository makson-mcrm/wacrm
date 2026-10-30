# mCRM AI — checklista przygotowania Meta App Review

Wersja robocza 0.1 — 30.10.2026. Kontakt: biuro@makson.space.
Odhaczenie oznacza wyłącznie obecność materiału lub implementacji w tym repo. Nie oznacza wdrożenia, testu LIVE ani decyzji Meta. Stan paneli i firmy wymaga osobnego dowodu; w tym zadaniu nie zmieniano Meta.

## 1. Weryfikacja firmy

- [ ] Potwierdzona przez Meta weryfikacja portfolio i zgodność danych firmy; brak dowodu bieżącego statusu w tym zadaniu.
- [ ] Potwierdzenie domeny i danych kontaktowych w panelu Meta.

## 2. App Review — przygotowanie i zgłoszenie

- [x] Publiczne trasy w kodzie: `/polityka-prywatnosci`, `/regulamin`, `/usuwanie-danych`, z datą, kontaktem i wzajemnymi linkami.
- [x] Middleware przepuszcza te trasy bez sesji i bez wywołania uwierzytelniania.
- [x] Uzasadnienia dwóch uprawnień, lista pól i scenariusze nagrań: `app-review-justification.md`.
- [x] Istniejące wysyłanie wiadomości i zarządzanie szablonami w aplikacji; jest to dowód implementacji, nie działania LIVE.
- [x] Zapisany brak materiału źródłowego ikony ≥512 px: `../../public/app-icon-NOTICE.md`; istniejąca ikona w `src/app/icon.tsx` ma 32 × 32 px, pozostałe SVG w `public/` nie są materiałem marki mCRM.
- [ ] Akceptacja dokumentów przez właściciela przed publikacją. W projekcie źródłowym polityki występuje zapis o chmurowym AI dla spraw klientów; strona stosuje nadrzędną zasadę LOCAL-FIRST. Źródłowe pliki `*.PROJEKT.md` zachowano bez zmian.
- [ ] Materiał źródłowy marki oraz gotowe ikony 512 × 512 i 1024 × 1024 px.
- [ ] Wdrożenie zaakceptowanych stron i potwierdzenie publicznego dostępu HTTPS bez logowania. Adresy w uzasadnieniu są docelowymi URL-ami.
- [ ] Uzupełnienie właściwych pól w panelu Meta, w tym URL-i dokumentów i ikony.
- [ ] Dostęp recenzenta do odseparowanego konta i syntetycznych danych.
- [ ] Dwa rzeczywiste nagrania z widocznym wynikiem; plik ze scenariuszem nie zastępuje nagrania.
- [ ] Złożenie App Review i pozytywna decyzja Meta.

## 3. Advanced access

- [ ] Przyznany w panelu Advanced Access dla `whatsapp_business_messaging`.
- [ ] Przyznany w panelu Advanced Access dla `whatsapp_business_management`.
- [ ] Aktualne obowiązki dotyczące wykorzystania danych i ewentualnej weryfikacji dostępu uzupełnione zgodnie z formularzem Meta.

## 4. Tech Provider

- [ ] Potwierdzony status Tech Provider dla aplikacji/firmy; implementacja ES ani lokalne testy nie dowodzą tego statusu.
- [ ] Potwierdzone przez Meta warunki onboardingu klientów dla tej aplikacji.

## 5. Embedded Signup — Coexistence

- [x] Komponent czyta `NEXT_PUBLIC_FB_APP_ID` i `NEXT_PUBLIC_FB_ES_CONFIG_ID`; brak konfiguracji daje polski komunikat i nie ładuje SDK.
- [x] Facebook SDK v23.0 i `featureType: 'whatsapp_business_app_onboarding'`.
- [x] Parser obsługuje `FINISH`, `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` (także samo WABA) i `CANCEL`.
- [x] Backend ustala numer z autoryzowanego WABA i sprawdza `is_on_biz_app=true` oraz `platform_type=CLOUD_API`, bez `/register` i `/deregister`.
- [x] Obsługa webhooków `messages`, `statuses`, `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes` z `value.message_echoes`; deduplikacja wiadomości.
- [x] Istnieje addytywna migracja `supabase/migrations/072_whatsapp_coexistence.sql`; w tej paczce jej nie zmieniano ani nie uruchamiano.
- [ ] Potwierdzenie zastosowania wymaganej migracji we właściwym środowisku; obecność pliku nie potwierdza stanu bazy.
- [ ] Potwierdzenie aktualnych wartości App ID/ES config ID i App Secret w środowisku wdrożenia, bez zapisywania sekretów w materiałach.
- [ ] Aktualne potwierdzenie callback URL, verify tokenu, HMAC i subskrypcji pięciu pól webhooka w Meta. Starsze wpisy w repo i informacje w poleceniu nie zastępują odczytu bieżącego panelu.
- [ ] Odbiór rzeczywistego onboardingu i synchronizacji na kontrolowanym numerze: echo z telefonu, kontakty, dwie partie historii bez duplikatów, odłączenie/ponowne połączenie.
- [ ] Potwierdzenie zachowania aplikacji WhatsApp Business na telefonie i historii w mCRM.

Kolejność kontrolna: weryfikacja firmy → App Review → Advanced Access → Tech Provider → ES Coexistence. Dokładne zależności i aktualne formularze należy potwierdzić w panelu aplikacji; odnośniki i ograniczenie odczytu dokumentacji są opisane w `app-review-justification.md`.
