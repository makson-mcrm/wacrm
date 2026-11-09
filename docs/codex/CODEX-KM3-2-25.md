# KM3.2.25 — stałe wymiary szkieletu i usunięcie banera demo

09.11.2026, 13:48–13:57 CET. **NIE PASS całej paczki: typecheck i lokalny build przeszły, testy szkieletu 20/20; pełny zestaw 2153 PASS / 27 FAIL / 1 wcześniejszy SKIP (2181).** Formalny odbiór należy wyłącznie do Tomasza.

## Stan bazowy i zakres

- Repo `/Users/mcrm-ai/wacrm-a`, czysty start na detached HEAD `a74345fc570dc88481774fb531f539045f655b45`, zgodnym ze wskazanym worktree. Zadany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem HEAD; nie przełączano ani nie cofano gałęzi `k3/bigin-02b-20261105`.
- Źródło: TASK-KM3.2.25, istniejąca implementacja i raporty KM3.2.23–24. Zastosowano `mcrm-wykonawca` i `k3-screen-delivery`; bieżący zakaz commita, pusha i publikacji ma pierwszeństwo przed ich historycznymi procedurami.
- Zmieniono sześć wskazanych plików oraz niniejszy wymagany raport. Bez zmian ekranów, szerokości kolumn Lejka, plików bankowych, flag funkcji, bazy, sekretów, `.env` i zależności.

## Wykonana zmiana

1. `layout-geometry.ts`: jedno źródło `SIDEBAR_WIDTH=285`, `SIDEBAR_WIDTH_COLLAPSED=65`, `TOPBAR_HEIGHT=56`, `TOPBAR_HEIGHT_LIST=49`. `SHELL_CSS_VARS` zawiera szerokości, wysokość paska i `--list-banner-height:0px`. Alias `--app-header-height:var(--app-topbar-height)` zachowuje istniejących konsumentów. Historyczna wartość 49 px pozostaje pomiarem referencyjnym; wszystkie trasy używają 56 px.
2. `layout.tsx`: zmienne szkieletu i globalna paleta są ustawiane raz inline na `<html>`. Obie funkcje geometrii zwracają wyłącznie geometrię treści, bez nadpisywania wymiarów szkieletu lub odstępu banera. Typ zabrania dodawania takich nadpisań do `GeometryCssVars`.
3. `app-shell.tsx`: usunięto element `list-banner` i powiązany padding. Kontener wymusza na rzeczywistym Header klasę wysokości `h-[var(--app-topbar-height)]`. CSS ustawia również min/max wysokości, brak zawijania i zerowy pionowy padding, na wszystkich breakpointach. Wyszukiwarka mieści się w tym samym wierszu.
4. `sidebar.tsx`: panel używa wyłącznie `w-[var(--app-sidebar-width)]`, opcjonalny wariant `collapsed` — `w-[var(--app-sidebar-width-collapsed)]`; bez lokalnych szerokości i nadpisania desktopowego. Nie dodawano nowego przycisku zwijania.
5. `globals.css`: usunięto `--brand-info`; menu, przyciski nagłówka i nawigacja mobilna korzystają z `--bigin-panel`, `--bigin-accent`, `--bigin-panel-text`. Globalne reguły obejmują również zielony wcześniej przycisk dodawania na mobile. Reguły przycisków nagłówka nie obejmują linków wyników wyszukiwania.
6. `app-shell.test.tsx`: renderuje rzeczywisty RootLayout z AppShell. Sprawdza identyczne zmienne na `/pipelines`, `/contacts`, `/companies`, `/dashboard`, `/calendar`, `/quick-call` i dodatkowych trasach, w tym przyszłej trasie syntetycznej; pojedynczą definicję na `<html>`, brak banera w drzewie i źródle, obie szerokości panelu, brak nadpisań w geometrii oraz paletę i stałą wysokość w CSS. Zachowano testy wymiarów kolumn Lejka. Liczba przypadków szkieletu wzrosła z 12 do 20.

## Weryfikacja

| Kontrola | Wynik | Dowód lokalny |
| --- | --- | --- |
| `npm run typecheck`, końcowa próba 2 | Kod 0 | `/private/tmp/km3-2-25-typecheck-attempt-2.log` |
| `npx --no-install vitest run`, próba 1 | 2152 PASS / 27 FAIL / 1 SKIP (2180), kod 1 | `/private/tmp/km3-2-25-vitest-attempt-1.log` |
| Pełny Vitest, końcowa próba 2 | 2153 PASS / 27 FAIL / 1 SKIP (2181), 140/142 pliki zielone, kod 1 | `/private/tmp/km3-2-25-vitest-attempt-2.log` |
| `app-shell.test.tsx`, końcowy pełny przebieg | 20/20 PASS | Ten sam log |
| `npm run build:webpack`, końcowy lokalny build | Kod 0, kompilacja, TypeScript, 85/85 stron | `/private/tmp/km3-2-25-build-final.log` |
| Źródła buildu zgodne z końcowym worktree | 560/560 plików `src/`, potwierdzone po buildzie | `/private/tmp/km3-2-25-build-source-sha256.json` |
| Zakres, brak banera i `--brand-info`, `git diff --check` | Potwierdzone | Odczyt źródeł i terminal sesji |

Pierwszy typecheck wykrył odczyt usuniętego klucza przez dawny test. Typ geometrii doprecyzowano tak, aby odczyt zwracał `undefined`, a przypisanie wymiarów szkieletu było zabronione. Druga próba przeszła. Pełny Vitest wykonano dwukrotnie: drugi przebieg obejmuje końcową korektę palety i dodatkowy test nawigacji. Dalej nie ponawiano tej metody.

Build końcowy: `/private/tmp/km3-2-25-build`, BUILD_ID **`72H-a0-YPSzsQ0SPYOImn`**. Pierwszy build również przeszedł; końcowy przebudowuje ostateczne źródła po doprecyzowaniu selektorów palety. Istniejący runtime zależności: Next.js 16.3.6, webpack; bez instalacji lub aktualizacji. Kopia bez `.env*`, syntetyczny Supabase `https://synthetic.invalid`, syntetyczny klucz, lokalna atrapa fontów, wyłączona telemetria. Pozostały wcześniejsze ostrzeżenia middleware/Edge Runtime i webpacka. Testy uruchomiono w oczyszczonym środowisku, na istniejących mockach i danych syntetycznych. Jedyny SKIP to wcześniejszy opcjonalny test przeglądarkowy; nie dodano nowych pominięć. W tej paczce nie wykonano pomiaru pikselowego ani testu LIVE.

## Bloker pełnego zestawu i LIVE

**Wszystkie 27 FAIL występuje w dwóch plikach poza dozwolonym zakresem:**

- `src/lib/ui/layout-geometry.test.ts`: 3 przypadki nadal wymagają lokalnych wymiarów szkieletu i panelu 160 px.
- `src/lib/ui/surface-flags.test.ts`: 24 przypadki nadal wymagają banera, wymiarów 65/49 na wybranych trasach, definicji wymiarów inline na AppShell lub usuniętego `--brand-info` / poprzedniego aliasu tła nagłówka.

To asercje sprzeczne z nowym kontraktem. Oba pliki pozostały identyczne z HEAD, co sprawdzono bajtowo. Wysłano jedno pytanie o dopuszczenie ich aktualizacji; do chwili zamknięcia raportu brak odpowiedzi. Nie przywracano starego zachowania dla zielonych testów i nie osłabiano ani nie pomijano przypadków. Kryterium **0 FAIL i ≥2173 zielonych testów nie jest spełnione**. Następny krok w tej samej paczce: po rozszerzeniu zakresu dostosować oba testy do dziedziczenia z RootLayout.

Adres zastanego środowiska odbioru: [TEST — panel odbioru](https://test.makson.space/review/status.html). **Nie publikowano tej paczki, więc ten adres nie jest dowodem jej działania.** Dostarczono lokalny build testowy; build na serwerze TEST, link do wdrożonej poprawki i odbiór LIVE pozostają niewykonane zgodnie z zakazem publikacji.

## Koszt i checkpoint

- Nowe wywołania Nous: **0**, ich koszt **0 USD**. Bez nowego Codex API, usług, instalacji i subagentów. Salda Nous nie odczytywano.
- Pasywnie odczytane metadane bieżącego przebiegu Codex Plus: pierwsza próbka sesji **13:48:34 CET — 74% użycia 5 h / 26% tygodnia**; próbka po końcowym buildzie **13:56:21 CET — 82% / 28%**. To wskazania okien abonamentu, nie dokładny koszt paczki. Źródło: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T13-48-23-01a1c05a-4491-7053-ac8a-fbd2b8a1b9bf.jsonl`; wyciągi `/private/tmp/km3-2-25-limits-before.json` i `km3-2-25-limits-after.json`. Pierwszy plik wyciągu zapisano przed testami i zawiera późniejszą próbkę 13:51:50 (78% / 27%); próbkę startową odczytano następnie z tego samego rolloutu.
- Checkpoint KM3.2.25: niniejszy raport, lokalny diff sześciu plików `/private/tmp/km3-2-25.patch`, logi i manifest źródeł. SHA256 diffu kodu: `9cfbe71c0b6e7babee36fe1525ec08986f149ec9f2e5bc0c71d7f92c1b085dc4`.
- Zapis `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza dozwolonymi korzeniami zapisu sandboxa; eskalacja jest wyłączona. Zachowano stan w repo zgodnie z sekcją „Checkpoint pisz poza Codexem” skilla `k3-screen-delivery`; nie obchodzono ograniczenia.
- Bez commita, pusha, uruchamiania serwera i publikacji. Stan wymaga domknięcia sprzecznych testów oraz późniejszego odbioru Tomasza.
