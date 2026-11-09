# KM3.5.1C — trzecia poprawka tej samej paczki, telefon

Data: 09.11.2026. Status techniczny: **typecheck RC=0, Vitest RC=0 — 0 FAIL**.

## Zakres i stan wejścia

- Kontynuacja KM3.5.1 na polecenie po zatwierdzonym pomiarze LIVE; bez nowej paczki.
- Worktree: `/Users/mcrm-ai/wacrm-a`, detached HEAD `c018054c4f0cf7d149ff8480b821d1c04432c9bb`; drzewo wejściowe czyste.
- Zlecenie: `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md` wraz z rozszerzeniem i bieżącym poleceniem właściciela.
- BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, zgodny z odczytanym `prod-build.json`.
- Istniejący lock wskazuje `TASK-KM3.5.1.md`, start 21:10:13; ostatni zapis `ALLOW_GATE_ONLY` dla tego zlecenia: 21:29:28. Nie zmieniano locka ani zlecenia.
- Zastosowano wskazane skille `mcrm-wykonawca` i `k3-screen-delivery`; przeczytano lokalny przewodnik Next.js `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.

## Przyczyna i poprawka

Pomiar przekazany w poleceniu dla TEST 390×844: kolumny **x=294, y=110**, Bigin **x=272, y=115**.
Istniejące stałe telefonu były poprawne: panel potoków 199 px, toolbar 72 px. Mobilne reguły CSS nadpisywały jednak zmienne na samym AppShell, gdzie przegrywały z deklaracjami inline z `biginGeometryCssVars('pipelines')`. Telefon dziedziczył desktopowe 221 px panelu i 67 px toolbara:

- x = 63 + 221 + 10 = 294;
- y = 43 + 67 = 110.

Przeniesiono trzy mobilne nadpisania geometrii na potomny `[data-pipeline-workspace]`, poniżej inline AppShell. Lokalna deklaracja na potomku ma pierwszeństwo przed odziedziczoną wartością. Reguła pozostaje wyłącznie wewnątrz `@media (max-width: 767px)` i dotyczy Lejka, także jego stanu ładowania.

| Geometria wynikająca z deklaracji | Telefon <768 px | Laptop / desktop ≥768 px |
| --- | --- | --- |
| Rail | 63 px | 64 px |
| Panel potoków | **199 px** | 221 px |
| Inset tablicy | 10 px | 10 px |
| Start kolumn x | **272 px** | 295 px |
| Pasek górny | 43 px | 48 px |
| Toolbar | **72 px** | 67 px |
| Start tablicy y | **115 px** | 115 px |
| Przyciski toolbara | 29 px | 32 px |

Docelowa korekta względem przekazanego pomiaru: **−22 px w osi x, +5 px w osi y**.

## Zmienione pliki

1. `src/app/globals.css` — przeniesienie mobilnych nadpisań szerokości panelu, wysokości toolbara i istniejącej wysokości jego przycisków na kontener Lejka. Reguły laptopa i desktopu bez zmian.
2. `src/components/pipelines/pipeline-board.test.tsx` — aktualizacja selektora mobilnych reguł, dodatkowe asercje użycia tokenów przez panel i toolbar oraz pięć przypadków regresyjnych: 390, 767, 768, 1366 i 1536 px. Sprawdzają lokalne nadpisania poniżej inline shellu, granicę media query, składanie x/y oraz brak inline nadpisań na kontenerach ładowania i gotowego ekranu.
3. `docs/codex/CODEX-KM3-5-1C.md` — niniejszy raport.

Zachowano wszystkie istniejące przypadki i asercje funkcji. Dodano 5 przypadków, bez nowych skipów. Nie zmieniono danych, API, flag, formularzy, komponentów produkcyjnych TSX, tokenów geometrii ani zależności.

## Weryfikacja

| Komenda | RC | Wynik / log |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów; `/tmp/km3-5-1c-typecheck.log` |
| `npx vitest run` | **0** | **2250 PASS / 0 FAIL / 1 istniejący skip (2251)**, 142 pliki, 23,77 s; `/tmp/km3-5-1c-vitest.log` |
| `git diff --check` | **0** | Brak błędów whitespace |

Przed końcowym przebiegiem poprawiono literówkę składniową w nowej asercji. Przejściowy typecheck miał RC=2, a pierwszy pełny Vitest RC=1 (141 plików PASS, 1 błąd parsowania tego testu; 2225 PASS / 1 skip). Log pierwszego przebiegu: `/tmp/km3-5-1c-vitest-initial.log`. Końcowe wyniki powyżej dotyczą poprawionego kodu i testów.

## Granice dowodu i dalszy pomiar

Testy potwierdzają deklaracje CSS, ich umiejscowienie względem dziedziczonych tokenów i arytmetykę geometrii. **Nie wykonano nowego pomiaru DOM na TEST ani Visual Diff. Diff ramy: NIEZMIERZONY.** Wartości x=272/y=115 w tabeli są wynikiem deklaracji, nie pomiarem po wdrożeniu. Nie ponawiano zablokowanych metod przeglądarkowych opisanych w `CODEX-KM3-5-1.md`.

Zmiany pozostają lokalne i niecommitowane; nie wykonano publikacji, pusha, builda Hostingera ani uruchomienia serwera dev. Techniczne 0 FAIL nie stanowi nowego PASS wizualnego; po wdrożeniu potrzebny jest pomiar kierownika i odbiór właściciela.

## Limity i koszt

Pasywny odczyt przed edycją: `codex-limity.sh` RC=0, pozostało **78% okna 5 h / 59% tygodnia**. Źródło: `rollout-2026-11-09T22-16-20-01a1c22b-4d98-7043-839a-61f6dea7cfde.jsonl` z 22:16; jest to odczyt zapisanej sesji, nie gwarancja aktualnego limitu.

`hermes usage --provider nous --json` RC=1: brak prawa zapisu `.prepare.lock` instalacji Hermesa poza worktree. Nie zmieniano uprawnień. Nie wywoływano płatnego modelu Nous ani płatnego API do kodowania; prace wykonano w tej sesji Codexa.
