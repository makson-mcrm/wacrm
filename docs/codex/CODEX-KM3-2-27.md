# KM3.2.27 — test geometrii jednolitego szkieletu

09.11.2026, 14:07–14:10 CET. **Wszystkie wymagane kontrole techniczne zielone: 2211 zaliczonych / 0 FAIL / 1 istniejący SKIP.** Formalny PASS nadaje wyłącznie Tomasz. Nie publikowano na TEST ani LIVE.

## NAPRAWIONE

- Zmieniono wyłącznie `src/lib/ui/layout-geometry.test.ts` oraz dodano wymagany raport. Kod aplikacji pozostał bez zmian.
- `APP_SIDEBAR_WIDTH` oczekiwane jako 285; wysokość nagłówka 56 i wszystkie pozostałe wymiary/proporcje zachowane.
- Oczekiwane obiekty `geometryCssVars()` i `geometryCssVars('pipelines')` nie zawierają wymiarów szkieletu. Zachowano ścisłe porównanie obiektu domyślnego, odstępy, promień, proporcje kolumn i początek tablicy x=295. Dodano jawne asercje braku `--app-sidebar-width` i `--app-header-height` w geometrii Lejka.
- `SHELL_CSS_VARS` sprawdzane pod kątem `--app-sidebar-width: 285px` i `--app-topbar-height: 56px`.
- Zachowano wszystkie 3 przypadki; nazwę pierwszego dostosowano do globalnego szkieletu. Bez skip, todo i pozornych asercji.

Źródła: TASK-KM3.2.27, aktualne `layout-geometry.ts`, raport KM3.2.26 oraz skill `mcrm-wykonawca`. Jawny zakres, zakaz publikacji/commita i odbiór Tomasza z TASK mają pierwszeństwo przed historycznymi procedurami skilla.

## PRZETESTOWANE

| Kontrola — każda w pierwszej próbie | Wynik | Dowód |
| --- | --- | --- |
| `npm run typecheck` | Kod 0 | `/private/tmp/km3-2-27-typecheck.log` |
| `npx --no-install vitest run` — pełny zestaw | Kod 0, 142/142 pliki; 2211 zaliczonych, 0 FAIL, 1 SKIP | `/private/tmp/km3-2-27-vitest.log` |
| `layout-geometry.test.ts` | 3/3 zaliczone | Ten sam log |
| `npm run build:webpack` — lokalny build TEST | Kod 0, TypeScript i 85/85 stron | `/private/tmp/km3-2-27-build.log` |
| Źródła kopii buildowej | 560/560 plików `src` zgodnych z worktree | `/private/tmp/km3-2-27-build-source-sha256.json` |
| `git diff --check` | Kod 0 | Terminal sesji |

Liczba testów pozostała 2212, jak po KM3.2.26; trzy wcześniejsze błędy geometrii usunięte. Jedyny istniejący SKIP to opcjonalny test przeglądarkowy w `contact-detail-view.test.tsx`, zależny od `K3_PLAYWRIGHT_MODULE` i `K3_RENDER_DIR`. Nie zmieniano tego pliku.

Build: `/private/tmp/km3-2-27-build`, BUILD_ID `iL5R9WiJGLpYMfUVK0hvE`. Kopia bieżących śledzonych plików bez `.env*`, istniejące zależności Next.js 16.3.6, oczyszczone środowisko, syntetyczna konfiguracja Supabase `https://synthetic.invalid`, telemetria wyłączona, lokalny mock fontów `/private/tmp/km3-2-10-font-mock.cjs`. Bez instalacji i uruchamiania serwera. Ostrzeżenia dotyczą istniejącej konwencji middleware, Edge Runtime, cache webpack i React w testach; nie ma błędów kontroli.

## NIEODEBRANE

Formalny odbiór Tomasza i działanie LIVE nie są potwierdzone przez testy ani build. Publikacja została wyraźnie zabroniona; wykonano wyłącznie lokalny build TEST.

Start: czysty detached HEAD `db4f96ad394903159ba01da4f585469cb1f58f42`, rzeczywisty stan po KM3.2.26. Zadany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest jego przodkiem. Gałąź `k3/bigin-02b-20261105` jest przypisana do innego worktree; nie przełączano jej i nie cofano bieżących plików. Końcowy HEAD bez zmian; poprawka pozostaje niezatwierdzona w Git zgodnie z TASK.

Bez modyfikacji plików bankowych/KM4, bazy, sekretów, `.env`, zależności i metadanych Git. Bez commita, pusha, publikacji, modeli chmurowych i operacji na danych klientów.

## BLOKADA

Brak blokera kodu lub testów. Wymagany zapis checkpointu do `~/.hermes/cache/k3/` jest niedostępny: katalog poza dozwolonymi korzeniami zapisu, eskalacja wyłączona. Nie obchodzono sandboxa. Kopia checkpointu: `/private/tmp/CHECKPOINT-KM3.2.27-20261109.md`; raport w repo zachowuje wynik.

Diff: `/private/tmp/km3-2-27.patch`, SHA256 `8611c9d2f4b9304b560486c3bf2771f87d6aed956a7cce9365687d66b9174e40`.

Nowe wywołania Nous: **0; koszt 0 USD**. Jeden bieżący przebieg abonamentowego Codexa Plus; bez dodatkowej sesji, Codex API, subagentów i nowych opłat. Salda Nous nie odczytywano. Pasywne próbki limitów: **14:08:08 CET — użycie 94% okna 5 h / 29% tygodnia; 14:10:08 CET — 0% / 30% po resecie okna 5 h**. Nie oznacza to zerowego zużycia Codexa. Źródło: rollout `rollout-2026-11-09T14-07-31-01a1c06b-c8df-7703-b235-8e2d7a78677d.jsonl`; wyciągi `/private/tmp/km3-2-27-limits-before.json` i `/private/tmp/km3-2-27-limits-after.json`.

## JEDYNA DECYZJA

Formalny PASS KM3.2.27 pozostaje do nadania przez Tomasza. Nie uruchamiano następnego zadania.
