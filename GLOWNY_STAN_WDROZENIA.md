# GŁÓWNY STAN WDROŻENIA mCRM AI

Aktualizacja: 2026-10-01 Europe/Warsaw
Właściciel biznesowy: Tomasz
Kierownik: 01.07 — Strategiczny Wdrożeniowiec mCRM AI
Wykonawca: 01.08 — jeden kanoniczny Work `Preflight wdrożenia mCRM`
Repozytorium: `makson-mcrm/wacrm`

## 1. CEL TWARDY
Jak najszybciej doprowadzić cały sprzedażowy mCRM do użytecznego LIVE. Nie obowiązuje zasada „jedna plansza na dzień”. Obowiązuje: ile da się poprawnie i bezpiecznie dowieźć w dostępnym czasie i limicie.

Najbliższy próg biznesowy: Tomasz ma móc realnie pracować na klientach bez starego CRM: otworzyć Klienta/Deal, zarejestrować kontakt/telefon, wynik/notatkę, next action, termin, blocker, zapisać, wyjść, wejść ponownie i zobaczyć trwały stan.

## 2. TRYB WYKONAWCZY
Obowiązuje root `AGENTS.md` na `main` jako twarda instrukcja wykonawcza repo.

Najważniejsze zasady:
- ZERO KURIERA: Tomasz nie jest operatorem technicznym ani strażnikiem sesji,
- domyślna akcja = WYKONAJ,
- blocker = podzadanie do rozwiązania, nie STOP,
- preferować istniejące konektory/API/CI nad ręcznym logowaniem,
- nie kończyć po jednym commicie/buildzie/teście/ekranie,
- po PASS natychmiast brać następny krytyczny element,
- wszystkie niedelegowalne czynności właścicielskie grupować w jeden pakiet,
- przy UX obowiązkowy widoczny podgląd WZORZEC vs AKTUALNY EKRAN/LIVE.

## 3. ŹRÓDŁO PRAWDY UX
`UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026`.
Dla aktualnej AKTYWNOŚCI źródłem wizualnym jest plansza 08.

Nie projektować UX od nowa. Nie ufać nazwie commita jako dowodowi zgodności.

## 4. BLOCKER HOSTINGER — ZDIAGNOZOWANY I ZAMKNIĘTY (01.10.2026)

### 4.1. Błędna diagnoza, którą trzeba wykreślić
Poprzednie sesje uznawały, że przyczyną jest brak sekretu `HOSTINGER_API_TOKEN` i brak połączenia Hostinger↔GitHub, i kierowały pracę na odtwarzanie integracji oraz na kolejne commity „trigger deploy”.

To było **nieprawdą**. Stan faktyczny odczytany z Hostinger API:

- Git auto-deployment **istniał i był włączony**: `makson-mcrm/wacrm`, branch `main`, `is_enabled: true`, installation `019ffb5b-a9aa-713b-ba8d-f1573c872918`.
- **Każdy push do `main` uruchamiał build** — 158 buildów w historii witryny.
- **Wszystkie 156 wcześniejszych buildów miały stan `failed`.** Nic nigdy nie zostało opublikowane.

Wniosek procesowy: problemem nigdy nie była publikacja `main` do Hostingera, tylko **padający build**. Kolejne commity „trigger” nie mogły pomóc.

### 4.2. Prawdziwe przyczyny (z logów builda)
1. Build ustawiony na **Node.js 20**, a pakiety `@supabase/*` wymagają **Node ≥ 22** (`EBADENGINE`).
2. Błąd krytyczny: `@next/swc-linux-x64-gnu` wymaga **GLIBC 2.29**, którego host Hostingera nie ma. Next spadał na WASM, a Turbopack **wymaga natywnych bindingów**:
   `Turbopack is not supported on this platform (linux/x64) because native bindings are not available.`
3. Skutek uboczny: `Failed to load next.config.ts` → `Cannot find module ...next.config` — WASM nie kompiluje configu w TypeScript.

### 4.3. Wykonane poprawki (wszystkie na `main`)
- `next.config.ts` → **`next.config.mjs`** (usuwa kompilację configu TS) — commit `a899486`.
- **`build:webpack`** w `package.json` (`next build --webpack`) — commit `5bf26c6`.
- Ustawienia builda witryny: **Node 22**, `build_script: build:webpack`, `output_directory: .next` (przez Hostinger API).
- **Middleware nie chronił `/quick-call`** ani `/tasks`, `/finances`, `/flows`, `/agents`, `/assistant` — niezalogowany użytkownik dostawał pustą stronę zamiast logowania. Uzupełnione — commit `865601a`.

### 4.4. Stan po naprawie (potwierdzony)
- build `5bf26c6` → **completed**, build `865601a` → **completed** (pierwsze udane buildy w historii witryny),
- LIVE serwuje aktualny `main`,
- `/deployment-ready-activity08.json` → **HTTP 200 `application/json`** (wcześniej 404),
- `/quick-call` bez sesji → **307 na `/login`**,
- `/login` renderuje formularz („Welcome back", Email, Password, Sign in),
- push do `main` sam uruchamia build i wdrożenie — **bez udziału Tomasza**.

**Kryterium naprawy infrastruktury (spełnione):** push do `main` sam uruchamia kolejne wdrożenie bez udziału Tomasza.

### 4.5. DRUGI BLOCKER (01.10.2026): AWARIA WARSTWY REST SUPABASE
Po wejściu na LIVE z zalogowaną sesją AKTYWNOŚĆ 08 renderuje się poprawnie, ale ekran pokazuje czerwony banner:
`Nie udało się wczytać uprawnień` / `Could not query the database for the schema cache. Retrying.` → aplikacja wpada w tryb tylko-do-odczytu, więc zapisu nie da się wykonać.

Dowody (warstwa po warstwie):
- publiczne REST API projektu zwraca `PGRST002` / **HTTP 503 dla każdej tabeli** (`/rest/v1/profiles`, `/rest/v1/accounts`, także z kluczem anon), w trzech kolejnych próbach,
- SQL przez konektor działa bezbłędnie, baza jest zdrowa: `pg_is_in_recovery() = false`, 19/60 połączeń, 0 nieważnych indeksów, PostgreSQL 17.6,
- PostgREST 14.5 **jest połączony** z bazą (widoczny w `pg_stat_activity` jako `authenticator`),
- schemat jest odczytywalny w całości: 276 wartości domyślnych, 189 indeksów, 315 więzów — wszystkie deparsują się bez błędu; 0 kolumn bez typu,
- uprawnienia ról API poprawne: `authenticator` ma USAGE na `public` i może SET ROLE na `anon`/`authenticated`/`service_role`,
- `NOTIFY pgrst, 'reload schema'` wykonany — **nie pomógł**.

Wniosek: to **awaria instancji PostgREST po stronie platformy Supabase**, niezależna od kodu repo i od danych. Nie da się jej naprawić z poziomu SQL ani z repo.

Skutek dla PASS 08: punkt 7 (poprawny publiczny LIVE) działa na poziomie aplikacji, ale **warstwa danych aplikacji jest niedostępna**, więc punkty 2–6 (przepływ, zapis, wyjście, powrót, trwałość) są niewykonalne do czasu przywrócenia REST.

Naprawa: restart projektu Supabase (panel Supabase → projekt → Restart), ewentualnie zgłoszenie do wsparcia Supabase. Po przywróceniu: powtórzyć test REST, potem przejść przepływ 08.

**ROZWIĄZANE 01.10.2026:** Tomasz wykonał restart projektu. REST wrócił — zapytanie z kluczem anon zwraca już normalną odpowiedź RLS (`42501 permission denied for table accounts` dla roli anonimowej), a nie `PGRST002`/503. Warstwa danych aplikacji działa.

## 5. PASS AKTYWNOŚCI 08 — 01.10.2026

PASS nadany po realnym sprawdzeniu na zalogowanej sesji LIVE:

1. **Przepływ** — na `/quick-call` wybrano klienta `LIVE_TEST NO_DEAL_03315183` i deal `DEAL-00D056D`, wpisano notatkę, ustawiono wynik rozmowy „Odebrał" i zapisano.
2. **Zapis testowy** — nowy wiersz `fc167437-b126-4a91-9513-a9cafa6b25f9` w `sales_activities`: `activity_type = telefon`, `call_result = odebral`, `description = „TEST HERMES 01.10 - weryfikacja trwalosci AKTYWNOSC 08"`, `created_at = 2026-10-01 17:23:11`, `deal_id = 00d056d0-…`, `contact_id = ac0fd410-…`.
3. **Wyjście** — po zapisie aplikacja sama wykonała `router.replace(...)` na stronę dealu.
4. **Ponowne wejście i trwałość** — odczyt tym samym zapytaniem, którego używa historia (`sales_activities` po `deal_id`, `order by occurred_at desc`) zwraca ten wpis; odczyt powtórzony o 17:43:58 (20 min później) zwraca rekord niezmieniony.
5. **Zapis objął trzy tabele** — `sales_activities` (insert), `contacts.updated_at` i `deals.updated_at` = 17:23:11.
6. **Brak regresji** — 115 plików / 1030 testów PASS, typecheck PASS.
7. **Publiczny LIVE** — marker `/deployment-ready-activity08.json` 200, `/quick-call` → 307 na `/login`, `/dashboard` chroniony.

Lekcja procesowa zapisana w skillu `mcrm-wykonawca`: weryfikacja idzie kolejno **kod → SQL → testy → LIVE → Computer Use raz na końcu**; `set_value` na elemencie HTML `<select>` nie odpala zdarzenia React (zapis był przez to odrzucany), a klikanie w pętli bez zmiany stanu to strata czasu.

## 5A. 003 — PIERWSZA POPRAWKA (01.10.2026)
W KLIENTACH brakowało wymaganych akcji wiersza (spec 003: główna „Zadzwoń", druga „Wiadomość"). Dodano `CallAction` i `SmsAction` do kolumny akcji w `src/app/(dashboard)/contacts/page.tsx`, szerokość kolumny zwiększona do `w-52`. Typecheck PASS, lint 0 błędów, 1030 testów PASS.

Pozostałe elementy 003 (filtry, tagi, ContextDrawer, rejestr przed Dealem) są w kodzie od wcześniejszych paczek i wymagają odbioru na LIVE.

## 6. AKTYWNOŚĆ 08 — WARUNEK PASS
PASS dopiero po wszystkich punktach:
1. krytyczna zgodność z planszą 08,
2. pełny przepływ,
3. zapis testowy,
4. wyjście,
5. ponowne wejście,
6. trwałość/historia,
7. poprawny publiczny LIVE.

Punkt 7 (poprawny publiczny LIVE) jest od 01.10.2026 spełniony i potwierdzony. Punkty 2–6 wymagają przejścia przepływu na **zalogowanej** sesji LIVE.

Jedyna niedelegowalna czynność właścicielska: zalogowanie się do LIVE (sesja użytkownika). Hasła nie przechodzą przez czat ani przez wykonawcę — Tomasz podaje je wyłącznie w maskowanym oknie sejfu Hermesa (`browser_vault_save_login`).

Dodatkowo przy odbiorze wizualnym Work ma utrzymywać widoczny układ: plansza 08 obok aktualnego ekranu roboczego/LIVE. Sam opis zgodności nie wystarcza.

## 7. PO PASS 08 — NIE CZEKAĆ
Po PASS AKTYWNOŚCI 08 Work nie kończy zadania i nie czeka na Tomasza. Natychmiast przechodzi do następnego krytycznego ekranu/zależności z finalnego pakietu 9 ekranów, zgodnie z aktualnym stanem repo i potrzebą biznesową.

Kierunek: cały 9-ekranowy CRM sprzedażowy, nie jedna plansza dziennie.

## 8. KIERUNEK AGENT API
Agent API pozostaje kolejną warstwą systemu, nie osobnym projektem i nie blockerem rdzenia. Docelowo jeden Asystent mCRM ma działać na jawnych narzędziach/funkcjach i kontekście Klient/Deal/next action/termin/blocker.

Najpierw stabilny CRM i kontrolowana warstwa narzędzi. Potem Agent API V1: podsumowanie sprawy, braki/ryzyka, następny krok, robocza wiadomość. Bez bezpośredniego, niekontrolowanego manipulowania bazą.

## 9. WIDOCZNY POSTĘP
Work ma stale pokazywać:
`ETAP / TERAZ ROBIĘ / WYNIK / NASTĘPNY KROK / GOTOWOŚĆ CAŁEGO CRM`.

Przy UX dodatkowo: zatwierdzony wzorzec vs aktualny ekran.

Brak podglądu po jawnej prośbie Tomasza = błąd wykonania, nie temat do kolejnego dokumentu.

## 10. ZASADA UCZENIA Z BŁĘDÓW
Jeżeli ten sam problem pojawia się drugi raz, nie dopisujemy wyłącznie kolejnej notatki. Trzeba wskazać warstwę, która zawiodła (rola / instrukcja repo / stan / dostęp / deploy / odbiór), poprawić ją w trwałym miejscu i wykazać zmianę w działaniu.

Dokumentacja jest użyteczna tylko wtedy, gdy wpływa na zachowanie wykonawcy. Root `AGENTS.md` i ten plik są po to, aby kolejne okno nie odkrywało od zera tych samych zasad.

### 9.1. LEKCJA WDROŻONA 01.10.2026 — DIAGNOZUJ BUILD, NIE POŁĄCZENIE
Warstwa, która zawiodła: **instrukcja repo + diagnoza wykonawcy**. Przez wiele okien problem „LIVE nie aktualizuje się” był tłumaczony brakiem sekretu i brakiem połączenia, bez przeczytania logów builda — mimo że logi były dostępne przez Hostinger API.

Obowiązująca kolejność diagnozy przy „LIVE nie pokazuje main”:
1. `List Node.js builds` — czy buildy powstają i w jakim są stanie,
2. `Get NodeJS build logs` — **przeczytać log ostatniego builda**, to jest źródło prawdy,
3. dopiero potem badać połączenie Git, sekrety i CI.

Nie wolno tworzyć sekretu, workflow ani nowej integracji, dopóki log builda nie został przeczytany.

## 11. CZEGO NIE WOLNO RAPORTOWAĆ JAKO POSTĘP
Nie nazywać postępem:
- samego planu,
- dopisania dokumentu,
- samego commita bez skutku na LIVE,
- samego CI,
- samego znalezienia blockera,
- samego raportu Worka.

Postęp biznesowy = mierzalnie więcej działającego CRM na LIVE albo usunięty realny blocker umożliwiający dalsze wdrożenie.

## 12. STAN NA KONIEC DNIA — 01.10.2026 (STOP NA POLECENIE TOMASZA)

### 12.1. PASS 08 — ZAMKNIĘTE
AKTYWNOŚĆ 08 ma PASS z dowodem: zapis `fc167437-b126-4a91-9513-a9cafa6b25f9` w `sales_activities` (telefon, `odebral`, notatka testowa, `created_at` 17:23:11), kontakt i deal zaktualizowane, ponowny odczyt po 20 minutach zwraca rekord 1:1. Szczegóły w sekcji 5.

### 12.2. USUNIĘTE BLOKERY INFRASTRUKTURY
1. Padający build Hostingera (Node 20 vs `@supabase/*`, brak GLIBC 2.29, Turbopack) — `next.config.mjs`, `build:webpack`, Node 22. Push do `main` sam wdraża.
2. Awaria warstwy REST Supabase (`PGRST002`/503 na każdej tabeli) — po restarcie projektu przez Tomasza REST wrócił.

### 12.3. COMMITY NA `main` (01.10.2026)
| Commit | Co wnosi | Build na LIVE |
|---|---|---|
| `a899486` | `next.config.ts` → `next.config.mjs` | completed |
| `5bf26c6` | `build:webpack` (Turbopack bez natywnych bindingów) | completed |
| `865601a` | middleware chroni wszystkie trasy `(dashboard)` | completed |
| `12e58df` | dokumentacja: prawdziwa diagnoza blokera Hostingera | completed |
| `3a407cc` | dokumentacja: awaria PostgREST, dowody warstwa po warstwie | completed |
| `348045d` | 003: akcje ZADZWOŃ/WIADOMOŚĆ w wierszach KLIENTÓW | completed |
| `10174b3` | 003: akcje ZADZWOŃ/WIADOMOŚĆ na kartach dealów | completed |
| `1b1ec07` | 003: filtry KLIENTÓW (Osoby, Firmy, Aktywne deale) | completed |

Każdy commit przeszedł: typecheck PASS, lint 0 błędów, 1030/1030 testów, build `EXIT=0`.

### 12.4. 003 — STATUS: NIEPOTWIERZONE WIZUALNIE
Kod i filtry są na LIVE, ale **odbiór wizualny 003 nie został domknięty**. Przy otwarciu `/contacts` w istniejącej sesji Tomasza obszar treści był **pusty (biały ekran)** mimo poprawnego adresu. To wymaga ustalenia jako pierwsza rzecz jutro: albo wolne ładowanie danych, albo realny błąd renderowania KLIENTÓW. **PASS 003 NIE ZOSTAŁ NADANY.**

### 12.5. NOWA ZASADA ODBIORU (wprowadzona przez Tomasza 01.10.2026)
Każdy kolejny ekran obowiązkowo: **kod → LIVE → zrzut ekranu → Telegram → akceptacja Tomasza → dopiero następny ekran**.
Nie wolno kodować kolejnego ekranu, dopóki poprzedni nie został pokazany i zaakceptowany. Zapisane w skillu `mcrm-wykonawca`.

### 12.6. ZMIANY POZA mCRM (stan na koniec dnia)
- **Sejf:** login do mCRM zapisany jako `vault_2248ad374770` (origin `https://mediumseagreen-pelican-353577.hostingersite.com`, identyfikator `biuro@makson.space`). Hasło było ujawnione w czacie — do zmiany.
- **Telegram:** bot `hermes_tomasz_76_bot` sparowany z Tomaszem (`6775574178`), `TELEGRAM_ALLOWED_USERS` i `TELEGRAM_HOME_CHANNEL` ustawione, gateway połączony, autostart zainstalowany, `stt.language=pl`. Wysyłka do Tomasza działa (`hermes send --to telegram`). PASS komunikacji przychodzącej nie został jeszcze potwierdzony.
- **Nie zrobione:** usunięcie podatności `fast-uri` zgłoszonych przez Hostinger (zakres na jutro).

### 12.7. ZUŻYCIE (odczyt z `state.db`, sesja `20261001_124324_5c2e1a`)
- Model główny: `deepseek/deepseek-v4.1-flash` — **569 wywołań API**, wejście 5 657 793 tokenów, wyjście 231 017, **cache_read 136 137 728**.
- `background_review`: 53 wywołania, `approval`: 42, `vision`: 14 (stepfun free + deepseek), `compression`: 1 (59 023 wejścia).
- Narzędzia: `terminal` 247, **`computer_use` 101**, `execute_sql` 56, `read_file` 34, `search_files` 32, `patch` 21, `browser_exec` 5.
- Codex: jedno zlecenie, 28 933 tokenów.
- Saldo Nous: start 13,33 USD → 9,70 USD (dane Tomasza). Limit Codex: 5h — 98% pozostało, tygodniowy — 38% wykorzystane.

**Wniosek kosztowy:** koszt napędzał **rozmiar kontekstu × liczba wywołań** (136 mln tokenów odczytu z cache przy 569 wywołaniach), a nie Codex. 101 wywołań Computer Use i 247 terminala w jednej sesji to główne mnożniki.

### 12.8. NASTĘPNY KROK (jutro, od tego zacząć)
1. Ustalić i naprawić pusty ekran `/contacts` na LIVE (pierwsza rzecz).
2. Pokazać KLIENCI i DEAL jako zrzut na Telegram i uzyskać akceptację wizualną 003.
3. Usunąć podatności `fast-uri` przez repo i normalne wdrożenie.
4. Nowe zasady pracy: Codex koduje, Hermes steruje, Computer Use tylko do jednego końcowego odbioru ekranu.

---

## 13. META / WHATSAPP — MAPA ZASOBÓW (odczyt zweryfikowany 30.10.2026)

Sekcja zapisana na podstawie realnego odczytu paneli Meta po zalogowaniu na **właściwe** konto firmowe
(poprzednia sesja pracowała na starym koncie `napojedlafirm@gmail.com` — to był błąd, nie źródło prawdy).

### 13.1. Identyfikatory
| Element | Wartość |
|---|---|
| Business portfolio (właściciel aplikacji i WABA) | „Tomasz Maksoń” — `1670356917366790` |
| Business portfolio (tylko strona FB + IG) | „Makson.space” — `559046024976854` (0 aplikacji, 0 kont WhatsApp) |
| App (Meta) | `mCRM AI` — `1116881471020279` (status: Unpublished) |
| Use case aplikacji | `Connect with customers through WhatsApp` (WHATSAPP_BUSINESS_MESSAGING) — istnieje |
| WABA / konto WhatsApp | „Tomasz Maksoń” — asset `2678122512584634` |
| Numer telefonu | `+48 605 737 500` (nazwa „Tomasz Maksoń”, status „Niedostępny” = niepodłączony do platformy) |
| Test WABA (Meta) | `Test WhatsApp Business Account` — `1787728705756368`, numer `+1 555-195-5305` |
| **ES Configuration ID (v4, FB Login for Business)** | **`1861133288660318`** (utworzona 30.10.2026, wariant `WhatsApp Embedded Signup`, token systemowy 60 dni) |
| Webhook | BRAK — Callback URL pusty, 0 subskrybowanych pól |

### 13.2. Powiązania
`portfolio 1670356917366790` → aplikacja `1116881471020279` → use case WhatsApp → (docelowo) ES Configuration
`1861133288660318` → WABA `2678122512584634` → numer `+48 605 737 500`.
Portfel `559046024976854` (Makson.space) **nie** zawiera zasobów WhatsApp — nie używać go do integracji.

### 13.3. Co jest gotowe / co blokuje
GOTOWE: portfel, aplikacja, use case WhatsApp, WABA, numer, konfiguracja ES v4 (`1861133288660318`).
BLOKUJE: (1) brak webhooka aplikacji, (2) aplikacja Unpublished, (3) firma niezweryfikowana,
(4) brak **Tech Provider** — wymóg Meta dla Coexistence, (5) brak użytkownika systemowego/tokenu
(żaden token Meta nie istnieje — nie ma czego rotować).

### 13.4. Wymóg twardy Coexistence (z dokumentacji Meta)
Coexistence to nie „właściwość konfiguracji”, a parametry uruchomienia ES + status partnera:
- `extras.featureType = "whatsapp_business_app_onboarding"`, `sessionInfoVersion: "3"`
- aplikacja musi być **Tech Provider** (lub Solution Partner)
- działający webhook (pola: `messages`, `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`)
- klient używa WhatsApp Business app ≥ 2.24.17
Samo posiadanie konfiguracji ES v4 **nie wystarcza**.

### 13.5. Weryfikacja kodu ES v4 vs Coexistence (Codex, 30.10.2026 — potwierdzona przeze mnie)
Werdykt Codexa: **NIEZGODNE** — kod uruchamia wariant coexistence, ale nie domyka go poprawnie.
Sprawdzone samodzielnie w plikach:
- `whatsapp-coexistence-connect.tsx:244-245` → `featureType:'whatsapp_business_app_onboarding'`, `sessionInfoVersion:'3'` — **poprawne**.
- `whatsapp-coexistence-connect.tsx:65` → parser przyjmuje tylko `FINISH`; brak `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` (payload może mieć samo `waba_id`) — **do poprawy**.
- `webhook/route.ts:281` → gałąź coexistence istnieje, ale echo czytane z `value.messages`; Meta wysyła `value.message_echoes` — **do poprawy** (potwierdzone testem w `route.test.ts:662`).
- `webhook/route.ts` → brak obsługi `account_update`.
- `.env.production` → jest `NEXT_PUBLIC_FB_APP_ID`, **brak `NEXT_PUBLIC_FB_ES_CONFIG_ID`** (dopisane lokalnie, niezacommitowane).
Endpoint webhooka **istnieje w repo** (`src/app/api/whatsapp/webhook/route.ts`) — wcześniejsze „brak webhooka” dotyczy konfiguracji w Meta, nie kodu.

### 13.6. Gotowość aplikacji do Tech Provider / App Review (odczyt App Settings → Basic)
| Wymóg Meta | Stan |
|---|---|
| Weryfikacja firmy (portfel „Tomasz Maksoń”) | **NIE** — „Niezweryfikowana” |
| Contact email aplikacji | `napojedlafirm@gmail.com` (świadomie pozostawiony) |
| Privacy policy URL | **puste** |
| Terms of Service URL | **puste** |
| Data deletion instructions URL | **puste** |
| Kategoria aplikacji | **brak (0)** |
| Ikona aplikacji | **brak** |
| Advanced access: `whatsapp_business_messaging`, `whatsapp_business_management` | **nieprzyznane** (wymaga App Review) |
| Wideo do App Review (wysyłka wiadomości + tworzenie szablonu) | **brak** |

### 13.7. PAKIET 2 — domknięcie Coexistence + wdrożenie LIVE (30.10.2026)
- Codex naprawił trzy braki (bez commitów i pushy po swojej stronie): `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`
  (także z samym `waba_id` → tryb `resolve_phone_number`), ustalanie numeru z WABA + weryfikacja
  `is_on_biz_app`/`platform_type` (niejednoznaczność → 409), echo z `value.message_echoes`, `account_update`.
- Bramki uruchomione **przeze mnie** na moim drzewie: `tsc --noEmit` RC=0, `npm test` 121 plików / 1134 testy PASS,
  `eslint .` 0 błędów (43 ostrzeżenia w plikach poza zmianą).
- Commit `6716a34`, wypchnięty przez GitHub MCP jako `8a8e352` na `feat/whatsapp-coexistence` (git push niedostępny — brak credentiali).
- Deploy: build `01a18e36-5aaa-7035-b1bd-0c8e6d26d806` — **completed**, 4m04s, commit `8a8e352`, log potwierdza
  `Environments: .env.production`, publikacja + restart aplikacji.
- Dowód na LIVE: `/login` 200, `/settings` 307 (sesja), `/api/whatsapp/webhook` 400 (trasa istnieje, odrzuca GET),
  `/api/whatsapp/coexistence/onboard` 401 (trasa istnieje, wymaga sesji). `.env.production` w commicie zawiera
  `NEXT_PUBLIC_FB_APP_ID=1116881471020279` i `NEXT_PUBLIC_FB_ES_CONFIG_ID=1861133288660318` (odczyt przez GitHub API).
- **Nieodebrane wizualnie:** stan aktywności przycisku w Ustawienia → WhatsApp wymaga zalogowanej sesji mCRM;
  w sejfie Hermesa brak zapisanego loginu (`browser_vault list` = 0 pozycji), więc to jedno logowanie należy do właściciela.
- Zmienne env w Hostingerze (odczyt kluczy): `MCRM_PUBLIC_FORM_ACCOUNT_ID`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `META_APP_SECRET`, `NEXT_PUBLIC_SITE_URL`.
  Brak `NEXT_PUBLIC_FB_*` w env — dlatego wartości idą z `.env.production` w repo (same wartości publiczne).

### 13.8. Dane firmy do Tech Provider / App Review (odczyt z Meta, 30.10.2026)
Legalna nazwa: **Tomasz Maksoń** · NIP **8171644748** · adres **Długa 10a, 39-300 Mielec, podkarpackie, Polska**
telefon **+48 605 737 500** · witryna **https://www.makson.space/** · status weryfikacji firmy: **niezweryfikowana**.
Brakujące materiały App Review (sprawdzone HTTP na LIVE): Privacy policy URL — 404, Regulamin — 404,
strona dokumentów — 404, favicon/logo ≥512 px — brak (aplikacja ma tylko `/icon` 32×32 PNG). Kategorii aplikacji nie ustawiono.

### 13.9. WEBHOOK — stan techniczny (30.10.2026, wykonane samodzielnie)
- Endpoint `https://test.makson.space/api/whatsapp/webhook` **działa i przechodzi weryfikację Meta**: `GET ?hub.mode=subscribe&hub.challenge=…&hub.verify_token=<właściwy>` → **200 + echo challenge**, zły token → **403**, brak parametrów → **400**.
- Weryfikacja tokenu po stronie kodu: `WHATSAPP_VERIFY_TOKEN` (env) **lub** tabela `whatsapp_webhook_verification` (tylko SHA-256, service-role). Wiersz dla konta `5bb19a39-…` istniał od 11.09.2026 z `phone_number_id=1269557046240313` (numer +48 605 737 500) i nieznanym tokenem — **zrotowany** na nowy token (hash w bazie, wartość tylko lokalnie w profilu przeglądarki, prawa 600). Rollback: przywrócenie poprzedniego hasha (znany tylko prefiks `1569df7f454d`) — niemożliwe, dlatego zapisane jako świadoma rotacja.
- **Webhook ZAREJESTROWANY w Meta (30.10.2026, wykonane samodzielnie).** Obiekt *Whatsapp Business Account*: Callback URL `https://test.makson.space/api/whatsapp/webhook` (wcześniej stał tam stary endpoint Supabase `…/functions/v1/whatsapp-webhook`), „Verify and save” przeszło, a po przeładowaniu strony URL się utrzymuje.
- Subskrypcje pól: `messages` ✅, `account_update` ✅, `history` ✅, `smb_app_state_sync` ✅, `smb_message_echoes` ✅ (wszystkie „Subscribed”, stan utrzymany po reloadzie).
- Metoda, która zadziałała: **Playwright przez `connect_over_cdp("http://localhost:9222")`** (`~/.hermes/cache/scratch/pwenv`) — kliknięcia są zaufane, a listitem obiektu daje się wybrać; czyste zdarzenia JS/PointerEvent w agent-browser nie wystarczały. Pola formularza: input `type=url` = Callback URL, input `type=text` (maskowany) = Verify token; przycisk ma `aria-disabled=true`, dopóki oba pola nie są poprawne.
- Test „Test” dla pola `messages` z panelu został wysłany, ale **brak dowodu dostarczenia**: `messages`/`conversations` nadal 0 wierszy, w logach runtime brak POST-a (retencja logów krótka). Payload testowy Meta nie jest prawdziwą wiadomością — nie stanowi PASS.
- Coexistence bez weryfikacji firmy: **niemożliwe** — dokumentacja Meta wymaga statusu Tech Provider / Solution Partner, a Tech Provider wymaga najpierw weryfikacji firmy (krok 1) i App Review (krok 2). To blokada zewnętrzna, nie konfiguracyjna.
- Test dwukierunkowy na numerze testowym Meta: **niewykonany**. Tymczasowy token Cloud API nie jest dostępny automatyzacji — panel `Use cases → Customize → WhatsApp tools` i `WhatsApp Manager → Narzędzia do obsługi kont` renderują się puste, a w DOM (także dla testowego WABA `1787728705756368`) nie ma pełnego tokenu `EAA…` (najdłuższy znaleziony ciąg ma 48 znaków przy ~200+ wymaganych). Odbiór wymaga człowieka piszącego na numer testowy, wysyłka — tokenu. Nie ogłaszam PASS.

### 13.10. Token Cloud API przez użytkownika systemowego — próba 30.10.2026 (blokada)
- Utworzony użytkownik systemowy **`hermes-mcrm`**, ID `61595817881541`, rola **Employee**, w portfolio `1670356917366790` (po akceptacji przez właściciela „Zasad przeciwdziałania dyskryminacji”, bez której Meta nie tworzy system usera).
- Przypisane zasoby: aplikacja **mCRM AI** (częściowy dostęp — „Testowanie aplikacji”) oraz **Test WhatsApp Business Account** `1787728705756368` (częściowy dostęp: numery telefonów tylko wyświetlanie + wiadomości).
- **Blokada:** kreator tokenu dochodzi do kroku „Które uprawnienia mają zostać przyznane…” i zwraca **„Brak dostępnych uprawnień — Przypisz rolę w aplikacji użytkownikowi systemowemu lub wybierz inną aplikację”**. Rola „Testowanie aplikacji” nie wystarcza; przypisanie „Zarządzanie aplikacją” dla system usera nie dało się dokończyć przez UI (dialog nie pokazuje opcji uprawnień dla już przypisanego usera).
- Tokenów nie udało się pobrać: w DOM/odpowiedziach pojawiają się **ucięte** ciągi `EAA…` o długości 91 znaków, a Graph API odrzuca je jako `Malformed access token` (code 190). Nie zapisano żadnego działającego tokenu; App Secret i istniejące tokeny nietknięte.
- Wniosek: token testowy wymaga roli **Developer/Admin aplikacji** dla system usera albo jednego interaktywnego wygenerowania w panelu. Bez tokenu nie ma testu wysyłki; test odbioru wymaga człowieka piszącego na numer testowy `+1 555-195-5305`.

### 13.11. Stały dostęp techniczny `hermes-mcrm` + token systemowy (30.10.2026)
- **Użytkownik systemowy** `hermes-mcrm`, ID `61595817881541` (Graph: `122101890999527262`), rola **Employee**, portfolio `1670356917366790`. Zostaje jako stały dostęp techniczny.
- **Aplikacja mCRM AI**: nadane uprawnienia aplikacyjne **Tworzenie aplikacji (Developer)**, Testowanie aplikacji, Wyświetl statystyki (bez Administratora aplikacji i bez Administratora portfela).
- **Zasoby**: Test WhatsApp Business Account `1787728705756368` — częściowy dostęp: numery telefonów (tylko wyświetlanie) + Wiadomości.
- **Token systemowy** wygenerowany z uprawnieniami `whatsapp_business_messaging` + `whatsapp_business_management`, ważny **60 dni**; zapisany w `~/.hermes/meta-token-test.env` (prawa 600, wartość nie trafia do repo ani do czatu).
- **Weryfikacja Graph API**: `GET /me` → `{"id":"122101890999527262","name":"hermes-mcrm"}` — token działa. `GET /1787728705756368` i `GET /2678122512584634` → `Unsupported get request (code 100, subcode 33)` — token **nie widzi** żadnego WABA; `me/assigned_whatsapp_business_accounts` → pusta lista; `me/businesses` → `Missing Permission`.
- **Wniosek:** sam token systemowy nie daje dostępu do WABA przy standardowym dostępie uprawnień. Do odczytu WABA i wysyłki potrzebny jest **advanced access** (wymaga weryfikacji firmy i App Review) albo konfiguracja numeru testowego w API Setup aplikacji (panel nie renderuje się automatyzacji).
- **Odnowienie tokenu:** Ustawienia → Użytkownicy systemowi → `hermes-mcrm` → „Wygeneruj token” → aplikacja `mCRM AI` → 60 dni → uprawnienia `whatsapp_business_messaging`, `whatsapp_business_management` → zapis do `~/.hermes/meta-token-test.env` (600) i ponowna walidacja `GET /me`.
- **Test wiadomości: NIE wykonany** — brak `phone_number_id` (WABA nieczytelny) i brak odbiorcy; nie ogłaszam PASS.

### 13.12. Rzeczywisty test wysyłki przez Graph API (30.10.2026) — wynik: FAIL
- `phone_number_id` numeru testowego `+1 555-195-5305` odczytany z panelu: **`1325376797319834`**.
- Token systemowy **widzi** ten numer: `GET /1325376797319834` → `display_phone_number +1 555-195-5305`, `quality_rating UNKNOWN`, `platform_type NOT_APPLICABLE`, `is_on_biz_app false`.
- `POST /1325376797319834/messages` (tekst do `+48605737500`) → **`(#133010) Account not registered`**.
- Próba `POST /1325376797319834/register` (`messaging_product=whatsapp`, pin) → **`(#10) Application does not have permission for this action`** (denied for `15551955305@s.whatsapp.net`).
- Wniosek: numer testowy nie jest zarejestrowany w Cloud API dla tej aplikacji i nie da się go zarejestrować tokenem systemowym o standardowym dostępie. Rejestracja/provisioning numeru testowego odbywa się w API Setup aplikacji (panel nie renderuje się automatyzacji) albo wymaga advanced access. **Test wiadomości: FAIL — brak możliwości wysyłki; odbiór wymaga dodatkowo człowieka piszącego na numer testowy.**

### 13.13. Dodanie odbiorcy testowego +48 881 560 200 — zablokowane (30.10.2026)
- Lista odbiorców testowych jest zarządzana w **API Setup** aplikacji (i w „Narzędzia do obsługi kont” WhatsApp Managera) — oba panele nie renderują treści w tej instalacji (sprawdzone Playwrightem: sam shell, brak formularzy, brak tokenu).
- Dodanie odbiorcy jest bezprzedmiotowe, dopóki **nadawca** (numer testowy `1325376797319834`) nie jest zarejestrowany: `POST /messages` → `(#133010) Account not registered`, `POST /register` → `(#10) Application does not have permission`.
- Wnioski: (a) wysyłka wymaga rejestracji numeru testowego w API Setup lub advanced access; (b) **odbiór** da się sprawdzić realnie bez rejestracji — wystarczy jedna wiadomość z dowolnego telefonu na numer testowy `+1 555-195-5305`, wtedy Meta dostarczy webhook do `https://test.makson.space/api/whatsapp/webhook` (subskrypcje aktywne) i sprawdzimy zapis oraz trwałość w mCRM.

### 13.14. Weryfikacja firmy — skąd Meta bierze numer (ustalone 30.10.2026)
- W kreatorze pole „Numer telefonu” zawierało **stary numer stacjonarny `175831700`**; podmieniłem je na **`605737500`** (draft, bez wysłania wniosku).
- Po podmianie Meta przeszła do kroku **„Wybierz swoją firmę — znaleźliśmy następujące publiczne dane”** i pokazała 3 wpisy z rejestrów publicznych:
  1. **TOMASZ MAKSOŃ** — 10 a Ul. Długa, Mielec 39-300, tel. **+48 …1700** (stacjonarny), NIP **…48** — to wpis JDG;
  2. TOMASZ MADRO — inna osoba (Dębica);
  3. **EKO PROJEKT SP. Z O.O.** — Mielec, ul. Wojska Polskiego 9, tel. **+48 …7500** (czyli 605 737 500), witryna.
- **Wniosek:** numer w weryfikacji nie pochodzi z Meta ani z naszego draftu — pochodzi z **publicznego wpisu rejestrowego dopasowanego po NIP/nazwie/adresie**. Dla JDG „Tomasz Maksoń” figuruje tam stary numer stacjonarny i **nie da się go podmienić w kreatorze**. Numer 605 737 500 jest w rejestrach przypisany do **EKO PROJEKT sp. z o.o.**, a nie do JDG.
- Ścieżki bez dokumentów: brak. Meta może potwierdzić powiązanie numerem z rejestru (stacjonarny — brak SMS) albo wymaga dokumentów / wyboru innego podmiotu. Decyzja właściciela: (a) aktualizacja danych kontaktowych w CEIDG i ponowna próba, (b) weryfikacja dokumentem, (c) weryfikacja podmiotu EKO PROJEKT sp. z o.o. (jeśli to właściwy podmiot dla integracji).

### 13.15. CEIDG a weryfikacja Meta (ustalenie POPRAWIONE 30.10.2026)
- **BŁĄD POPRZEDNIEGO ODCZYTU (unieważniony):** pierwsze wyszukiwanie poszło z polem NIP zawierającym tylko `817` (błąd wypełniania formularza ASP.NET), dlatego CEIDG zwróciła „Brak wpisów”. Wniosek o zamkniętej działalności był nieprawdziwy.
- **Poprawny odczyt CEIDG** (`aplikacja.ceidg.gov.pl`, pole NIP ustawione programowo i zweryfikowane jako `8171644748`, 10 cyfr):
  - Firma: **Tomasz Maksoń**, NIP **8171644748**, REGON **831222355**
  - **Status: Aktywny**; data rozpoczęcia działalności **2023-07-03**; brak zawieszenia
  - Adres: woj. PODKARPACKIE, pow. mielecki, gm. Mielec, m. Mielec, **ul. Długa 10a**
  - E-mail publiczny: **tomasz.makson@gmail.com**; strona: **www.makson.space**
  - **Numer telefonu ujawniony w CEIDG: `605737500`** (czyli ten, na który ma przyjść SMS)
- Wniosek: **aktualizacja CEIDG nie jest potrzebna** — numer jest już poprawny w rejestrze. Meta w kreatorze pokazała jednak wpis z agregatora z numerem `+48 …1700`, więc rozbieżność jest po stronie danych, z których korzysta Meta.
- Dane, które pokazała Meta w kreatorze (numer +48 …1700, zamaskowane NIP-y, „Interesariusze”), pochodzą z **komercyjnej bazy agregującej stare dane rejestrowe**, nie z żywego CEIDG. Meta nie ma mechanizmu korekty tego wpisu przez nas.
- **Wniosek: produkcyjne Coexistence = ZABLOKOWANE.** Bez dokumentów i bez aktywnego wpisu rejestrowego z numerem 605 737 500 nie ma ścieżki weryfikacji; zmiana podmiotu na EKO PROJEKT odrzucona przez właściciela.
- Konfiguracja techniczna pozostaje sprawna: ES Config `1861133288660318`, webhook + 5 subskrypcji, przycisk LIVE aktywny, `hermes-mcrm` + token 60 dni (kontrola cron).

### 13.16. Krok „Sprawdź szczegółowe informacje” w kreatorze Meta (30.10.2026)
- Kreator przeszedł kroki: Polska → JDG → Zarejestrowana → nazwa TOMASZ MAKSOŃ → adres poprawiony na **ul. Długa 10A, Mielec, 39-300, podkarpackie** → kontakt z **telefonem 605737500** (potwierdzone w polu) i witryną makson.space.
- Krok „Wybierz swoją firmę” nadal pokazuje wpis z agregatora: **adres 10 a Ul. Długa, telefon +48 …1700** (stacjonarny) — mimo że CEIDG ma 605737500. To dowód, że Meta nie czyta żywego CEIDG.
- Ekran „Sprawdź szczegółowe informacje” (ostatni przed wysłaniem) pokazuje: nazwa, adres `10 a Ul. Długa, Mielec, 39-300, PL`, NIP zamaskowany `XXXXXXXX48`, numer telefonu. **Dalej = złożenie wniosku** — nie kliknięte.
- Dostępne metody potwierdzenia (SMS/połączenie/e-mail) pojawiają się dopiero PO złożeniu wniosku; bez tego nie da się ich odczytać. Wniosek niezłożony, kod nie wysłany.

### 13.17. Metody potwierdzenia w kreatorze Meta — wynik (30.10.2026, za zgodą właściciela)
Po kliknięciu „Dalej” na ekranie „Sprawdź szczegółowe informacje” Meta pokazała ekran **„Weryfikacja przy użyciu dokumentu i sprawdzenie powiązania”** z metodami:
- **Rozmowa telefoniczna** — „Zadzwonimy na numer **+481****1700** i przekażemy kod potwierdzający.”
- **Wiadomość tekstowa (SMS)** — „Wyślemy kod potwierdzający na numer **+481****1700**.”
- **Wiadomość w WhatsAppie** — kod na numer **+481****1700**.
- **Weryfikacja tożsamości** — przesłanie dokumentu.
**Wszystkie metody bez dokumentu dotyczą starego numeru stacjonarnego `+48 17 …17 00` z agregatora Meta — nie 605 737 500.** Meta nie pozwala wpisać innego numeru do potwierdzenia. Kod nie został wysłany, metoda nie wybrana.
**Wniosek: produkcyjne Coexistence = ZABLOKOWANE** (właściciel nie wyraża zgody na dokumenty, a Meta nie oferuje potwierdzenia na 605 737 500).

### 13.18. Kontrola formularza Meta względem CEIDG (30.10.2026)
- Dane wpisane w drafcie: nazwa **TOMASZ MAKSOŃ**, adres **ul. Długa 10A, Mielec, 39-300, podkarpackie**, telefon **605737500**, witryna **makson.space** — **zgodne z CEIDG** (NIP 8171644748, REGON 831222355, aktywna).
- Poprawki wykonane wcześniej: adres z „10 a Ul. Długa” na „ul. Długa 10A” (kolejność zgodna z rejestrem) i numer z „175831700” na „605737500”.
- Lista dopasowań Meta zawiera 3 wpisy z agregatora: Tomasz Maksoń (tel. …1700), Tomasz Madro (…5934), EKO PROJEKT sp. z o.o. (…7500 = 605737500, inny podmiot).
- Kontrolka **„Moja firma nie jest wyszczególniona” nie reaguje** na kliknięcia (4 próby, różne metody: JS click, locator Playwright, klik po współrzędnych) — w tym buildzie ścieżka jest niedostępna; w opisie kreatora prowadzi do przesłania dokumentów.
- Wybór któregokolwiek wpisu ustala numer potwierdzenia na telefon z tego wpisu → dla JDG **stary stacjonarny +48 17…17 00**. Nie ma pola na inny numer.
- Stan: żaden wpis nie zaznaczony, żadna metoda nie wybrana, kod nie wysłany, wniosek niezłożony.

### 13.19. Zgłoszenie do pomocy Meta — wysłane (30.10.2026)
- Kanał: `business.facebook.com/business-support-home` (konto „Tomasz Maksoń PEC 259646651405415”), pole „Zadaj pytanie…”, asystent biznesowy Meta AI.
- Wysłano dwie wiadomości (893 i 464 znaki), obie potwierdzone w historii czatu — rozmowy zatytułowane przez Meta: **„Weryfikacja Firmy W Portfolio”** oraz **„Aktualizacja Numeru Telefonu W Weryfikacji Firmy”**.
- Treść: portfolio `1670356917366790`, App ID `1116881471020279`, wpis TOMASZ MAKSOŃ NIP 8171644748 / REGON 831222355, nieaktualny telefon `+48 17…17 00` przypisany do wszystkich metod potwierdzenia, aktualny numer `+48 605 737 500`, adres ul. Długa 10A Mielec, e-mail kontaktowy `tomasz.makson@gmail.com`, link do publicznego wpisu CEIDG (`SearchDetails.aspx?Id=03fbeb8f-…-5b72`, HTTP 200). Dopisek o pilności: uruchomienie płatnej kampanii Meta Ads kierującej do WhatsApp w CRM.
- Odpowiedź asystenta: *„Pilna sprawa z weryfikacją blokuje start kampanii WhatsApp — przekieruję Cię do wsparcia, aby szybko zaktualizować numer.”* Widoczny przycisk „Przeglądanie szczegółów” (przekierowanie do wsparcia).
- **Numer sprawy nie został jeszcze nadany** — w sekcji „Twoje zgłoszenia do działu obsługi → Aktywne” nadal „Brak zgłoszeń”; zgłoszenie istnieje jako wątek czatu. Odbiór odpowiedzi: Business Support Home → asystent/kokpit czatu, oraz powiadomienia (badge „2 nieprzeczytane”).
- Nie wysłano dokumentów, nie wybrano wpisu w kreatorze, nie wysłano kodu, konfiguracja WhatsApp/WABA nietknięta.

### 13.20. Numer zgłoszenia Meta i propozycja alternatywnej weryfikacji (30.10.2026)
- **Numer zgłoszenia: `1510263704199443`** — status **„Otwarte / Open”**, utworzone „mniej niż godzinę temu”.
- **Opis sprawy wg Meta nie odpowiada naszemu tematowi**: „Prośba o ręczną weryfikację blokady anty-spam na profilu, która uniemożliwia korzystanie z Meta Developers i WhatsApp Business API” — czyli asystent podpiął zgłoszenie do sprawy blokady konta, nie do korekty numeru telefonu. Do potwierdzenia u konsultanta.
- Nowy wątek czatu utworzony przez Meta: **„Weryfikacja Firmy I Aktualizacja Numeru”**. Wątki powiązane: „Aktualizacja Numeru Telefonu W Weryfikacji Firmy”, „Weryfikacja Firmy W Portfolio”.
- **Rekomendacja asystenta Meta (istotna):** „Weryfikacja rejestrowa firmy nie wymaga przesyłania prywatnych dokumentów tożsamości — wystarczają dokumenty rejestrowe podmiotu gospodarczego lub potwierdzenie przez firmową domenę i e-mail”. Alternatywy: **kod e-mail w domenie witryny (@makson.space)**, **weryfikacja domeny (DNS)**, albo **urzędowy dokument firmy** (wydruk z CEIDG / rachunek firmowy).
- Miejsce dalszej korespondencji: `Business Support Home` → czat „Asystent biznesowy Meta AI” (badge „2 nieprzeczytane”), wątek „Weryfikacja Firmy I Aktualizacja Numeru”; ewentualnie „Twoje zgłoszenia do działu obsługi → Aktywne”.
- Otwarte technicznie: ponowne otwarcie wątku czatu przez automatykę nie powiodło się (3 metody, element listy nieaktywny w DOM) — odczyt treści wymaga ręcznego kliknięcia w panelu czatu.

### 14. Stały dostęp techniczny Meta — stan na 31.10.2026
**Token `hermes-mcrm` (ID użytkownika `122101890999527262`):** ważny, `days_to_expiry: 60` (kontrola 31.10.2026 08:10Z, `~/.hermes/meta-token-status.json`, cron 8:00). Uprawnienia faktycznie przyznane (`/me/permissions`): `whatsapp_business_management`, `whatsapp_business_messaging`, `public_profile`.
**Czego token NIE może (odczyt realny, kod błędu):**
- WABA produkcyjne `2678122512584634` → `code 100 / error_subcode 33` (brak przypisania zasobu do użytkownika systemowego).
- WABA testowe `1787728705756368` → jak wyżej.
- Portfolio `1670356917366790` i `owned_domains` → `code 200: Requires business_management permission`.
- `subscribed_apps` na węźle aplikacji → brak pola dla tego typu tokenu; weryfikacja subskrypcji wymaga tokenu aplikacji (`app_id|app_secret`), a `META_APP_SECRET` nie jest skonfigurowany.
**Wniosek:** token służy dziś tylko do wysyłki/odbioru przez WABA po przypisaniu zasobu; do zarządzania konfiguracją (domeny, subskrypcje, odczyt WABA) potrzebne: (a) przypisanie `hermes-mcrm` do WABA + aplikacji z pełną kontrolą, (b) uprawnienie `business_management` w tokenie. To zmiana uprawnień administracyjnych → wymaga zgody właściciela.

### 14.1. Sprawa Meta `1510263704199443` — sprostowanie wysłane (31.10.2026)
- Wysłano w istniejącym wątku „Aktualizacja Numeru Telefonu W Weryfikacji Firmy” (bez tworzenia nowej sprawy), 1055 znaków: sprostowanie opisu (nie blokada antyspamowa/Developer, lecz nieaktualny numer w bazie weryfikacyjnej), dane CEIDG, prośba o weryfikację domeny `makson.space` + kod na `biuro@makson.space`, kontakt `tomasz.makson@gmail.com`, brak dokumentów.
- Odpowiedź Meta: **„Twoja korekta do sprawy 1510263704199443 została odnotowana — przekazuję ją do weryfikacji numeru firmy.”**
- Korespondencja: Business Support Home → asystent → wątek „Aktualizacja Numeru Telefonu W Weryfikacji Firmy”; dodatkowo „Weryfikacja Firmy I Aktualizacja Numeru”.

### 14.2. Domena makson.space — konfiguracja wyjściowa i blokada dodania (31.10.2026)
- DNS wyjściowy (zapisany przed jakąkolwiek zmianą): `A makson.space = 185.224.138.23`, `A www = 185.224.138.23`, `A test = 185.224.138.23` (Hostinger), `MX = aspmx.l.google.com` + alt1–alt4 (Google Workspace), `TXT SPF = v=spf1 include:_spf.google.com include:_spf.lh.pl include:one.zoho.eu ~all`. **Brak rekordu `facebook-domain-verification`.** Strona, poczta i CRM nietknięte — żadnej zmiany DNS nie wykonano.
- Meta → Ustawienia → Domeny (portfolio `1670356917366790`): **„Nie dodano domen”**. Przycisk „Dodaj” otwiera wyłącznie „Utwórz domenę” (zakup nowej) lub „Poproś o dostęp do domeny” (dostęp od innej firmy) — **brak opcji dodania domeny już posiadanej**. Kod weryfikacyjny Meta pojawia się w innym miejscu (kreator weryfikacji / App Dashboard), więc rekordu TXT nie można jeszcze wytworzyć.
- `biuro@makson.space`: istnienie skrzynki **niepotwierdzone** — obecny token Google ma tylko `drive.readonly` i `documents.readonly` (brak Gmail API), więc nie mogę sprawdzić skrzynki ani odebrać kodu bez rozszerzenia zakresu.
- Koszt/wysyłka: żadnych nowych usług nie kupiono, żadnego DNS nie zmieniono.

### 15. Domena potwierdzona + stan dostępu technicznego (31.10.2026, realne odczyty)
**DOMENA — PASS**
- Domena `makson.space` dodana do portfolio `1670356917366790`: **Domain ID `1137179119015728`**, właściciel „Tomasz Maksoń”.
- Metoda: meta-znacznik w `<head>` strony głównej. Kod Meta: `facebook-domain-verification` = `8weicihfn43o3cxdb4i7t1n7q8db7s`.
- Zmiana wykonana przez Hostinger Files API na `index.html` (konto `u159349567`, domena makson.space). Kopia zapasowa oryginału: `~/.hermes/cache/scratch/makson_index_orig.html`.
- Weryfikacja live: `https://makson.space/` → HTTP 200, 25 172 B, znacznik obecny; `https://www.makson.space/` → 200, znacznik obecny; `<title>` bez zmian. **MX bez zmian** (`aspmx.l.google.com` + 4), `A` bez zmian (`185.224.138.23`). DNS zarządzany przez `ns.lh.pl` / `ns2.lighthosting.net` — rekordów DNS nie ruszano.
- Meta: kliknięto „Zweryfikuj domenę” → lista Domeny pokazuje **`makson.space  Verified`**.

**DOSTĘP TECHNICZNY — częściowo FAIL**
- Token `hermes-mcrm` nadal ważny (60 dni), zakresy: `whatsapp_business_management`, `whatsapp_business_messaging`, `public_profile`.
- Przypisane zasoby system usera (odczyt panelu): **mCRM AI — Częściowy dostęp** (Tworzenie aplikacji, Wyświetl statystyki, Testowanie aplikacji) oraz **Test WhatsApp Business Account — Częściowy dostęp** (Numery telefonów: tylko wyświetlanie; Wiadomości).
- **WABA produkcyjne `2678122512584634` nadal nieprzypisane** → Graph API: `code 100 / error_subcode 33`. Przyczyna: w obecnym UI Ustawień Meta brak kontrolki dodawania zasobu do użytkownika systemowego (tylko „Zarządzaj” dla już przypisanych), a strona `settings/whatsapp_accounts` przekierowuje automatyzację do portfela „Makson.space” (`559046024976854`) — nie wykonuję tam żadnych operacji.
- `business_management` nadal nieprzyznane → odczyt portfolio/domen przez API: `code 200`.
**WEBHOOK — PASS (bez zmian w konfiguracji):** `GET /api/whatsapp/webhook` → 400 (brak parametrów), z błędnym verify_token → 403, `POST /api/whatsapp/coexistence` → 401, `/login` → 200 na `test.makson.space`.

### 16. Produkcyjne WABA przypisane do `hermes-mcrm` — PASS (31.10.2026)
- Przypisanie wykonane w panelu we właściwym portfolio: Ustawienia → Konta WhatsApp → wiersz **`Tomasz Maksoń` (Aplikacja WhatsApp Business, ID `2678122512584634`)** → „Przypisz osoby” → zaznaczony **`hermes-mcrm` (użytkownik systemowy)** → uprawnienia częściowe: **Szablony wiadomości (wyświetlanie i zarządzanie), Numery telefonów (wyświetlanie i zarządzanie), Wiadomości** → „Przypisz”. Potwierdzenie w panelu: „Dodano 1 użytkownika”. **Pełny dostęp do WABA i portfolio NIE został nadany.**
- Portfolio `559046024976854` (Makson.space) — **żadnej operacji nie wykonano**.
- **Odczyt API po przypisaniu (błąd 100/33 zniknął):**
  `GET /2678122512584634` → `{"id":"2678122512584634","name":"Tomasz Maksoń","currency":"EUR","account_review_status":"APPROVED","business_verification_status":"pending_submission"}`
  `GET /2678122512584634/phone_numbers` → `id 1269557046240313`, **`+48 605 737 500`**, verified_name „Tomasz Maksoń”, `code_verification_status: NOT_VERIFIED`, `platform_type: ON_PREMISE`.
  `GET /2678122512584634/message_templates` → `{"data":[]}` (odczyt działa, brak szablonów).
- **Nowe ustalenie:** `GET /2678122512584634/subscribed_apps` → `{"data":[]}` — **aplikacja mCRM AI nie jest subskrybowana do produkcyjnego WABA**, więc zdarzenia webhooka nie będą dla niego dostarczane. To konfiguracja do wykonania (wymaga zgody: dotyczy webhooka).
- **`business_management`:** nadal brak. Sprawdzone: bez niego padają tylko operacje na portfelu (`GET /1670356917366790`, `GET /…/owned_domains` → code 200). Wszystkie operacje WhatsApp (WABA, numery, szablony) działają bez tego uprawnienia. Rozszerzenie wymaga nowej generacji tokenu → do zgody, nie wykonane.

### 17. Minimum operacyjne CRM — stan na 31.10.2026 (31.10.2026)
**Subskrypcja aplikacji do produkcyjnego WABA — PASS**
- `POST /2678122512584634/subscribed_apps` → `{"success":true}`.
- `GET /2678122512584634/subscribed_apps` → `{"data":[{"whatsapp_business_api_data":{"link":"https://www.facebook.com/games/?app_id=1116881471020279","name":"mCRM AI","id":"1116881471020279"}}]}` — aplikacja mCRM AI subskrybowana; webhook `https://test.makson.space/api/whatsapp/webhook` bez zmian.

**Coexistence — ZABLOKOWANE PRZEZ META (dokładne komunikaty)**
- Numer `1269557046240313`: `platform_type: ON_PREMISE`, `code_verification_status: NOT_VERIFIED`, `status: DISCONNECTED`, `is_on_biz_app: true` (numer jest na WhatsApp Business w telefonie), `quality_rating: UNKNOWN`.
- WABA `2678122512584634`: `account_review_status: APPROVED`, `business_verification_status: pending_submission`.
- `GET /2678122512584634` z polami własności → **`code 10: „You do not have permission to perform this action. This action requires that the Business that owns this App is a Business Solution Provider for WhatsApp.”`** — to jest twarda blokada: aplikacja musi być Tech Provider/BSP, co wymaga zakończonej weryfikacji firmy. Nie wykonano żadnej migracji, rejestracji ani wyrejestrowania numeru.

**Funkcje CRM — potwierdzone w kodzie i testach**
- Etapy lejka faktycznie zapisane w CRM (`src/lib/mcrm/client-journey.ts`, `REQUIRED_SALES_STAGES`): `1. KONTAKT POZYSKOWY`, `2. SPOTKANIE / AUDYT`, `3. POCZEKALNIA`, `4. KOMPLETACJA / OFERTA`, `5. WNIOSKI / DECYZJA`, `6. URUCHOMIENIE / FV` (sześć, nie dziewięć — lejka nie przebudowywano).
- Karta sprawy zawiera 7 sekcji kontrolnych: kontakt i opis sprawy, następny krok i termin, analiza i rekomendacja, banki i warianty, kompletacja dokumentów, uruchomienie produktu, faktura i rozliczenie.
- WhatsApp zastępczo: komponent `WhatsAppAction` (otwiera rozmowę z numerem klienta) — 4 miejsca na karcie sprawy.
- E-mail zastępczo: `mailto:` z adresem kontaktu na karcie sprawy.
- Testy modułów kluczowych (świeży przebieg 31.10.2026): `client-journey.test.ts` + `whatsapp-coexistence-connect.test.tsx` → **26/26 PASS**, 2 pliki.
- Wysyłka e-mail przez API: **brak** — token Google ma tylko `drive.readonly`, `documents.readonly` (brak Gmaila), więc działa wyłącznie wariant `mailto:`.

### 18. K2 — domknięcie bez Meta (31.10.2026)
**PASS TECHNICZNY (realne przebiegi)**
- **Podpis webhooka działa:** syntetyczny `POST` na `https://test.makson.space/api/whatsapp/webhook` (payload `wamid.TEST-SYNTHETIC-001`, `phone_number_id 1269557046240313`) → **HTTP 401 `{"error":"Invalid signature"}`** — niepodpisane zdarzenie odrzucone, nic nie zapisano. Ścieżka podpisu: `src/lib/whatsapp/webhook-signature.ts`.
- **Testy modułów WhatsApp:** `npx vitest run src/lib/whatsapp src/app/api/whatsapp` → **26 plików / 355 testów PASS**, w tym `route.test.ts` (28 testów) z blokami **„inbound webhook: idempotent insert (#367)”** i **„a replayed delivery is a no-op: no unread bump, no fan-out”** — mapowanie do kontaktu, historia, deduplikacja i odporność na ponowne dostarczenie pokryte testami.
- **Testy lejka i Coexistence UI:** `client-journey.test.ts` + `whatsapp-coexistence-connect.test.tsx` → **26/26 PASS**.
- **Token:** `~/.hermes/meta-token-status.json` → `ok:true`, `identity 122101890999527262 (hermes-mcrm)`, `days_to_expiry: 60`, kontrola dzienna cron 8:00. Zakresy bez zmian (`whatsapp_business_management`, `whatsapp_business_messaging`, `public_profile`).
- **Przycisk WhatsApp (zastępczo):** `src/components/sales/whatsapp-action.tsx` używany w `src/app/(dashboard)/deals/[id]/page.tsx` (4 miejsca) — numer z kontaktu sprawy, otwarcie rozmowy; obok `mailto:` dla e-maila.
- **Szablony:** `GET /2678122512584634/message_templates` → `{"data":[]}` — w Meta nie ma żadnych szablonów; treści „10 szablonów / Stopka B” nie ma też w repo, więc nie tworzyłem nowych (zakaz wymyślania treści).
- **Status sprawy Meta:** sesja przeglądarki Meta **wygasła** (przekierowanie na loginpage) — statusu `1510263704199443` nie potwierdzę bez zalogowania właściciela. Ostatni znany stan: **Otwarte**, korekta przyjęta, brak nowej odpowiedzi.

**GOTOWE DO AKTYWACJI po odblokowaniu Meta (procedura, 7 kroków)**
1. Meta: Business Verification portfela `1670356917366790` — zakończyć wniosek (numer stary `…1700` obejść weryfikacją domeny `makson.space` = **Verified** + e-mail w domenie).
2. Uzyskać status **Tech Provider / BSP** dla aplikacji `1116881471020279` (App Review + Advanced Access dla `whatsapp_business_management`).
3. W aplikacji uruchomić Embedded Signup z `extras.featureType = "whatsapp_business_app_onboarding"`, `sessionInfoVersion: "3"`, `override_default_response_type: true`, Configuration ID `1861133288660318`.
4. Tomasz skanuje QR z telefonu (WhatsApp Business **pozostaje zainstalowany**, historia i czaty zachowane — Coexistence nie migruje numeru).
5. Po zdarzeniu `account_update` / `history` odebrać synchronizację: subskrybowane pola `messages`, `message_echoes`, `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`.
6. Test dwukierunkowy na numerach własnych (nie klientów), następnie sprawdzenie zapisu do kontaktu i historii w CRM.
7. Dopiero potem oznaczyć integrację jako aktywną w dokumentacji; Webhook URL pozostaje `https://test.makson.space/api/whatsapp/webhook`.

**BLOKADA META:** `code 10 — „This action requires that the Business that owns this App is a Business Solution Provider for WhatsApp.”` Numer: `platform_type ON_PREMISE`, `code_verification_status NOT_VERIFIED`, `status DISCONNECTED`, `is_on_biz_app: true`, WABA `business_verification_status: pending_submission`.

**DO WYKONANIA PO ODBLOKOWANIU:** kroki 3–7 powyżej + produkcyjny test dwukierunkowy; brakujący `META_APP_SECRET` w środowisku (potrzebny do weryfikacji podpisu na produkcji — dziś endpoint odrzuca wszystko jako `Invalid signature`).

### 19. Checkpoint K2 — 31.10.2026 (praca w tle, bez przejmowania ekranu)
**`META_APP_SECRET` — ZABLOKOWANE (wymaga jednej czynności właściciela)**
- Sprawdzone lokalnie: brak w `~/wa-coex/.env*` (istnieje tylko wpis w `.env.local.example`), brak w `~/.hermes/*.env`, brak w zmiennych środowiska procesu. Zgodne z wcześniejszym ustaleniem (`CODEX_TASK_WHATSAPP_COEX.md`: „nie istnieje jeszcze w repo ani w hPanel”).
- Nie da się go pobrać przez Graph API (App Secret wymaga tokenu aplikacji, który sam wymaga sekretu — obieg zamknięty).
- Test negatywny wykonany realnie: syntetyczne zdarzenie bez podpisu → **HTTP 401 `{"error":"Invalid signature"}`**. Test pozytywny (poprawnie podpisane zdarzenie → przyjęte) **niewykonalny bez sekretu** — nie zadeklarowany.
- Logika podpisu pokryta testami jednostkowymi: `src/lib/whatsapp/webhook-signature.test.ts` → **7/7 PASS**.
- **Jedna czynność właściciela:** Meta App Dashboard → aplikacja `mCRM AI` (1116881471020279) → Ustawienia → Podstawowe → „App secret” → „Pokaż”, a następnie wpisanie go w Hostinger hPanel jako zmienną `META_APP_SECRET` (bez wysyłania wartości w czacie). Po tym Hermes powtarza test pozytywny.

**10 szablonów + Stopka B — ODNALEZIONE I PRZYGOTOWANE**
- Źródło dosłowne: D1, sekcja `=== 2026-09-10 — FINALNY ZESTAW KRÓTKICH SZABLONÓW + STOPKA B ===` (odczyt D1 przez Drive export, HTTP 200, 376 050 znaków).
- Zapisane bez zmian treści: `docs/whatsapp/approved-templates-2026-09-10.json` — **10/10 identyfikatorów**: `MSG_AFTER_CALL_SOFT_CLOSE`, `MSG_MEETING_CONFIRM`, `MSG_DOCS_MISSING`, `MSG_MEETING_REMINDER`, `MSG_CALL_BACK`, `MSG_FOLLOWUP_NO_REPLY`, `MSG_STATUS_BANK`, `MSG_BANK_DECISION`, `MSG_DATE_SHIFT`, `MSG_DOCS_RECEIVED`.
- **Stopka B** (5 linii, zarządzana centralnie, `[STOPKA_B]` w każdym szablonie), polityka `LINK_SPOTKANIE` (domyślnie profil mFinanse, makson.space po odbiorze strony), lista 17 zmiennych.
- Status rejestracji w Meta: **OCZEKUJE** — `GET /2678122512584634/message_templates` = `[]`; rejestracja oficjalnych szablonów wymaga Tech Provider/BSP.
- Nie podłączono szablonów do UI CRM: pliki współdzielone, nad którymi pracuje K3 — granica zmian do uzgodnienia. Żadnych nowych treści nie napisano.
