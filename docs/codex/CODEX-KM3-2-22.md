# KM3.2.22 — pełny zestaw testów

09.11.2026. **0 FAIL; 2162 PASS + 1 wcześniejszy SKIP = 2163 testy. Typecheck i końcowy lokalny build testowy: kod 0.** Lokalna paczka do odbioru Tomasza; formalny PASS pozostaje decyzją właściciela.

## Stan i zakres

- Repo: `makson-mcrm/wacrm`, worktree `/Users/mcrm-ai/wacrm-a`.
- Zadany BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, potwierdzony jako przodek HEAD.
- Rzeczywisty HEAD przed pracą: `2bd9c708396febe6d0e931e795cfe1f731ae628b`, detached HEAD: `c47acfa` + commit KM3.2.21. Początkowo czysty; bez przełączania gałęzi.
- Źródła: TASK-KM3.2.22, `src/lib/ui/layout-geometry.ts`, istniejący kontrakt selektora z KM3.2.18 i rzeczywiste handlery formularza/ankiety. Potwierdzenie produkcyjnej kolumny `description` przyjęto ze zlecenia; nie odczytywano bazy.
- Zastosowano skill `mcrm-wykonawca`. Aktualne zlecenie ogranicza pracę do czterech plików testów i tego raportu, bez commita oraz publikacji.

## Zmiany i zachowanie asercji

`src/components/layout/app-shell.test.tsx`: zachowano wszystkie przypadki, render rzeczywistych komponentów i kompilację klas przez Tailwind/PostCSS. Oczekiwania sprawdzają panel Lejka 285 px, zwinięty panel list 65 px, pasek Bigin 49 px, tło Lejka `#F9FBFC`, pasek/panel `#093E52` i akcent `#0B4A63`. Kolory sprawdzane są w aktualnych stylach inline i zmiennych CSS, zamiast w usuniętych klasach z literalnym kolorem. Pozostałe trasy zachowują istniejące w kodzie 160/56 px. Test jednokrotnego dziedziczenia zmiennych używa wariantu `lists`, właściwego dla domyślnej trasy testu `/contacts`. Pozostają kontrole szerokości kolumn, odstępów, przewijania i breakpointów.

`src/lib/financial-questionnaires.test.ts`: atrapa schematu dopuszcza `sales_activities.description`, nadal odrzucając pozostałe nieznane kolumny. Zachowano dokładne oczekiwania 201, jednego Kontaktu, `+48500100200`, deduplikacji submisji/intake oraz braku Deali.

Po dopuszczeniu kolumny ujawniło się dalsze nieaktualne oczekiwanie tego samego testu: formularz tworzy własne działanie, a ankieta drugie. Asercja wymaga teraz dokładnie dwóch działań i sprawdza ich odrębne tytuły/źródła, wspólny Kontakt, typ `zadanie`, status `PLANOWANE` i `completed: false`, a także opis formularza. Dwa formaty telefonu w ponowieniach ankiety nie mogą utworzyć trzeciego działania. To kontrola konkretnych rekordów obu przepływów, bez tolerowania duplikatów.

`src/lib/mcrm/pipeline-ux.test.ts` oraz `src/lib/mcrm/ux-checklist-2026-09-18.test.ts`: istniejące przypadki wymagają poziomego selektora „Etapy lejka”, przewijania w poziomie, obsługi wyboru, wskazania aktywnego etapu i filtrowania kart do wybranego etapu. Pierwszy test ogranicza te asercje do sekcji mobile, wymaga `md:hidden`, wyklucza akordeon i siatkę kolumn oraz zachowuje kontrolę przewijania i osobnego układu desktop. Rozdzielenie sześciu aktywnych etapów i archiwum pozostaje sprawdzane.

Nie usunięto żadnego przypadku, nie dodano `skip`, `todo` ani asercji pozornych. Liczba definicji przypadków w czterech plikach pozostała odpowiednio 4, 57, 6 i 7; przypadki parametryzowane rozwija Vitest.

## Weryfikacja

Przebieg bazowy: **11 FAIL, 2151 PASS, 1 SKIP, 2163 łącznie**, 142 pliki, kod 1. Błędy wystąpiły wyłącznie we wskazanych czterech plikach. Log: `/private/tmp/km3-2-22-baseline.log`.

Pierwsza próba poprawki: **1 FAIL, 2161 PASS, 1 SKIP**, kod 1; pozostała asercja liczby działań formularza i ankiety. Log: `/private/tmp/km3-2-22-vitest-attempt-1.log`. Druga próba poprawki zakończyła się kodem 0. Nie uruchamiano trzeciej próby poprawki; razem były trzy pełne przebiegi: pomiar bazowy i dwie weryfikacje poprawek.

| Kontrola | Wynik | Dowód |
| --- | --- | --- |
| `npx vitest run` — druga próba poprawki | **0 FAIL, 2162 PASS, 1 SKIP, 2163 łącznie; 142/142 pliki; kod 0** | `/private/tmp/km3-2-22-vitest.log`, 33,84 s |
| Cztery wskazane pliki, w pełnym przebiegu | **9 + 143 + 6 + 7 = 165 PASS** | Ten sam log |
| `npm run typecheck` po końcowej zmianie | **Kod 0, bez błędów** | `/private/tmp/km3-2-22-typecheck.log` |
| Końcowy lokalny build testowy `npm run build:webpack` | **Kod 0, kompilacja, TypeScript, 85/85 stron** | `/private/tmp/km3-2-22-build.log` |
| `git diff --check` | Bez błędów | Terminal sesji |

**Istniejący SKIP:** `src/components/contacts/contact-detail-view.test.tsx:761` ma warunkowy test renderu SSR wymagający `K3_PLAYWRIGHT_MODULE` i `K3_RENDER_DIR`. Te zmienne nie były ustawione, zarówno przed zmianami, jak i po nich. Test jest poza zakresem KM3.2.22; nie zmieniono go ani warunku pominięcia. Kryterium **0 FAIL** i liczba **2163** zostały osiągnięte; nie twierdzimy, że wszystkie 2163 testy zostały wykonane i zaliczone.

Testy korzystały z istniejących zależności, atrap i syntetycznych danych. `npx` uruchamiano z `npm_config_offline=true`, a procesy otrzymały oczyszczone środowisko bez odziedziczonych sekretów. Nie dodawano zmiennych do plików `.env`. W logach pozostają ostrzeżenia Vite o formacie konfiguracji i React o `jsx`, a także oczekiwane komunikaty kontrolowanych błędów z testów negatywnych.

Build wykonano w `/private/tmp/km3-2-22-build`, z kopii śledzonych plików bieżącego drzewa roboczego, z wykluczeniem wszystkich `.env*`. Użyto istniejących zależności, syntetycznego adresu `https://synthetic.invalid`, syntetycznego klucza Supabase, wyłączonej telemetrii i lokalnego mocka fontów `/private/tmp/km3-2-10-font-mock.cjs`. Nie uruchomiono serwera ani publikacji. Pierwszy build zakończył się kodem 0 i wygenerował 85/85 stron, lecz jego kopia zawierała wcześniejszą wersję jednej asercji. Dlatego powtórzono build po zsynchronizowaniu końcowej wersji testów: **kod 0**, kompilacja 11,0 s, TypeScript 7,2 s, 85/85 stron. Runtime: Next.js 16.3.6, webpack. Pozostają ostrzeżenia istniejącej konwencji middleware i Edge Runtime.

Po końcowym buildzie porównano bajtowo wszystkie **560 śledzonych plików `src/`** kopii i worktree oraz potwierdzono SHA256 wszystkich **142 plików testowych** z manifestu `/private/tmp/km3-2-22-build-tests-sha256.json`. Kopia nie zawiera plików `.env*`. Końcowy `git status` zawiera wyłącznie cztery wskazane testy i wymagany raport.

## Checkpoint i ograniczenia

Checkpoint KM3.2.22: lokalny diff czterech wskazanych testów oraz niniejszy raport, bez kolejnego zadania i bez publikacji. Rzeczywisty HEAD jak wyżej; nie utworzono commita.

Wymagany `~/.hermes/cache/k3/CHECKPOINT-*.md` leży poza katalogami zapisu sandboxa `workspace-write`, a eskalacja jest wyłączona. Nie zapisano go i nie obchodzono ograniczenia. Ten raport zachowuje stan do przejęcia przez uprawnionego Hermesa.

- Bez edycji kodu aplikacji, plików bankowych, bazy, sekretów, `.env` i zależności. Pełny zestaw uruchamia istniejące testy, także bankowe; nie zmieniono ich plików.
- Bez commita, pushowania i publikacji TEST/LIVE. Lokalny build testowy nie dowodzi wdrożenia na serwerze TEST.
- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Bez Codex API, nowej sesji Hermesa i subagentów. Nie odczytywano salda konta Nous.
- Pasywny odczyt Codex przed edycją: 09.11.2026 11:44:06 CET, użycie 5 h **48%**, tydzień **22%**, plan Plus, bez dodatkowych kredytów. Źródło: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T11-43-13-01a1bfe7-aa44-7253-8be4-ee96e1b09f7d.jsonl`. To wskaźniki okien abonamentu, nie dokładny koszt paczki.
- Pasywny odczyt po końcowych kontrolach z tego samego źródła: 09.11.2026 11:49:24 CET, użycie 5 h **55%**, tydzień **23%**, plan Plus, bez dodatkowych kredytów. Zmiana wskazań: **48% → 55%** i **22% → 23%** użycia.
