# KM3.2.17 — rama Lejka 02B

Data: 09.11.2026. **WYKONANE CZĘŚCIOWO / BLOKER ZAKRESU.** Odbiór pozostaje po stronie Tomasza; nie nadano PASS.

## Stan wejściowy i źródła

- Zadany BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Zadany punkt roboczy: `085c80d`; oba commity są przodkami bieżącego HEAD.
- Rzeczywisty katalog: `/Users/mcrm-ai/wacrm-a`, detached HEAD `4f5d7d3aa3a34a7dc31287d9f9433d39d29525ed`. Dodatkowe commity po `085c80d` dotyczą raportowania wersji TEST. Początkowo drzewo czyste; HEAD nie zmieniono.
- Źródło wymagań: TASK-KM3.2.17. Obejrzano lokalny wzorzec `/Users/mcrm-ai/.hermes/k3/render/bigin_pipeline_1536.png` (1536×1024).
- Odczytano lokalne skills `k3-screen-delivery` i `mcrm-wykonawca`; jawne ograniczenia tego zadania mają pierwszeństwo nad ich procedurą publikacji.

## Zmiany

1. `layout-geometry.ts`: dodano `BRAND_HEADER_BG = '#093E52'` i `BRAND_SIDEBAR_ACTIVE = '#0B4A63'`.
2. `app-shell.tsx`: wyłącznie dla `/pipelines` użyto stałej tła nagłówka; ustawiono biały tekst i ikony, `--foreground: #ffffff`, `--muted-foreground: #e6eef2` i dolną krawędź 1 px w kolorze `#0B4A63`. Pozostałe reguły nagłówków zachowano.
3. `sidebar.tsx`: tło już miało `#093E52`; aktywna pozycja i hover już używały `#0B4A63`. Powiązano je z nową jawną stałą `BRAND_SIDEBAR_ACTIVE`, zachowując białe etykiety. W tym pliku nie ma zabronionych starych kolorów.
4. `pipeline-board.tsx`: przy wyłączonych rozszerzeniach dodano prosty nagłówek „Transakcje” i rzeczywisty licznik przekazanych transakcji.
5. `surface-flags.test.ts`: dodano asercje obu stałych, reguł nagłówka z ograniczeniem do trasy Lejka oraz nagłówka/licznika dla obu wartości flagi.

## Bloker filtrów

Wskazany pasek nie występuje w `pipeline-board.tsx`. Cały jego kod, wraz z kontrolkami wyszukiwania, widoku transakcji, właściciela i sortowania, znajduje się w **`src/app/(dashboard)/pipelines/page.tsx`**, poza podanym zakresem plików.

Zadano pytanie o rozszerzenie zakresu wyłącznie na warunkowe renderowanie tego paska. Do chwili sporządzenia raportu nie otrzymano odpowiedzi. Plik strony pozostawiono bez zmian. Pasek nadal jest renderowany przy `pipelineExtensions = false`; nie dodano pozornej asercji sprawdzającej wyłącznie sam komponent tablicy zamiast rzeczywistej strony.

Pozostały krok implementacyjny: po dopuszczeniu tego pliku objąć istniejącą sekcję `aria-label="Narzędzia tablicy transakcji"` warunkiem `surfaceFlags.pipelineExtensions` i dodać test rzeczywistego renderu strony dla `false` oraz przywrócenia kontrolek dla `true`. Kod filtrów, obsługa zdarzeń i zapytania mają pozostać zachowane.

## Weryfikacja

| Kontrola | Wynik |
| --- | --- |
| `npm run typecheck` | Kod 0, również po ostatecznej zmianie testu licznika. Log: `/private/tmp/km3-2-17-typecheck-final.log`. |
| `npx vitest run src/lib/ui src/components/pipelines` | Dwie próby: każda **105 poprawnych / 1 błędny**. Wszystkie nowe testy poprawne. Końcowy log: `/private/tmp/km3-2-17-vitest-final.log`. |
| Błąd testu na kodzie bazowym | W oddzielnej kopii z niezmienionymi plikami HEAD odtworzono ten sam błąd: `deal-form.test.tsx:493`, test „odczytuje dane, zmienia etap i zapisuje następny krok trwale po ponownym wejściu”; 11 poprawnych / 1 błędny. Log: `/private/tmp/km3-2-17-baseline.log`. Nie zmieniano kartoteki ani jej testu. |
| Zwykły `npm run build:webpack` | Kod 1: brak pobrania Inter z Google Fonts. Log: `/private/tmp/km3-2-17-build.log`. |
| Build offline, syntetyczna konfiguracja | **Kod 0**: kompilacja, TypeScript i wygenerowanie 85/85 stron. Użyto istniejących lokalnych plików Inter przez `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`, bez zmiany konfiguracji repo. Log: `/private/tmp/km3-2-17-build-offline.log`. |
| Lokalny render SSR | Wygenerowano stronę z 6 etapami i 1 transakcją syntetyczną, dla obu wartości flagi. Potwierdzono w HTML ramę, kolory, tytuł i licznik 1; potwierdzono również nadal widoczny pasek filtrów. |
| PostCSS/Tailwind | Kod 0; wygenerowano CSS podglądu (232622 bajty). |
| Kontrola wizualna | NIEWYKONANA: osobny Chromium headless zakończył się kodem -6; alternatywny host przeglądarki CUA niedostępny (`The browser access host is unavailable`). Nie wykonano kolejnych prób ani nie ingerowano w sesję właściciela. |
| `git diff --check` | Kod 0, również po dodaniu raportu. |

Build wykonano w `/private/tmp/km3-2-17-source`, bez kopiowania plików `.env`, z syntetycznym adresem Supabase i syntetycznym kluczem. Nie instalowano zależności; wykorzystano istniejące `node_modules` (build raportuje Next.js 16.3.6). **To lokalny build offline, nie nowy build wdrożony na TEST ani dowód działania LIVE.**

## Podgląd i checkpoint

- [Podgląd lokalny — dane syntetyczne, filtry nadal widoczne](/private/tmp/km3-2-17-review/index.html).
- [Wariant z rozszerzeniami](/private/tmp/km3-2-17-review/extensions.html).
- Artefakty HTML/CSS pozostają poza repo, aby nie wprowadzać artefaktów renderu do skanowania Tailwinda. Wizualnego wyświetlenia tych plików nie potwierdzono.
- TEST nie publikowano zgodnie z zakazem. Istniejący adres `https://test.makson.space/review/status.html` nie jest dowodem tej paczki.
- Wymagany katalog `~/.hermes/cache/k3/` leży poza katalogami zapisu sandboxa, przy wyłączonej eskalacji. Nie zapisano tam checkpointu. Niniejszy raport zachowuje stan do odbioru przez Hermesa; zgodnie ze skillem `k3-screen-delivery` checkpoint poza sandboxem zapisuje kierownik po przebiegu Codexa.

## Koszt i granice

- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Nie wywoływano innych modelowych API, nie uruchamiano kolejnego Codexa ani subagentów.
- Pasywny odczyt bieżącego rolloutu Codexa: 09:12:15 CET — użycie 5 h 4%, tydzień 15%; 09:16:22 CET — 5 h 8%, tydzień 16%, plan `plus`. To odczyty całego okna abonamentu, nie pomiar kosztu tej paczki.
- Źródło limitów: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T09-09-40-01a1bf5b-16de-7140-8ddf-9d582abfe77a.jsonl`.
- Bez zmian w kartach Deal 03A, plikach bankowych, bazie, RLS, sekretach, `.env`, modelach AI i zależnościach. Bez odczytu rzeczywistych danych klientów. Bez commita, pushowania i publikacji.
- **Pełne kryterium akceptacji niespełnione:** filtry nadal widoczne, jeden istniejący błąd w zadanym zestawie testów, brak zweryfikowanego podglądu wizualnego i wdrożonego builda TEST. PASS może nadać wyłącznie Tomasz.
