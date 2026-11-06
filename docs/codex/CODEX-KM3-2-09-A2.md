# KM3.2.09-A2 — tokeny geometrii list Bigin

Stan końcowy **DZIAŁA CZĘŚCIOWO — kod lokalny, odbiór wizualny i build TEST zablokowane**.
PASS właściciela oczekuje na rzeczywisty ekran TEST i decyzję Tomasza.

## Podstawa

- Zlecenie TASK-KM3.2.09-A2 i obejrzany obraz `~/.hermes/k3/render/bigin_hash_contacts.png`, 1536×1024.
- Odczytane skills `k3-screen-delivery` i `mcrm-wykonawca` oraz instrukcje renderu lokalnego i paczek roboczych.
- Produkcyjny BASE_SHA podany w zleceniu `0f7317df7d017d1c4d33412e29a4df9eee108583`. To wartość ze zlecenia, bez aktualnego potwierdzenia wdrożenia.
- Faktyczny HEAD przed i po pracy `868eccf69476586ced91c510762121ac5cbeb8e2`. Repo `/Users/mcrm-ai/wacrm-a`, detached HEAD, początkowo czyste drzewo. Wskazany commit roboczy jest zgodny ze zleceniem.
- Zmiany źródłowe obejmują sześć wskazanych plików. Ten raport jest dodatkowym, zamówionym artefaktem.

## Wykonane

| Plik | Wynik w kodzie |
| --- | --- |
| `src/lib/ui/layout-geometry.ts` | Wariant `lists`, tokeny 65/33/49/56/32 px, y=138, pięć kolorów HEX i typografia 14/12 px. Wspólne klasy tabeli i paska korzystają ze zmiennych CSS. |
| `src/components/layout/app-shell.tsx` | Rama list na dokładnych trasach `/contacts`, `/companies`, `/deals`. Panel ikon z ucinanymi etykietami, pasek 49 px, białe pole treści i usunięte desktopowe marginesy. |
| `src/app/(dashboard)/contacts/page.tsx` | Pasek 56 px, filtr z istniejącą wyszukiwarką, dropdown, lista/kafelki, zielony podzielony przycisk dodawania i menu opcji. Siedem kolumn, komórki 32 px, właściwe kolory i wielkości tekstu. |
| `src/app/(dashboard)/companies/page.tsx` | Ten sam pasek i tokeny tabeli. Filtr otwiera istniejące wyszukiwanie. Checkbox oraz nazwa firmy, telefon, e-mail, właściciel. |
| `src/app/(dashboard)/deals/page.tsx` | Pasek wyszukiwania 56 px i wspólne tokeny tabeli, z zachowanymi kolumnami i przejściami do spraw. |
| `src/lib/ui/surface-flags.test.ts` | Asercje tokenów, siedmiu kolumn, stanów ładowania/pustych, kafelków, wariantów flag oraz ramy trzech tras i pozostałych ekranów. |

Kolejność Kontaktów jest następująca.

1. Checkbox.
2. Nazwa kontaktu.
3. Firma.
4. Adres Email.
5. Telefon.
6. Kontakt właściciel.
7. + Utwórz pole.

Przycisk tworzenia pola otwiera istniejący `CustomFieldsManager` i korzysta z dotychczasowego sprawdzenia `edit-settings`. Formularze, powiązania, tagi, akcje, import/eksport, zapytania i logika zapisów pozostają w kodzie. Wartości `contactsExtensions`, `companiesExtensions` i `dealsListExtensions` wynoszą `false`. Testy renderowania włączają flagi i potwierdzają ponowne pojawienie się dodatków.

## Decyzje implementacyjne do weryfikacji

- Rezerwę 33 px nad nagłówkiem odwzorowano jako pusty biały pas. Treść i kolor promocyjnego banera Bigin nie mają określonego odpowiednika w zleceniu. Jest to widoczna różnica względem PNG.
- Geometria y=138 wynika z sumy 33 + 49 + 56, usunięcia paddingu treści i odstępów nad tabelą. Brakuje niezależnego pomiaru DOM w przeglądarce.
- Widok kafelków pokazuje te same podstawowe pola kontaktu w prostym układzie kart. Zlecenie zawiera wzorzec listy. Wygląd kafelków wymaga osobnego potwierdzenia.
- Szerokości poszczególnych kolumn nie mają dostarczonych tokenów. Tabela korzysta z układu `table-fixed` i istniejącej szerokości kolumny checkboxa. Zgodność szerokości kolumn 1:1 pozostaje niezweryfikowana.
- Nazwa właściciela korzysta z obecnego profilu wyłącznie przy zgodnym `user_id`. Dla innego właściciela widnieje istniejące `—`.

## Testy i dowody

Testy korzystają z syntetycznych fixtures. Adapter Supabase w teście powierzchni rzuca błąd przy próbie odczytu, a efekty sieciowe nie są montowane przez SSR.

| Kontrola | Wynik |
| --- | --- |
| `npx --no-install vitest run src/lib/contacts src/lib/companies src/components/contacts src/lib/ui src/components/ui` | 233 zaliczone, 1 pominięty, 13 plików. Końcowy przebieg 06.11.2026 o 15:07:20 CET, 3,77 s. |
| Pominięty test | Istniejący test Playwright w `contact-detail-view.test.tsx`, warunkowany przez `K3_PLAYWRIGHT_MODULE` i `K3_RENDER_DIR`. |
| `npm run typecheck` | Kod wyjścia 0. |
| `git diff --check` | Kod wyjścia 0. |
| ESLint sześciu plików zakresu | Kod wyjścia 0, 0 błędów, 4 ostrzeżenia dotyczące istniejących dyrektyw `eslint-disable` w Kontaktach i Firmach. |
| Kompilacja CSS przez PostCSS/Tailwind | Kod wyjścia 0. Wygenerowane reguły używają zmiennych wysokości, kolorów i typografii. |
| Tymczasowy render SSR pełnego `AppShell` z trzema stronami | Test renderowania zaliczony, syntetyczne dane. Tymczasowy plik testu usunięty z repo. |
| Zrzuty 1536×1024 i pomiar DOM | BLOKER. Chromium uruchomione headless zakończyło się `SIGABRT/EPERM`. Konektor CUA zgłosił `The browser access host is unavailable`. |
| Nakładka i mapa różnic pikselowych | Brak aktualnych zrzutów umożliwiających wykonanie porównania. |
| Klikalność w przeglądarce i zapis | NIEPRZETESTOWANE. SSR potwierdza strukturę i warianty stanu. |

Logi lokalne znajdują się w `/private/tmp/km3-a2-tests-final.log`, `/private/tmp/km3-a2-typecheck-final.log` i `/private/tmp/km3-a2-lint.log`.

## Build TEST i adres odbioru

**Build TEST jest niegotowy.**

1. `npm run build:webpack` z syntetycznym adresem Supabase i syntetycznym kluczem przekazanymi wyłącznie do procesu zatrzymał się na `getaddrinfo ENOTFOUND fonts.googleapis.com` podczas pobierania Inter przez `next/font`.
2. Próba offline przez istniejący mechanizm testowy Next `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` miała użyć lokalnego cache fontów. Przygotowanie mocka zawiodło przez błędne założenie o nazwie rodziny fontu w cache CSS. Następująca po nim kompilacja zgłosiła brak pliku mocka i została przerwana, kod procesu 130. Jest to błąd przygotowania tej próby. Budowanie zatrzymano po dwóch próbach.

Logi obejmują `/private/tmp/km3-a2-build.log` i `/private/tmp/km3-a2-build-offline.log`.

Istniejący symlink `node_modules` wskazuje `/Users/mcrm-ai/wacrm-km2/node_modules`. Środowisko zgłasza Vitest 4.1.12 i Next 16.3.6, podczas gdy manifest repo wskazuje Next 16.4.1. Ta lokalna różnica ogranicza dowód builda.

**URL aktualnej paczki TEST/LIVE jest niedostępny.** Zlecenie jawnie zabrania publikacji, commita i pusha. Wynik ma postać lokalnego, nieskommitowanego diffu. Istniejącego adresu środowiska nie przedstawia się jako wdrożenia A2.

## Koszt i granice wykonania

Ten przebieg używa lokalnych narzędzi i bieżącej sesji Codexa. Liczba nowych wywołań Nous wynosi 0, koszt tych wywołań wynosi 0 USD. Aktualne saldo całego konta Nous oraz zużycie abonamentu Codex 5 h/tydzień pozostają niezmierzone. Wykorzystano istniejące zależności i lokalne narzędzia.

## Checkpoint KM3.2.09-A2

Zmiany pozostają na HEAD `868eccf69476586ced91c510762121ac5cbeb8e2`, detached HEAD, w sześciu plikach źródłowych i tym raporcie. Testy są zielone w opisanym zakresie. Build TEST, pomiar 1536×1024 i odbiór Tomasza pozostają otwarte.

Docelowy zapis `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza dozwolonymi katalogami zapisu aktywnego sandboxa. Polityka uprawnień wyłącza eskalację. Checkpoint zapisano w tej sekcji zamówionego raportu, wewnątrz repo.

Następny krok wymaga środowiska, które umożliwia uruchomienie przeglądarki i pobranie fontu albo poprawną kompilację z lokalnym cache. Potem potrzebne są build TEST, pełny zrzut, pomiar DOM, porównanie z PNG i decyzja Tomasza. Publikacja wymaga rozstrzygnięcia jawnego zakazu zawartego w tym zleceniu.
