# K3-02B-01 — nagłówki kolumn lejka

**WYKONANE lokalnie: kod i testy. NIEUKOŃCZONE: pomiar DOM i odbiór geometrii.**
KM3 — Lejek sprzedaży. Data: 03.11.2026. Bez commita, pusha i publikacji.

## Podstawa i zakres

- Zlecenie: `docs/codex/TASK-K3-02B01.md`; jeden wykonawca Codex, bez podagentów.
- Zadany BASE_SHA: `4503d9a867f1deb6d669cceffa3f4ccc4a898bcf` — obiekt niedostępny w lokalnym repozytorium. Nie potwierdzono zgodności tej bazy z lokalnym kodem ani produkcją.
- Faktyczny HEAD przed/po: `ce734ac4297ce54eb4bf5e48419d92fb82f209e1`.
- Odczytano checkpoint `~/.hermes/cache/k3/CHECKPOINT-K3-01-20261103-0102.md`. Nie zmieniano checkpointów: zamknięty zakres zlecenia obejmuje wyłącznie trzy pliki poniżej.
- Zastosowano `~/.hermes/skills/software-development/k3-screen-delivery/SKILL.md` oraz [UXKIN ui-from-screenshot](https://github.com/uxkin/agent/blob/main/.agents/skills/ui-from-screenshot/SKILL.md).

Zmiany tej paczki:

1. `src/components/pipelines/pipeline-board.tsx`
2. `src/app/(dashboard)/pipelines/page.test.tsx`
3. `CODEX-K3-02B01-REPORT.md`

Zastane zmiany `AGENTS.md`, `CODEX-K3-01-A-REPORT.md`, nieśledzone zlecenia i `package-lock.json` pozostawiono bez zmian.

## Zmiana

Nagłówki desktop i mobile pokazują kolejno nazwę etapu, sumę wartości widocznych deali tego etapu i licznik, oddzielone `·`. Przykłady:

- `Kontakt syntetyczny · 1 500 zł · 1 transakcja`
- `Kontakt syntetyczny · 35 000 zł · 2 transakcje`
- `Pusty etap · 0 zł · 0 transakcji`

Odmiana uwzględnia również 12–14, 21, 22, 101 i 112. Zerowa suma jest widoczna także przy niezerowej liczbie kart.

Typ `Pipeline` nie ma pola waluty. Nagłówki używają istniejącej waluty konta z `useAuth().defaultCurrency`, wspólnej dla wszystkich etapów, również pustych. Nie wybierają waluty na podstawie pierwszego deala i nie wykonują konwersji. Dla walut innych niż PLN wywoływany jest istniejący `formatCurrency`. Dla PLN lokalnie wymuszono polskie grupowanie i sufiks `zł`: wspólny formatter zależy od locale środowiska i nie przyjmuje parametru locale, więc nie zapewnia wymaganego `1 500 zł` we wszystkich środowiskach. Nie zmieniano wspólnego formattera poza zakresem paczki; zachowano jego dotychczasową precyzję pełnych jednostek.

Nagłówki desktop mają `flex-nowrap` od 1440 px; poniżej dopuszczają zawijanie. Długie nazwy zachowują skracanie, a pełna nazwa jest dostępna w `title`. Nie zmieniono szerokości kolumn, tokenów 00S, kart, filtrów, zapytań ani obsługi drag&drop. **Reguła CSS nie jest dowodem zmierzonej geometrii.**

## Weryfikacja automatyczna

| Kontrola | Wynik |
| --- | --- |
| `npm run test` | PASS — 2019 zaliczonych, 1 pominięty; 143 pliki |
| Testy strony lejka | PASS — 25 testów, w tym 18 nowych przypadków |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 błędów, 43 istniejące ostrzeżenia; wynik identyczny przed/po |
| Prettier dla obu plików kodu | PASS |
| `git diff --check` | PASS |

Testy renderują rzeczywistą stronę i tablicę na danych syntetycznych. Po każdym przypadku sprawdzają brak wywołań bazy i sieci. Obejmują:

- 1500 i jedną transakcję osobno w desktop/mobile;
- zera, niezależne sumy etapów i polskie formy licznika;
- walutę EUR dla zajętego i pustego etapu;
- zachowaną liczbę kolumn/kart, linki kart, identyfikatory draggable/droppable;
- wywołanie istniejącego callbacku po przeciągnięciu do innego etapu oraz brak wywołania dla tego samego etapu, nieznanego celu i anulowanego upuszczenia;
- dotychczasowe filtry, statystyki, archiwum i przyciski dodawania.

Są to testy renderowania i callbacków z atrapą dnd-kit, a nie test przeciągania fizycznym wskaźnikiem w przeglądarce.

## Wzorce i pomiar DOM

Obejrzano lokalne `~/.hermes/cache/k3/cmp/bigin_lejek.png` i `04A.jpg` (1536 × 1024). Bigin pokazuje nazwę, kwotę i licznik; jego obraz ma nazwę nad podsumowaniem. W tej paczce obowiązuje jawne wymaganie zlecenia: jeden wiersz od 1440 px. Nie kopiowano brandingu Bigin ani nie przebudowywano ramy 00S.

Mapowanie: istniejący `StageColumn`/nagłówek mobile → nazwa; istniejący `StageSummary` → suma i licznik; istniejące tokeny tekstu, tła i kolumn → wygląd. Nie dodano komponentów bibliotecznych.

Przygotowano lokalny render syntetyczny prawdziwej strony z sześcioma etapami operacyjnymi, CSS z `src/app/globals.css` i lokalnymi plikami fontu Inter. Pliki pomocnicze są w `/tmp/k3-02b01/` (`index.html`, `board.html`, `styles.css`, `dom-render.log`); nie należą do zmian repozytorium. Render HTML wykonany przez tymczasową kopię testów przeszedł (26/26 z przypadkiem eksportu HTML).

**Pomiar przeglądarkowy zablokowany:** uruchomienie lokalnego Chromium zakończyło się `bootstrap_check_in … Permission denied (1100)` w sandboxie. Dostępny podgląd przeglądarkowy odpowiedział `The browser access host is unavailable`. Nie zmieniano uprawnień ani zabezpieczeń.

| Viewport | Wysokość/szerokość DOM nagłówków | Jeden wiersz / brak overflow |
| --- | --- | --- |
| 1536 px | NIEZMIERZONE | NIEZWERYFIKOWANE |
| 1440 px | NIEZMIERZONE | NIEZWERYFIKOWANE |
| 1280 px | NIEZMIERZONE | NIEZWERYFIKOWANE |

Brak pary obrazów wzorzec/render oraz pomiarów `getBoundingClientRect`, `scrollWidth/clientWidth` i pozycji fragmentów nagłówka. Nie deklaruję zgodności wizualnej ani pełnego spełnienia kryterium ukończenia.

## Koszt, limity i odbiór

- PRZED, odczyt Hermesa 16:50:02 CET: 5 h użyte 21%, tydzień użyte 92%.
- PO, pasywny odczyt rollout 16:56:43 CET: 5 h użyte 7%, tydzień użyte 93%; plan `plus`. Reset bieżącego okna 5 h: 03.11, 21:50 CET; tygodnia: 04.11, 10:12 CET. Odczyt PRZED pochodził z innej sesji; nie wyliczam różnicy zużycia 5 h z tych dwóch wartości.
- Zmiana tygodniowa w dostępnych odczytach: **+1 pp**, w budżecie ≤3 pp; pozostało 7%. Wskaźniki są zaokrąglone i dotyczą konta.
- Nie wywoływano Nous ani płatnych API modeli. Salda Nous nie odczytywano; nie przedstawiam nieznanego salda jako zera.
- Produkcyjny LIVE: bez zmian. Brak testów na prawdziwych danych klientów i brak zapisów do produkcji.
- Recenzent 02: odbiór niewykonany. Właściciel: odbiór niewykonany.
- Następny krok: pomiar syntetycznego renderu w działającej przeglądarce przy 1536/1440/1280 px, następnie niezależny odbiór Recenzenta 02 i właściciela. Publikacja pozostaje poza zgodą tego zlecenia.
