# KM3.2.23 — globalny szkielet Bigin

09.11.2026. **Implementacja lokalna przygotowana; kryterium pełnego zielonego zestawu NIEOSIĄGNIĘTE.** Typecheck: kod 0. Testy powłoki: 12/12. Pełny zestaw: **2146 PASS, 19 FAIL, 1 wcześniejszy SKIP; 2166 łącznie**. Końcowy lokalny build testowy: kod 0, 85/85 stron. Formalny PASS nadaje wyłącznie Tomasz.

## Stan i źródła

- Worktree: `/Users/mcrm-ai/wacrm-a`, początkowo czysty, detached HEAD `f78e9bb260bc57e0f47f3e7ac7a50879da784b4b` — commit KM3.2.22.
- Zadany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem rzeczywistego HEAD. Nie przełączano ani nie cofano gałęzi `k3/bigin-02b-20261105`; zachowano późniejsze prace.
- Kontrakt: aktualne TASK-KM3.2.23, podana przez właściciela paleta zmierzona z Bigin oraz istniejące `layout-geometry.ts`. Nie wykonywano nowego pomiaru demo ani odbioru wizualnego.
- Zastosowano wskazane skills `mcrm-wykonawca`, `k3-screen-delivery` oraz przegląd `vercel:react-best-practices`. Zakaz publikacji i commita z bieżącego zlecenia ma pierwszeństwo przed historycznymi procedurami skills.

## Wykonane zmiany

1. `src/lib/ui/layout-geometry.ts`: eksport `BIGIN_TOKENS` z paletą i `BIGIN_CSS_VARS` wyprowadzony z tego obiektu. Dotychczasowe eksporty kolorów odwołują się do tej samej palety. `biginGeometryCssVars` centralizuje ramę Bigin: panel 285 px dla Lejka, 65 px dla pozostałych, pasek 49 px dla list/Lejka i 56 px dla pozostałych, typografia 14 px i wymiary zwiniętej nawigacji. Historyczny kontrakt `geometryCssVars` pozostał dla istniejących odrębnych konsumentów; AppShell korzysta z nowej funkcji.
2. `src/app/globals.css`: wymagane siedem zmiennych w `:root`, dodatkowe tokeny powierzchni/tekstu i `body { background: var(--bigin-bg) }`. Klasa `bigin-shell` mapuje dotychczasowe nazwy semantyczne na zmienne Bigin. Style ramy przeniesiono z komponentu do tego pliku; kolorami sterują zmienne. Historyczne reguły 02A pozostawiono, a globalny standard ma pierwszeństwo w aktywnym RootLayout.
3. `src/app/layout.tsx`: klasa standardu na `html` i `body`, paleta oraz domyślna geometria na `body` przed hydratacją, także dla tras bez AppShell. Zachowano istniejącą obsługę motywów.
4. `src/components/layout/app-shell.tsx`: usunięto lokalne deklaracje palety i warunkowe bloki CSS, przenosząc je do globalnego standardu. Shell pobiera paletę i geometrię z modułu tokenów. Wszystkie trasy poza Lejkiem, także przyszłe, otrzymują zwiniętą nawigację 65 px bez dopisywania do listy tras. Istniejący wybór banera list pozostaje. Zachowano obsługę logowania, viewportu, nawigacji, heartbeat i flag powierzchni.
5. `src/components/layout/app-shell.test.tsx`: zachowano wcześniejsze przypadki i kompilację klas Tailwind; oczekiwania ramy dostosowano do standardu. Dodano nieznaną trasę oraz kontrole zgodności całej palety CSS z TypeScript i renderu rzeczywistego RootLayout z ekranem bez własnych stylów. Kontrolowane są również odziedziczone tokeny typografii i proporcji kolumn. Bez usuwania przypadków ani dodawania pominięć.

## Wyniki i dowody

| Kontrola | Wynik | Dowód lokalny |
| --- | --- | --- |
| `npm run typecheck` | Kod 0, bez błędów | `/private/tmp/km3-2-23-typecheck-attempt-1.log` |
| `npx vitest run src/components/layout/app-shell.test.tsx` | 12/12, kod 0 | `/private/tmp/km3-2-23-shell-attempt-1.log` |
| `npx vitest run` | 2146 PASS, 19 FAIL, 1 SKIP, 2166 łącznie; 141/142 pliki zielone; kod 1 | `/private/tmp/km3-2-23-vitest-attempt-1.log` |
| Końcowy `npm run build:webpack` | Kod 0; kompilacja, TypeScript, 85/85 stron | `/private/tmp/km3-2-23-build.log` |
| Zgodność źródeł builda z worktree | 560/560 śledzonych plików `src/` identycznych bajtowo | `/private/tmp/km3-2-23-build-source-sha256.json` |
| `git diff --check` | Kod 0 | Terminal sesji |
| Pomiar CSS w Chromium | NIEPRZETESTOWANE: start przeglądarki odrzucony przez sandbox macOS | `/private/tmp/km3-2-23-browser.log` |

Build wykonano w `/private/tmp/km3-2-23-build`, z kopii bieżących śledzonych źródeł, bez plików `.env*`, z istniejącymi zależnościami, syntetycznym adresem `https://synthetic.invalid`, syntetycznym kluczem i lokalnym mockiem fontów `/private/tmp/km3-2-10-font-mock.cjs`. Telemetria wyłączona. Runtime istniejących zależności: Next.js 16.3.6, webpack. Pozostają wcześniejsze ostrzeżenia middleware/Edge Runtime. Nie instalowano ani nie aktualizowano zależności.

Vitest uruchomiono offline, w oczyszczonym środowisku, z istniejącymi atrapami i danymi syntetycznymi. Wcześniejszy warunkowy SKIP w `contact-detail-view.test.tsx` pozostaje bez zmian. Próba pomiaru przeglądarkowego zakończyła się `MachPortRendezvousServer: Permission denied (1100)`; nie ponawiano jej ani nie obchodzono ograniczenia. Wygenerowany render SSR i CSS nie są dowodem pomiaru pikselowego.

## Bloker pełnego zestawu

Wszystkie **19 FAIL** występuje wyłącznie w **`src/lib/ui/surface-flags.test.ts`**, poza zatwierdzonym zakresem pięciu plików:

- 7 przypadków wymaga dawnego panelu 160 px zamiast globalnych 65 px;
- 1 przypadek wymaga literalnych kolorów Lejka inline zamiast odwołań do zmiennych;
- 1 przypadek szuka reguł nagłówka wewnątrz renderowanego HTML zamiast w globalnym CSS;
- 5 przypadków palety wymaga dawnych aliasów inline i białego tła tras;
- 5 przypadków wspólnej ramy szuka stylów nagłówka w HTML i białego tła zamiast globalnego standardu.

Wysłano jedno pytanie o rozszerzenie zakresu o aktualizację tych asercji. **Do chwili sporządzenia raportu brak odpowiedzi; pliku nie zmieniono.** Nie obniżano liczby testów, nie wyłączano ich i nie odtwarzano starych wartości wyłącznie dla zielonego wyniku. Wykonano jeden pełny przebieg zestawu; bez ślepego ponawiania. Następny krok wyłącznie w tej samej paczce: po zgodzie na zakres uaktualnić sprzeczne asercje i ponownie uruchomić pełne kontrole.

## Koszt, checkpoint i granice

- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Bez Codex API, nowych płatnych usług, subagentów i sesji Hermesa. Nie odczytywano salda konta Nous.
- Pasywny pomiar abonamentu Codex przed edycją, 09.11.2026 **11:52:24 CET**: użycie 5 h **58%**, tydzień **24%**. Po buildzie, **11:59:03 CET**: **65% / 25%**. Plan Plus, brak dodatkowych kredytów. Źródło obu pomiarów: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T11-51-33-01a1bfef-4b49-7222-8d8f-449552389e8e.jsonl`; zapisane wyłącznie metadane limitów w `/private/tmp/km3-2-23-limits-before.json` i `km3-2-23-limits-after.json`. To wskazania okien abonamentu, nie precyzyjny koszt paczki. Reset 5 h: 09.11 14:09 CET; tygodnia: 13.11 10:24 CET.
- Checkpoint paczki stanowią lokalny diff pięciu plików, niniejszy raport i manifest źródeł builda. Wpisu `~/.hermes/cache/k3/CHECKPOINT-*.md` nie wykonano: katalog jest poza dozwolonym zapisem sandboxa, eskalacja jest wyłączona. Skill `k3-screen-delivery`, sekcja „Styl odpowiedzi dla właściciela”, przewiduje pozostawienie notatki przez Codexa w raporcie repo i późniejszy zapis właściwego checkpointu przez uprawnionego Hermesa.
- Bez edycji plików bankowych, bazy, sekretów, `.env`, zależności i flag. Pełny zestaw uruchomił istniejące testy, również bankowe; nie zmieniano ich plików ani danych produkcyjnych.
- Bez commita, pusha, serwera i publikacji. **Lokalny build testowy nie jest wdrożeniem na serwerze TEST ani odbiorem LIVE.**
