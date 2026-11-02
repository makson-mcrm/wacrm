# K3-02A-13b — korekta nagłówka i akcji 02A

## ZROBIONE

KM3 / K3-02A-13b, 02.11.2026. Korekta kodu wykonana; pełne kryterium testów **NIESPEŁNIONE**.
Jeden Codex w abonamencie Plus, bez podagentów, nowych wywołań Nous i płatnych API.
BASE_SHA / HEAD: `ea1d3e1c05bbcd901f6a0d8de512040d0adabfdf`.

Zastosowano [k3-screen-delivery](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md).
Odczytano zlecenie `docs/codex/TASK-K3-02A13B.md`, poprzedni raport, checkpoint z 17:00,
kod i oryginalne plansze `~/.hermes/cache/k3/cmp/02A.jpg` oraz `00S.jpg`.
Bramka D2: `python3 ~/.hermes/skills/software-development/k3-screen-delivery/scripts/zlecenie_gate.py docs/codex/TASK-K3-02A13B.md`
— PASS, 13 pól, 3 pliki. Zastany lock wskazuje tę samą paczkę.

- Padding pionowy nagłówka zmniejszono z 16 do 12 px (`py-4` → `py-3`).
- Usunięto 6 px górnego marginesu wiersza kontaktowego (`mt-1.5`).
- Zachowano desktopowy rząd czterech akcji i minimum 44 px dla ich elementów.
- „Zadzwoń” przekazano jako etykietę istniejącego `CallAction`. „WhatsApp” i „E-mail” zachowano.
- Przycisk „Więcej” zawiera wyłącznie ikonę wielokropka, ma `aria-label="Więcej"`,
  a ikona `aria-hidden="true"`.
- Menu zachowuje pięć pozycji: „Pełna karta klienta”, „Więcej danych klienta”,
  „+ Nowy deal”, „Dyktuj”, „Dodaj termin”. Trasy i obsługa akcji pozostały bez zmian.

Wyliczenie dla metadanych mieszczących się w jednym wierszu:
28 px nazwa/tagi + 32 px wiersz kontaktowy + 24 px paddingu + 1 px obramowania = **85 px**,
czyli 14 px mniej niż zgłoszone 99 px. Zachowano istniejące minimum 85 px.
To **wyliczenie CSS, nie pomiar DOM**. Spełnienie limitu przy 1536 px wymaga potwierdzenia
w przeglądarce po osobno dopuszczonym wdrożeniu; zawijanie danych może zwiększyć wysokość.

Zmieniono tylko dwa dozwolone pliki TSX i ten raport. Wygląd zakładek, kart informacyjnych,
kolumn i shella pozostał bez zmian. Zastane zmiany `CODEX-K3-01-A-REPORT.md`,
nieśledzone zlecenie i `package-lock.json` pozostawiono bez edycji.
Bez commita, pusha i publikacji. Weryfikacja wyłącznie na danych syntetycznych, bez bazy produkcyjnej.

## CZY CRM DZIAŁA

| Sprawdzenie              | Wynik                                                    | Dowód                                                 |
| ------------------------ | -------------------------------------------------------- | ----------------------------------------------------- |
| `npm run test`           | **NIE PASS — 1992 PASS / 1 FAIL**, 143 pliki, 1993 testy | `/private/tmp/k3-02a13b-test-final.log`               |
| Testy komponentu         | PASS — **99/99**                                         | `/private/tmp/k3-02a13b-contact-test.log`             |
| `npm run typecheck`      | PASS, kod 0                                              | `/private/tmp/k3-02a13b-typecheck-final.log`          |
| `npm run lint`           | PASS, kod 0 — **0 błędów, 43 ostrzeżenia**               | `/private/tmp/k3-02a13b-lint-final.log`               |
| Ostrzeżenia lint         | Lista 43 ostrzeżeń identyczna z pierwszym przebiegiem    | `/private/tmp/k3-02a13b-lint-before.log`, log końcowy |
| Prettier — oba pliki TSX | PASS                                                     | wynik w sesji                                         |
| `git diff --check`       | PASS                                                     | wynik w sesji                                         |

Testy obejmują etykiety i ikonowy przycisk z dostępną nazwą, dokładnie pięć pozycji menu,
ID kontaktu w linku nowego deala, dotychczasowe trasy i otwieranie/zamykanie menu.
Zachowano regresję: 8 zakładek, 5 kart info, 7 stopek „Zobacz wszystkie →”, breadcrumbs poza kartą.
Kontrakt CSS sprawdzono przy 1280 i 1536 px: padding 12 px, brak marginesu nad danymi,
jeden rząd czterech akcji i minimum 44 px. Testy SSR/CSS nie mierzą geometrii DOM.

## CO BLOKUJE

Jeden test spoza dopuszczonego zakresu, `src/lib/mcrm/ux-board.test.ts:106`,
szuka dosłownego napisu `DYKTUJ` w źródle komponentu. FINAL-PASS i bieżące zlecenie wymagają
„Dyktuj”, dlatego ta historyczna asercja przestała być aktualna.
Nie zmieniono tego pliku, nie wyłączono testu ani nie dodano starego napisu do kodu dla obejścia asercji.
Poproszono o rozszerzenie zakresu wyłącznie o aktualizację tej jednej asercji.

Pomiar DOM po wdrożeniu: **NIEWYKONANY** — obowiązuje zakaz publikacji.
Odbiór właściciela: **BRAK**. Nie deklaruje się PASS wizualnego ani efektu na LIVE.

Checkpoint `~/.hermes/cache/k3/CHECKPOINT-K3-01-*.md` oraz zwolnienie
`~/.hermes/cache/k3/active_package.lock`: **NIEWYKONANE** — są poza katalogami zapisywalnymi
tej sesji. Poniższy stan zachowano w raporcie do wpisania przez uprawnionego kierownika:
`K3-02A-13b | kod gotowy | 1992/1993, stara asercja DYKTUJ poza zakresem | typecheck PASS |
lint 0 błędów / 43 ostrzeżenia | brak publikacji i pomiaru DOM | odbiór właściciela oczekuje`.

## KOSZT I LIMIT

Nie wykonano nowych połączeń Nous ani płatnych API; salda Nous nie odczytywano.
Pasywny odczyt limitów z dziennika **tej sesji**, plan `plus`:
02.11.2026 **20:45:33 CET** — zapas 5 h **94%**, tygodnia **12%**;
**20:49:53 CET** — zapas 5 h **88%**, tygodnia **11%**.
Wskaźniki są zaokrąglone i nie stanowią dokładnego rozliczenia tokenów ani kwoty w USD.

## JEDEN NASTĘPNY KROK

Po zgodzie na rozszerzenie zakresu: zmienić jedną historyczną asercję `DYKTUJ` → `Dyktuj`
i ponownie uruchomić pełną baterię. Bez tej zgody pozostaje rzeczywisty blocker kryterium testów.
