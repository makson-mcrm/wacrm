# KM3.2.26 — testy globalnego szkieletu i tokeny nawigacji

09.11.2026, 13:59–14:05 CET. **DZIAŁA CZĘŚCIOWO — NIE PASS całej paczki.** Typecheck i lokalny build testowy: kod 0. Pełny zestaw: **2208 PASS / 3 FAIL / 1 wcześniejszy SKIP (2212)**. Formalny PASS nadaje wyłącznie Tomasz.

## NAPRAWIONE

- Start: czysty detached HEAD `1a73f7b14bcd426174c46b733c8d9abdc5652c98`, rzeczywisty stan po KM3.2.25. Zadany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem; nie cofano worktree ani nie przełączano gałęzi `k3/bigin-02b-20261105`, przypisanej do innego worktree.
- Zastosowano skill `mcrm-wykonawca`, bieżący TASK-KM3.2.26 i istniejące tokeny. Jawny zakres i zakaz publikacji z TASK mają pierwszeństwo przed historycznymi procedurami skilla.
- `sidebar.tsx`: wszystkie kolory nawigacji, logo, odznak, ról i stopki korzystają z `--bigin-panel`, `--bigin-accent`, `--bigin-panel-text`, `--bigin-border`; usunięto lokalne `text-white`, kolory amber i pośrednie klasy kolorów. Wysokość logo korzysta z `--app-topbar-height`. Szerokości i zachowanie menu zachowane.
- `surface-flags.test.ts`: wszystkie wcześniejsze przypadki zachowane. Zamiast wymagania lokalnych wymiarów renderowany jest rzeczywisty RootLayout, z kontrolą pojedynczej definicji `SHELL_CSS_VARS` i `BIGIN_CSS_VARS` na `<html>` oraz braku ich nadpisania w AppShell. Zachowano asercje geometrii treści, kart, kolumn i flag rozszerzeń. Nowe asercje sprawdzają brak banera i usuniętego `--brand-info`, aktualny alias tła nagłówka oraz wartości CSS `--bigin-panel: #093e52` i `--bigin-bg: #f9fbfc`.
- Dodano **26 osobnych przypadków — po jednym na każdy ekran `page.tsx` w dashboardzie** — zakazujących własnej definicji szerokości panelu i wysokości nagłówka/paska. Lista jest odkrywana rekurencyjnie, z kontrolą obecności głównych ekranów. Pliki ekranów nie były edytowane.
- RootLayout nie zawiera literalnych nazw czterech zmiennych, bo importuje ich mapy z `layout-geometry.ts`. Test sprawdza użycie map w źródle i faktyczne nazwy/wartości w renderowanym `<html>`; nie duplikuje definicji w `layout.tsx`.
- `app-shell.test.tsx`: zachowano wcześniejsze asercje, dodano kontrolę canonical `--app-topbar-height`, braku emerald/ring-white w shellu i sidebarze oraz tokenów panelu przy obu stanach zwinięcia. Header nadal używa globalnego aliasu `--app-header-height`; test sprawdza też nadrzędne wymuszenie `--app-topbar-height` i wynik kompilacji klas Tailwind.
- `app-shell.tsx` już w stanie bazowym nie zawierał emerald ani ring-white. Mobilne logo i paski są osobnymi importowanymi komponentami, więc plik pozostał bez zmian. Nie przenoszono ich implementacji do shellu w celu obejścia zakresu.

## PRZETESTOWANE

| Kontrola | Wynik | Dowód lokalny |
| --- | --- | --- |
| `npm run typecheck`, próba 1 | Kod 2: typ `readdirSync` obejmował Buffer | `/private/tmp/km3-2-26-typecheck-attempt-1.log` |
| `npm run typecheck`, próba 2 | **Kod 0** po jawnym `encoding: 'utf8'` | `/private/tmp/km3-2-26-typecheck-attempt-2.log` |
| `npx --no-install vitest run`, próba 1 | 2208 PASS / 3 FAIL / 1 SKIP, kod 1 | `/private/tmp/km3-2-26-vitest-attempt-1.log` |
| Pełny Vitest, końcowa próba 2 | **2208 PASS / 3 FAIL / 1 SKIP**, 141/142 pliki zielone, kod 1 | `/private/tmp/km3-2-26-vitest-attempt-2.log` |
| Zmienione testy powierzchni / szkieletu | **137/137 oraz 23/23 PASS** | Ten sam końcowy log |
| `npm run build:webpack` — lokalny TEST | **Kod 0**, TypeScript i 85/85 stron | `/private/tmp/km3-2-26-build.log` |
| Źródła lokalnego buildu | **560/560 plików src zgodnych z worktree**, potwierdzone po buildzie | `/private/tmp/km3-2-26-build-source-sha256.json` |
| `git diff --check` | Kod 0 | Terminal sesji |
| Brak emerald/ring-white w shellu i sidebarze | Potwierdzony w źródle i testach | `app-shell.test.tsx` |

Obie zmienione grupy testów są zielone. Wszystkie 24 wcześniejsze błędy `surface-flags` z KM3.2.25 usunięto przez dostosowanie kontraktu, bez pomijania przypadków. Dodano 31 przypadków; liczba wszystkich testów wzrosła z 2181 do 2212. Jedyny SKIP pochodzi z wcześniejszego opcjonalnego testu przeglądarkowego; nie dodano skip, todo ani pozornych asercji.

Build: `/private/tmp/km3-2-26-build`, BUILD_ID **NJ903L_iZ_liGqvYT_ZfR**. Istniejące zależności: Next.js 16.3.6 / webpack. Bez instalacji i aktualizacji. Kopia bez `.env*`, środowisko oczyszczone, syntetyczny Supabase `https://synthetic.invalid`, syntetyczne wartości kluczy i lokalna atrapa fontów; telemetria wyłączona. Pozostały wcześniejsze ostrzeżenia middleware/Edge Runtime, webpack oraz ostrzeżenia React w testach. Nie uruchamiano serwera ani testu na rzeczywistych danych.

## NIEODEBRANE

- Kryterium **0 FAIL** nie zostało spełnione. Zielonych testów jest więcej niż wymagane 2173, ale pozostałe 3 FAIL blokują całość.
- Nie usunięto emerald z faktycznych wydzielonych komponentów mobilnych, ponieważ nie znajdują się na liście plików do zmiany.
- Zastany [TEST — panel odbioru](https://test.makson.space/review/status.html) **nie zawiera tej nieopublikowanej paczki i nie stanowi dowodu jej działania**. Wykonano lokalny build testowy. Brak nowego linku LIVE do poprawki wynika z jawnego zakazu publikacji; nie oznaczano starego LIVE jako nowego rezultatu.
- Bez zmian Lejka, logiki ekranów, banków/KM4, flag funkcji, bazy, sekretów, `.env`, zależności i metadanych Git. Bez commita, pusha, publikacji ani operacji na rekordach CRM.

## BLOKADA

Rozbieżność listy plików z rzeczywistym rozmieszczeniem kodu:

1. `src/components/layout/header.tsx`: mobilne logo `bg-emerald-800` i przycisk `hover:bg-emerald-50`.
2. `src/components/layout/mobile-bottom-nav.tsx`: `border-emerald-950/10`, `text-emerald-950`, `bg-emerald-50` oraz kolory white/slate.
3. `src/components/layout/global-add.tsx`: mobilny przycisk `text-emerald-900`, `bg-emerald-700`, `ring-white`.
4. `src/lib/ui/layout-geometry.test.ts`: **3/3 FAIL**, nadal oczekuje panelu 160 px i wymiarów definiowanych lokalnie przez `geometryCssVars()`.

Wszystkie cztery pliki potwierdzono bajtowo jako niezmienione względem HEAD. Nie przywracano dawnych wymiarów dla zielonych testów ani nie maskowano emerald kolejnymi regułami CSS. Zgodnie z bramką wykonano maksymalnie dwie próby typecheck i pełnego Vitest; **STOP dalszych prób tą samą metodą**.

Checkpoint w `~/.hermes/cache/k3/` pozostaje niewykonany: katalog leży poza dozwolonymi korzeniami zapisu, a eskalacja jest wyłączona. Zapisano zastępczy checkpoint w dozwolonym `/private/tmp/CHECKPOINT-KM3.2.26-20261109.md`, raport w repo i diff `/private/tmp/km3-2-26.patch` (SHA256 `31fc0938b33dc186c31655fe7c5dd643f3065d6fa028ee2b8359c0c63fb29fd1`). Nie obchodzono ograniczenia sandboxa.

Nowe wywołania Nous: **0; koszt 0 USD**. Jeden istniejący przebieg abonamentowego Codexa Plus; bez Codex API, subagentów i nowych opłat. Salda Nous nie odczytywano. Pasywne próbki limitów: **14:00:35 CET — użycie 87% okna 5 h / 28% tygodnia**, **14:03:55 CET — 91% / 29%**. To obserwacje limitów, nie dokładny koszt paczki. Źródło: bieżący rollout `rollout-2026-11-09T13-59-23-01a1c064-5424-7422-9933-b073a6470fda.jsonl`; wyciągi `/private/tmp/km3-2-26-limits-before.json` i `km3-2-26-limits-after.json`.

## JEDYNA DECYZJA

Wysłano jedno pytanie o rozszerzenie KM3.2.26 o powyższe cztery pliki; do chwili zapisu raportu odpowiedź nie dotarła. Następny krok zależny od tej decyzji: poprawić wyłącznie tokeny w trzech rzeczywistych komponentach nawigacji i trzy sprzeczne testy geometrii, następnie wykonać nową weryfikację zatwierdzonej poprawki. Publikacja pozostaje zakazana.
