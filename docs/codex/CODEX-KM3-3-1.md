# KM3.3.1 — Faza 2: odsłonięcie dodatków pod flagami

09.11.2026, start sesji 14:37 CET; zapis wyniku 09.11.2026 14:43:36 CET. **NIEODEBRANE — kryterium 0 FAIL niespełnione.** Typecheck i lokalny build TEST zakończone kodem 0. Pełny zestaw: **2226 zaliczonych / 5 FAIL / 1 istniejący SKIP (2232 łącznie)**. Formalny PASS nadaje wyłącznie Tomasz.

## NAPRAWIONE

- Wszystkie 9 flag `*Extensions` ustawiono na `true`; `bankQualification` pozostaje `true`. Komentarz opisuje decyzję Fazy 2 i możliwość ukrycia dodatków przez `false`.
- `pipelineSurfaceExtensions` zachowano bajt w bajt; SHA256 części modułu od listy: `56e10210995b62e3378363f59a670444ff622a3691d21963c33ee12172f5fc73`.
- Zaktualizowano asercje domyślnych flag w `surface-flags.test.ts`. Dotychczasowe testy rdzenia jawnie wybierają `false`, zachowując sprawdzanie geometrii i możliwości wyłączenia dodatków. Dodano 20 przypadków: rzeczywiste domyślne flagi, trzy warianty flagi Lejka i domyślne dodatki ekranów.
- Render rzeczywistego `PipelinesPage` potwierdza obecność KPI: Aktywne sprawy, Przychód TERAZ, Przychód PÓŹNIEJ, Z blockerem, Z next action; selektorów Produkt/Tag/Bank/Priorytet oraz Tylko przeterminowane i Bez next action. Wariant `false` nadal je ukrywa.
- Odczytano warunki flag i potwierdzono render dodatków w Kontakty/karta kontaktu, Firmy, lista transakcji/karta deala, Dzisiaj, Aktywności, Zadania, Inbox. Testy używają danych syntetycznych oraz atrap komponentów szczegółowych; nie stanowią odbioru przeglądarkowego ani produkcyjnego. Istniejące warunki renderowania działają przy `true`; nie wymagały zmian.
- Zmieniono wyłącznie dwa dozwolone pliki źródłowe/testowe oraz niniejszy wymagany raport. Geometrii, ekranów, plików bankowych, modeli AI, bazy, `.env`, sekretów i zależności nie zmieniono.

## PRZETESTOWANE

| Kontrola — pierwsza próba | Wynik | Dowód |
| --- | --- | --- |
| `npm run typecheck` | Kod 0 | `/private/tmp/km3-3-1-typecheck.log` |
| `npx --no-install vitest run` | Kod 1; 138 plików zielonych, 4 czerwone; 2226 PASS / 5 FAIL / 1 SKIP | `/private/tmp/km3-3-1-vitest-1.log` |
| `surface-flags.test.ts` wraz z 20 nowymi przypadkami | Brak FAIL | Ten sam pełny przebieg |
| `npm run build:webpack` — lokalny build TEST | Kod 0, 85/85 stron | `/private/tmp/km3-3-1-build.log` |
| Zgodność kopii builda z worktree przed i po kompilacji | 560/560 źródeł `src` zgodnych SHA256 | `/private/tmp/km3-3-1-build-source-sha256.json` |
| Niezmieniona lista dodatków | Zgodna bajtowo z HEAD | `/private/tmp/km3-3-1-inventory.json` |
| `git diff --check` | Kod 0 | Terminal sesji |

Build: `/private/tmp/km3-3-1-build`, BUILD_ID `Hq_pN-U2G8waIXB077Zaw`. Kopia bieżących śledzonych plików bez `.env*`, istniejące zależności (Next.js 16.3.6), oczyszczone środowisko, wyłącznie syntetyczny adres/klucz Supabase; telemetria wyłączona. Fonty z istniejącego lokalnego mocka `/private/tmp/km3-2-10-font-mock.cjs`. Bez instalacji, uruchamiania serwera, publikacji i wywołań modeli. Pozostały ostrzeżenia middleware, Edge Runtime i cache webpack.

Nie powtarzano deterministycznie błędnego zestawu bez poprawki. Limit dwóch prób zachowany; typecheck, pełne testy i build wykonano po jednym razie. Dotychczasowy opcjonalny SKIP pochodzi z `contact-detail-view.test.tsx`; nie dodano skip/todo ani nie usunięto przypadków.

## NIEODEBRANE

Nie ma nowego wdrożenia ani linku LIVE zawierającego tę paczkę — zlecenie zabrania publikacji. [Istniejący LIVE — Lejek](https://mediumseagreen-pelican-353577.hostingersite.com/pipelines) oraz [istniejący panel TEST](https://test.makson.space/review/status.html) są adresami zapisanymi w `public/review/status.html`; nie zweryfikowano ich w tej sesji i nie stanowią dowodu tej nieopublikowanej zmiany. Dostarczono lokalny build TEST.

Zastano czysty detached HEAD `8cbcfb430cd023a29a02e10c4d4bc0b8f4cfcc88`, zgodny z podanym WORKTREE. Zadany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest jego przodkiem (sprawdzone `git merge-base --is-ancestor`). Gałąź `k3/bigin-02b-20261105` jest zajęta przez inne worktree. Nie przełączano ani nie cofano drzewa. HEAD pozostał bez zmian; bez commita, pusha i publikacji.

## BLOKADA

Pełny zestaw zawiera pięć asercji sprzecznych z nowym stanem flag w czterech plikach spoza zatwierdzonego zakresu:

| Plik i linia | Powód FAIL | Wymagana korekta testu |
| --- | --- | --- |
| `src/app/(dashboard)/pipelines/page.test.tsx:799` | Wariant `undefined` traktuje domyślną flagę jako `false` | Oczekiwać domyślnych dodatków przy braku nadpisania |
| `src/app/(dashboard)/pipelines/page.test.tsx:821` | Wymaga źródłowego `pipelineExtensions === false` | Oczekiwać `true` i zachować asercje listy dodatków |
| `src/components/pipelines/pipeline-board.test.tsx:195` | Domyślny render ma ukrywać dodatki desktop/mobile | Sprawdzić nowy domyślny stan i zachować test wyłączenia |
| `src/components/pipelines/deal-form.test.tsx:500` | Test przepływu wyszukuje kartę `data-bigin-deal-card`, dostępną przy `cardExtensions=false` | Jawnie ustawić `false` w teście tego wariantu karty |
| `src/lib/banking/qualify.test.ts:90` | Wymaga `cardExtensions === false`, mimo niezależnego `bankQualification === true` | Aktualizacja wyłącznie oczekiwania domyślnej flagi; plik objęty zamrożeniem KM4 |

Nie zmieniono tych plików ani nie obchodzono asercji. Poproszono o rozstrzygnięcie zakresu; do czasu odpowiedzi zachowano oryginalny zakres i zamrożenie banków. Błędy wynikają ze zmiany domyślnych flag; nie są wcześniejszymi czerwonymi testami ani dowodem awarii kodu ekranów.

Checkpoint w `~/.hermes/cache/k3/` jest poza dozwolonymi korzeniami zapisu, przy wyłączonej eskalacji. Nie obchodzono sandboxa. Kopia checkpointu: `/private/tmp/CHECKPOINT-KM3.3.1-20261109.md`. Wynik zachowany również w tym raporcie.

Nowe wywołania Nous: **0; koszt tych wywołań 0 USD**. Jeden bieżący przebieg abonamentowego Codexa Plus, bez dodatkowej sesji, API, subagentów i nowych opłat. Nie odczytywano salda Nous. Pasywne próbki użycia Codexa: `2026-11-09T13:39:09.800Z` — 4.0% okna 5 h / 30.0% tygodnia; `2026-11-09T13:42:25.051Z` — 8.0% / 31.0%. To próbki z rolloutów, nie dowód zerowego zużycia Codexa. Źródła i szczegóły resetów: `/private/tmp/km3-3-1-limits-before.json`, `/private/tmp/km3-3-1-limits-after.json`.

## JEDYNA DECYZJA

Do uzyskania 0 FAIL potrzebne jest rozszerzenie zakresu wyłącznie o powyższe testy, w tym jawny wyjątek dla jednej asercji w zamrożonym teście KM4. Bez tej zmiany KM3.3.1 nie spełnia kryterium odbioru. PASS pozostaje wyłączną decyzją Tomasza; nie uruchomiono kolejnego zadania.
