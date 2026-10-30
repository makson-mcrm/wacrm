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
  override_default_response_type:true, extras:{feature:'whatsapp_embed_signup', sessionInfoVersion:'3', setup:{}}})`.
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
