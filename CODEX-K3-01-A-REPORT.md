# K3/01-A — Kontakt → Deal → Lejek

2026-10-31. Baza: `2a09889f7273ea976da517fa534eeea64ecd5a51`, gałąź `k3/01-crm-core`.
Zmiany wyłącznie robocze; bez commit/push/deploy, połączeń z bazą i płatnych API. Nie odczytano `.env*` ani danych klientów.

## Prześledzony obieg

`/contacts` → `ContactForm` → `ContactDetailView` (kartoteka pod `/contacts?open=ID`; brak `/contacts/[id]`) → `/pipelines?new=deal&contact=ID` → `DealForm` → `/deals/[id]`. `/deals` otwiera tę samą kartotekę. Lejek grupuje rekordy po `stage_id`. Przejrzano używane moduły `src/lib/{crm,contacts,deals,sales}` i migracje relacji/historii.

## Usterki i poprawki

Numery linii wskazują **kod bazowy 2a09889**, przed zmianami.

| Miejsce | Objaw i przyczyna | Poprawka |
|---|---|---|
| `src/app/(dashboard)/contacts/page.tsx:191`, `:220` | Wyszukiwanie od pierwszego znaku; formatowany telefon nie odpowiada zapisowi; interpunkcja trafia wprost do filtra OR. | Próg 3 znaków, cyfry telefonu, filtr `phone_normalized`, oczyszczenie składni. |
| `src/lib/contacts/dedupe.ts:48`; `src/components/contacts/contact-form.tsx:233`, `:296` | Awaria odczytu oznaczała „brak duplikatu”; walidacja zależała od wcześniejszego blur, również dla już zmienionego numeru. | Propagacja błędu, ponowna kontrola znormalizowanego numeru przy zapisie; stary wynik nie blokuje innego telefonu. Ścieżka „nieznany numer” korzysta z tego samego dopasowania. |
| `src/components/pipelines/deal-form.tsx:356` | Inline zapisywał surowy telefon, umożliwiając rozbieżne klucze dla `500…` i `+48500…`. | Walidacja i zapis E.164, kontrola istniejącego kontaktu przed INSERT. |
| `src/components/pipelines/deal-form.tsx:199`, `:535`, `:1258`; `src/app/(dashboard)/deals/[id]/page.tsx:415` | Formularz obcinał UTC do godziny lokalnej i zapisywał bez strefy; kartoteka interpretowała warszawską godzinę w strefie urządzenia. Termin przesuwał się po otwarciu/zapisie. | Spójne Europe/Warsaw ↔ ISO UTC we wszystkich polach datetime formularza i przy zapisie następnego kroku kartoteki. |
| `src/components/pipelines/deal-form.tsx:436`, `:468`, `:594` | Najpierw usuwano relacje; błędy DELETE/upsert firmy ignorowano, a błąd INSERT relacji kończył się sukcesem i zamknięciem formularza. | Upsert zastępstw przed usunięciem zbędnych relacji, kontrola każdego błędu, formularz pozostaje otwarty; zapamiętane ID umożliwia retry bez drugiego INSERT Deala. |
| `src/components/pipelines/deal-form.tsx:570`; `src/app/(dashboard)/deals/[id]/page.tsx:398`; `src/app/(dashboard)/pipelines/page.tsx:307`; `src/components/contacts/contact-form.tsx:348` | UPDATE bez zwracanych wierszy mógł zgłosić sukces przy 0 rekordów po RLS. Zwykły obiekt błędu Supabase tracił komunikat (`deal-form.tsx:609`, `contact-form.tsx:439`). | UPDATE z SELECT/single, propagacja oryginalnego komunikatu; Lejek aktualizuje kolumnę po udanym zapisie. |
| `src/app/(dashboard)/pipelines/page.tsx:106`, `:224` | Błąd odczytu lejków zwracał pustą listę i uruchamiał automatyczne tworzenie lejka/etapów. | Usunięte automatyczne seedowanie przy odczycie; widoczne błędy ładowania. Nie zmieniono nazw etapów. |
| `src/components/pipelines/deal-form.tsx:119`, `:196`; `src/app/(dashboard)/deals/[id]/page.tsx:257` | Błędy ładowania powiązań/historii wyglądały jak puste dane; pusty domyślny stage nie uruchamiał fallbacku. | Widoczne błędy; formularz blokuje zapis po nieudanym odczycie; fallback i sprawdzenie przynależności stage do lejka. |

Wiele Deali kontaktu już używało INSERT — zachowano ten mechanizm i dodano regresję. Historia zmian etapów już ma atomowy trigger w `supabase/migrations/054_package2_deal_process_integrity.sql:34`; nie dodawano drugiego wpisu po stronie aplikacji. Nie zmieniano schematu, ekranów ani zakładek Deala.

## Sprawdzenia

Komendy wykonano w `/private/tmp/k3-01-a-check`: kopia bieżącego kodu bez `.env*`, istniejące lokalne zależności, wyczyszczone środowisko, syntetyczna konfiguracja. Preload `/tmp/k3-no-network.cjs` blokuje połączenia sieciowe i odczyt `.env*` przed otwarciem pliku.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **FAIL**, exit 1: **1158 PASS / 1 FAIL**, 124 pliki testowe. Jedyny FAIL: `src/lib/mcrm/integration-coverage.test.ts:153`, starszy test dokumentacji próbuje czytać `.env.local.example`; odrzucono jako `K3_ENV_FILE_BLOCKED`. |
| Zestawy funkcjonalne K3 w powyższym uruchomieniu | **30/30 PASS**: formularz/kartoteka 12, Lejek 2, deduplikacja 13, wyszukiwanie 3. Dodano łącznie **19 testów**. |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów; liczba testów: nie dotyczy. |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 ostrzeżenia; liczba testów: nie dotyczy. |
| `npm run build:webpack` | **FAIL**, exit 1: `src/app/layout.tsx`, `next/font` nie może pobrać Inter z Google Fonts przy blokadzie sieci. Pełnego buildu nie potwierdzono; liczba testów: nie dotyczy. |

Testy wykonują rzeczywiste handlery formularza i kartoteki z kontrolowanymi hookami oraz bazą w pamięci: dodanie kontaktu, normalizacja/deduplikacja, dwa osobne Deale, właściwe ID, odczyt danych, zmiana etapu, termin zimowy/letni, zapis i ponowne wejście, błędy upsert/delete/INSERT i 0 wierszy UPDATE. Test Lejka sprawdza grupowanie/renderowanie po ponownym przekazaniu danych (adaptery DnD i karty). Historia: sprawdzono kontrakt istniejącego SQL, nie wykonanie triggera na Postgresie.

## Zmienione pliki

- `src/app/(dashboard)/contacts/page.tsx`
- `src/app/(dashboard)/deals/[id]/page.tsx`
- `src/app/(dashboard)/pipelines/page.tsx`
- `src/components/contacts/contact-form.tsx`
- `src/components/pipelines/deal-form.tsx`
- `src/components/pipelines/deal-form.test.tsx` — nowy
- `src/components/pipelines/pipeline-board.test.tsx` — nowy
- `src/lib/contacts/dedupe.ts`
- `src/lib/contacts/dedupe.test.ts`
- `src/lib/contacts/search.ts` — nowy
- `src/lib/contacts/search.test.ts` — nowy
- `src/lib/deals/persistence.ts` — nowy
- `src/lib/mcrm/integration-coverage.test.ts` — tylko dostosowanie asercji roli do wydzielonego modułu
- `CODEX-K3-01-A-REPORT.md` — nowy

`package-lock.json` był nieśledzony już na starcie; nie jest częścią paczki.

## Pozostałe ograniczenia

- Brak zielonego pełnego zestawu i buildu z przyczyn wskazanych powyżej. Nie obchodzono zakazu `.env*`, nie zmieniano layoutu/czcionek poza zakresem.
- Nie sprawdzano LIVE, rzeczywistych nazw/ID siedmiu etapów, wdrożenia migracji 054, RLS ani wpisu historii na prawdziwej bazie. Nazwy w testach pochodzą z istniejących stałych repo; nie potwierdzają stanu bazy.
- Nie wykonano przeglądarkowego E2E. Testy potwierdzają lokalną logikę na adapterach, bez połączeń z Supabase.
- Zapis Deala i relacji to osobne żądania, bez transakcji obejmującej oba. Częściowy zapis jest jawny i można go ponowić w otwartym formularzu; nie deklaruję atomowości całego obiegu.

ZABLOKOWANE: pełna walidacja — build wymaga pobrania Inter, a jeden starszy test wymaga zakazanego odczytu `.env*`.

---

## K3/01-B

**Opis historyczny paczki B. Wymaganie migracji 073 i gwarancje jej indeksów zostały odrzucone w K3/01-C poniżej. Obowiązuje implementacja C na istniejącym schemacie; migracji 073 nie stosować.**

2026-10-31. Ten sam katalog, gałąź `k3/01-crm-core`, baza `2a09889f7273ea976da517fa534eeea64ecd5a51`. Zachowano wcześniejsze zmiany A. Poniższy wynik zastępuje historyczny status walidacji A; nie oznacza odbioru LIVE.

### Regresja pierwszego lejka

`pipelines/page.tsx` wywołuje `loadOrSeedPipelines` z istniejącą, niezmienioną `SPEC_DEFAULT_STAGES` (7 etapów) i dotychczasową nazwą lejka `mFinanse`. Funkcja w `src/lib/deals/pipeline-bootstrap.ts` sprawdza konto i poprawną sesję, odczytuje lejek w granicach konta i tworzy go tylko przy udanym odczycie pustej listy. Błąd i brak danych nie są pustym sukcesem. Cała operacja odczyt → seed → ponowny odczyt współdzieli Promise dla klienta/konta, więc powtórzenie efektu StrictMode nie wykonuje drugiego INSERT. Po błędzie etapów próbuje wycofać wyłącznie własny nowo utworzony pusty lejek. Wszystkie błędy wracają do strony i widocznego toastu; błąd odświeżenia nie zastępuje dotychczasowej listy pustą.

Ochrona StrictMode dotyczy jednej instancji klienta w aplikacji. Nie jest blokadą transakcyjną między niezależnymi kartami/przeglądarkami. Tworzenie lejka nadal podlega istniejącemu RLS. Testy nie potwierdzają rzeczywistych uprawnień nowego konta na serwerze.

### Kontrakt ankiety i mapowanie 13 pól

`src/lib/questionnaires/contract.ts` zawiera zamknięty zestaw nazw. Render rzeczywistego formularza ma **dokładnie 13 kontrolek** (input/select/textarea), potwierdzone testem, w tym jedną kontrolkę wielokrotnego wyboru dokumentów. Parser odrzuca brakujące klucze, nieznane pola, nieprawidłowe typy, przekroczone długości, błędny telefon, brak zgody i wypełnioną pułapkę. Nie obcina odpowiedzi po cichu.

Skróty w tabeli: `responses` = `financial_questionnaire_submissions.responses`; `raw_payload` = `client_intakes.raw_payload`. Wszystkie 12 pól biznesowych są także opisane w notatce `contact_notes.note_text`, przypisanej do tego samego Kontaktu.

| Pole formularza/API | Zapis |
|---|---|
| `adults` | `responses.adults` i `raw_payload.adults`; tekst liczby całkowitej ≥1 albo jawnie pusty tekst |
| `amount` | `responses.amount` i `raw_payload.amount`; kwota/przedział jako tekst |
| `children` | `responses.children` i `raw_payload.children`; tekst liczby całkowitej ≥0 albo jawnie pusty tekst; `0` nie jest brakiem |
| `city` | `responses.city` i `raw_payload.city` |
| `consent` | `responses.consent`, `raw_payload.consent` oraz `consent_to_analysis=true` i czas `consented_at`; wyłącznie boolean `true` |
| `debts` | `responses.debts` i `raw_payload.debts` |
| `documents` | Pełna tablica `responses.documents` i `raw_payload.documents`, pobrana przez `FormData.getAll` |
| `goal` | `responses.goal` i `raw_payload.goal` |
| `insurance` | `responses.insurance` i `raw_payload.insurance` |
| `investments` | `responses.investments` i `raw_payload.investments` |
| `savings` | `responses.savings` i `raw_payload.savings` |
| `timeline` | `responses.timeline` i `raw_payload.timeline` |
| `website` | Wyłącznie honeypot: niepusty/nieprawidłowy → HTTP 400 przed zapisem; nie jest zapisywany jako odpowiedź ani w intake |

Dane tożsamości **nie są dodatkowymi polami wejściowymi ankiety**. Pochodzą z istniejącego przejścia `/formularz` → `sessionStorage.mcrmLeadContext`. Żądanie zawiera osobną kopertę `contact` (`name`, `phone`, `email`, `company`) i metadane `startedAt`. Telefon jest normalizowany do E.164 przed wyszukaniem. Koperta trafia do `submitted_*` submisji i `raw_payload.contact`; firma także do notatki. Brak kontekstu blokuje wysłanie i pokazuje odnośnik do istniejącego `/formularz`; nie dodano nowego ekranu. Kontekst pozostaje w sesji karty, umożliwiając ponowienie ankiety po odświeżeniu.

Jawnie puste odpowiedzi i pusta tablica dokumentów pozostają zachowane, a status to `partial` z listą braków. Brak klucza albo niewłaściwy typ oznacza HTTP 400. Komplet 12 odpowiedzi daje `submitted`. Wstępne podsumowanie powstaje lokalnie z pól — bez wywołania modelu.

**Wersja:** w kodzie aplikacji i migracjach nie ma identyfikatora `v1-2026-10`. Nie jest zapisany w formularzu, żądaniu API, `responses`, `raw_payload` ani kolumnie wersji ankiety. Istniejące wersje źródeł analiz bankowych nie wersjonują ankiety. Zgodnie ze zleceniem **nie dodano pola wersji do bazy**; nazwa zlecenia nie jest dowodem wersjonowania rekordu.

### Kontakt, ponowienia i trwałe powiązanie

- Ankieta korzysta z deduplikacji po znormalizowanym telefonie i istniejącego ograniczenia unikalności kontaktu (migracje 022/062), wraz z ponownym odczytem po wyścigu INSERT. Email nie łączy różnych telefonów w jeden Kontakt.
- `completePublicFormContact` w `src/lib/public-leads.ts` uzupełnia tylko puste `name`/`email`, z warunkiem porównującym poprzednią wartość przy UPDATE. Zachowuje niepuste dane i równoległe zmiany CRM. Dane finansowe i zgłoszona firma są dopisywane w submisji, intake i notatce; nie zastępują dotychczasowych pól Kontaktu.
- SHA-256 kanonicznego telefonu, tożsamości i odpowiedzi tworzy `submission_key`. Powtórka tej samej ankiety, także równoległa, korzysta z istniejącej submisji; nowy zestaw odpowiedzi tworzy nową submisję tego samego Kontaktu. Nie ma zapisu do tabeli `deals`.
- Trwałe FK: `financial_questionnaire_submissions.contact_id` oraz `client_intakes.contact_id`. `client_intakes.questionnaire_submission_id` i `contact_notes.questionnaire_submission_id` wskazują submisję. Unikalne indeksy oraz UPSERT z `ignoreDuplicates` zachowują jeden intake i jedną notatkę, bez nadpisania późniejszego statusu obsługi.
- Niepowodzenie któregokolwiek wymaganego zapisu daje błąd HTTP, widoczny w formularzu. Zapis kilku tabel nie jest jedną transakcją: przy awarii część danych może pozostać, a powtórzenie uzupełnia brakujący krok z tymi samymi identyfikatorami. Testy obejmują błędy i ponowienie.

### Migracja do przeglądu

`supabase/migrations/073_questionnaire_retry_integrity.sql` jest wyłącznie przygotowana w katalogu roboczym. Dodaje nullable `submission_key` i unikalny indeks konta/klucza submisji oraz nullable FK `questionnaire_submission_id` z unikalnymi indeksami w `client_intakes` i `contact_notes`. Nie zmienia istniejących rekordów ani nie uzupełnia ich wstecz. Starsze submisje bez klucza pozostają bez zmian; deduplikacja submisji obejmuje zapisy nową ścieżką. Kontakty są wyszukiwane także w istniejących rekordach.

Migracja 073 musi zostać zastosowana przez kierownika w odpowiednim środowisku przed uruchomieniem nowego zapisu. Bez niej API zwróci błąd odczytu/zapisu; nie udaje sukcesu. Nie wykonano migracji na żadnej bazie ani testu ograniczeń na rzeczywistym Postgresie.

### Testy i walidacja

Tak jak w A: kopia `/private/tmp/k3-01-a-check` bez `.env*`, lokalne zależności, wyczyszczone środowisko i preload `/tmp/k3-no-network.cjs` blokujący połączenia. Nie odczytywano sekretów ani danych klientów. Test dokumentacji, który w A próbował czytać `.env.local.example`, sprawdza teraz te same cztery nazwy kluczy w rzeczywistych konsumentach Kalendarza/Dysku Google; żaden test nie jest pomijany ani zastępowany fikcyjną zawartością `.env`.

| Komenda | Wynik końcowy |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1192/1192**, 126 plików; start 2026-10-31 15:29:45 Europe/Warsaw, czas 34,39 s |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 ostrzeżenia |
| Build | Nie uruchamiano zgodnie ze zleceniem; uruchamia kierownik |

Logi: `/tmp/k3-b-vitest.log`, `/tmp/k3-b-tsc.log`, `/tmp/k3-b-eslint.log`. `git diff --check`: PASS. Nie wykonano builda ani odbioru LIVE.

Testy B: 8 regresji pierwszego lejka; render 13 kontrolek; 28 testów przepływu ankiety, w tym pełne 12 odpowiedzi od `FormData` przez rzeczywisty handler API do adaptera bazy w pamięci, powtórka i równoległe wysłania, różne telefony o wspólnym emailu, uzupełnianie istniejącego Kontaktu, wyścig unikalnego klucza, jawne błędy zapisu i naprawa przy retry oraz błędne/niekompletne payloady. Wykonanie SQL/RLS i przeglądarkowe E2E pozostają poza tą lokalną weryfikacją.

### Pliki paczki B

- `src/app/(dashboard)/pipelines/page.tsx`
- `src/lib/deals/pipeline-bootstrap.ts` i `.test.ts` — nowe
- `src/app/ankieta/page.tsx`, `questionnaire-form.tsx`, `questionnaire-form.test.tsx` (test nowy)
- `src/lib/questionnaires/contract.ts` — nowy
- `src/lib/financial-questionnaires.ts` i `.test.ts`
- `src/lib/public-leads.ts` — helper uzupełnienia Kontaktu dla ankiety
- `src/lib/mcrm/integration-coverage.test.ts` — usunięty odczyt pliku środowiskowego z testu
- `supabase/migrations/073_questionnaire_retry_integrity.sql` — nowa, niewykonana
- `CODEX-K3-01-A-REPORT.md` — niniejsza sekcja

Handler `src/app/api/public/questionnaires/route.ts` zachowuje dotychczasowy format odpowiedzi i obsługę błędów; nowy kontrakt jest sprawdzany przez importowany parser i testowany przez ten handler. `package-lock.json` pozostaje poza paczką. Brak commit/push/deploy, płatnych wywołań i zmian rzeczywistej bazy.

**GOTOWE DO WERYFIKACJI** — lokalna paczka robocza; migracja 073 przygotowana, niewykonana.


## K3/01-C

2026-10-31, ta sama gałąź `k3/01-crm-core`. Zachowano wcześniejsze zmiany A/B. Zakres C: `src/lib/financial-questionnaires.ts`, `src/lib/financial-questionnaires.test.ts`, usunięcie roboczej migracji 073 i aktualizacja niniejszego raportu.

### Działanie bez migracji

- **Migracja `073_questionnaire_retry_integrity.sql`: ODRZUCONA i usunięta z katalogu roboczego.** Kod nie wymaga jej kolumn, indeksów, FK ani UPSERT na tych polach. Nie dodano żadnej migracji ani indeksu. Istniejący kontrakt tabel potwierdzono w migracjach 001/017/046/047/057, bez połączenia z bazą.
- SHA-256 kanonicznego telefonu, danych zgłoszenia i odpowiedzi zapisuje się jako **`responses.submission_key`** w istniejącej kolumnie JSONB submisji. Odczyt filtruje jednocześnie `account_id`, `contact_id` oraz `responses->>submission_key`. Powtórka tej samej ankiety zwraca zapisane ID; zmienione odpowiedzi tworzą nową submisję tego samego Kontaktu. Zmienny fingerprint żądania nie jest kluczem deduplikacji.
- Powiązania Kontaktu korzystają z istniejących `financial_questionnaire_submissions.contact_id`, `client_intakes.contact_id` i `contact_notes.contact_id`. Intake przechowuje `submission_key` i `submission_id` **wewnątrz `raw_payload`**. Nie ma odwołań do kolumny `questionnaire_submission_id`.
- Notatka jest odnajdywana w granicach konta i kontaktu po zachowanym prefiksie treści `Ankieta <ID>\n`. Przy INSERT ustawiane jest istniejące, wymagane `account_id`. Powtórzenie nie nadpisuje notatki ani statusu obsługi intake; brakujący etap częściowego zapisu zostaje uzupełniony. Błąd obowiązkowego odczytu/zapisu daje błąd HTTP; sukces po nieudanym INSERT submisji jest możliwy wyłącznie po odczytaniu faktycznie istniejącej, zgodnej submisji.
- Starsze rekordy bez klucza JSON pozostają nietknięte i nie podlegają deduplikacji wstecz. Zwykły zapis nie tworzy Deala. Zmiany A/B formularza, Kontaktu i Lejka pozostają zachowane.

### Wyścigi i rzeczywiste granice

Po INSERT wykonywany jest **read-after-write**: ponowne wyszukanie najwcześniejszej widocznej submisji (`created_at ASC, id ASC`, `LIMIT 1`). Gdy obie submisje są już widoczne, równoległe żądania wybierają to samo ID; także późniejsze sekwencyjne retry wybiera ten rekord, zamiast tworzyć kolejny. Odczyt z limitem obsługuje już istniejące duplikaty bez błędu `maybeSingle`.

**To nie jest atomowe ani dokładnie-jednokrotne przetwarzanie.** Bez ograniczenia unikalności/transakcji dwa lub więcej równoległych żądań mogą zostawić fizyczne duplikaty submisji, notatek i intake — do jednego nowego rekordu danej tabeli na każde ścigające się żądanie. Jeżeli później zatwierdzona transakcja ma wcześniejszy `created_at` (czas transakcji, nie commitu) lub ten sam czas i mniejsze ID, wcześniejsza odpowiedź HTTP może zawierać inne ID niż odpowiedź drugiego żądania/późniejszego retry. Zaimplementowany odczyt ogranicza wyścig do widocznego zbioru; nie gwarantuje zgodności odpowiedzi przy opóźnionym commicie. Test odtwarza również ten przypadek i potwierdza możliwość różnych ID. Nie dodano blokady działającej tylko w jednym procesie, która sugerowałaby ochronę wielu workerów.

Duplikatów nie usuwa się automatycznie. Powiązanie notatki z submisją jest znacznikiem w tekście, nie FK: usunięcie/zmiana prefiksu przez edycję notatki może spowodować dopisanie notatki przy retry. Usunięcie klucza z JSON również przerywa deduplikację. Odczyty JSON nie mają nowego indeksu; wraz ze wzrostem liczby rekordów koszt wyszukiwania może rosnąć, mimo zawężenia kontem i kontaktem. Są to jawne ograniczenia pracy bez zmiany schematu.

### Weryfikacja

Uruchomiono wymagane komendy na aktualnej kopii roboczej w `/private/tmp/k3-01-a-check`, bez `.env*`, z istniejącymi lokalnymi zależnościami. Wyczyszczone środowisko i syntetyczna konfiguracja; preload `/tmp/k3-no-network.cjs` blokował sieć oraz odczyty plików `.env*`. Nie korzystano z prawdziwej bazy, sekretów, danych klientów ani płatnego API.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1201/1201**, 126 plików; start 15:41:06 Europe/Warsaw, czas 32,04 s |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 istniejące ostrzeżenia |
| Build | Nie uruchamiano; uruchamia kierownik |

**37 testów przepływu ankiety** (B: 28) używa adaptera w pamięci odwzorowującego istniejące kolumny. Adapter odrzuca nieznane kolumny przy SELECT, filtrach, sortowaniu i zapisie; nie implementuje UPSERT ani unikalności submisji/notatek/intake z odrzuconej 073. Zachowuje istniejące ograniczenie telefonu Kontaktu. Pokrycie: pełny obieg FormData → parser → rzeczywisty handler API → submisja/intake/notatka; sekwencyjne retry; dwa równoległe INSERT-y i kanoniczny odczyt; fizyczne duplikaty powiązań; opóźniony commit i różne ID; porządek wyboru spośród duplikatów; izolacja konta/kontaktu; różne odpowiedzi; zachowanie obsłużonego intake i dopisku notatki; rekordy bez klucza; błędy odczytu/zapisu, w tym odczytu po INSERT, i naprawa przy retry. Test potwierdza też brak pliku 073.

Logi: `/tmp/k3-c-vitest.log`, `/tmp/k3-c-tsc.log`, `/tmp/k3-c-eslint.log`. Walidacja offline nie zastępuje wykonania SQL/RLS, testu rzeczywistego Postgresa ani odbioru LIVE. Bez commit/push/deploy, nowych ekranów i zmian produkcyjnych. `package-lock.json` pozostawiono bez zmian C.

**GOTOWE DO WERYFIKACJI** — zależność od migracji 073 usunięta; ryzyko wyścigu bez atomowości opisane powyżej.

## K3/01-D

2026-10-31, katalog `/Users/mcrm-ai/wacrm-k3`, gałąź `k3/01-crm-core`, bazowy HEAD `7389730ea76cecf1f3f7052a7d73fc329b4586c0`. Zachowano zmiany A/B/C. Dowód 403 na LIVE dla wdrożonego `2a09889` pochodzi ze zlecenia kierownika; nie wykonywano nowych żądań na LIVE.

### Przyczyna i poprawka

`isAllowedPublicFormOrigin` sprawdzała wyłącznie cztery stałe originy i nie otrzymywała adresu żądania. Aktualny host wdrożenia nie należał do listy, więc wszystkie trzy publiczne POST-y kończyły się 403 przed walidacją danych.

- Helper porównuje pełny origin z `request.url`: schemat HTTPS, dokładny host i port, bez dopasowań prefiksu/sufiksu ani wildcardów. Nie odczytuje `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto` ani `Forwarded` w celu dopuszczenia źródła. Nowy host wdrożenia nie wymaga dopisania nazwy hostingu do kodu.
- Zachowano cztery zatwierdzone originy i dodano `https://crm.makson.space`. `ALLOWED_PUBLIC_FORM_ORIGINS` rozszerza tę samą listę wpisami rozdzielonymi przecinkami, po obcięciu otaczających spacji. Porównanie używa pełnego originu znormalizowanego przez URL, włącznie z portem; wpisy z wildcardem, ścieżką, query, fragmentem lub danymi logowania są odrzucane.
- Produkcja odrzuca HTTP, localhost, origin `null`, host `null`, `file://`, inne schematy i nieprawidłowe wartości także wtedy, gdy zostały wpisane do konfiguracji. Poza produkcją zachowano dotychczasowe wyjątki `http://localhost:3000` i `http://127.0.0.1:3000`; lokalny HTTP może również przejść dokładne porównanie same-origin. Brak Origin pozostaje dozwolony, bez nagłówka odbijającego origin.
- POST-y `leads`, `questionnaires`, `bookings` przekazują adres żądania do tego samego helpera. Wspólne `publicFormCorsHeaders` i `publicFormOptionsResponse` zastąpiły lokalny helper CORS w leads; OPTIONS dodano także do questionnaires/bookings. Nagłówki CORS obejmują sukcesy i błędy, w tym 429 z zachowaniem nagłówków limitu. `Vary: Origin` jest ustawiane również bez odbicia originu.

**Stan wskazanych GET-ów:** w tej gałęzi katalog `src/app/api/public` zawiera wyłącznie trasy leads, questionnaires i bookings. Nie istnieje `/api/public/availability`, osobna trasa `/api/public/questionnaire` ani eksport GET ankiety. Nie było zatem drugiej listy originów GET do usunięcia ani istniejącego handlera do podłączenia. Nie tworzono nowych API. Wspólny helper CORS obsługuje także `GET, OPTIONS`; jego zachowanie dla GET sprawdzono bezpośrednio testami, bez deklarowania działania nieistniejących endpointów.

### Zmienione pliki D

- `src/lib/public-leads.ts` — wspólna polityka originów, CORS i preflight.
- `src/app/api/public/leads/route.ts` — przekazanie URL i wspólne CORS.
- `src/app/api/public/questionnaires/route.ts` — przekazanie URL, wspólne CORS i OPTIONS.
- `src/app/api/public/bookings/route.ts` — przekazanie URL, wspólne CORS i OPTIONS.
- `src/lib/public-form-origin.test.ts` — nowy zestaw regresji polityki i rzeczywistych handlerów.
- `CODEX-K3-01-A-REPORT.md` — niniejsza sekcja.

### Wyniki komend

Komendy uruchomiono na aktualnej kopii `/private/tmp/k3-01-a-check`, bez `.env*`, z istniejącymi lokalnymi zależnościami, wyczyszczonym środowiskiem i preloadem `/tmp/k3-no-network.cjs` blokującym sieć oraz odczyt plików `.env*`. Porównanie `src` kopii i katalogu roboczego nie wykazało różnic. Nie używano prawdziwej bazy, danych klientów, sekretów ani płatnych API.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1519/1519**, 127 plików; start 16:02:52, czas 24,23 s |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 istniejące ostrzeżenia |
| Build | Nie uruchamiano; uruchamia kierownik |

Nowy zestaw D: **318/318 PASS**. Sprawdza własny host LIVE i dowolny nowy własny host HTTPS, zatwierdzone domeny, dodatkowe originy z konfiguracji, dokładność portu, obce i podobne hosty, sfałszowane nagłówki Host/forwarded, HTTP w produkcji, wyjątki lokalne poza produkcją, nieprawidłowe originy i konfigurację, brak Origin, CORS GET helpera oraz preflight trzech rzeczywistych tras. Dla wszystkich trzech POST-ów dozwolony origin z pustym payloadem daje **400 walidacji**, a zabroniony **403** przed limitem i bazą. Testy blokują inicjalizację klienta bazy. Oddzielny przebieg ukierunkowany razem z istniejącymi testami leadów, rezerwacji i ankiety B/C: **370/370 PASS**.

Logi: `/tmp/k3-d-targeted.log`, `/tmp/k3-d-vitest.log`, `/tmp/k3-d-tsc.log`, `/tmp/k3-d-eslint.log`. `git diff --check`: PASS. Brak commit/push/deploy, nowych ekranów, zmian konfiguracji środowiskowej i zmian rzeczywistej bazy. Istniejący nieśledzony `package-lock.json` pozostaje poza paczką. Wyniki lokalne nie oznaczają naprawy już wdrożonego LIVE ani odbioru biznesowego.

**GOTOWE DO WERYFIKACJI**

## K3/01-E

2026-10-31, katalog `/Users/mcrm-ai/wacrm-k3`, gałąź `k3/01-crm-core`, bazowy HEAD `c9e715df11714a32c989133858f5cbcd176d1339`. Zachowano wcześniejsze zmiany A/B/C/D.

### Przywrócenie tożsamości

- Przywrócono cztery kontrolowane inputy bez `name`: **Imię i nazwisko**, **Telefon z kodem kraju**, **E-mail**, **Firma**. Cała sekcja „Dane kontaktowe” ma JSX identyczny z `2a09889` (porównanie tekstowe: PASS), w tym etykiety, kolejność i dwukolumnowy układ. Styl tych inputów również pochodzi z wersji bazowej.
- `sessionStorage.mcrmLeadContext` tylko wstępnie wypełnia edytowalne pola. Brak, uszkodzenie lub niedostępność kontekstu nie blokuje ręcznego wpisu ani przycisku wysyłki.
- Wymagane są imię i nazwisko oraz poprawny telefon; puste dane pokazują czytelny błąd i nie wywołują API. E-mail i firma pozostają opcjonalne. Parser serwera również odrzuca brak wymaganych danych przed dostępem do bazy; komunikaty nie odsyłają już do osobnego formularza.
- Formularz przed wysyłką normalizuje telefon do E.164 przez istniejące `parseCrmPhone`. Ten sam helper już obsługuje parser ankiety i `findOrCreateContact` używany przy deduplikacji; zachowano tę ścieżkę bez przebudowy zapisu.
- **17 kontrolek = 13 dotychczasowych pól + 4 pola tożsamości.** Lista i mapowanie `adults, amount, children, city, consent, debts, documents, goal, insurance, investments, savings, timeline, website` pozostały bez zmian. Nie zmieniono wyglądu pozostałych sekcji.

### Testy i zakres

Test renderowania sprawdza 17 kontrolek, dokładną listę 13 nazw, wymagane/opcjonalne inputy i dostępność przycisku bez kontekstu. Nowe 11 testów interakcji uruchamia rzeczywiste handlery komponentu z atrapą hooków React i FormData, bez DOM: ręczny wpis → sukces, prefill → edycja wszystkich czterech pól, brak/błędne imię lub telefon → błąd bez fetch, uszkodzony/niedostępny kontekst → możliwość wysyłki. Cztery dodatkowe testy rzeczywistego handlera API z bazą w pamięci potwierdzają odrzucenie braków bez zapisu i trzy kolejne zgłoszenia z telefonem zapisanym jako `500 100 200`, `+48 500-100-200`, `0048 500 100 200` → jeden Kontakt, jedna submisja, intake i notatka.

Zmiany: `src/app/ankieta/questionnaire-form.tsx`, `questionnaire-form.test.tsx`, nowy `questionnaire-form-interaction.test.tsx`, `src/lib/financial-questionnaires.ts`, `financial-questionnaires.test.ts`, komentarz w `src/lib/questionnaires/contract.ts` oraz niniejszy raport.

### Wyniki komend

Weryfikacja na kopii `/private/tmp/k3-01-a-check`, z identycznym `src`, migracjami i konfiguracją kontroli. Wyczyszczone środowisko, bez `.env*`; preload `/tmp/k3-no-network.cjs` blokował sieć i odczyt `.env*`. Użyto istniejących zależności, sztucznych danych i atrap usług.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1534/1534**, 128 plików; start 16:32:34 Europe/Warsaw, czas 32,22 s |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 istniejące ostrzeżenia |

Logi: `/tmp/k3-e-vitest.log`, `/tmp/k3-e-tsc.log`, `/tmp/k3-e-eslint.log`. `git diff --check`: PASS. Bez commit/push/deploy, nowych zależności, sekretów i prawdziwej bazy. Istniejący nieśledzony `package-lock.json` pozostaje poza paczką. Testy lokalne nie stanowią odbioru przeglądarkowego ani LIVE.

**GOTOWE DO WERYFIKACJI**

## K3/01-F

2026-10-31, zakończenie 16:46 CET (Europe/Warsaw), katalog `/Users/mcrm-ai/wacrm-k3`, gałąź `k3/01-crm-core`, bazowy HEAD `1db67a9d11e3b6a3d8b1e61d7e3f397cdc8c306a`. Zachowano zmiany A–E. Dowód awarii LIVE pochodzi ze zlecenia kierownika; nie wykonywano nowych żądań na LIVE.

### Przyczyna i poprawka

`/auth/callback` budował absolutny `Location` z `requestUrl.origin`, który w standalone Hostingera wskazuje wewnętrzny listener `https://0.0.0.0:3000`. Samo `next.startsWith('/')` dopuszczało również `//evil`. Podobnie Google Calendar OAuth używał adresu serwera do przekierowań oraz `redirect_uri`. Zaproszenia ufały nagłówkom bez obowiązkowej listy hostów i miały awaryjny adres strony marketingowej.

- Wspólny `relativeRedirect` zwraca **307 z względnym nagłówkiem Location**, ustawionym bezpośrednio w `NextResponse` (jego metoda `redirect()` wymaga URL absolutnego). Callback, oba przekierowania middleware i lokalne wyniki Google OAuth nie publikują hosta listenera. Parametry callbacku są nadal odczytywane z URL żądania, ale host z tego URL nie jest używany do tworzenia linków.
- `safeRedirectPath` odrzuca cele absolutne, `//evil`, odwrotne ukośniki, znaki sterujące, zakodowane warianty oraz ścieżki normalizujące się do podwójnego ukośnika. Niebezpieczne `next` daje `/dashboard`; zachowano `/reset-password` i `/join/<token>`.
- Politykę `isAllowedPublicFormOrigin` przeniesiono do wspólnego `src/lib/public-origin.ts`, z zachowaniem eksportu z `public-leads.ts`. Lista nadal rozszerza się przez `ALLOWED_PUBLIC_FORM_ORIGINS`; dodano dokładny origin obecnego LIVE `https://mediumseagreen-pelican-353577.hostingersite.com`, bez wildcardów. `0.0.0.0` jest odrzucane także po wpisaniu do konfiguracji. Zachowano regułę same-origin dla formularzy z D; test porównania schematów używa teraz nieujętego na liście hosta, ponieważ aktualny LIVE został jawnie dopuszczony.
- `getPublicAppOrigin` weryfikuje `NEXT_PUBLIC_SITE_URL`, a przy jego braku parę `x-forwarded-proto` + `x-forwarded-host`, ewentualnie bezpośredni `Host` z HTTPS. Każdy kandydat wymaga dokładnego dopuszczenia przez tę samą listę originów, bez wyjątku CORS same-origin, bez użycia `request.url`/`nextUrl.origin`. Listy proxy, niekompletne pary, obce domeny, inny port, ścieżki i dane logowania są odrzucane. Produkcja wymaga HTTPS. Usunięto osobną, opcjonalną politykę `ALLOWED_INVITE_HOSTS` i fallback do domeny marketingowej.
- Zaproszenie otrzymuje prawidłowy publiczny `/join/<token>`. Brak zaufanego originu, w tym nieprawidłowy jawny `NEXT_PUBLIC_SITE_URL`, daje **503 przed INSERT**. Google OAuth używa tego samego resolvera w inicjacji i wymianie kodu; nieznany origin blokuje rozpoczęcie/wymianę i daje względny powrót do ustawień.
- Rejestracja zawsze przekazuje jawne `emailRedirectTo` do publicznego `/auth/callback`, z adresem pochodzącym z `window.location.origin` przeglądarki. Zaproszenie zachowuje `next=/join/<token>` przez wymianę kodu. Reset hasła już używał poprawnego originu przeglądarki i `/auth/callback?next=/reset-password` — pozostawiono tę implementację i sprawdzono ją testem rzeczywistego handlera formularza.
- `/join/[token]` korzysta z względnych linków/API i powrotu na `/dashboard`, nie wymagał zmiany. Middleware przepuszcza callback także z aktywną sesją; testy potwierdzają zachowanie odświeżonych cookies przy przekierowaniach. Dalszy przegląd użyć `request.url` wykazał odczyty parametrów API i kontrolę CORS, bez kolejnych linków użytkownika wymagających poprawki.

Nie zmieniano danych logowania, wymiany kodu przez Supabase, RLS, schematu bazy, ekranów ani ustawienia potwierdzania e-mail.

### Pliki F

- `src/lib/auth/redirect.ts` — wspólne względne przekierowania i walidacja celu.
- `src/lib/public-origin.ts`, `src/lib/public-leads.ts` — wspólna polityka originów z kompatybilnym eksportem.
- `src/lib/auth/public-url.ts` — zaufany publiczny adres linków serwera.
- `src/app/auth/callback/route.ts`, `src/middleware.ts` — względne Location.
- `src/app/api/account/invitations/route.ts` — bezpieczne linki zaproszeń.
- `src/app/api/google-calendar/oauth/start/route.ts`, `callback/route.ts` — publiczne `redirect_uri` i względne powroty.
- `src/app/(auth)/signup/page.tsx` — jawny callback rejestracji i zachowanie zaproszenia.
- Nowe testy: `src/app/auth/callback/route.test.ts`, `src/app/auth/email-redirect.test.tsx`, `src/app/api/account/invitations/route.test.ts`, `src/lib/auth/public-url.test.ts`, `src/lib/google-calendar/oauth-origin.test.ts`.
- Rozszerzone/dostosowane testy: `src/middleware.test.ts`, `src/lib/public-form-origin.test.ts`.
- `CODEX-K3-01-A-REPORT.md` — niniejsza sekcja.

### Dowody i wyniki

Testy rzeczywistego handlera callbacku dla adresu `https://0.0.0.0:3000`, bez nagłówków, z poprawnymi nagłówkami proxy oraz z `x-forwarded-host: evil.example`, potwierdzają:

| Przypadek | Status / dokładny Location |
|---|---|
| Brak `code` | `307 /login?error=missing_auth_code` |
| Błędny `code` | `307 /login?error=auth_callback_failed` |
| Poprawny `code`, brak `next` | `307 /dashboard` |
| Poprawny `code`, `next=//evil` | `307 /dashboard` |
| Poprawny `code`, lokalne `next` | `307 /reset-password` lub `/join/synthetic-token` |

Dodano **102 testy**: 48 callbacku, 33 resolvera originu, 5 API zaproszeń, 6 Google OAuth, 4 formularzy rejestracji/resetu i 6 middleware. Ukierunkowany zestaw razem z regresją D: **430/430 PASS**. Testy używają atrap Supabase, cookies i fetch; nie wysyłają e-maili ani żądań OAuth. Test Google potwierdza identyczny publiczny `redirect_uri` w obu etapach, a zaproszeń — brak zapisu przy obcym/nieznanym hoście.

Wymagane komendy uruchomiono na kopii `/private/tmp/k3-01-a-check`, z identycznym `src` (porównanie `diff -qr`: brak różnic) i istniejącymi zależnościami. Kopia nie zawiera `.env*`; wyczyszczone środowisko procesu, syntetyczna konfiguracja i preload `/tmp/k3-no-network.cjs` blokują sieć oraz odczyt `.env*`. Bez prawdziwej bazy, klientów, sekretów i płatnych API.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1636/1636**, 133 pliki; start 16:45:44, czas 22,30 s |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 istniejące ostrzeżenia |

Przed końcowym przebiegiem poprawiono dwa błędy typowania nowych danych testowych wykryte przez TypeScript. Logi końcowe: `/tmp/k3-f-vitest.log`, `/tmp/k3-f-tsc.log`, `/tmp/k3-f-eslint.log`; testy ukierunkowane: `/tmp/k3-f-targeted.log`. `git diff --check`: PASS.

Bez commit/push/deploy, zmian `.env`, sekretów i prawdziwej bazy. Istniejący nieśledzony `package-lock.json` pozostawiono poza paczką. Nie uruchamiano builda. Lokalne wyniki nie są odbiorem LIVE ani dowodem dostarczenia e-maila; nie odczytywano i nie zmieniano zewnętrznej listy dozwolonych redirectów Supabase ani ustawień Google OAuth.

**GOTOWE DO WERYFIKACJI**

## K3/01-G

2026-10-31, katalog `/Users/mcrm-ai/wacrm-k3`, gałąź `k3/01-crm-core`, bazowy HEAD `411a95fcbdf15731b366966218f93e035dd12444`. Zachowano bazę `2a09889` i commity A–F. Zmiany wyłącznie lokalne, bez commit/push/deploy.

### Jedna ankieta, dwie ścieżki

- **Publiczna:** w istniejącym `LeadForm` dodano jeden opcjonalny, domyślnie niezaznaczony checkbox „Chcę od razu wypełnić pełną ankietę badania potrzeb”. Dopiero po skutecznym POST `/api/public/leads` i zapisaniu dotychczasowego `sessionStorage.mcrmLeadContext` następuje `router.push('/ankieta')`. Bez zaznaczenia pozostaje obecne potwierdzenie i linki. Błąd wysłania nie przekierowuje. Checkbox nie jest dodatkowym polem payloadu ankiety ani leadu.
- **Doradca:** link „Wypełnij ankietę” znajduje się w istniejącym wierszu informacji karty Kontaktu. Otwiera `/ankieta?contact=<uuid>`. Serwer rozwiązuje sesję, członkostwo przez `getCurrentAccount`, jawne `account_id` i RLS przed odczytem danych. Firma pochodzi z powiązanej firmy (preferowana główna), z fallbackiem do istniejącego `contacts.company`. Niepoprawny identyfikator, tablica parametrów, brak sesji/profilu, obcy Kontakt i błąd odczytu dają zwykłą ankietę publiczną, bez danych z parametru i bez klienta admin. Kontekst CRM ma pierwszeństwo przed publicznym sessionStorage. Klucz komponentu po ID Kontaktu zapobiega zachowaniu poprzedniej tożsamości przy zmianie kontaktu w nawigacji.
- Obie ścieżki renderują **ten sam `FinancialQuestionnaireForm`**, z niezmienionymi 13 nazwanymi polami (`adults, amount, children, city, consent, debts, documents, goal, insurance, investments, savings, timeline, website`) i czterema edytowalnymi polami tożsamości. Nie zmieniono plansz, układu sekcji ankiety ani nazw etapów lejka.
- **Wspólny zapis:** publiczny POST `/api/public/questionnaires` oraz chroniony POST `/api/questionnaires?contact=<uuid>` korzystają z tego samego parsera i `saveFinancialQuestionnaire`. Chroniony POST ponownie sprawdza bieżącą sesję, rolę co najmniej `agent`, konto i widoczność Kontaktu przez RLS przed uruchomieniem wspólnego zapisu. Viewer może odczytać dozwolony kontekst, ale nie może zapisać jako doradca. Utrata sesji/uprawnień podczas wypełniania daje jawny błąd, bez automatycznego przełączenia zapisu na publiczny.
- Publiczny handler nie używa identyfikatora z URL. Payload nie pozwala przemycić `contactId`, `source`, `crm` ani `submitted_by`. Źródło i autor są ustalane po stronie serwera. Publiczna ankieta zachowuje istniejące źródło `makson.space/ankieta`; wcześniejszy formularz zapisuje `makson_space_form`. W ścieżce doradcy źródło wynosi `crm`, a autor to faktycznie zalogowany użytkownik.
- Publiczny zapis używa dotychczasowej deduplikacji E.164 i uzupełnia puste imię/e-mail Kontaktu. Doradca zachowuje wskazane ID Kontaktu i aktualizuje jego imię, telefon E.164 oraz e-mail. Numer zajęty przez inny Kontakt we własnym koncie daje jawne **409**, bez tworzenia nowego Kontaktu ani przepinania ankiety. Poprawiona nazwa firmy pozostaje w migawce ankiety i notatce; nie zmienia automatycznie kartoteki firm ani relacji Kontakt–Firma.
- **Zakaz Deala:** żaden z obu handlerów ani wspólny zapis nie wykonuje operacji na `deals`. Działanie jest przypisane do Kontaktu; nie tworzy ani nie aktualizuje Deala.

### Mapowanie zapisu — istniejące tabele i kolumny

| Tabela | Zapis / powiązanie |
|---|---|
| `contacts` | `account_id`, `user_id`, `phone`, `name`, `email`; publiczne find-or-create po znormalizowanym telefonie; CRM aktualizuje wskazany i ponownie sprawdzony `id` w swoim koncie |
| `public_lead_submissions` | Dotychczasowe zgłoszenie `/formularz`: `contact_id`, `submitted_*`, `source=makson_space_form`, `consent_to_contact`, `consented_at`, `created_at` (domyślny czas bazy) |
| `financial_questionnaire_submissions` | `account_id`, `contact_id`, `submitted_name/phone/email/company`, `responses`, `status`, `missing_items`, `preliminary_analysis`, `consent_to_analysis`, `consented_at`, `created_at` (domyślny czas bazy), `request_fingerprint`, `user_agent`; w istniejącym JSON `responses`: odpowiedzi oraz metadane `submission_key`, `source`, `submitted_by` (UUID doradcy albo null dla klienta publicznego) |
| `contact_notes` | `account_id`, `contact_id`, `user_id`, `note_text`, `created_at` (domyślny czas bazy); historia „Ankieta <ID>”, odpowiedzi/podsumowanie, zgoda, zgłoszona firma; autor CRM to doradca, dla publicznej ścieżki dotychczasowy użytkownik audytowy konta |
| `client_intakes` | `account_id`, `contact_id`, `intake_type=ankieta`, `source`, `status=nowe`, `submitted_at/created_at` (domyślne czasy bazy); istniejący `raw_payload`: odpowiedzi, migawka czterech danych tożsamości, `submission_key`, `submission_id`, `source`, `submitted_by`, `consent_to_analysis` |
| `sales_activities` | `account_id`, `user_id`, `contact_id`, `activity_type=zadanie`, `activity_status=PLANOWANE`, `completed=false`, `source`, `title=Ankieta <ID>`, istniejące `next_action`; działanie wskazuje uzupełnienie braków albo omówienie ankiety i przygotowanie spotkania. Bez wymyślania terminu (`next_action_date`) na podstawie opisowej odpowiedzi klienta; `occurred_at/created_at` korzystają z domyślnego czasu bazy |

Nie dodano tabel, kolumn, indeksów ani migracji; odrzucona w C migracja 073 pozostaje nieobecna. W istniejącym zapisie notatki z `/formularz` uzupełniono wymagane `contact_notes.account_id`; wykrył to nowy test obu rzeczywistych handlerów na adapterze odrzucającym brak tej kolumny.

### Ponowienia i granice gwarancji

Powtórzenie takiego samego zgłoszenia ankiety, również z innym formatem telefonu, używa tej samej submisji, notatki, intake i działania. Zmienione odpowiedzi tworzą kolejną pozycję historii. Klucz publiczny zachowuje dotychczasowy algorytm C; klucz CRM dodatkowo uwzględnia ścieżkę, doradcę i wskazany Kontakt. Te same odpowiedzi zapisane raz przez klienta i raz przez doradcę pozostają dwiema pozycjami historii z właściwym autorstwem. Retry nie nadpisuje obsłużonego intake, dopisków notatki ani istniejącego działania. Nieudany etap zwraca błąd; retry uzupełnia brakującą część zapisu.

**Zachowano ograniczenie C: brak atomowości i unikalności submisji w istniejącym schemacie.** Równoległe żądania w wielu workerach mogą zostawić fizyczne duplikaty submisji/notatek/intake/działań. Zwykłe sekwencyjne ponowienie jest sprawdzone bez duplikatów; pełna gwarancja dokładnie jednego zapisu przy wyścigu nie jest spełniona. Nie przywracano odrzuconej migracji i nie dodawano pozornej blokady tylko w jednym procesie. Istniejące testy wyścigów nadal pokazują tę granicę. Zapis wielu tabel nie jest transakcją; po błędzie część danych może już istnieć i zostać wykorzystana przy ponowieniu.

### Testy i wyniki komend

Dodano **32 przypadki** względem F. Ukierunkowany zestaw ankiety: **85/85 PASS**, 3 pliki. Obejmuje rzeczywiste handlery komponentów (atrapy hooków/FormData), przekierowanie tylko po zaznaczeniu i sukcesie, kontekst/pre-fill, brak przekierowania po błędzie, edycję danych CRM, te same 13+4 kontrolki w obu wariantach, rzeczywisty resolver sesji/konta i stronę `/ankieta`, brak ujawnienia danych, ponowną autoryzację POST, odrzucenie widza, źródło/autora, konflikt telefonu, powtórzenie bez duplikatów, zachowanie działania i jawne błędy. Oddzielny test obu rzeczywistych POST-ów `/leads` → `/questionnaires` z kolejnymi formatami telefonu potwierdza jeden Kontakt, jedną submisję ankiety, jeden intake, jedno działanie i dwie właściwe notatki (zgłoszenie oraz ankieta). Adapter odrzuca operacje na nieznanych tabelach, w tym `deals`; testy obu ścieżek jawnie sprawdzają brak jakiegokolwiek wywołania tej tabeli.

Końcowe wymagane komendy wykonano w `/private/tmp/k3-01-a-check`, z identycznym `src` (`diff -qr`: brak różnic), istniejącymi zależnościami, wyczyszczonym środowiskiem i pustymi konfiguracjami npm. Kopia nie zawiera `.env*`; preload `/tmp/k3-no-network.cjs` blokuje sieć i odczyt `.env*`. Wyłącznie syntetyczne dane i adapter w pamięci; bez usług AI i prawdziwej bazy.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1668/1668**, 133 pliki; start **17:52:03 CET**, czas **18,63 s** |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, **43 dotychczasowe ostrzeżenia** |
| `git diff --check` | **PASS** |

Logi: `/tmp/k3-g-targeted.log`, `/tmp/k3-g-vitest.log`, `/tmp/k3-g-tsc.log`, `/tmp/k3-g-eslint.log`. Pierwszy przebieg testów wykrył brak obsługi spacji w SELECT w nowo rozszerzonym adapterze; poprawiono adapter. Nawigację zmieniono na router Next, usuwając nowe ostrzeżenie lint. Próba uruchomienia npm z tym samym pustym plikiem konfiguracji użytkownika i globalnej zakończyła się przed uruchomieniem kontroli; końcowe przebiegi powyżej korzystają z dwóch oddzielnych plików i przeszły.

### Zmienione pliki G

- `src/app/formularz/lead-form.tsx` — checkbox i przejście po sukcesie.
- `src/app/ankieta/page.tsx` — serwerowe rozpoznanie uprawnionego kontekstu, ten sam formularz.
- `src/app/ankieta/questionnaire-form.tsx` — kontekst CRM i wybór chronionego endpointu.
- `src/lib/questionnaires/crm-context.ts` — nowy resolver kontekstu sesji/konta/Kontaktu.
- `src/app/api/questionnaires/route.ts` — nowy chroniony adapter HTTP do wspólnego zapisu.
- `src/components/contacts/contact-detail-view.tsx` — link w istniejącej karcie Kontaktu.
- `src/lib/financial-questionnaires.ts` — wspólny zapis obu ścieżek, źródło/autor, korekta Kontaktu i działanie.
- `src/lib/public-leads.ts` — wymagane konto notatki pierwotnego zgłoszenia.
- `src/lib/financial-questionnaires.test.ts` — rozszerzony adapter pamięci i regresje obu ścieżek.
- `src/app/ankieta/questionnaire-form-interaction.test.tsx` — przejście publiczne i interakcje doradcy.
- `src/app/ankieta/questionnaire-form.test.tsx` — kontrakt 13+4 w obu wariantach.
- `CODEX-K3-01-A-REPORT.md` — niniejsza sekcja.

### Niepotwierdzone / niewykonane

- Nie wykonano przeglądarkowego E2E ani porównania plansza ↔ LIVE. Testy komponentów używają atrap hooków, bez prawdziwego DOM i rzeczywistego routera Next.
- Nie sprawdzano publicznego `makson.space`, wdrożenia Hostingera, realnych cookies/logowania, polityk RLS, triggerów i domyślnych czasów na rzeczywistym Postgresie. Brak wywołania `deals` w kodzie i adapterze nie stanowi audytu triggerów produkcyjnej bazy.
- Nie potwierdzono pełnej odporności na równoległe żądania; znane ograniczenie C opisano powyżej. Nie zmieniano schematu ani istniejących rekordów.
- Nie wykonano builda, commit, push ani deploy. Nie zmieniano `.env`, sekretów, plansz, lejka i danych klientów. Zastany nieśledzony `package-lock.json` pozostawiono poza paczką. Wyniki lokalne nie stanowią odbioru biznesowego LIVE.

**GOTOWE DO WERYFIKACJI**

## K3/01-H

2026-10-31. Katalog `/Users/mcrm-ai/wacrm-k3`, gałąź `k3/01-crm-core`, zastany HEAD `eb008dab8f0bcd46885a602d16ded315b8baed03`. Wskazany w zleceniu `2ccb69a` nie jest dostępny w lokalnych obiektach Git. Nie cofano ani nie odtwarzano wcześniejszych zmian; poprawkę wykonano na zastanym kodzie.

### Poprawka zgodności

- Usunięto odrzucanie nieznanych kluczy. Parser przyjmuje dotychczasowy bezpośredni payload CRM (13 pól plus `contact` i `startedAt`) oraz publiczną kopertę z czterema polami tożsamości na głównym poziomie, `responses`, `preparationPlan` i płaskimi duplikatami. Koperty muszą być obiektami; ich wartości mają pierwszeństwo przed płaskimi odpowiednikami, także gdy są puste. Nie stosuje się fallbacku do starej wartości po błędzie typu zagnieżdżonego pola.
- Zachowano walidację wymaganych odpowiedzi i znanych typów, imienia, telefonu normalizowanego do E.164, zgody wyłącznie `true`, opcjonalnego e-maila, długości i honeypotu. Puste zagnieżdżone `website` nie omija wypełnionej pułapki na głównym poziomie. Brak imienia/telefonu/zgody daje czytelny błąd 400 przed dostępem do bazy.
- Wszystkie dodatkowe niepuste odpowiedzi z głównego poziomu i obu kopert są zachowane w istniejącym JSON `financial_questionnaire_submissions.responses` oraz `client_intakes.raw_payload`, także tablice/obiekty i wartości `0`/`false`. Plan z koperty trafia również do istniejącego `preparation_plan`. Dodatkowe pola nie generują fałszywych braków ani etykiet `undefined` w notatce. Pola tożsamości i techniczne elementy koperty pozostają poza odpowiedziami.
- Metadane serwera pozostają nadrzędne. Przy kolizji z nazwami metadanych oryginalne odpowiedzi są dodatkowo zachowane w `original_answers`; przesłane `source`, `submitted_by`, `crm` czy `contactId` nie nadają uprawnień ani nie zmieniają konta/Kontaktu/autora zapisu.
- Klucz ponowienia zachowuje algorytm C i dotychczasową kolejność pól CRM; dodatkowe klucze są porządkowane. Identyczna ankieta tworzy jeden komplet rekordów przy sekwencyjnym ponowieniu, również po zmianie kolejności kluczy obu kopert. Zmiana dodatkowej odpowiedzi tworzy następną pozycję historii. **Zachowano ograniczenie C: brak transakcji/unikalnego indeksu oznacza możliwość fizycznych duplikatów przy równoległych żądaniach wielu workerów.**
- Bez zmian tabel, migracji, 13 nazw kontraktu CRM, wyglądu formularzy i handlerów HTTP. Test dokładnie sprawdza dotychczasową odpowiedź 201 z `ok`, `status`, `missingItems`, `preparationItems`, `message`; nie dodano pola odpowiedzi ani nowego zachowania `preparationItems`.

### Testy i źródło fixture

Dodano 21 przypadków regresji H; usunięto jeden nieaktualny przypadek wymagający 400 za nieznane pole. Testy bezpieczeństwa G dostosowano do akceptacji dodatkowych kluczy, nadal sprawdzając autorytatywne metadane serwera i brak przejęcia kontekstu CRM.

Fixture zawiera 33 odpowiedzi, 5 pól przygotowania, 4 pola tożsamości oraz płaskie duplikaty. Nazwy pochodzą z pierwotnego parsera `2a09889:src/lib/financial-questionnaires.ts`, wartości są wyłącznie syntetyczne. Test rzeczywistego POST potwierdza 201 oraz zachowanie każdej niepustej odpowiedzi i każdego pola przygotowania w obu zapisach JSON. Pozostałe przypadki obejmują payload CRM, koperty bez duplikatów, pierwszeństwo pustych/wypełnionych wartości, nieznane klucze na każdym poziomie, braki tożsamości/zgody, honeypot, błędne typy, retry i historię zmienionej odpowiedzi.

**Ograniczenie dowodu:** nie uzyskano aktualnego payloadu ani kodu publicznej witryny. Próby odczytu `https://makson.space/ankieta/` zakończyły się niedostępnością w narzędziu web, błędem DNS w lokalnym `curl` i niedostępnym hostem przeglądarki. Fixture odtwarza strukturę 33+5 ze zlecenia i nazwy z historii repo; nie jest przechwyconym JSON-em bieżącej produkcji. Nie wysyłano formularza ani testowych danych na LIVE.

Weryfikacja: kopia `/private/tmp/k3-01-a-check`, identyczne `src` (`diff -qr`: brak różnic), istniejące zależności, wyczyszczone środowisko, dwa puste pliki konfiguracji npm. Preload `/tmp/k3-no-network.cjs` blokuje połączenia sieciowe i odczyt `.env*`. Testy używają bazy w pamięci; bez rzeczywistej bazy, klientów, sekretów i usług AI.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | **PASS**, exit 0: **1688/1688**, 133 pliki; start 19:21:12 CET, czas 27,80 s |
| `npx tsc --noEmit` | **PASS**, exit 0, 0 błędów |
| `npx eslint src` | **PASS**, exit 0, 0 błędów, 43 dotychczasowe ostrzeżenia |
| `git diff --check` | **PASS** |

Logi: `/tmp/k3-h-targeted.log`, `/tmp/k3-h-vitest.log`, `/tmp/k3-h-tsc.log`, `/tmp/k3-h-eslint.log`.

Zmienione pliki H: `src/lib/financial-questionnaires.ts`, `src/lib/financial-questionnaires.test.ts`, nowy `src/lib/questionnaires/public-payload.fixture.ts`, niniejszy raport. Zastany nieśledzony `package-lock.json` pozostawiono poza paczką. Bez commit/push/deploy i zmian konfiguracji środowiska. Wyniki lokalne nie stanowią odbioru LIVE.

**GOTOWE DO WERYFIKACJI**


## K3/01-I

2026-10-31. Poprawka lokalna na zastanej gałęzi `k3/01-crm-core`, HEAD `40f0c81efbb8920bf0e181afad035ab1c0338e9f`. W lokalnym repo brak wskazanej `k3/01-crm-base` i obiektu `a52a890`; nie cofano wcześniejszych zmian.

**Przyczyna:** potwierdzono, że błąd odczytu `sales_activities` był zamieniany na wyjątek HTTP 500 już po zapisaniu submisji, notatki i intake. Analogicznie działał błąd insertu działania. Oryginalny kod błędu Supabase był tracony. Samo zapytanie (`id`, `account_id`, `contact_id`, `title`, `limit(1).maybeSingle()`) jest zgodne z migracją 044, pola zapisu z 058/059, a publiczny handler używa klienta admin z kluczem service role. Nie znaleziono prostej lokalnej pomyłki kolumny lub klienta. **Dokładna przyczyna błędu Supabase na produkcji pozostaje niepotwierdzona** bez jego oryginalnego kodu/logu i stanu wdrożonego schematu/uprawnień. Migracje 051/059 jawnie nadają dostęp do działań roli `authenticated`, a 056 nie obejmuje tej tabeli dla `service_role`; to trop dotyczący uprawnień, nie dowód ich braku w produkcji. Nie zmieniano uprawnień ani schematu na podstawie przypuszczenia.

**Poprawka:** cały blok działania jest best-effort, zarówno dla zwróconego `error`, jak i rzuconego wyjątku. Błąd odczytu pomija insert. Błąd działania nie przerywa sukcesu ankiety: handler nadal zwraca 201 z dotychczasowymi `ok`, `status`, `missingItems`, `preparationItems`, `message`. Log serwera `financial_questionnaire_activity_failed` zawiera wyłącznie `operation` (`select`/`insert`) i sprawdzony kod SQLSTATE/PostgREST albo `UNKNOWN`; bez treści błędu, danych klienta, identyfikatorów i sekretów. Nie zmieniono modelu danych, 13 pól, API ani wyglądu.

**Idempotencja/testy:** identyczne sekwencyjne ponowienia zachowują jedną submisję i jedno działanie. Po awarii retry uzupełnia brakujące działanie; po utracie odpowiedzi insertu rozpoznaje już zapisane. Testy obejmują sukces, zwrócone i rzucone błędy odczytu/insertu, retry, częściową ankietę i brak danych osobowych w logu/odpowiedzi. Zaktualizowano wcześniejsze oczekiwania 500 dla działania oraz adapter testowy, aby poprawnie propagował odrzucenie Promise przy insercie. Zachowano wcześniejsze ograniczenie: brak unikalnego indeksu/transakcji nie gwarantuje deduplikacji równoległych żądań wielu workerów.

| Komenda | Wynik |
|---|---|
| `npx vitest run` | PASS, exit 0: 1693/1693, 133 pliki; ankieta 91/91 |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npx eslint src` | PASS, exit 0: 0 błędów, 43 dotychczasowe ostrzeżenia |
| `git diff --check` | PASS |

Wymagane kontrole wykonano w `/private/tmp/k3-01-a-check` z identycznym `src` (potwierdzone `diff -qr`), wyczyszczonym środowiskiem i blokadą sieci oraz odczytu `.env*` przez `/tmp/k3-no-network.cjs`. Wyłącznie syntetyczna baza w pamięci. Logi końcowe: `/tmp/k3-i-vitest.log`, `/tmp/k3-i-tsc.log`, `/tmp/k3-i-eslint.log`. Pierwszy test celowany wykrył brak przekazania callbacku odrzucenia w adapterze testowym; poprawiono go przed pełnym przebiegiem.

Zmienione pliki: `src/lib/financial-questionnaires.ts`, `src/lib/financial-questionnaires.test.ts`, niniejszy raport. Bez commit/push/deploy, dostępu do prawdziwej bazy, odczytu `.env` i sekretów. Zastany nieśledzony `package-lock.json` pozostawiono bez zmian. Wynik lokalny nie potwierdza naprawy LIVE ani dokładnego źródła błędu Supabase.

**GOTOWE DO WERYFIKACJI**
