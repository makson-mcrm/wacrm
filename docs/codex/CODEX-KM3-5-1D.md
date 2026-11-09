# KM3.5.1D — responsywność wspólnej ramy po pomiarze LIVE

Data: 09.11.2026. Kontynuacja **tej samej paczki KM3.5.1**, zgodnie z bieżącym poleceniem właściciela. Status techniczny: **typecheck RC=0; pełny Vitest RC=0, 0 FAIL**. To nie jest PASS wizualny.

## Stan wejścia i źródła

- Worktree: `/Users/mcrm-ai/wacrm-a`, detached HEAD `2531f00d34a780e1c91e9c658f7365e975c4ac5a`; drzewo wejściowe czyste.
- Kontrakt: `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md`, jego rozszerzenie i bieżąca korekta właściciela. Nie tworzono nowej paczki.
- BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, zgodny z odczytanym `prod-build.json`.
- Istniejący lock wskazuje `TASK-KM3.5.1.md` od 21:10:13; ostatni zapis bramki dla tego kontraktu to `ALLOW_GATE_ONLY` z 21:29:28. Nie zmieniano locka ani zlecenia poza worktree, nie uruchamiano kolejnego Codexa.
- Wzorzec: pomiar LIVE Bigin przekazany w poleceniu: 1536 px → pasek/rail 48/64; 1280, 1024, 900, 768, 640, 390 px → 43/63; rail zawsze widoczny; poziomy scroll kontenera kolumn, bez scrolla dokumentu. Podane `scrollWidth=1427` dotyczy pomiaru wzorca, nie nowego pomiaru mCRM.
- Zastosowano wskazane w kontrakcie skille `mcrm-wykonawca` i `k3-screen-delivery`, z nadrzędnością aktualnego AGENTS.md oraz polecenia właściciela. Przeczytano lokalny przewodnik Next.js `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.

## Przyczyna i naprawa

1. **Dwa progi były utożsamione.** Wymiary 43/63 ustawiała reguła telefonu `max-width: 767px`. Wspólna rama stosuje je teraz przy **max-width: 1280px**, z osobną stałą `COMPACT_SHELL_MAX_WIDTH=1280`. Próg dolnej nawigacji pozostaje 768 px. Nazwy istniejących tokenów `--app-mobile-*` zachowano dla zgodności.
2. **Sidebar nadal zawierał mechanizm drawer.** Poniżej `lg` dostawał `fixed` i `-translate-x-full`. Tailwind generuje przesunięcie przez osobną właściwość CSS `translate`; późniejsze `transform: none` nie usuwało go. Usunięto stan otwierania, backdrop, hamburger, przycisk zamknięcia i efekty blokowania scrolla dokumentu. Rail jest stale obecnym, niekurczącym się elementem flex, więc treść zajmuje pozostałą szerokość. Wspólna reguła jawnie zeruje także `translate`.
3. **Scroll był również na toolbarze.** Usunięto jego `overflow-x-auto`. Przy ≤1280 px trzy filtry widoku/właściciela/sortowania są dostępne w istniejącym menu filtrów, w panelu ograniczonym do szerokości viewportu. Oba warianty używają tego samego zestawu kontrolek i istniejących wartości/handlerów. „Więcej” i „Transakcja” zwijają etykiety do ikon, zachowując nazwy dostępności, uprawnienia i akcje. Szeroki toolbar zachowuje dotychczasowe filtry w rzędzie.
4. **Ograniczono łańcuch szerokości.** Shell ma `width:100%` i `min-width:0`; workspace i obszar treści mają `min-width:0` oraz `overflow:hidden`. Poziome `overflow-x:auto` jest na `.pipeline-scroll`; kolumny nadal mają stałe 230 px, karty 220 px. Nie maskowano problemu globalnym `body { overflow-x:hidden }`.
5. **Nagłówek kompaktowy.** Etykiety logo/konta/przycisku dodawania ustępują ikonom; menu konta i dodawania pozostają dostępne także na telefonie, wyszukiwarka zajmuje wolne miejsce. Wysokość kontrolek wynosi 29 px. Zmiany te są ograniczone do ≤1280 px.
6. **Dziedziczenie geometrii Lejka.** Toolbar ma 72 px przy kompaktowym pasku 43 px, aby zachować start tablicy y=115. Nadpisania pozostają na workspace poniżej inline tokenów shellu. Panel potoków nadal ma 199 px tylko poniżej 768 px; poza telefonem zachowuje 221 px.

## Tabela progów

Wartości mCRM poniżej są potwierdzone deklaracjami CSS, renderem statycznym i testami kaskady; **nie są pomiarem DOM po wdrożeniu**. Pozycja x dotyczy początku kolumn przy przewinięciu tablicy do początku.

| Szerokość okna | Bigin pasek/rail — przekazany pomiar | mCRM pasek/rail — po korekcie | Panel potoków | Toolbar / przyciski | Kolumny x / y | Dolna nawigacja |
| --- | --- | --- | --- | --- | --- | --- |
| 1536 px | 48 / 64 px | 48 / 64 px | 221 px | 67 / 32 px | 295 / 115 px | ukryta |
| 1366 px | nie podano w tym poleceniu | 48 / 64 px | 221 px | 67 / 32 px | 295 / 115 px | ukryta |
| 1281 px | nie podano | 48 / 64 px | 221 px | 67 / 32 px | 295 / 115 px | ukryta |
| 1280 px | 43 / 63 px | 43 / 63 px | 221 px | 72 / 29 px | 294 / 115 px | ukryta |
| 1024 px | 43 / 63 px | 43 / 63 px | 221 px | 72 / 29 px | 294 / 115 px | ukryta |
| 900 px | 43 / 63 px | 43 / 63 px | 221 px | 72 / 29 px | 294 / 115 px | ukryta |
| 768 px | 43 / 63 px | 43 / 63 px | 221 px | 72 / 29 px | 294 / 115 px | ukryta |
| 767 px | nie podano | 43 / 63 px | 199 px | 72 / 29 px | 272 / 115 px | widoczna |
| 640 px | 43 / 63 px | 43 / 63 px | 199 px | 72 / 29 px | 272 / 115 px | widoczna |
| 390 px | 43 / 63 px | 43 / 63 px | 199 px | 72 / 29 px | 272 / 115 px | widoczna |

Rail pozostaje w układzie na wszystkich tych szerokościach. Dodatkowo testy obejmują 1023 px, aby wykryć powrót off-canvas na dawnej granicy `lg`. Docelowe `pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth` wynosi **0**; jego faktyczna wartość po wdrożeniu pozostaje **niezmierzona**.

## Zmienione pliki

- `src/components/layout/sidebar.tsx` — usunięcie mechanizmu off-canvas, stały rail.
- `src/components/layout/app-shell.tsx` — usunięcie stanu drawer i jego połączenia z nagłówkiem.
- `src/components/layout/header.tsx` — usunięcie hamburgera, selektory kompaktowych kontrolek.
- `src/app/globals.css` — progi, reset `translate`, szerokości kontenerów, kompaktowe menu i brak poziomego scrolla toolbara.
- `src/lib/ui/layout-geometry.ts` — jawny próg kompaktowej ramy 1280 px, niezależny od dolnej nawigacji.
- `src/app/(dashboard)/pipelines/page.tsx` — wspólne kontrolowane filtry w wariancie szerokim i kompaktowym; ikony z nazwami dostępności.
- `src/components/layout/app-shell.test.tsx` — macierz 4 tras × 11 szerokości; kontrola obecności raila, braku przesunięć i drawer, wymiarów, ograniczeń szerokości i kompaktowych menu. Dotychczasowa asercja wysokości nadal zabrania responsywnych nadpisań wysokości i zawijania; dopuszcza wyłącznie konkretnie sprawdzone odstępy.
- `src/components/pipelines/pipeline-board.test.tsx` — rozdzielone progi ramy/panelu, kontrola x/y oraz tokenów poniżej inline shellu.
- `src/lib/ui/layout-geometry.test.ts` — niezależne progi 1280 i 768 px.
- `docs/codex/CODEX-KM3-5-1D.md` — raport i checkpoint w repo.

Nie zmieniono danych, zapytań, API, flag ani formularzy. `mobile-bottom-nav.tsx`, `surface-flags.ts` i `deal-form.tsx` są identyczne z HEAD. Wymiary desktopu 1536 px pozostają 48/64, panel 221, kolumny x=295/y=115; kompaktowe style nie obowiązują przy tej szerokości.

## Testy i dowody techniczne

| Komenda | RC | Wynik |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów; `/tmp/km3-5-1d-typecheck.log` |
| `npx vitest run` | **0** | **2309 PASS / 0 FAIL / 1 istniejący skip (2310)**; 142 pliki, 24,73 s; `/tmp/km3-5-1d-vitest.log` |
| `git diff --check` | **0** | brak błędów whitespace |
| `git diff --exit-code HEAD -- src/components/layout/mobile-bottom-nav.tsx src/lib/ui/surface-flags.ts src/components/pipelines/deal-form.tsx` | **0** | brak zmian w tych plikach |

Zachowano istniejące przypadki i asercje funkcji; przybyło **59 przypadków** względem 2251 z KM3.5.1C. Pełny zestaw nadal sprawdza karty, sumy, filtrowanie, sortowanie, drag & drop, uprawnienia i dodatki pod flagami. Testy shellu obejmują również kompilację klas rzeczywistych komponentów przez Tailwind.

Przed pełnym przebiegiem test zakresu miał 186 PASS / 1 FAIL: stara asercja wymagała, aby każda reguła selektora nagłówka była poza media query. Doprecyzowano test geometrii o dokładne dozwolone odstępy kompaktowe, zachowując kontrolę stałej wysokości i `nowrap`. Log: `/tmp/km3-5-1d-targeted.log`. Oba przebiegi typecheck miały RC=0. Końcowy pełny Vitest nie miał porażek.

## Granice dowodu i odbiór

**Pomiar DOM na TEST po tej zmianie: niewykonany. Visual Diff ramy: NIEZMIERZONY.** Testy statyczne nie potwierdzają faktycznego `pageOverflow=0`, przewijania dotykiem ani wizualnej zgodności menu 1:1. Nie ponawiano metod przeglądarkowych zablokowanych w tej paczce: CDP `connect EPERM`, lokalny headless `MachPortRendezvousServer … Permission denied (1100)` — szczegóły w `CODEX-KM3-5-1.md`.

Zmiany pozostają lokalne, niecommitowane; nie wykonywano pusha, publikacji, builda Hostingera ani serwera dev, zgodnie z kontraktem tej paczki. Po wdrożeniu kierownik powinien zmierzyć ramę i `pageOverflow` przy szerokościach z tabeli, sprawdzić menu filtrów/konta/dodawania i policzyć Visual Diff. PASS wizualny nadal należy wyłącznie do Tomasza. Nie podano linku odbioru bez nowego pomiaru.

## Limity i koszt

Pasywny odczyt `bash …/mcrm-wykonawca/scripts/codex-limity.sh`: RC=0, zapisane **74% zapasu okna 5 h / 59% tygodnia**, kredyty dodatkowe 0. Źródło: `rollout-2026-11-09T22-24-54-01a1c233-2769-77f3-83d3-18281f072d26.jsonl` — odczyt zapisanej sesji, nie gwarancja aktualnego limitu. Bezpośrednie uruchomienie pliku skryptu nie miało prawa wykonania; uruchomienie przez Bash działało.

`hermes usage --provider nous --json`: RC=1, instalacja nie może zapisać `.prepare.lock` poza worktree. Nie zmieniano uprawnień; saldo Nous niezweryfikowane. Nie wywoływano płatnego modelu Nous ani płatnego API do wykonania tej poprawki. Kod i testy wykonano w bieżącej sesji Codexa.
