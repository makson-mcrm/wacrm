# KM3.5.1B — rozszerzenie tej samej paczki

Data: 09.11.2026. Status techniczny: **typecheck RC=0, Vitest RC=0 — 0 FAIL**.
Brak odbioru wizualnego i PASS właściciela. Zmiany są lokalne, niecommitowane i nieopublikowane.

## Stan wejścia i upoważnienie

- Kontynuacja KM3.5.1 w `/Users/mcrm-ai/wacrm-a`; zachowano wszystkie zastane zmiany pierwszego przebiegu.
- HEAD: `117eaae6c0f5d6fde18cff28aea5196dee2c6dc7`, detached HEAD.
- BASE_SHA produkcji: `0f7317df7d017d1c4d33412e29a4df9eee108583`; zgodny z odczytanym `prod-build.json`.
- Zlecenie: `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md`, rozszerzenie II.1 z 21:30.
- Aktywny lock wskazuje tę samą paczkę, rozpoczętą 21:10:13. Nie tworzono nowego zlecenia ani locka.
- Zastosowano skille `mcrm-wykonawca`, `k3-screen-delivery`; przeczytano lokalne przewodniki Next.js dotyczące layoutów i grup tras.

## Zmienione pliki w tym rozszerzeniu

1. `src/app/(dashboard)/pipelines/page.test.tsx` — selektor jednej przewijanej tablicy dla obu szerokości; wszystkie kolumny i karty także na telefonie, kolumny 230 px, gap 0, powierzchnie z tokenów. Nakładka drag & drop jest drugą instancją karty, po usunięciu oddzielnego renderu mobile.
2. `src/components/layout/app-shell.test.tsx` — rail 64 px, pasek 48 px, tokeny telefonu 63/43, kompilowane klasy kolumn 230 px i paddingu 5 px. Dodano `/agents` i `/audyt-crm` do istniejącej parametryzacji oraz sprawdzenie pojedynczej ramy i sposobu osadzenia tras.
3. `src/lib/ui/surface-flags.test.ts` — wyłącznie oczekiwania geometrii 64/48/230/0 zamiast 285/48/220/10; pozostawiono testy domyślnych flag i przywracania dodatków.
4. `src/lib/mcrm/pipeline-ux.test.ts` — wspólna pozioma tablica, wszystkie etapy i niezależny pionowy scroll kolumn zamiast selektora jednego etapu mobile.
5. `src/lib/mcrm/ux-checklist-2026-09-18.test.ts` — analogiczna aktualizacja prezentacji mobile; zachowano sprawdzanie sześciu etapów i oddzielnego archiwum.
6. `src/app/audyt-crm/page.tsx` — osadzenie w `DashboardShell`. Zewnętrzny `main` zmieniono na kontener treści, aby główny obszar należał do AppShell; dotychczasowy nagłówek audytu jest sekcją narzędzi wewnątrz ekranu. Zachowano jego tytuł, przyciski i całą zawartość oraz logikę audytu.
7. `docs/codex/CODEX-KM3-5-1B.md` — niniejszy raport.

`src/app/(dashboard)/agents/page.tsx` już dziedziczy wspólną ramę przez `(dashboard)/layout.tsx` → `DashboardShell` → `AppShell`. Nie dodano drugiej powłoki. `agents/page.tsx` i `dashboard-shell.tsx` nie wymagały zmian; stan ten objęto asercjami trasy.

Nie usunięto przypadków ani nie dodano skipów/todo. Liczba deklaracji `it` w każdym z pięciu plików pozostała taka sama; dwa nowe warianty tras zwiększyły liczbę wykonywanych testów o 2. Zachowano asercje sum, liczników, walut, kart, kontaktów, filtrów, sortowania, flag, błędów pobrania i drag & drop.

## Weryfikacja

| Komenda | RC | Wynik / log |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów; `/tmp/km3-5-1b-typecheck.log` |
| `npx vitest run` | **0** | **2245 PASS / 0 FAIL / 1 istniejący skip (2246)**, 142 pliki, 28,57 s; `/tmp/km3-5-1b-vitest.log` |
| `git diff --check` | **0** | Bez błędów whitespace |

Pierwszy przebieg pięciu plików: 272 PASS / 1 FAIL (273), RC=1; log `/tmp/km3-5-1b-focused-1.log`. Pozostała stara asercja kompilowanego tła HEX w `app-shell.test.tsx`; po korekcie pełny zestaw przeszedł. W tym rozszerzeniu wykonano jeden pełny przebieg Vitest. Próg co najmniej 2240 testów jest spełniony; stan wejściowy tej paczki miał 2244 testy.

## Geometria i granice dowodu

Wartości z pomiarów Bigin i istniejącej implementacji pierwszego przebiegu: pasek desktop/mobile **48/43 px**, rail **64/63 px**, kolumna **230 px**, padding **5 px**, karta **220 px**, gap **0 px**, start tablicy **y=115 px**, x desktop/mobile **295/272 px**, przyciski toolbara **32/29 px**. Dolna nawigacja zachowuje `md:hidden`: widoczna do 767 px. Font pozostaje Inter, dodatki nadal są sterowane domyślnie wyłączonymi `surfaceFlags`.

Są to stałe i deklaracje sprawdzone testami źródeł, renderu statycznego i CSS. **Nie wykonano nowego pomiaru DOM ani Visual Diff; diff ramy pozostaje NIEZMIERZONY.** Ograniczenia przeglądarki opisano w `CODEX-KM3-5-1.md`; nie ponawiano zablokowanych prób. Testy nie stanowią odbioru UX ani dowodu interakcji w przeglądarce.

Nie zmieniono modelu danych, API, Supabase, formularzy, sekretów, `.env`, `package.json` ani pliku definicji flag. Nie uruchomiono dev servera, commita, pusha, publikacji ani builda Hostingera. Nie zapisywano checkpointu poza dozwolonym worktree; odbiór diffu przez kierownika jeszcze nie nastąpił.

## Limity i dalszy odbiór

Pasywny odczyt `codex-limity.sh` przed zmianami: pozostało **84% okna 5 h / 60% tygodnia**, źródło `rollout-2026-11-09T21-29-37-01a1c200-88c4-7241-a8b5-5aa1bdd1e25d.jsonl`, odczyt około 21:30. To odczyt zapisanej sesji, nie gwarancja bieżącego limitu. `hermes usage --provider nous --json` zakończył się RC=1: katalog instalacji poza worktree nie pozwala zapisać `.prepare.lock`. Nie zmieniano uprawnień i nie wywoływano płatnego modelu/API.

Kolejny etap należy do kierownika: odbiór diffu, dopuszczenie do wdrożenia TEST oraz pomiar desktop/mobile i Visual Diff. PASS wizualny nadaje wyłącznie Tomasz.
