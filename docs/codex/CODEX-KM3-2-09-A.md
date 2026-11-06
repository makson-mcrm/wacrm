# KM3.2.09-A — czysta powierzchnia list Bigin

Stan: wykonane lokalnie; **PASS właściciela nie został nadany**. Bez commita, pusha i publikacji.
Końcowa weryfikacja: 06.11.2026, 10:37 CET.

## Podstawa i zakres

- BASE_SHA ze zlecenia: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Faktyczny HEAD przed i po pracy: `7099b46fe744ed925f4738a9268dfb12d81d3c14`, zgodny ze wskazanym worktree; detached HEAD. Początkowo czyste drzewo.
- Źródła: zlecenie TASK-KM3.2.09-A, istniejący kod, odczytane umiejętności `k3-screen-delivery` i `mcrm-wykonawca`, obejrzane lokalne `bigin_contacts.png` i `bigin_companies.png`.
- Kolumny firm odtworzono zgodnie z jawnym zleceniem (E-mail), mimo że obraz Bigin zawiera stronę internetową. Nie rozszerzano zakresu do innych ekranów.

## Pliki i efekt

| Plik | Zmiana |
| --- | --- |
| `src/lib/ui/surface-flags.ts` | Trzy nowe flagi boolean, wszystkie domyślnie `false`; zachowana flaga Lejka. Dopisany inwentarz list i komentarz wyjaśniający historyczną nazwę `pipelineSurfaceExtensions`. |
| `src/app/(dashboard)/contacts/page.tsx` | Przy wyłączonych rozszerzeniach jedna tabela dla wszystkich szerokości, dropdown „Wszystkie kontakty”, przełącznik listy/kompaktowej gęstości wierszy i zielony „+ Kontakt”. Kolumny: checkbox, Nazwa kontaktu, Firma, E-mail, Telefon, Właściciel. |
| `src/app/(dashboard)/companies/page.tsx` | Kolumny: checkbox, Nazwa firmy, Telefon, E-mail, Właściciel; zielony „+ Firma”; zachowane wyszukiwanie i przejście do istniejącej karty firmy. Nagłówki tabeli pozostają także podczas ładowania i dla pustej listy. |
| `src/app/(dashboard)/deals/page.tsx` | Autorski nagłówek i opis pod flagą; wyszukiwarka i dotychczasowa tabela transakcji zachowane. |
| `src/lib/ui/surface-flags.test.ts` | Nowe testy wartości flag oraz rzeczywistego HTML list na danych syntetycznych, obu ustawień flag i stanów pustych/ładowania. |

## Ukryte i zachowane

Kontakty: warunkowo nie renderują się segmenty, autorskie nagłówki/liczniki, eksport/import, filtr i kolumna tagów, menedżer pól własnych, powiązania małżonka, aktywne sprawy, historia aktywności, szybkie akcje, panel nieznanego numeru oraz dotychczasowa ukryta sekcja z paskiem akcji masowych i jej potwierdzenie usuwania. Dotychczasowy widok mobilny z dodatkami również jest pod flagą. Kod, zapytania, wzbogacanie danych i funkcje obsługi zachowano. Przywrócenie dodatków wymaga świadomego ustawienia `contactsExtensions: true`.

Firmy: pod flagą pozostają NIP, główna osoba kontaktowa, licznik aktywnych Deali, następne działanie/termin i autorski opis listy. W istniejącej karcie firmy warunkowo nie renderują się edytor tagów, powiązania małżonka i zakładka historii z `ActivityHistory`. Kod formularzy, relacji, zapytań i zapisów pozostaje. Na dotychczasowej liście firm nie było osobnego paska akcji masowych ani menedżera pól własnych — nie dodawano atrap tych funkcji.

Transakcje: w pliku wejściowym nie było narzędzi AI ani autorskich filtrów do schowania. Flaga obejmuje istniejący dodatkowy nagłówek; nie dodawano nowych filtrów ani integracji.

Nawigacja kontakt → pełna karta, formularz dodawania kontaktu oraz istniejące dane/formularze szczegółowe pozostają. Zakres czyszczenia dotyczy list; nie modyfikowano komponentów karty kontaktu ani jej formularza, w tym ich wewnętrznych edytorów.

Właściciel: wykorzystywany jest istniejący `user_id` i już dostępny profil zalogowanego użytkownika. Nazwa pojawia się wyłącznie przy zgodnym identyfikatorze. Dla innego lub nieustalonego właściciela jest `—`; nie przypisuje się wszystkim rekordom Tomasza i nie dodaje nowych zapytań o profile. To ograniczenie obecnego źródła danych, nie dowód braku właściciela w bazie.

## Testy

| Polecenie | Wynik |
| --- | --- |
| `npm run typecheck` | Kod wyjścia 0, bez błędów; końcowy przebieg po zmianach. |
| `npx vitest run src/lib/ui/surface-flags.test.ts src/components/pipelines/pipeline-board.test.tsx` | **18/18**, 2/2 pliki; 10:37:16 CET, 3,10 s. Istniejących asercji Lejka nie zmieniano. |
| `npx vitest run src/components/contacts/contacts-page-navigation.test.tsx` | Dodatkowa kontrola: **2/4**, dwa testy nawigacji przechodzą; dwa historyczne testy stale widocznej kolumny „Tagi” nie przechodzą. |
| `git diff --check` | Bez błędów. |

**Zastrzeżenie regresyjne:** `src/components/contacts/contacts-page-navigation.test.tsx:170` wymaga tagu lub kreski w szóstej komórce domyślnej listy. To założenie koliduje z nowym kontraktem, który ukrywa tagi i wymaga kolumny Właściciel. Plik leży poza zakresem; nie zmieniano go ani jego asercji. Nowy test potwierdza, że tagi znikają przy `false` i wracają przy `true`. Pełny zestaw nie jest oznaczony jako zielony; historyczny test wymaga dostosowania do obu wariantów flag w osobnym upoważnionym zakresie.

Testy renderowania korzystają wyłącznie z syntetycznych fixtures; efekty pobierające dane nie są montowane, a adapter bazy rzuca błąd przy próbie zapytania. Nie czytano produkcyjnych rekordów. Nie wykonywano testu przeglądarkowego, porównania pikseli ani odbioru LIVE — wynik techniczny nie stanowi zgodności wizualnej ani PASS Tomasza.

## Środowisko i koszt

W worktree brakowało `node_modules`. Dodano lokalny, ignorowany przez Git symlink do już istniejących zależności `/Users/mcrm-ai/wacrm-km2/node_modules`; bez instalacji, zmian manifestów i lockfile. Użyte środowisko zgłosiło Vitest 4.1.12. Wypisuje ostrzeżenie o przyszłym natywnym loaderze konfiguracji Vite; nie blokuje testów.

Nie uruchamiano bramki, skryptów Hermesa, dodatkowej sesji Codex, subagentów, płatnych modeli API ani Nous. Nie zmieniano bazy, RLS, sekretów, `.env`, uprawnień ani modeli AI. Nie odczytywano liczników abonamentu skryptami spoza repo; brak świeżego odczytu limitów nie został przedstawiony jako zerowe zużycie zasobów.

## Checkpoint KM3.2.09-A — 2026-11-06 10:37 CET

Zmiany pozostają nieskommitowane na HEAD `7099b46fe744ed925f4738a9268dfb12d81d3c14`, w czterech plikach źródłowych, nowym teście i tym raporcie. Wszystkie trzy nowe flagi są `false`. Wymagane testy: 18/18; typecheck bez błędów. Dodatkowa kontrola historycznego testu kontaktów: dwie niezgodne asercje tagów opisane powyżej. Publikacji nie wykonano; PASS nadaje wyłącznie Tomasz.

Docelowy wpis `~/.hermes/cache/k3/CHECKPOINT-*.md` **nie został zapisany**: aktywny sandbox dopuszcza zapis wyłącznie w repo i katalogach tymczasowych, a eskalacja uprawnień jest wyłączona. Stan zabezpieczono w tym raporcie wewnątrz dozwolonego repo. Nie obchodzono ograniczenia zapisu.
