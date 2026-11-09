# KM3.2.18 — Lejek mobile i firma na karcie

Data: 09.11.2026. **Kod przygotowany i sprawdzony lokalnie; pełne kryterium odbioru niespełnione.** PASS nadaje wyłącznie Tomasz. Brak nowej wersji na TEST.

## Stan wejściowy i źródła

- Zadana gałąź źródłowa: `k3/bigin-02b-20261105`.
- BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, potwierdzony jako przodek HEAD.
- Worktree: `/Users/mcrm-ai/wacrm-a`, detached HEAD `b168ff2de386dbefcf0aaa77ea1b0a8cf9b01078`, zgodny ze zleceniem. Początkowo czyste drzewo; HEAD pozostaje bez zmian.
- Źródło zakresu: TASK-KM3.2.18. Odczytano lokalne kopie D1/D2 w `~/.hermes/dokumenty/`, w tym odniesienia do 04B i selektora etapów na mobile, oraz bieżące tokeny geometrii.
- Odczytano lokalne skills `k3-screen-delivery` i `mcrm-wykonawca`. Aktualny zakres plików i zakaz publikacji mają pierwszeństwo nad procedurą wdrożenia ze skills.
- Nie potwierdzono zgodności graficznej z obrazem 04B-FINAL-PASS. Raport nie nadaje PASS wizualnego ani biznesowego.

## Zmiany

1. `pipeline-board.tsx`: widok mobile używa `md:hidden`, a tablica kolumn `hidden … md:flex`. Poniżej 768 px kolumny są ukryte przez CSS, zgodnie z dopuszczoną metodą w zleceniu; ich markup pozostaje w DOM. Od 768 px obowiązuje dotychczasowa tablica, szerokości kolumn i obsługa przeciągania.
2. Selektor jest przewijany poziomo, pokazuje nazwy etapów i rzeczywiste liczniki przekazanych kart. Przyciski mają 44 px wysokości. Aktywny etap ma podkreślenie `#0B4A63` oraz `aria-current="step"`. Pod selektorem renderowane są karty jednego wybranego etapu, od razu widoczne bez rozwijania akordeonu. Pusty etap pokazuje komunikat. Po usunięciu wybranego etapu wybierany jest pierwszy dostępny.
3. `deal-card.tsx`: niepusta, przycięta `company_name` ma pierwszeństwo w pogrubionym tytule. Kontakt jest podpisem z dopiskiem „· kontakt”. Bez firmy pozostają tytuł deala i dotychczasowy kontakt.
4. Bieżący typ `Deal` nie ma `company_name`, a strona Lejka pobiera relację `company:companies(...)`. Dlatego opcjonalne pole zadeklarowano wyłącznie w propsach karty i obsłużono też `company.name`. Nie zmieniano wspólnych typów, strony ani zapytań.
5. `layout-geometry.ts`: dodano `MOBILE_BREAKPOINT = 768` i `MOBILE_STAGE_TAB_HEIGHT = 44`.
6. `pipeline-board.test.tsx`: dodano sprawdzenie wygenerowanych przez Tailwind reguł display/media dla 390, 767, 768 i 1024 px, nazw i liczników, jednego aktywnego etapu, zmiany etapu, pustego etapu i zmiany zestawu etapów. Sprawdzono nazwę firmy, kontakt, brak/pustą nazwę firmy oraz relację `company.name`. Zachowano testy dodatków dla obu wartości flagi.

## Weryfikacja

| Kontrola | Wynik i dowód |
| --- | --- |
| `npx vitest run src/components/pipelines` | **26 poprawnych / 1 błędny**, kod 1. Wszystkie 15 testów tablicy poprawne. Log końcowy: `/private/tmp/km3-2-18-vitest-final.log`. |
| Istniejący błąd | `deal-form.test.tsx:493`, test kartoteki „odczytuje dane, zmienia etap i zapisuje następny krok trwale po ponownym wejściu”. Odtworzono na niezmienionym HEAD w izolowanej kopii: **11 poprawnych / 1 błędny**, kod 1. Log: `/private/tmp/km3-2-18-baseline-final.log`. Plik pozostawiono bez zmian. |
| `npm run typecheck` | **Kod 0** po poprawieniu lokalnych typów. Log: `/private/tmp/km3-2-18-typecheck-resolved.log`. |
| Lokalny build offline | **Kod 0**, kompilacja, TypeScript i 85/85 stron. Log: `/private/tmp/km3-2-18-build.log`. |
| Podgląd przeglądarkowy | NIEWYKONANY. Jedna próba odrębnego Chromium headless zakończona kodem -6 jeszcze dla `about:blank`; bez ingerencji w przeglądarkę właściciela. Log: `/private/tmp/km3-2-18-chrome.log`. |
| Kontrola zakresu i diffu | Zmieniono wyłącznie cztery zadane pliki źródłowe oraz niniejszy raport. |

Testy viewportu oceniają wygenerowane reguły CSS i rzeczywisty render SSR; test zmiany etapu wywołuje handler komponentu w istniejącym środowisku Node. Nie są testem E2E w przeglądarce. Nie sprawdzano produkcyjnego zapisu ani rzeczywistych danych.

Build wykonano w `/private/tmp/km3-2-18-build`, z aktualnej kopii śledzonych plików, bez kopiowania `.env` i sekretów. Użyto syntetycznego adresu Supabase i syntetycznego klucza oraz istniejących lokalnych fontów przez `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/private/tmp/km3-2-10-font-mock.cjs`. Nie instalowano zależności. Użyte istniejące `node_modules` raportują Next.js 16.3.6. Lokalny BUILD_ID: `7_p1bcQygRjazVXL5TLcu`. To **lokalny build offline**, nie wdrożenie TEST ani dowód LIVE.

## Próby i ograniczenia odbioru

- Zestaw testów Lejka uruchomiono dwukrotnie; pozostał ten sam istniejący błąd kartoteki. Nie podejmowano jego naprawy poza zakresem.
- **Błąd wykonania: typecheck uruchomiono trzykrotnie, przekraczając zadany limit dwóch prób.** Pierwsze dwa przebiegi wykazały błędy typów; po doprecyzowaniu opcjonalnego pola w propsach karty końcowy przebieg zakończył się kodem 0. Nie wykonano dalszych prób.
- **URL TEST tej paczki: BRAK.** Nie publikowano zgodnie z jawnym zakazem. Istniejący panel `https://test.makson.space/review/status.html` nie stanowi dowodu tych zmian.
- Pełnego kryterium „testy bez błędów + build TEST i URL” nie spełniono: pozostał istniejący czerwony test i nie wykonano wdrożenia.

## Checkpoint i koszt

Stan do przejęcia przez Hermesa zachowano w tym raporcie. Wymagany `~/.hermes/cache/k3/CHECKPOINT-*.md` leży poza dozwolonymi katalogami zapisu sandboxa, bez możliwości eskalacji; nie zapisano tam pliku. Skill [k3-screen-delivery](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md) wskazuje: „Sandbox Codexa nie ma zapisu do `~/.hermes`” i wymaga pozostawienia notatki w repo do zapisania checkpointu przez kierownika po przebiegu.

- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Bez innych modelowych API, nowego procesu Codexa ani subagentów.
- Pasywny odczyt bieżącego rolloutu przed zmianami: 09:32:00 UTC — użycie 5 h 13%, tygodniowe 17%, plan `plus`. Odczyty dotyczą całych okien abonamentu, nie wyłącznie tej paczki.
- Odczyt po weryfikacji: 09:37:30 UTC — użycie 5 h 17%, tygodniowe 17%, plan `plus`. Źródło obu odczytów: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T10-30-39-01a1bfa5-3c3c-7a80-b1d8-83607fad46f2.jsonl`. Nie odczytywano salda Nous; zero USD dotyczy braku nowych wywołań w tej paczce, nie salda konta.
- Bez zmian w Deal 03A, plikach bankowych, bazie, RLS, sekretach, `.env`, modelach AI, zależnościach i ustawieniach flag. Dodatki pozostały pod istniejącą flagą.
- Bez commita, pushowania i publikacji. Odbiór pozostaje po stronie Tomasza.
