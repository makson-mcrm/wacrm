# CODEX-SHELLH — dopasowanie wspólnego nagłówka

Data: 2026-11-10. Zakres: H1–H5 według pomiarów i obserwacji przekazanych w zleceniu, viewport referencyjny 1536×1024. Zmiany lokalne; bez commita, pushu i publikacji. Bramka Hermesa przyjęta jako PASS zgodnie ze zleceniem; nie uruchamiano jej ponownie.

## Zmiany i dowody (plik:linia)

| Wymaganie | Realizacja | Lokalizacja |
|---|---|---|
| H1 | Zielony przycisk `+`, `#1FA463`, 32×32 px, `aria-label="Dodaj"`; istniejące wejścia formularzy zachowane. Styl ograniczony do nagłówka, także dla hover/fokusu/otwartego menu. | `src/components/layout/global-add.tsx:26`, `src/app/globals.css:936` |
| H2 | Avatar i przycisk menu konta 32×32 px, `border-radius: 9999px`, bez pigułki z imieniem. Imię w `title` i `aria-label` przycisku, nadal dostępne w otwartym menu konta. Zachowano inicjał z profilu: dla Tomasza `T`, oraz istniejącą obsługę zdjęcia. | `src/components/layout/header.tsx:79`, `src/components/layout/header.tsx:132`, `src/app/globals.css:947` |
| H3 | Pomoc i ModeToggle ukryte przez nową flagę prezentacji `surfaceFlags.headerExtensions: false`. Kod obu funkcji i dotychczasowe testy akcji zachowane; test obejmuje flagę false i true. Pozostałe flagi bez zmian. | `src/lib/ui/surface-flags.ts:20`, `src/components/layout/header.tsx:119`, `src/components/pipelines/pipeline-ux-actions.test.tsx:235` |
| H4 | Wyszukiwanie bezpośrednio po logo, wyrównane do lewej, bez bocznego paddingu kontenera i bez centrowania. Komponent i kontener ograniczone do 420 px. Placeholder `Wyszukaj (⌘K)`. Tytuł modułu przeniesiony za wyszukiwanie. | `src/components/layout/header.tsx:102`, `src/components/layout/global-crm-search.tsx:96`, `src/app/globals.css:463`, `src/app/globals.css:933` |
| H5 | Logo wysokości 32 px. Przy 1536 px: zwykły nagłówek zaczyna się za railem 64 px i ma padding 8 px, zatem x=72. Nagłówek Lejka obejmuje cały viewport, więc dostaje padding `calc(var(--app-sidebar-width) + 8px)`, również x=72. | `src/app/globals.css:440`, `src/app/globals.css:926`, `src/components/layout/header.tsx:89` |

Nowe asercje: `src/components/pipelines/pipeline-ux-actions.test.tsx:257` — zielony przycisk 32×32, avatar i trigger 32×32 z pełnym zaokrągleniem, inicjał T i opis konta, domyślne ukrycie H3, limit wyszukiwania 420 px i kolejność za logo, położenie logo x=72 / wysokość 32 px na dziewięciu trasach. Istniejące testy skrótu ⌘K/Ctrl+K, wyników wyszukiwania, formularzy i wylogowania pozostają w zestawie.

## Walidacja

| Polecenie | RC | Wynik |
|---|---:|---|
| `npm run typecheck` | 0 | 0 błędów TypeScript |
| `npx vitest run` | 0 | 145 plików PASS; 2372 testy PASS, 1 skipped, 0 FAIL (2373 łącznie); czas 38,94 s |

Próg ≥2358 testów spełniony również liczbą samych PASS. Vitest wypisał ostrzeżenie o przyszłym domyślnym `configLoader: native` i konfiguracji ESM/CJS; nie spowodowało błędów. Konfiguracji nie zmieniano.

## Zakres i ryzyka

- Nie zmieniano tras, API, zapytań ani plików Supabase, danych, `.env*`, geometrii panelu, kolumn ani kart. Zmiany CSS są ograniczone do nagłówka. Istniejące zmiany użytkownika w `.planning/` i wcześniejsze raporty pozostawiono bez ingerencji.
- Asercje geometrii sprawdzają drzewo komponentów i deklaracje CSS; x=72 jest wyliczeniem dla desktopowego raila 64 px. Nie stanowią pomiaru `getBoundingClientRect` w działającej przeglądarce ani Visual Diff. W tej paczce, zgodnie ze zleceniem, uruchomiono tylko typecheck i Vitest; bez audytu, bramki i skryptów spoza repo.
- Na szerokościach ≤1280 px zachowano istniejący rail 63 px i wysokość paska 43 px. Odsunięcie logo podąża za railem (x=71 px); przycisk dodawania i avatar pozostają 32×32 px.
- Inicjał i zdjęcie nadal wynikają z istniejącego profilu. Nie wpisano na stałe tożsamości Tomasza dla innych użytkowników.
- Bez wdrożenia i bez odbioru wizualnego na TEST. Nie nadano PASS wizualnego ani statusu „ZGODNY I DZIAŁA”; odbiór należy do Tomasza.
