# KM3.2.19 — wspólna rama Bigin

09.11.2026. **Kod przygotowany i sprawdzony lokalnie. Odbiór: NIE PASS — pełne kryterium nie jest spełnione.** PASS nadaje wyłącznie Tomasz. Bez commita, pushowania i publikacji.

## Stan wejściowy i źródła

- Zadany BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`; potwierdzony jako przodek HEAD.
- Worktree: `/Users/mcrm-ai/wacrm-a`, początkowo czysty, detached HEAD `81a3a2660bacc33e16b4a3cd036fbffe9fbaedd3`. To `b168ff2` z już dołączonym KM3.2.18. HEAD nie zmieniono. Zmiany niniejszej paczki są niezacommitowanym diffem względem tego HEAD.
- Zadana gałąź źródłowa: `k3/bigin-02b-20261105`; nie przełączano gałęzi ani innych worktree.
- Odczytano lokalne skills `k3-screen-delivery`, `mcrm-wykonawca`, lokalne kopie D1/D2 oraz tokeny `src/lib/ui/layout-geometry.ts`. Obejrzano wskazane obrazy `bigin_hash_contacts.png`, `bigin_card_contact.png`, `bigin_pipeline_1536.png` w `~/.hermes/k3/render/`.
- Zakres i zakaz publikacji z TASK-KM3.2.19 mają pierwszeństwo nad starszą procedurą wdrożenia ze skills. Nie zmieniano kolejki/checklisty KM ani statusu właścicielskiego.

## Zmiany i siedem ekranów

| Ekran | Wynik w kodzie |
| --- | --- |
| Kontakty — lista | Zachowano tabelę Bigin, geometrię i istniejące funkcje. Przyciski, obramowania, hover i tekst korzystają ze zmiennych palety powłoki; bez klas emerald/slate na podstawowej powierzchni. |
| Firmy — lista | Zachowano tabelę, wyszukiwanie, wybór i nawigację. Tło treści i kolory korzystają z tokenów; dotychczasowe dodatki nadal zależą od `companiesExtensions`. |
| Karta kontaktu | W pliku strony dodano podstawową kartę z panelem pól i czterema zakładkami: Oś czasu, Komentarze, Aktywności, Wiadomości. Stary `ContactDetailView` pozostał bez zmian i wraca przy `contactsExtensions = true`. |
| Karta firmy | Zachowano pola, cztery zakładki i edycję. Nadpisano również kolory odziedziczone z komponentu zakładek. Podstawowa zakładka aktywności pokazuje tytuł i datę; dotychczasowy rozbudowany `ActivityHistory` pozostał pod `companiesExtensions`. |
| Aktywności | Domyślnie tabela: checkbox / Temat / Termin / Powiązanie / Właściciel. Odczyt istniejących `sales_activities`, linki do Kontaktu/Firmy/Deala, zaznaczanie, stany ładowania/pusty/błąd i ponowienie. Cały `ActivityBoard08`, w tym dodatki, pozostaje pod nową `activitiesExtensions = false`. |
| Dzisiaj | Zachowano istniejącą listę dnia i jej tokeny. Dawne panele, KPI, kafelki i szybkie akcje pozostały w kodzie pod `dashboardExtensions = false`; wymieniono klasy emerald/slate na zmienne palety. |
| Kalendarz | Zachowano siatkę tygodnia, godziny, weekendy, dzień/miesiąc i kafelki zdarzeń. Kolory z tokenów. Dodatkowy opis i boczny panel zależą od istniejącej `cardExtensions = false`. |

Panel i górny pasek pozostają w istniejącym `AppShell`: `#093E52`, biały tekst. Nie zmieniano powłoki ani geometrii. Listy używają bieli, wiersze `#FCFDFD`, obramowania `#E0E9EE`, hover `#F0F7FB`, linki `#7EB5F4`. Nowe powierzchnie dziedziczą zmienne z tej powłoki. Przełączniki `*Extensions` pozostają `false`; istniejącego `bankQualification` nie zmieniano ze względu na zamrożony zakres bankowy.

Nowa karta kontaktu pobiera pełny istniejący rekord do dotychczasowego `ContactForm`, aby edycja nie wyzerowała pól niewidocznych na karcie. Przekazuje również aktualne tagi. Komentarze i aktywności są odczytywane z istniejących tabel. Nowe odczyty są ograniczone identyfikatorem konta/rekordu, a błędy mają komunikaty ogólne. Nie dodano nowej ścieżki zapisu, migracji ani wywołań AI. Właściciel innego użytkownika bez dostępnej nazwy jest pokazywany jako `—`, bez przypisywania go zalogowanej osobie.

## Weryfikacja

| Kontrola | Wynik / dowód |
| --- | --- |
| `npm run typecheck` | **Kod 0** w obu przebiegach. Końcowy log: `/private/tmp/km3-2-19-typecheck-final.log`. |
| `npx vitest run src/lib/ui 'src/app/(dashboard)' src/components/companies` | **177 poprawnych, 2 błędne / 179; kod 1.** Log: `/private/tmp/km3-2-19-vitest-final.log`. |
| Testy ramy i flag | **102/102** w `surface-flags.test.ts`; sprawdzono nową flagę, przywrócenie zachowanych komponentów, siedem powierzchni, dane/powiązania w tabeli, stany puste/błędy, zakładki i tokeny powłoki. Testy są na syntetycznych rekordach, klient bazy jest atrapą. |
| Błędy istniejące przed paczką | `src/app/(dashboard)/pipelines/page.test.tsx:234` — mobilny nagłówek etapu; `:591` — mobilny kontener tablicy. Na niezmienionym HEAD, w osobnej kopii, odtworzono **72 poprawne / 2 błędne**. Log: `/private/tmp/km3-2-19-baseline-final.log`. Nie zmieniano tego pliku ani kodu Lejka. |
| Zbiorczy build lokalny | **Kod 0**, kompilacja, TypeScript, **85/85** stron. `npm run build:webpack`, log `/private/tmp/km3-2-19-build.log`. BUILD_ID: `X7WsHXw4N0cTjLefY-Tgh`. |
| Zakres i diff | `git diff --check` bez błędów. Osiem zmienionych plików źródłowych/testowych zgodnych ze zleceniem oraz niniejszy raport. Osiem plików kopii użytej do builda porównano bajtowo z worktree: zgodne. |

Pełny zestaw uruchomiono dwukrotnie. Pierwszy ujawnił dodatkowo slate w bazowym komponencie zakładek; poprawiono warianty kolorystyczne w kartach, bez zmiany wspólnego komponentu. Drugi przebieg pozostawił wyłącznie dwa potwierdzone błędy bazowego Lejka. Nie wykonano trzeciego przebiegu ani napraw spoza zakresu. Znany `deal-form` nie jest jedynym wyjątkiem: **dwa powyższe błędy nie są objęte wyjątkiem akceptacyjnym zadania**, dlatego nie deklaruję pełnego spełnienia kryterium testów.

Build wykonano w `/private/tmp/km3-2-19-build`, bez kopiowania `.env` i sekretów, z syntetycznym adresem/kluczem Supabase oraz istniejącym mockiem fontów `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/private/tmp/km3-2-10-font-mock.cjs`. Użyto istniejących zależności; runtime raportuje Next.js 16.3.6. Ostrzeżenia dotyczą middleware/Edge Runtime i zależności webpack; build zakończył się kodem 0. To **lokalna kompilacja testowa**, nie publikacja na serwerze TEST.

## Obraz i ograniczenia odbioru

- Statyczne rendery całej powłoki z danymi syntetycznymi i wygenerowany CSS: `/private/tmp/km3-2-19-render/`. Siedem plików: `kontakty.html`, `firmy.html`, `karta-kontaktu.html`, `karta-firmy.html`, `aktywnosci.html`, `dzisiaj.html`, `kalendarz.html`; wspólny `app.css`.
- Osobny proces Chromium headless 1536×1024 zakończył się kodem **-6**, nie utworzył PNG. Jedna próba, bez ingerencji w przeglądarkę właściciela. Log: `/private/tmp/km3-2-19-chrome.log`.
- **Brak wizualnego porównania PNG/nakładki/pomiaru DOM i brak potwierdzenia zgodności pikselowej.** Testy renderu SSR nie są testem E2E, zapisu ani interakcji w przeglądarce. Nie sprawdzano rzeczywistych danych ani produkcyjnego zapisu.
- **Brak nowego builda na serwerze TEST i URL tej paczki** — obowiązuje jawny zakaz publikacji. Istniejący panel odbioru nie dowodzi obecności tych zmian.
- Granice zakresu zachowane: bez zmian w `src/app/(dashboard)/deals/**`, plikach bankowych, bazie, RLS, `.env`, sekretach, modelach AI i zależnościach. Dotychczasowy kod dodatków pozostał dostępny przez flagi.

## Checkpoint KM3.2.19 i koszt

Stan do przejęcia: niezacommitowane osiem plików + ten raport, HEAD `81a3a2660bacc33e16b4a3cd036fbffe9fbaedd3`; kod/testy własnego zakresu sprawdzone, build lokalny gotowy. Pozostałe bramki: dwa błędy bazowego Lejka, rzeczywisty obraz/porównanie, brak publikacji TEST i odbioru Tomasza. Nie otwierano następnego zadania.

Wymagany `~/.hermes/cache/k3/CHECKPOINT-*.md` leży poza katalogami zapisu sandboxa; nie zapisano tam pliku i nie obchodzono ograniczenia. Skill [k3-screen-delivery](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md) mówi: „Sandbox Codexa nie ma zapisu do `~/.hermes`” i poleca zostawić notatkę w `docs/codex/CODEX-*.md` do zapisania przez kierownika po przebiegu. Niniejsza sekcja jest tą notatką.

- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Bez dodatkowego procesu modelowego Codexa, płatnych API i subagentów; jedna bieżąca sesja abonamentowa.
- Pasywny odczyt przed zmianami: **09:41:22 UTC**, użycie 5 h **22%**, tygodnia **18%**, plan `plus`.
- Odczyt po weryfikacji: **09:52:04 UTC**, użycie 5 h **32%**, tygodnia **20%**, plan `plus`.
- Źródło: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T10-40-07-01a1bfad-e77a-7371-a0e7-34fdc79df219.jsonl`. Odczyty dotyczą całych okien abonamentu, nie precyzyjnego zużycia wyłącznie tej paczki. Nie odczytywano salda Nous; zero USD oznacza brak nowych wywołań w tej sesji, nie saldo konta.

**Bez commita, pushowania i publikacji. PASS pozostaje wyłącznie decyzją Tomasza.**
