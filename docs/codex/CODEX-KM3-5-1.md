# KM3.5.1 — rama Lejka Bigin, desktop i telefon

Status: **STOP / BLOKER — paczka nie spełnia bramki 0 FAIL, bez odbioru wizualnego**.
Zmiany pozostają lokalne i niecommitowane. Nie uruchamiano serwera dev, commita, pusha ani publikacji.

## Źródła i stan wejścia

- Zlecenie: `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md`.
- BASE_SHA produkcji ze zlecenia: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- HEAD worktree: `117eaae6c0f5d6fde18cff28aea5196dee2c6dc7`; drzewo wejściowe czyste.
- Bramka została wykonana przed sesją: wpis `ALLOW_GATE_ONLY` z 09.11.2026 21:10:13 oraz lock `TASK-KM3.5.1.md`. Nie modyfikowano bramki ani jej plików.
- Źródło pomiarów: `/Users/mcrm-ai/.hermes/k3/render/ii1/bigin_measure.json`; obejrzano pełne zrzuty desktop i phone z tego samego katalogu.
- Zastosowano skille `mcrm-wykonawca`, `k3-screen-delivery` i przegląd `react-best-practices`; przeczytano lokalny przewodnik CSS Next.js.

## Zmienione pliki

1. `src/components/layout/app-shell.tsx` — wspólny kompaktowy rail również na Lejku.
2. `src/components/layout/sidebar.tsx` — aria-label i tooltipy ikon; tekst dodatkowych narzędzi w osobnym elemencie pozwala schować etykiety bez usuwania funkcji.
3. `src/components/layout/mobile-bottom-nav.tsx` — istniejąca nawigacja pięciu pozycji i GlobalAdd, kolory z tokenów; zachowano `md:hidden` i safe area.
4. `src/app/(dashboard)/pipelines/page.tsx` — panel wyboru istniejących lejków, wspólna przestrzeń toolbar/tablica, toolbar bez zawijania, filtr wyszukiwania otwierany także skrótem Cmd/Ctrl+K, działające CTA Transakcja z istniejącym formularzem i ograniczeniem roli agent+.
5. `src/components/pipelines/pipeline-board.tsx` — jedna przewijana tablica dla wszystkich szerokości, stałe kolumny 230 px, padding 5 px; usunięto osobną prezentację wybranego etapu na telefonie. Zachowano grupowanie i sumy, linki, obsługę drag & drop, nakładkę i przyciski dodatków pod flagą.
6. `src/components/pipelines/deal-card.tsx` — obramowanie i tekst z tokenów, kompaktowy kontener. Zachowano dane, kontakt, datę, link oraz akcje flagi.
7. `src/lib/ui/layout-geometry.ts` — stałe zmierzonego raila, paska, panelu potoków, kolumn, kart i toolbara.
8. `src/lib/ui/layout-geometry.test.ts` — asercje 64/48/230/220/115 i telefonu 43/63; rozkład szerokości panelu potoków.
9. `src/components/pipelines/pipeline-board.test.tsx` — plik wskazany w sekcji TEST zlecenia; wspólna tablica na 390, 767, 768, 1024, 1366 i 1536 px, sześć etapów, brak regresu flag undefined/false/true, test reguł CSS i kolejności narzędzi. Nie usunięto testów funkcji dodatków.
10. `src/app/globals.css` — rail, pełny pasek Lejka, panel potoków, zerowe dodatkowe marginesy, wysokości toolbara i przycisków, reguły telefonu, przewijanie kolumn i dostępność dodatków po włączeniu flagi.
11. `docs/codex/CODEX-KM3-5-1.md` — ten raport i checkpoint w repozytorium.

Model danych, zapytania Supabase, trasy API, formularz deala, plik flag, sekrety, `.env` i zależności pozostały bez zmian.

## Stałe ze wzorca i geometria deklarowana w kodzie

| Element | Desktop 1536/1366 | Telefon 390 |
| --- | --- | --- |
| Pasek | 48 px | 43 px |
| Rail | 64 px | 63 px |
| Panel potoków | 221 px | 199 px |
| Inset tablicy | 10 px | 10 px |
| Początek kolumny x | 64 + 221 + 10 = 295 | 63 + 199 + 10 = 272 |
| Początek tablicy y | 48 + 67 = 115 | 43 + 72 = 115 |
| Kolumna / padding / karta | 230 / 5 / 220 px | 230 / 5 / 220 px |
| Odstęp między kontenerami kolumn | 0 px (krok 230 px) | 0 px |
| Przyciski toolbara | 32 px | 29 px |
| Dolna nawigacja mobilna | ukryta od 768 px | widoczna do 767 px |

Kolory: `#093E53`, `#F9FBFC`, `#FCFDFD`, `#E0E9EE`, `#0B4A63`; font aplikacji pozostaje Inter.
221/199 px panelu potoków wynika z granic raila, x kolumny i insetu, potwierdzonych obrazem wzorca. To nie jest rozwinięty rail 285 px. Sześć etapów pochodzi z dotychczasowego filtrowania danych strony; nie dodano Archiwum.

Powyższa tabela opisuje wartości źródłowe i deklaracje CSS. **Nie jest pomiarem DOM nowego mCRM.**

## Weryfikacja i kody wyjścia

| Komenda / sprawdzenie | Wynik | Log |
| --- | --- | --- |
| `npm run typecheck` po poprawkach TS | **RC=0**, 0 błędów | `/tmp/km3-5-1-typecheck.log` |
| Pierwszy test dwóch plików zakresu | RC=0, 23 PASS | `/tmp/km3-5-1-focused.log` |
| `npx vitest run`, końcowy przebieg | **RC=1**, 2145 PASS / **98 FAIL** / 1 istniejący skipped; **2244 testy**, 142 pliki | `/tmp/km3-5-1-vitest-final.log` |
| Pierwszy pełny przebieg | RC=1, również 98 FAIL; zawierał tymczasowy test renderu | `/tmp/km3-5-1-vitest.log` |
| Statyczny render pełnego AppShell z załadowaną stroną i fixture'ami | RC=0, markup i rzeczywisty CSS Tailwind utworzone lokalnie | `/tmp/km3-5-1-render/index.html`, `/tmp/km3-5-1-render/app.css`, `/tmp/km3-5-1-render.log` |
| `git diff --check` | RC=0 | odczyt terminala |

Oba docelowe pliki `layout-geometry.test.ts` i `pipeline-board.test.tsx` przeszły również w końcowym pełnym przebiegu (łącznie 24 przypadki). Liczba testów nie spadła poniżej 2240. Tymczasowy test renderu oraz skrypt kompilacji CSS zostały usunięte z repo przed końcowym przebiegiem.

Pierwszy typecheck zgłosił nieistniejący klucz uprawnienia oraz etykietę w typie pozycji ustawień; oba błędy usunięto. Finalne uprawnienie wykorzystuje istniejącą zdolność `send-messages` (agent+).
Ostatnia zmiana po pełnym przebiegu dotyczyła wyłącznie selektora ukrywającego zbędny hamburger w stałym railu także poza Lejkiem; nie wykonano trzeciego pełnego przebiegu zgodnie z limitem dwóch prób.

## Bloker testów — pięć plików poza zamkniętym zakresem

Pozostawiono bez zmian:

| Plik | FAIL | Przyczyna |
| --- | --- | --- |
| `src/app/(dashboard)/pipelines/page.test.tsx` | 69 | Helper szuka `pipeline-scroll hidden`, dzieli markup na osobny desktop/mobile; asercje wymagają pojedynczego etapu, starych szerokości, powierzchni i klasy `min-h-full`. |
| `src/components/layout/app-shell.test.tsx` | 13 | Wymaga raila 285 px, kolumn 220 px i gap 10 px. |
| `src/lib/ui/surface-flags.test.ts` | 14 | Wymaga dawnych wartości 285/220/10 w ramie i tokenach. |
| `src/lib/mcrm/pipeline-ux.test.ts` | 1 | Wymaga selektora etapów i renderowania tylko wybranego etapu na mobile. |
| `src/lib/mcrm/ux-checklist-2026-09-18.test.ts` | 1 | Wymaga tej samej usuwanej mobilnej prezentacji. |

Nie zmieniano tych pięciu plików bez rozszerzenia listy zakresu. Wysłano pytanie o objęcie ich aktualizacją wyłącznie asercji układu, bez usuwania testów sum, kart, flag, filtrów i drag & drop. **Brak odpowiedzi nie jest zgodą.**
Po dwóch pełnych przebiegach z tym samym konfliktem obowiązuje STOP z kontraktu. Nie ma podstaw do statusu zielonych testów ani PASS.

## Pomiar przeglądarkowy i Visual Diff

- Połączenie Playwright z CDP `127.0.0.1:9400` zablokowane przez sandbox: `connect EPERM`.
- Alternatywny lokalny headless: domyślna wersja binarki Playwright nie istnieje; druga i ostatnia próba z istniejącą binarką kończy się `MachPortRendezvousServer … Permission denied (1100)`.
- Zatrzymano próby uruchamiania przeglądarki. Nie instalowano pakietów, nie uruchamiano dev servera i nie obchodzono sandboxa.
- **Visual Diff ramy: NIEZMIERZONY. Visual Diff całej strony: NIEZMIERZONY.** Brak nowych zrzutów desktop/laptop/mobile. Nie przekazano linku do odbioru.
- Statyczny markup używa syntetycznych danych oraz atrap usług pomocniczych; nie potwierdza interakcji, zapisu, touch scroll ani drag & drop w przeglądarce.

## Ryzyka i dalszy krok

1. Kontrakt wymaga 0 FAIL, a starsze asercje poza zakresem wymagają układu sprzecznego z KM3.5.1. Potrzebna korekta zakresu testów przez kierownika i ich aktualizacja bez utraty pokrycia funkcji.
2. Geometria wspólnego raila dotyczy także pozostałych ekranów; ich wizualna regresja nie została zmierzona.
3. Toolbar zachowuje jeden rząd, a przy wąskim widoku przewija się poziomo; dotyk, menu, wyszukiwanie i formularz wymagają sprawdzenia w działającej przeglądarce.
4. Render statyczny nie dowodzi zgodności 1:1, szczególnie zawartości panelu potoków, typografii, wysokości kart i pozycji ich wewnętrznego paddingu względem screenshotu Bigin.
5. Brak publikacji wynika z jawnego zakazu zlecenia; środowisko TEST nie zawiera tych niecommitowanych zmian. Odbiór wizualny pozostaje niewykonany.
6. Checkpoint w `~/.hermes/cache/k3/` i zwolnienie locka pozostają czynnościami Hermesa po odbiorze diffu; sandbox nie ma tam prawa zapisu. Niniejszy plik jest checkpointem w repo.

## Koszt i limity

- Kodowanie w jednej bieżącej sesji Codexa; brak płatnych wywołań Nous/API z tej paczki.
- Pasywny odczyt na początku: 5 h użyte 1%, tydzień 37%; pod koniec: 5 h użyte 13% (87% zapasu), tydzień 39% (61% zapasu), z resetami 10.11 02:10 i 13.11 10:24.
- Źródło: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T21-10-19-01a1c1ee-dd61-75a1-bc07-47ba68987435.jsonl`, odczyt `codex-limity.sh` 09.11 około 21:20.
- `hermes usage --provider nous --json`: RC=1, blokada zapisu `.prepare.lock` w katalogu instalacji. Saldo Nous pozostaje niezweryfikowane; nie uruchamiano płatnego modelu w celu jego odczytu.
