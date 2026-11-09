# KM3.5.1G — zwijanie panelu „Potoki zespołu”

Data: 09.11.2026. Dodatek do **tej samej paczki KM3.5.1**, według bieżącego polecenia i `PROMPT-KM3.5.1G.md`. Lokalna implementacja i testy zakończone; **odbiór wizualny nieprzeprowadzony, PASS nieprzyznany**.

## Stan wejściowy

- Worktree: `/Users/mcrm-ai/wacrm-a`, detached HEAD `64de33f4c55e17119aa38b7c4ae77bbf5856d400` (KM3.5.1F); drzewo wejściowe czyste.
- Kontrakt: `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md`, rozszerzony bieżącym dodatkiem G. BASE_SHA zapisany w kontrakcie: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Źródło nowych wymiarów: pomiar zalogowanego Bigin 1536×1024 przekazany w poleceniu: panel x=65 / w=220, tablica x=295 → 115 → 295, kontrolka 32×32, rail 64, pageOverflow=0.

## Zmiany

| Plik | Zmiana |
| --- | --- |
| `src/app/(dashboard)/pipelines/page.tsx` | Stan domyślnie rozwinięty; odczyt localStorage po hydratacji; zapis przy każdym kliknięciu; rzeczywiste ukrycie panelu. Natywny przycisk ma zmienne aria-label i title „Zwiń panel potoków” / „Rozwiń panel potoków”, aria-expanded, aria-controls i podwójne chevrony. |
| `src/components/pipelines/pipeline-board.tsx` | Tablica wypełnia dostępną szerokość przez w-full / max-w-full, zachowując min-w-0 i własne overflow-x-auto. Kolumny nadal 230 px. |
| `src/app/globals.css` | Panel rozwinięty odsunięty o 1 px, rzeczywista szerokość 220 px w zajmowanym obszarze 221 px. Zwinięty panel ma display:none i szerokość 0. Osobny pas na przycisk zajmuje 41 px, inset tablicy pozostaje 10 px. Przycisk ma zawsze 32×32 i znajduje się 8 px nad dołem przestrzeni roboczej; po zwinięciu pozostaje w pasie. |
| `src/components/pipelines/pipeline-ux-actions.test.tsx` | 11 nowych przypadków: oba kliknięcia, zapis i odtworzenie stanu, wartości niepoprawne/puste, odmowa storage, szkielet ładowania oraz kontrakt geometrii/overflow dla czterech szerokości. |
| `src/components/pipelines/pipeline-board.test.tsx` | Asercje nowego odsunięcia panelu i szerokości pomniejszonej o 1 px. |
| `src/app/(dashboard)/pipelines/page.test.tsx` | Asercja jasnego tła dopuszcza nowy atrybut stanu między znacznikiem workspace a klasą. |

Klucz pamięci: `mcrm:pipelines:team-panel-collapsed`, wartości tekstowe `true` / `false`. Brak lub inna wartość oznacza panel rozwinięty. Odczyt i zapis są zabezpieczone przed odmową dostępu lub brakiem miejsca; kontrolka działa wtedy do końca wizyty. Odczyt nie nadpisuje zapisanego stanu wartością domyślną. Ukryty panel nie pozostawia aktywnych kontrolek w kolejności Tab.

Przycisk jest rodzeństwem przewijanego panelu, dzięki czemu nie znika wraz z panelem ani podczas przewijania jego listy. Rozwinięty panel ma dolny padding 48 px na ostatnie pozycje listy. Nowe reguły dotyczą wyłącznie znaczników przestrzeni Potoków; stan zwinięty ma większą specyficzność niż mobilne nadpisanie szerokości panelu.

Nie zmieniono danych, zapytań, modelu, API, tras, uprawnień ani wartości surfaceFlags. Nie uruchamiano serwera dev, commita, pusha ani wdrożenia na TEST lub produkcję. Nie dodano atrap do kodu aplikacji.

## Geometria wynikająca z CSS — nie pomiar DOM

| Viewport | Rail | Tablica: rozwinięty → zwinięty → rozwinięty | Szerokość widocznego panelu: rozwinięty / zwinięty |
| --- | --- | --- | --- |
| 1536 | 64 | **295 → 115 → 295** | 220 / 0 |
| 1024 | 63 | 294 → 114 → 294 | 220 / 0 |
| 768 | 63 | 294 → 114 → 294 | 220 / 0 |
| 390 | 63 | 272 → 114 → 272 | 198 / 0 |

Na 1536 px: stan rozwinięty 64 + 221 + 10 = 295; zwinięty 64 + 41 + 10 = 115. Przesunięcie wynosi **180 px**. Na mniejszych szerokościach zachowano wcześniejsze breakpointy KM3.5.1D (rail 63 px do 1280 px oraz zajmowany obszar panelu 199 px poniżej 768 px). Kolumny zachowują 230 px, karty 220 px. Wysokość przycisku panelu pozostaje 32 px także przy toolbarze 29 px.

## Weryfikacja

| Sprawdzenie | RC | Wynik |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów; `/tmp/km3-5-1g-typecheck.log` |
| `npx vitest run` — końcowy przebieg | **0** | **144 pliki, 2343 PASS / 0 FAIL / 1 istniejący skip (2344)**; `/tmp/km3-5-1g-vitest.log` |
| ESLint pięciu zmienionych plików TSX | **0** | 0 błędów, jedno wcześniejsze ostrzeżenie o zbędnym eslint-disable na stronie; `/tmp/km3-5-1g-eslint.log` |
| `git diff --check` | **0** | Bez błędów whitespace. |
| Porównanie z HEAD: layout-geometry.ts, surface-flags.ts, src/types, src/lib/deals, src/app/api | **0** | Brak zmian. |

Liczba testów wzrosła z 2333 do 2344; nie usunięto przypadków ani nie dodano skipów. Pierwszy pełny przebieg wykazał dwie asercje zależne od kolejności klas tablicy. Zachowano oczekiwany ciąg dotychczasowych klas, dopisując nowe klasy na końcu; testy poza zakresem pozostają niezmienione.

Testy interakcji wywołują rzeczywisty handler przycisku strony w istniejącym harnessie hooków i sprawdzają kolejne rendery oraz odtworzenie stanu po ponownym wejściu. Testy CSS odczytują rzeczywisty arkusz przez PostCSS: sprawdzają położenie po obu kliknięciach, szerokości, dostępność przycisku oraz ograniczenie overflow do tablicy przy 1536/1024/768/390. Jest to dowód logiki i kontraktu CSS, **nie pomiar scrollWidth/clientWidth z przeglądarki**.

Przegląd React: odczyt storage dopiero po hydratacji, zapis poza updaterem stanu, obsługa błędów storage, natywny przycisk dostępny z klawiatury, opisany stan i cel, brak nowych listenerów i zmian danych.

## Granice dowodu i checkpoint

- Próba `pomiar_pw.py` wskazanym interpreterem: RC=1, **connect EPERM 127.0.0.1:9400**; `/tmp/km3-5-1g-bigin.log`. Przyjęto pomiar dostarczony przez właściciela.
- Lokalny headless Playwright: domyślna binarka headless-shell niedostępna; druga próba z istniejącym Chromium 1248 zakończona TargetClosedError, proces SIGABRT i kill EPERM; `/tmp/km3-5-1g-headless.log`. Nie instalowano przeglądarki ani nie obchodzono ograniczeń środowiska.
- **pageOverflow w renderze DOM na czterech viewportach: NIEZMIERZONY. Visual Diff ramy: NIEZMIERZONY.** Brak podstaw do podania procentu zgodności lub ogłoszenia „ZGODNY I DZIAŁA”. Nie podano linku odbioru.
- Pasywny codex-limity.sh: RC=0, 5 h użyte 49% / **51% zapasu**, tydzień użyte 45% / **55% zapasu**, dodatkowe kredyty 0. Źródło: zapis `rollout-2026-11-09T23-42-49-01a1c27a-7c32-75d0-be72-955f78841264.jsonl` odczytany przed edycją.
- `hermes usage --provider nous --json`: RC=1, odmowa zapisu .prepare.lock poza writable roots. Nie zweryfikowano salda; nie korzystano z Nous ani płatnego API.
- `bramka_kod.py --zlecenie .../TASK-KM3.5.1.md --repo /Users/mcrm-ai/wacrm-a --lock`: RC=1, błąd D2 i odmowa zapisu audit-bramka.jsonl poza sandboxem. **Nie uzyskano nowego PASS bramki.** Kontynuowano jawnie zlecony dodatek tej samej paczki w bieżącej sesji; nie uruchamiano kolejnego Codexa ani nie zmieniano bramki/locka.
- Zastosowano wskazane w kontrakcie mcrm-wykonawca, k3-screen-delivery i przegląd vercel:react-best-practices. Przed kodowaniem przeczytano lokalny przewodnik Next.js use-client.md.

Checkpoint mieści się w tym raporcie w dozwolonym worktree. Pozostają: pomiar DOM i overflow w uprawnionym środowisku przeglądarkowym, wdrożenie TEST zgodnie z kontraktem, Visual Diff i ostateczny odbiór Tomasza. Produkcja bez zmian.
