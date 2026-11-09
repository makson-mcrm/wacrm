# KM3.2.20 — testy Lejka po zmianie kontraktu mobile

09.11.2026. Testy Lejka zielone: **74/74, 0 FAIL**. Typecheck: **kod 0**. Odbiór właścicielski/PASS pozostaje wyłącznie decyzją Tomasza.

## Stan i zakres

- Zadany BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, potwierdzony jako przodek HEAD.
- Zadana gałąź źródłowa: `k3/bigin-02b-20261105`; wskazany stan Lejka: `81a3a26`.
- Rzeczywisty worktree: `/Users/mcrm-ai/wacrm-a`, detached HEAD `636d36feb990a75af7f4e4fcda3921a669be16bc`, początkowo czysty. Zawiera już KM3.2.19. Porównanie z `81a3a26` nie wykazało różnic w stronie/testach Lejka, komponentach Lejka ani `layout-geometry.ts`. Nie przełączano HEAD/gałęzi.
- Źródła: TASK-KM3.2.20, raport i kod KM3.2.18, `layout-geometry.ts` (mobile poniżej 768 px), lokalne kopie D1/D2 w `~/.hermes/dokumenty/` (BIGIN-FIRST, techniczny test jako dowód, odbiór Tomasza). Odczytano skill `mcrm-wykonawca`; aktualne ograniczenia zadania mają pierwszeństwo nad jego starszymi procedurami wdrożenia.
- Jedyny zmieniony plik testowy: `src/app/(dashboard)/pipelines/page.test.tsx`. Dodatkowo niniejszy wymagany raport.

## Poprawione dwa warianty mobile

1. **K3-N4 — nazwa, suma i licznik etapu:** zamiast przycisku dawnego akordeonu test odczytuje nagłówek sekcji wybranego etapu. Zachowuje dokładną asercję `Transakcja Kontakt syntetyczny · 35 000 zł · 2 transakcje` i dotychczasowe kontrole struktury. Sprawdza także semantyczny selektor `nav[aria-label="Etapy lejka"]`, nazwy i liczniki wszystkich trzech etapów, dokładnie jeden aktywny przycisk, jedną sekcję etapu oraz wyłącznie dwie właściwe karty. Sprawdza mobilne `md:hidden` i brak kolumn w mobilnej części renderu.
2. **K3-02B-04 — powierzchnie:** tło `bg-[#f9fbfc]` jest sprawdzane na aktualnym kontenerze mobile. Karty `article[data-pipeline-deal]` są odczytywane wewnątrz sekcji wybranego etapu; test potwierdza właściwe dwa powiązania i brak karty z innego etapu. Zachowano wszystkie dotychczasowe asercje bieli, tekstu, obramowania, promienia i cienia kart.

Desktop zachowuje dotychczasowe selektory, oczekiwaną treść nagłówka, liczbę wszystkich kart i wszystkie asercje wyglądu. Skrypt porównujący plik z HEAD po wyłączeniu wyłącznie tych dwóch testów parametryzowanych potwierdził identyczność całej pozostałej treści. Liczba testów nie zmalała.

To testy renderu SSR w środowisku Node, bez emulacji viewportu i bez E2E w przeglądarce. Komponent z KM3.2.18 pozostawia desktopowy markup w DOM, ukrywając go przez `hidden … md:flex`; brak kolumn jest asercją dotyczącą wydzielonej części mobile, a nie całego HTML. Testy nie odczytują rzeczywistej bazy ani sieci; istniejące atrapy zabraniają obu operacji.

## Weryfikacja

| Kontrola | Wynik / dowód |
| --- | --- |
| `npx vitest run 'src/app/(dashboard)/pipelines'` | **74/74, 0 FAIL, kod 0**, jeden przebieg. Log: `/private/tmp/km3-2-20-vitest.log`. |
| `npm run typecheck` | **Kod 0**, jeden przebieg. Log: `/private/tmp/km3-2-20-typecheck.log`. |
| `npm run build:webpack` — lokalny build testowy | **Kod 0**, kompilacja, TypeScript i **85/85** stron; jeden przebieg. Log: `/private/tmp/km3-2-20-build.log`. BUILD_ID: `cQ_YB6P0F70CtUHeu-wYj`. |
| Kontrola zakresu | Cała treść poza dwoma wskazanymi testami identyczna z HEAD; `git diff --check` bez błędów. |

Build wykonano w `/private/tmp/km3-2-20-build`, z kopii aktualnych śledzonych plików (test porównany bajtowo), bez `.env` i sekretów. Użyto syntetycznego adresu `https://synthetic.invalid`, syntetycznego klucza Supabase, istniejących zależności oraz lokalnych fontów przez `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/private/tmp/km3-2-10-font-mock.cjs`; telemetria Next wyłączona. Runtime: Next.js 16.3.6. Ostrzeżenia dotyczyły middleware/Edge Runtime i cache webpack; nie uniemożliwiły kompilacji. Nie uruchamiano serwera ani instalacji. Każdą z trzech wymaganych kontroli wykonano jeden raz; limit dwóch prób zachowany.

## Checkpoint i ograniczenia

Checkpoint KM3.2.20 do przejęcia przez Hermesa: dwa warianty mobile poprawione, 74/74 testów, typecheck i lokalny build kod 0, niezacommitowany diff w powyższym worktree. Nie otwarto następnego zadania. Wymagany `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza dozwolonymi katalogami zapisu sandboxa, przy wyłączonej eskalacji; nie zapisano go ani nie obchodzono ograniczeń. Niniejsza sekcja zachowuje stan do zapisania przez kierownika.

- Bez zmian kodu aplikacji, Deal 03A, plików bankowych, bazy, sekretów, `.env` i zależności. Bez commita, pushowania i publikacji.
- **Brak nowego wdrożenia na serwerze TEST** — zgodnie z jawnym zakazem publikacji. Lokalny build nie stanowi dowodu publikacji TEST ani LIVE.
- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**; nie odczytywano salda konta. Bez dodatkowej sesji modelowej, Codex API ani subagentów.
- Pasywny odczyt przed edycją: **09:55:40 UTC**, plan `plus`, użycie okna 5 h **36%**, tygodnia **20%**. Źródło: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T10-54-57-01a1bfbb-7921-7b41-b093-d2ae922f81ef.jsonl`. Są to wskaźniki całych okien abonamentu, nie precyzyjny koszt tej paczki.
- Odczyt po weryfikacji: **09:58:19 UTC**, to samo źródło i plan; użycie 5 h **39%**, tygodnia **21%**. Resety z odczytu: 5 h `1794229791`, tydzień `1794561883` (Unix).
