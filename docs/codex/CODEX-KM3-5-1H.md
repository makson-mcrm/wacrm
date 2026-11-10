# KM3.5.1H — panel i karty Lejka

Data: 2026-11-10. Baza robocza: `f841e674ef3e023ead60830f65b2daf686b9223f`,
zawierająca źródła TEST `a155693`. BASE_SHA produkcji z kontraktu:
`0f7317df7d017d1c4d33412e29a4df9eee108583`.

## Zmiany D1–D3

| ID | Plik:linia | Zmiana |
| --- | --- | --- |
| D1 | `src/lib/ui/layout-geometry.ts:67` | Stałe `PIPELINE_TEAM_PANEL_NARROW_WIDTH = 199` i `PIPELINE_PANEL_NARROW_MAX_WIDTH = 1280`; istniejący token mobile korzysta z tej samej szerokości. |
| D1 | `src/app/globals.css:745` | Panel zwęża się przy ≤1280 zamiast dopiero ≤767. CSS odejmuje 1 px od tokena 199, co daje 198 px panelu. Usunięto zbędną deklarację przy ≤767. |
| D2 | `src/lib/ui/layout-geometry.ts:82` | Token wysokości karty: 60 → 79 px; istniejące `height` i `min-height` używają tego tokena. |
| D2 | `src/app/globals.css:847` | Obramowanie #E5EBEF i promień 4 px dla rdzenia kart; białe tło pozostaje na `article`. |
| D3 | `src/components/pipelines/deal-card.tsx:73` | Wiersz kwoty powstaje wyłącznie przy `deal.value > 0`, z istniejącym `formatCurrency`. CSS lokuje go w trzecim wierszu. |
| D1 | `src/components/pipelines/deal-card.test.tsx:40` | Regresje panelu i pozycji kolumny dla 1536, 1281, 1280, 1024 i 390 px; dodatkowo zwinięty panel i reguły przewijania. |
| D2–D3 | `src/components/pipelines/deal-card.test.tsx:85` | Regresje wysokości, promienia i warunkowej kwoty dla wartości dodatnich, zera, ujemnych, null i undefined. Łącznie 15 nowych przypadków. |
| D1, etap 2 | `src/components/pipelines/pipeline-board.test.tsx:410` | Oczekiwania panelu 199 i x=272 także przy 768–1280 px; desktop nadal 221 i x=295. |
| D1, etap 2 | `src/components/pipelines/pipeline-ux-actions.test.tsx:193` | Oczekiwania x=272 i tokena panelu 199 przy 1024/768 px; zwinięty panel nadal 0, desktop bez zmian. |
| D2, etap 2 | `src/lib/ui/surface-flags.test.ts:310` | Oczekiwania wysokości i tokena HTML karty 60 → 79; zgodna liczba w nazwie przypadku. |

Atrybuty `data-*`, etapy, flagi, teksty, font Inter i funkcje mCRM zachowano.
Nie zmieniono zależności, `.env`, produkcji ani danych. Zastane `.planning/`
pozostawiono poza paczką.

## Testy

Weryfikacja końcowa drzewa roboczego, 10.11.2026, start Vitest 13:11:55 CET:

- `npm run typecheck`: **RC=0**, 0 błędów.
- `npx vitest run`: **RC=0**, **2358 PASS / 0 FAIL / 1 skip (2359)**,
  145 plików PASS (145), czas 29,85 s.
  Log: `/tmp/km351h-vitest-final.log`. Wszystkie 15 nowych regresji PASS.
- Log typecheck: `/tmp/km351h-typecheck-final.log`.
- `git diff --check`: **RC=0**.

Etap 2 usunął osiem błędów nieaktualnych oczekiwań geometrii:

| Plik:linia | Przypadki | Stare oczekiwanie → D1/D2 |
| --- | --- | --- |
| `src/components/pipelines/pipeline-board.test.tsx:410` | 5: 768, 900, 1023, 1024, 1280 px | Token panelu 221 → 199, x kolumny 294 → 272. |
| `src/components/pipelines/pipeline-ux-actions.test.tsx:192` | 2: 768, 1024 px | x kolumny 294 → 272 i token panelu 221 → 199. |
| `src/lib/ui/surface-flags.test.ts:313` | 1 | Wysokość i token HTML karty 60 → 79. |

Etap 2 został jawnie dopuszczony w bieżącym poleceniu użytkownika.
Zmieniono wyłącznie oczekiwania geometrii (z wyborem 199/221 według szerokości),
bez usuwania przypadków, dodawania skipów i zmian asercji funkcji, sum, filtrów
czy flag. Liczba testów pozostała 2359; istniejący skip zachowano.

## Geometria i granice dowodu

| Viewport | Panel — kontrakt CSS | Początek kolumny — kontrakt CSS |
| --- | --- | --- |
| 1536 | 220 px | 295 px |
| 1280 | 198 px | 272 px |
| 1024 | 198 px | 272 px |
| 390 | 198 px | 272 px |

Liczby wynikają z testów reguł CSS i tokenów w Node, **nie z pomiaru DOM**.
Nie uruchamiano serwera dev ani nie publikowano na TEST. Zlecenie potwierdza
PASS bramki i odczyt limitów przez Hermesa przed paczką oraz zastrzega pomiar
na TEST po publikacji dla Hermesa. Nie ponawiano bramki ani zewnętrznych skryptów.

Pomiar `scrollWidth - clientWidth == 0` na czterech szerokościach,
wysokość/promień karty w DOM i Visual Diff: **nie wykonano**.
Visual Diff: **brak wyniku liczbowego**. Nie nadano PASS wizualnego ani statusu
zgodności ekranu; odbiór należy do Tomasza.

## Ryzyka i pozostała praca

1. Pełny Vitest i typecheck zakończyły się RC=0. Vitest emituje ostrzeżenie
   o przyszłym domyślnym loaderze konfiguracji Vite; konfiguracji nie zmieniano.
2. Brak dodatniej kwoty nie tworzy elementu kwoty; istniejąca data pozostaje.
   Rdzeń karty ma stałe 79 px także bez kwoty. Rozszerzone karty zachowują
   dotychczasową swobodną wysokość.
3. Testy CSS nie dowodzą braku overflow dokumentu ani zgodności pikselowej
   po publikacji. Te kryteria odbioru pozostają niezweryfikowane.

## Commit — blokada środowiska

Wymagany jedyny commit:
`fix(lejek): panel 198 px ≤1280 i karta 79 px jak Bigin (KM3.5.1H)`.

**Nie utworzono commita.** Po uzyskaniu 0 FAIL bieżąca próba `git add`
ośmiu plików paczki zakończyła się **RC=128**; `git commit` nie został uruchomiony:

```text
fatal: Unable to create '/Users/mcrm-ai/wacrm-km2/.git/worktrees/wacrm-a/index.lock': Operation not permitted
```

Metadane worktree leżą poza dozwolonymi katalogami zapisu, a polityka
zatwierdzeń to `never`. Nie obchodzono ograniczenia. Zmiany są w katalogu
roboczym i nie zostały zapisane w końcowym commicie.
