# KM3.2.10 — powłoka i trasy Bigin

**DZIAŁA CZĘŚCIOWO — kod i lokalny build przygotowane, ekran TEST oczekuje na weryfikację wizualną i odbiór Tomasza.**

## Podstawa i zakres

- Zlecenie TASK-KM3.2.10, 06.11.2026. Odczytano skills `k3-screen-delivery` i `mcrm-wykonawca` oraz referencje dotyczące renderu, testu headless i paczek roboczych.
- Obejrzano lokalne wzorce `~/.hermes/k3/render/bigin_hash_contacts.png` i `bigin_pipeline_1536.png`, oba 1536×1024. Wartości 285/65/49/138/32/60/220/10 pochodzą z bieżącego zlecenia. Zastosowano je także tam, gdzie historyczne wskazówki skill zalecały inne wymiary panelu list.
- BASE_SHA ze zlecenia `0f7317df7d017d1c4d33412e29a4df9eee108583`. Bieżącego wdrożenia produkcyjnego nie odczytywano.
- Rzeczywisty HEAD `a77db3052c7ca10120e8d286ba5c6b41c793890b`, repo `/Users/mcrm-ai/wacrm-a`, detached HEAD. Jest zgodny z polem WORKTREE. Nazwa gałęzi `k3/bigin-02b-20261105` pochodzi ze zlecenia. Początkowo drzewo było czyste.
- Diff obejmuje pięć plików źródłowych z dozwolonego zakresu i ten zamówiony raport. Istniejący kod Kontaktów realizuje kolumnę Firma i przeszedł weryfikację testem.

## Wykonane

| Plik | Zmiana i dowód |
| --- | --- |
| `src/app/(dashboard)/deals/page.tsx` | Przy domyślnym `dealsListExtensions = false` wywołuje `redirect('/pipelines')` przed inicjalizacją klienta bazy i hooków listy. Cała dotychczasowa lista pozostaje w `DealsList`, dostępna po świadomym włączeniu flagi. |
| `src/components/layout/app-shell.tsx` | Zmienne CSS na kontenerze ekranu wyznaczają panel 285 px na dokładnej trasie `/pipelines` i 65 px na `/contacts` oraz `/companies`. Nagłówek tych ekranów ma 49 px i tło `#093E52`. Lejek używa tła `#F9FBFC`, kolumn 220 px, odstępu 10 px i kart 60 px. Reguły kart obowiązują przy wyłączonych rozszerzeniach Lejka. |
| `src/lib/ui/layout-geometry.ts` | Dodano centralne tokeny kolumny 220 px, odstępu 10 px, karty 60 px i tła Lejka. Istniejące tokeny list określają y=138, wiersz 32 px i kolory `#FFFFFF`, `#FCFDFD`, `#E8ECEF`. |
| `src/app/(dashboard)/companies/page.tsx` | Kolumna Osoba bezpośrednio za Nazwą firmy. Korzysta z istniejącego `primaryContact`, wybranego z `contact_companies` z pierwszeństwem powiązania głównego. Nazwa prowadzi do `/contacts?open=…`. Brak powiązania daje `—`. Colspan stanu pustego i ładowania wynosi 6. |
| `src/lib/ui/surface-flags.test.ts` | Asercje wszystkich ośmiu wymiarów, kolorów, zmiennych powłoki, przekierowania, powiązanej firmy i osoby, stanów pustych oraz zachowania dodatków pod flagami. |

Kod Kontaktów pobiera `company:companies(id,name)` przez istniejącą relację `contact_companies`. Test syntetyczny potwierdza jednocześnie tekst nazwy firmy i link do właściwego identyfikatora.

## Decyzje implementacyjne do odbioru

- Zgodnie z dosłownym wymaganiem użyto funkcji `redirect`. Jej digest zawiera status 307. Żądanie trwałości w znaczeniu HTTP 308 pozostaje rozbieżne z nakazaną funkcją.
- Aby zachować treść karty w wysokości 60 px, tytuł zajmuje jeden wiersz z wielokropkiem, kontakt kolejny, a kwota i data wspólny dolny wiersz. Zmieniono CSS powłoki, zachowując źródłowy komponent karty. Ten układ wymaga sprawdzenia wizualnego, również dla długich wartości.
- Zachowano istniejący pusty pas list 33 px. Początek tabeli y=138 wynika z 33 + 49 + 56 i istniejącego wyzerowania paddingu list. Pomiar w przeglądarce pozostaje otwarty.
- Warianty pozostałych ekranów korzystają z dotychczasowego zestawu tokenów. Reguły Bigin są przypisane do dokładnych tras list i Lejka.

## Testy

Testy używają danych syntetycznych. Test powierzchni blokuje odczyt bazy przez atrapę rzucającą błąd. Sam render SSR nie uruchamia efektów pobierających dane.

| Kontrola | Wynik |
| --- | --- |
| `npx --no-install vitest run src/lib/ui src/components/ui src/lib/contacts src/lib/companies src/lib/deals src/components/contacts src/components/pipelines 'src/app/(dashboard)/pipelines'` | 343 zaliczone, 1 pominięty, 19 plików. |
| Pominięty test | Istniejący test Playwright w `contact-detail-view.test.tsx`, zależny od konfiguracji `K3_PLAYWRIGHT_MODULE` i `K3_RENDER_DIR`. |
| `npm run typecheck` | Kod wyjścia 0. |
| ESLint pięciu zmienionych plików źródłowych | Kod wyjścia 0, 0 błędów, 2 istniejące ostrzeżenia `eslint-disable` w Firmach. |
| `git diff --check` | Kod wyjścia 0. |
| Pełny `npx --no-install vitest run` | 2058 zaliczonych, 3 błędy, 1 pominięty. 139 plików zaliczonych, 2 z błędami. |

W pełnym zestawie pozostały dwa historyczne oczekiwania panelu 160 px na Kontaktach w `src/components/layout/app-shell.test.tsx` oraz błąd 500 zamiast 201 w `src/lib/financial-questionnaires.test.ts`. Izolowane archiwum HEAD `a77db30` w `/private/tmp/km3-2-10-baseline` potwierdziło te same trzy błędy i dodatkowe historyczne oczekiwanie 160 px na `/deals`. Łącznie stan bazowy miał 4 błędy w tych dwóch plikach. Bieżący diff usuwa jeden z nich przez zmianę trasy `/deals`.

Logi kontroli znajdują się w `/private/tmp/km3-2-10-tests-final.log`, `km3-2-10-typecheck-final.log`, `km3-2-10-lint.log`, `km3-2-10-full-tests.log` i `km3-2-10-baseline-tests.log`.

## Build i ekran TEST

1. Standardowy `npm run build:webpack` zakończył się błędem DNS `ENOTFOUND fonts.googleapis.com` przy pobieraniu Inter.
2. Druga próba zakończyła się kodem 0. Użyto istniejącego mechanizmu Next `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`, CSS siedmiu fontów Inter i plików WOFF2 z lokalnego cache wcześniejszego builda. Mock zapisano w `/private/tmp/km3-2-10-font-mock.cjs`. Syntetyczne URL i klucz Supabase podano wyłącznie jako zmienne procesu. Kompilacja, TypeScript i generowanie 85 stron zakończyły się poprawnie.

**Lokalny BUILD_ID wynosi `UxM4UZbBSEss4zZCAhoCk`.** Wynik znajduje się w `.next`. Log drugiej próby to `/private/tmp/km3-2-10-build-offline.log`. Lokalny symlink `node_modules` wskazuje `/Users/mcrm-ai/wacrm-km2/node_modules`. Narzędzia zgłaszają Next 16.3.6 i Vitest 4.1.12, podczas gdy manifest wskazuje Next 16.4.1 i Vitest `^4.1.10`. Build potwierdza pracę na tych dostępnych zależnościach.

Zrzuty i pomiar DOM są zablokowane. Chromium headless zakończył się kodem 133 z `bootstrap_check_in … Permission denied (1100)`. Niezależny odczyt CUA zwrócił `The browser access host is unavailable`. Log pierwszej próby znajduje się w `/private/tmp/km3-2-10-browser.log`. Zakończono diagnostykę po tych dwóch próbach.

Brakuje aktualnych zrzutów całej aplikacji, nakładki, mapy różnic oraz pomiaru 1536×1024. Według `k3-screen-delivery` taki stan pozostawia odbiór wizualny otwarty. Klikalność w przeglądarce, drag-and-drop i trwałość zapisu oczekują na test w odpowiednim środowisku.

**URL LIVE tej paczki jest niedostępny.** Zakaz publikacji zawarty w zleceniu ogranicza wynik do lokalnego builda i diffu. Istniejący kanał odbioru wskazany w skill to `https://test.makson.space/review/status.html`. W tej sesji nie potwierdzono tam wdrożenia KM3.2.10. PASS może nadać Tomasz po obejrzeniu właściwego ekranu TEST.

## Koszt i checkpoint

Liczba nowych wywołań Nous wynosi 0, koszt tych wywołań wynosi 0 USD. Praca korzysta z bieżącej sesji Codexa i istniejących narzędzi. Pasywny odczyt skryptem `codex-limity.sh` w trakcie końcowej kontroli podał 94% pozostałego okna 5 h i 95% tygodnia. Źródłem był rollout bieżącej sesji `rollout-2026-11-06T17-22-32-01a1b1ab-3d36-7632-baab-c1acf5a17b28.jsonl`. Zapas PRZED nie został zapisany, więc różnica zużycia tej paczki pozostaje niezmierzona. Salda całego konta Nous nie odczytywano.

Docelowa ścieżka `~/.hermes/cache/k3/CHECKPOINT-*.md` leży poza dozwolonym obszarem zapisu aktywnego sandboxa. Polityka sesji wyłącza eskalację uprawnień. Checkpoint stanowi ta sekcja zamówionego raportu.

- HEAD `a77db3052c7ca10120e8d286ba5c6b41c793890b`, detached HEAD.
- Pięć plików źródłowych zakresu zmienionych lokalnie oraz ten raport.
- Testy zakresowe i typecheck zaliczone, lokalny build ukończony.
- Trzy błędy pełnego zestawu potwierdzone również na stanie bazowym.
- Otwarty odbiór wizualny, dostępność ekranu TEST i decyzja Tomasza.
- Następny krok obejmuje pomiar i zrzuty w sprawnym środowisku przeglądarkowym oraz udostępnienie właściwego buildu TEST po rozstrzygnięciu zakazu publikacji.
