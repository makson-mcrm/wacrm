# KM3.2.12 — karta firmy i zakładki deala

Stan 07.11.2026: **kod wykonany i sprawdzony lokalnie; NIEODEBRANE na TEST. PASS nadaje Tomasz.**

## Stan bazowy i zakres

- Repo robocze: `/Users/mcrm-ai/wacrm-a`, detached HEAD `583422b33a81d049f5183bb545d0e248fab88ede`; początkowo czyste drzewo.
- Gałąź zadania: `k3/bigin-02b-20261105`; BASE_SHA właściciela: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- HEAD pozostał bez zmian. Bez commita, pushowania i publikacji.
- Zmienione źródła: [lista firm](../../src/app/(dashboard)/companies/page.tsx), [nowa karta firmy](../../src/components/companies/company-card.tsx), [testy powierzchni](../../src/lib/ui/surface-flags.test.ts).
- [Karta deala](../../src/app/(dashboard)/deals/[id]/page.tsx) już zawierała cztery zakładki Bigin na wejściowym HEAD. Zachowana bez zmian; regresję chronią dodatkowe testy wszystkich czterech stanów.

## Wynik

Firma otwiera pełny widok w obszarze aplikacji. `?open=<id>` pozostaje w adresie, więc odświeżenie może ponownie otworzyć rekord; `popstate` obsługuje powrót do listy. Dotychczasowy formularz służy nadal tworzeniu i edycji firmy. Doładowanie listy nie zamyka formularza nowej firmy, a karta po edycji korzysta z aktualnie pobranych danych.

| Wymaganie | Implementacja / dowód lokalny |
| --- | --- |
| Lewa kolumna 488 px | `geometryCssVars('cards')`, siatka `var(--card-left-panel-width)` z `CARD_LEFT_PANEL_WIDTH` |
| Treść od y=148 | Istniejący baner 33 + pasek 49 + nagłówek rekordu `CARD_RECORD_HEADER_HEIGHT` 66 |
| Wiersze 44 px | `var(--card-field-row-height)`; siedem wierszy danych firmy |
| Panel 65 / pasek 49 | Istniejąca rama `/companies`; test renderu `AppShell` |
| Firma: cztery zakładki | Oś czasu / Komentarze / Aktywności / Wiadomości |
| Deal: cztery zakładki | Ten sam zestaw, sprawdzony dla każdej aktywnej zakładki |
| Lista firm | Kolumny i kolejność zastana bez zmian: zaznaczenie, Nazwa firmy, Osoba, Telefon, E-mail, Właściciel |
| Rozszerzenia | Flagi pozostają wyłączone; dotychczasowy widok pod `companiesExtensions` zachowany |

Oś czasu firmy pokazuje datę utworzenia i ostatniej modyfikacji rekordu. Komentarze korzystają z istniejącego `companies.notes` i dotychczasowego formularza edycji — bez nowej tabeli ani osobnego strumienia komentarzy. Aktywności używają istniejącego `ActivityHistory` po `companyId`. Wiadomości udostępniają istniejący adres e-mail przez `mailto:`; integracja skrzynki nie została dodana.

Nie zmieniano plików bankowych, bazy, RLS, sekretów, `.env`, AI, tokenów geometrii ani zależności. Testy używają wyłącznie danych syntetycznych; klient bazy w testach powierzchni rzuca błąd przy próbie zapytania.

## Weryfikacja

| Kontrola | Wynik | Dowód |
| --- | --- | --- |
| `npm run typecheck` | RC=0 | [log](/tmp/km3-2-12-typecheck.log) |
| `npx vitest run src/lib/ui src/components/companies` | RC=0, **60/60**, 2 pliki | [log](/tmp/km3-2-12-vitest.log) |
| ESLint trzech zmienionych źródeł | RC=0, 0 błędów; 2 ostrzeżenia o istniejących dyrektywach eslint-disable | [log](/tmp/km3-2-12-lint.log) |
| `git diff --check` | RC=0 | Kontrola końcowego diffu |
| Lokalny `npm run build:webpack` | RC=1, blokada pobrania fontu Inter | [log](/tmp/km3-2-12-build.log) |
| Zrzut i pomiar DOM 1536×1024 | **NIEZWERYFIKOWANE** — Chromium nie uruchomił się w sandboxie | [log](/tmp/km3-2-12-geometry.log) |

Build uruchomiono z syntetycznymi wartościami Supabase, telemetrią wyłączoną i osobnym katalogiem wynikowym. Zatrzymał się na `getaddrinfo ENOTFOUND fonts.googleapis.com` / `Failed to fetch Inter from Google Fonts` w niezmienianym `src/app/layout.tsx`. Nie zmieniano konfiguracji fontów ani nie instalowano pakietów. Jedna próba builda; brak ponawiania nierozwiązanej przyczyny.

Powstały pełne statyczne rendery z rzeczywistym `AppShell` oraz CSS aplikacji: [firma](/tmp/km3-2-12-evidence/company.html), [deal](/tmp/km3-2-12-evidence/deal.html), [CSS](/tmp/km3-2-12-evidence/app.css). To lokalny SSR na danych syntetycznych, nie LIVE ani test interakcji/zapisu. Tymczasowy test renderujący został usunięty. Nie wykonano zdjęć, nakładki ani mapy różnic: pojedyncza próba headless zakończyła się `MachPortRendezvousServer: Permission denied (1100)`. Nie obchodzono sandboxa. Artefakty `/tmp` są tymczasowe.

## Źródła i ograniczenia odbioru

Wczytano `k3-screen-delivery`, `mcrm-wykonawca`, istniejący kod i [tokeny](../../src/lib/ui/layout-geometry.ts). Obejrzano lokalne źródła w `~/.hermes/k3/render/`: `bigin_card_contact.png` przedstawia kartę kontaktu, natomiast **`bigin_card_deal.png` przedstawia formularz „Utwórz Transakcja” na tle karty kontaktu**, więc nie jest dowodem szczegółowej karty deala. Nie deklaruję zgodności wizualnej 1:1 na podstawie tego obrazu.

Wartości 488/148/44 i 65/49 potwierdzono w kontrakcie/tokenach i renderze HTML; fizycznego pomiaru DOM nie uzyskano. Zapis i ponowne wejście na działającym TEST pozostają nieprzetestowane.

**Build TEST: nie uruchomiony.** Zadanie jednocześnie wymaga dowodu z TEST i zabrania publikacji; wykonano przygotowanie lokalne zgodnie z wyraźnym zakazem. Nie podaję starego adresu TEST jako dowodu wdrożenia tej paczki. Brak nowego UUID builda i linku do wdrożonych kart.

## Koszt, limit i checkpoint

- Jeden bieżący przebieg Codexa; bez podzadań i bez kolejnej sesji modelu. Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Saldo konta Nous nie było odczytywane.
- Przed pracą zastany zapis `limity.json` z 12:19:20: 5h 20% użyte, tydzień 9% użyte; źródło rollout z 10:09:53. To odczyt historyczny, nie gwarancja bieżącego limitu.
- Odczyt pasywny po weryfikacji: 5h **30% użyte / 70% pozostało**, reset 07.11 14:14; tydzień **10% użyte / 90% pozostało**, reset 13.11 10:24. [Log wraz ze ścieżką rollouta](/tmp/km3-2-12-limits.log). Procenty są zaokrąglone i obejmują okna abonamentu.
- Checkpoint Codexa stanowi ten raport. Sandbox pozwala pisać tylko w repo i katalogach tymczasowych; nie próbowano zapisywać do `~/.hermes/cache/k3/CHECKPOINT-*.md`. Wpis zewnętrzny pozostaje po stronie kierownika Hermesa, zgodnie z sekcją „Checkpoint pisz poza Codexem” w skill `k3-screen-delivery`.
- Punkt wznowienia: lokalny diff na HEAD `583422b`, zielone wymagane testy i typecheck; niedomknięte build/render przeglądarkowy oraz wdrożenie i odbiór na TEST. Nie rozpoczynano następnego zadania.
