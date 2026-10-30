# ZADANIE WYKONAWCZE — WhatsApp Business Coexistence w mCRM (jedna paczka)

Repozytorium: ten worktree (`~/wa-coex`, detached z `origin/main`, commit 8b60931).
Wykonawca kodu: Codex (abonament). Nie pushuj, nie zmieniaj innych plików niż wymienione.
Zakres jest zamknięty: **dokładnie dwa elementy** — (1) ekran połączenia istniejącej aplikacji
WhatsApp Business (Meta Embedded Signup, Coexistence), (2) obsługa webhooków synchronizacji
(echo z aplikacji, kontakty, historia). Bez nowej skrzynki, bez nowej kartoteki, bez nowego lejka.

## Kontekst, który MUSISZ wykorzystać (nie duplikować)
- `src/app/api/whatsapp/webhook/route.ts` — istniejący webhook: weryfikacja HMAC, `after()`,
  `processWebhook`, obsługa `messages`, `statuses`, szablony.
- `src/app/api/whatsapp/config/route.ts` — istniejący zapis konfiguracji (encrypt/decrypt tokenu,
  rejestracja numeru, `subscribeWabaToApp`).
- `src/lib/whatsapp/meta-api.ts`, `encryption.ts`, `resolve-conversation.ts`, `phone-utils.ts`,
  `src/lib/contacts/dedupe.ts`, `src/lib/conversations/reopen.ts`.
- `src/components/settings/whatsapp-config.tsx` + `settings-sections.ts` — istniejący ekran Ustawienia → WhatsApp.
- Baza: tabele `whatsapp_config`, `conversations`, `messages`, `contacts`, `sales_activities`.

## 1. Ekran „Połącz istniejącą aplikację WhatsApp Business”
- Nowy komponent `src/components/settings/whatsapp-coexistence-connect.tsx` renderowany w sekcji
  Ustawienia → WhatsApp (obok istniejącego formularza, nie zamiast niego).
- Ładuje Facebook JS SDK (`https://connect.facebook.net/en_US/sdk.js`), `FB.init({appId, version:'v23.0', xfbml:false, cookie:false})`.
- Przycisk „Połącz istniejącą aplikację WhatsApp Business”. Klik → `FB.login(cb, {config_id, response_type:'code',
  override_default_response_type:true, extras:{setup:{}, featureType:'whatsapp_business_app_onboarding', sessionInfoVersion:'3'}})`
  — `featureType: 'whatsapp_business_app_onboarding'` jest **obowiązkowy dla Coexistence** (Meta, ES v4).
  Wartość `whatsapp_embed_signup` dotyczy zwykłego onboardingu Cloud API, nie Coexistence.

## 1a. WARTOŚCI ZWERYFIKOWANE W META (30.10.2026 — źródło: panele Meta, konto firmowe)
- `NEXT_PUBLIC_FB_APP_ID` = `1116881471020279` (aplikacja `mCRM AI`, portfolio `1670356917366790` „Tomasz Maksoń”)
- `NEXT_PUBLIC_FB_ES_CONFIG_ID` = `1861133288660318` (Facebook Login for Business → WhatsApp Embedded Signup, v4)
- WABA / konto WhatsApp = `2678122512584634`, numer `+48 605 737 500`
- `META_APP_SECRET` — **nie istnieje jeszcze w repo ani w hPanel**; do uzupełnienia z App settings → Podstawowe
- Webhook aplikacji: **nieskonfigurowany** — endpoint `https://test.makson.space/api/whatsapp/webhook` trzeba
  najpierw wdrożyć, potem wpisać Callback URL + verify token w App → Webhooks (obiekt *Whatsapp Business Account*)
  i zasubskrybować: `messages`, `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`.
- Warunek zewnętrzny: aplikacja musi zostać **Tech Provider**, inaczej Meta nie pozwoli na onboarding Coexistence.
- Nasłuch `message` z `WA_EMBEDDED_SIGNUP`: `FINISH` (phone_number_id, waba_id) i `CANCEL` (current_step).
- Po FINISH: `POST /api/whatsapp/coexistence/onboard` z `{ code, phoneNumberId, wabaId }`, potem odświeżenie stanu.
- Gdy brak `NEXT_PUBLIC_FB_APP_ID` / `NEXT_PUBLIC_FB_ES_CONFIG_ID` → przycisk nieaktywny z czytelnym
  komunikatem po polsku („Brak konfiguracji Meta — uzupełnij …”) i bez wywołań sieciowych.
- Komunikaty po polsku, spójne z istniejącym UI (Tailwind + istniejące komponenty `ui/*`, bez nowych zależności).
- Ekran pokazuje status: niepołączony / połączony (numer, nazwa, tryb `coexistence`) / błąd z powodem.

## 2. Endpoint onboardingu
`src/app/api/whatsapp/coexistence/onboard/route.ts` (POST, wymaga zalogowanego użytkownika jak reszta API):
1. walidacja wejścia (code, phoneNumberId, wabaId — tylko cyfry / niepuste),
2. `GET https://graph.facebook.com/v23.0/oauth/access_token?client_id=<NEXT_PUBLIC_FB_APP_ID>&client_secret=<META_APP_SECRET>&code=<code>`
   → business token,
3. `GET /{phoneNumberId}?fields=display_phone_number,verified_name,quality_rating` (nazwa + numer do UI),
4. `POST /{wabaId}/subscribed_apps` (subskrypcja aplikacji do WABA),
5. `POST /{phoneNumberId}/smb_app_data` `{messaging_product:'whatsapp', sync_type:'smb_app_state_sync'}`
   — tylko raz; wynik zapisz w `whatsapp_config.contacts_sync_requested_at`,
6. `POST /{phoneNumberId}/smb_app_data` `{messaging_product:'whatsapp', sync_type:'history'}`
   — tylko raz; zapisz `whatsapp_config.history_sync_requested_at`,
7. upsert `whatsapp_config` (encrypt tokenu istniejącym `encrypt`, `onboarding_mode='coexistence'`,
   `coexistence_status='connected'`, `connected_at=NOW()`, `user_id`, `account_id`, wygenerowany `verify_token`),
8. brak rejestracji numeru (`/register`) — numer pozostaje w aplikacji; NIE wywołuj deregister.
9. każdy błąd Graph API → 4xx/5xx z `{ error, step }` po polsku w `message`; żadnych sekretów w odpowiedzi.
10. testy jednostkowe z zamockowanym `fetch` (sukces, błąd wymiany kodu, błąd subskrypcji, powtórne wywołanie).

## 3. Webhook — zdarzenia coexistence
W `processWebhook` obsłuż `change.field`:
- `smb_message_echoes` — wiadomości wysłane z aplikacji na telefonie. Dla każdej `value.messages[i]`:
  znajdź `whatsapp_config` po `value.metadata.phone_number_id`, znajdź/utwórz kontakt (`wa_id`) i rozmowę
  (istniejące helpery), wstaw `messages` z `sender_type='agent'`, `status='delivered'`, `message_id` z echa,
  `origin='business_app'`, `created_at` z `timestamp`. Idempotencja po `message_id`.
- `smb_app_state_sync` — `value.state_sync[]` (wpisy typu `contact`) → upsert kontaktów (imię/nazwisko z `profile.name`,
  telefon E.164 przez istniejący normalizator, dedupe przez `src/lib/contacts/dedupe.ts`), `origin` nie dotyczy.
- `history` — `value.history[]` (partie wątków) → dla każdego wątku (`thread.id` = numer klienta) upsert kontaktu
  i rozmowy, wstaw wiadomości chronologicznie z `created_at` z `timestamp`, `sender_type` z pola kierunku,
  `origin='history_sync'`, pomiń duplikaty po `message_id`. Partie mogą być niepełne — brak błędów przy nieznanych polach.
- Nie zmieniaj zachowania istniejących ścieżek `messages` / `statuses` / szablonów.
- Dodaj testy: echo, state_sync, history (2 partie, duplikat), nieznane pole → brak wyjątku.

## 4. Migracja (addytywna, bez kasowania danych)
`supabase/migrations/072_whatsapp_coexistence.sql`:
- `whatsapp_config`: `onboarding_mode TEXT DEFAULT 'cloud_api' CHECK (onboarding_mode IN ('cloud_api','coexistence'))`,
  `coexistence_status TEXT`, `contacts_sync_requested_at TIMESTAMPTZ`, `history_sync_requested_at TIMESTAMPTZ`.
- `messages`: `origin TEXT DEFAULT 'api' CHECK (origin IN ('api','business_app','history_sync'))`.
- unikalny indeks częściowy gwarantujący idempotencję: `CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_conversation_message_id
  ON messages(conversation_id, message_id) WHERE message_id IS NOT NULL;` — najpierw sprawdź, czy nie koliduje z istniejącymi danymi
  (jeśli koliduje, użyj indeksu nieunikalnego + `ON CONFLICT DO NOTHING` w kodzie i opisz to w komentarzu migracji).
- `.env.local.example`: dopisz `NEXT_PUBLIC_FB_APP_ID`, `NEXT_PUBLIC_FB_ES_CONFIG_ID` z komentarzem po polsku.

## 5. Bramki jakości (wszystkie muszą przejść, wyniki wklej na końcu)
- `npm run typecheck`
- `npm test` (pełny zestaw, bez regresji)
- `npm run lint`
- `npm run build:webpack`
- Commit: `feat(whatsapp): coexistence onboarding + business app echo/history sync`
- NIE pushuj, NIE uruchamiaj migracji na produkcyjnej bazie, NIE wołaj płatnych modeli ani zewnętrznego AI.

## Ograniczenia twarde
- LOCAL-FIRST: żadnych wywołań zewnętrznych modeli; dane klientów nie opuszczają infrastruktury projektu.
- Zero sekretów w logach i odpowiedziach API.
- Nie ruszaj plików spoza zakresu; nie zmieniaj istniejących kontraktów API innych modułów.
- UI tylko po polsku (istniejące i18n zostaw bez zmian).

---

## PAKIET 2 — POPRAWKI PO WERYFIKACJI ES v4 (30.10.2026)

Zakres WYŁĄCZNIE te trzy braki + testy. Nie zmieniaj niczego innego, nie zmieniaj kontraktów API,
nie ruszaj migracji na produkcyjnej bazie, nie pushuj.

### 2.1. `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`
Plik: `src/components/settings/whatsapp-coexistence-connect.tsx` (parser zdarzeń, ok. linii 38-80).
- Obsłuż także `event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'`.
- Payload takiego zakończenia może zawierać **tylko `waba_id`** (bez `phone_number_id`) — parser nie może go odrzucać.
- Zachowaj rozróżnienie trybu: wynik ma nieść informację, czy zakończenie podało numer (`coexistence` z numerem),
  czy tylko `waba_id` (numer do ustalenia serwerowo).
- `CANCEL` z `current_step` zostaje bez zmian.

### 2.2. Ustalenie numeru po stronie serwera
Plik: `src/app/api/whatsapp/coexistence/onboard/route.ts` (walidacja wejścia, ok. linii 40-70)
oraz `src/lib/whatsapp/meta-api.ts` (helper, ok. linii 60).
- Dopuść wejście bez `phone_number_id`, ale wtedy **ustal numer z autoryzowanego WABA**
  (`GET /{waba_id}/phone_numbers`) i zapisz ten, który jest na WhatsApp Business app.
- Przed zapisem trybu `coexistence` zweryfikuj `is_on_biz_app=true` oraz `platform_type=CLOUD_API`.
- Gdy nie da się jednoznacznie ustalić numeru — odpowiedz `409` z czytelnym powodem po polsku, nie zapisuj trybu.
- Nie wołaj `/register` ani `/deregister`.

### 2.3. `smb_message_echoes`
Plik: `src/app/api/whatsapp/webhook/route.ts` (gałąź coexistence, ok. linii 281 i 432-460).
- Dla pola `smb_message_echoes` czytaj `value.message_echoes` (Meta nie wysyła tam `value.messages`).
- Zachowaj istniejącą deduplikację `(conversation_id, message_id)` i oznaczanie wiadomości jako wychodzących.
- Popraw testy, które utrwalają błędny kontrakt (`route.test.ts` ok. linii 660).

### 2.4. `account_update`
Plik: `src/app/api/whatsapp/webhook/route.ts` (routing zmian, ok. linii 281).
- Dodaj obsługę `account_update` z `entry.id` jako identyfikatorem WABA; aktualizuj stan połączenia
  (odłączenie / ponowne połączenie) w `whatsapp_config`, bez kasowania historii wiadomości.

### 2.5. Bramki (wszystkie muszą przejść; wyniki wypisz na końcu)
- `npm run typecheck`
- `npm test` (pełny zestaw, bez regresji)
- `npm run lint`
Nie uruchamiaj `npm install`, nie zmieniaj `package.json`, nie pushuj, nie rób commitów.
