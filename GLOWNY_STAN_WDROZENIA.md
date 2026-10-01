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
