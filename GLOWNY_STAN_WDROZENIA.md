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

## 12. BIEŻĄCY NASTĘPNY KROK
Wykonać pełny test trwałości AKTYWNOŚCI 08 na zalogowanej sesji LIVE (zapis → wyjście → ponowne wejście → trwałość), pokazać planszę 08 obok LIVE i dopiero wtedy uznać PASS 08. Następnie kontynuować kolejne ekrany bez czekania na ręczne „dalej”.
