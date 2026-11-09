# KM3.4.1 — tokeny pomiaru Bigin i wyłączenie dodatków

09.11.2026, wykonanie około 17:47–17:55 CET. **STOP — kryterium 0 FAIL nie zostało spełnione.** W zakresie trzech plików testowych: 186/186 zaliczonych. Pełny zestaw: 2233 zaliczone, 5 FAIL, 1 istniejący skip; 2239 łącznie. Formalnego PASS nie nadano.

## ZROBIONE

- `layout-geometry.ts`: pasek i wariant list 48 px, panel 285 px, zwinięty 64 px, panel `#093E53`, akcent `#0B4A63`. `BOARD_START_X` wynika z 285 + 10 = 295. Kolumna 220 px, odstęp 10 px i karta 60 px pozostają zachowane.
- Dodano ciemniejsze tokeny panelu `panelDark: #073346` i `panelHover: #08394C` oraz odpowiadające im zmienne CSS. `--bigin-bg: #f9fbfc` pozostaje bez zmian. Kolory wariantów są pochodnymi panelu, nie osobnym pomiarem Bigin.
- Wszystkie 10 flag `surfaceFlags` ustawiono na `false`. Kod dodatków i inwentarz pozostały; testy obejmują zarówno ukrycie domyślne, jak i przywrócenie dodatków przez `true`.
- Zaktualizowano trzy dozwolone pliki testowe. Pochodne geometrii: historyczny `LIST_TABLE_TOP` wynosi teraz 33 + 48 + 56 = 137; wysokość nagłówka treści przy zachowanym `CARD_CONTENT_TOP=148` wynosi 67; szerokość dnia w historycznym wzorze kalendarza wynosi 286,4. Nie zmieniano logiki ekranów.

Źródło wymiarów i panelu: dostarczony przez właściciela pomiar zalogowanego demo Bigin z 09.11.2026 przy 1536×1024. Nie wykonano w tym przebiegu niezależnego pomiaru Bigin ani potwierdzenia tablicy y=115.

`layout.tsx` już przed zadaniem przekazywał `SHELL_CSS_VARS` do `style` elementu `<html>`. Próba zastąpienia spreadu jawnymi kluczami wywołała TS2353; po drugiej nieudanej próbie typowania wycofano tę zmianę w całości i zatrzymano tę metodę. Plik jest identyczny z HEAD. Render rzeczywistego RootLayout potwierdza dokładnie jedno wystąpienie każdej wymaganej wartości na `<html>`: `285px`, `64px`, `48px` i `#093E53`. To dowód serializacji SSR, nie pomiar `getComputedStyle` ani poprawka opublikowana na LIVE.

## CZY CRM DZIAŁA — DOWODY TECHNICZNE

| Kontrola | Wynik | Dowód |
| --- | --- | --- |
| `npm run typecheck`, próby 1 i 2 | Kod 2, TS2353 w eksperymentalnym zapisie `layout.tsx`; zmiana następnie całkowicie wycofana. Nie uruchamiano trzeciej próby tej komendy. | `/private/tmp/km3-4-1-typecheck.log`, `/private/tmp/km3-4-1-typecheck-2.log` |
| Pełny `npx --no-install vitest run`, próba 1 | 2229 zaliczonych, 9 FAIL, 1 skip | `/private/tmp/km3-4-1-vitest.log` |
| Pełny `npx --no-install vitest run`, próba 2 | 2233 zaliczone, 5 FAIL, 1 skip; 138/142 pliki zielone | `/private/tmp/km3-4-1-vitest-2.log` |
| Trzy dozwolone pliki w końcowym pełnym zestawie | `surface-flags`: 160/160; `app-shell`: 23/23; `layout-geometry`: 3/3 | Ten sam log |
| Lokalny build TEST: `npm run build:webpack` | Kod 0; TypeScript zakończony pomyślnie; 85/85 stron | `/private/tmp/km3-4-1-build.log` |
| Serializacja rzeczywistego RootLayout | Wszystkie cztery wartości obecne dokładnie raz na `<html>` | `/private/tmp/km3-4-1-root-serialization.json` |
| Przeglądarkowy `getComputedStyle` | NIEZWERYFIKOWANE — Chromium nie uruchomił się, `bootstrap_check_in ... Permission denied (1100)` | `/private/tmp/km3-4-1-browser.log` |
| `git diff --check` | Kod 0 | `/private/tmp/km3-4-1-verification.json` |

Jedyny skip jest wcześniejszy: `src/components/contacts/contact-detail-view.test.tsx`. Nie dodano skipów, nie usunięto testów ani asercji funkcji dodatków. Przybyły trzy przypadki przez parametryzację sprawdzającą obie wartości flag.

Build TEST znajduje się w `/private/tmp/km3-4-1-build`, BUILD_ID `JGsIlptl3TeQ18d3cHAb8`. To lokalny artefakt, bez publikacji. Skopiowano śledzone pliki bez `.env*`; zależności wykorzystano przez istniejący symlink. Środowisko oczyszczone, adres i klucz Supabase syntetyczne, font z wcześniejszego lokalnego mocka, telemetria wyłączona. Nie instalowano pakietów i nie uruchamiano serwera CRM. Build ma ostrzeżenia dotyczące middleware, Edge Runtime i cache webpacka.

Manifest `/private/tmp/km3-4-1-build-source-sha256.json` obejmuje 560 plików `src`. Po przygotowaniu kopii poprawiono jeszcze wyłącznie `surface-flags.test.ts`: końcowe drzewo zgadza się z kopią w 559/560 plikach i we wszystkich 418/418 plikach niebędących testami. Kopia źródeł builda pozostała nienaruszona. Wynik kompilacji nie jest pozytywnym wynikiem osobnej komendy `npm run typecheck` na końcowym drzewie.

Istniejący adres TEST/LIVE do dalszego odbioru: [test.makson.space](https://test.makson.space). **KM3.4.1 nie zostało tam opublikowane; link nie jest dowodem tej paczki.** W tym przebiegu nie potwierdzano HTTP ani wyglądu wdrożenia. Zakaz publikacji ze zlecenia pozostaje zachowany.

## CO BLOKUJE

Po dwóch próbach pełnego zestawu pozostaje pięć niepowodzeń spowodowanych oczekiwaniem wcześniejszych domyślnych flag `true`:

| Plik poza zakresem | Miejsce w końcowym logu | FAIL |
| --- | --- | --- |
| `src/components/pipelines/deal-form.test.tsx` | 596 — oczekiwanie Asystenta dla `extensions=undefined` | 1 |
| `src/components/pipelines/pipeline-board.test.tsx` | 198 — oczekiwanie dodatków przy domyślnej fladze | 1 |
| `src/app/(dashboard)/pipelines/page.test.tsx` | 799 i 821 — widoczność domyślna oraz asercja `pipelineExtensions=true` | 2 |
| `src/lib/banking/qualify.test.ts` | 89 — asercja `bankQualification=true`; następna asercja również oczekuje `cardExtensions=true` | 1 |

Tych plików nie zmieniono. Pełna zieleń wymaga rozszerzenia zakresu testów; aktualne zlecenie dodatkowo wprost zabrania zmian bankowych. Wysłano pytania o rozstrzygnięcie zakresu, ale do zamknięcia raportu nie otrzymano odpowiedzi. Nie przyjęto milczenia jako zgody. Nie wykonano trzeciej próby Vitest ani kolejnych napraw.

Próba odczytu w Chromium została zatrzymana przez ograniczenia systemowe sandboxa. Nie eskalowano uprawnień ani nie obchodzono blokady. Brak dowodu przeglądarkowego i wizualnego, także dla y=115.

Checkpoint `~/.hermes/cache/k3/CHECKPOINT-*.md` leży poza korzeniami dozwolonego zapisu. Bez eskalacji zapisano jego odpowiednik w `/private/tmp/CHECKPOINT-KM3.4.1-20261109.md` oraz w niniejszym raporcie. Zapis w docelowym katalogu pozostaje niewykonany.

## KOSZT I LIMIT

Jeden bieżący przebieg abonamentowego Codexa; lokalnie potwierdzone `auth_mode=chatgpt`, `plan_type=plus`. Nowe wywołania Nous: **0; koszt tych wywołań 0 USD**. Bez dodatkowych sesji modeli, subagentów, płatnego API lub zakupów. Salda Nous nie odczytywano.

Pasywne próbki użycia Codexa z bieżącego rolloutu: 16:48:40.692 UTC — użycie 5 h 31%, tydzień 34%; 16:54:02.642 UTC — 38% i 36%. Odpowiednio zapas 69%→62% i 66%→64%. Szczegóły oraz resety: `/private/tmp/km3-4-1-limits-before.json` i `/private/tmp/km3-4-1-limits-after.json`. Podany w zleceniu zapas 72%/66% był odczytem wcześniejszym, nie wynikiem tego przebiegu.

Na wejściu czyste detached HEAD `061dc6dfcbfa386498489c6c09ad257ad31d107f`; BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` potwierdzony jako przodek. Podczas pracy zewnętrzny proces zmienił HEAD na `a5fe48a9f41776041adb6df8ac97f7e76e02d525`: commit Hermesa z 17:52:12 CET zmienia wyłącznie `AGENTS.md`. Odczytano nową instrukcję; nie cofano commita ani nie ruszano nieśledzonego `AGENTS.md.bak-20261109`. Zmiany tej paczki pozostają niezacommitowane w sześciu plikach źródłowych/testowych i tym raporcie. Codex nie wykonywał commitów, pushów ani publikacji.

## JEDEN NASTĘPNY KROK

Rozstrzygnięcie zakresu aktualizacji czterech istniejących plików testowych wskazanych powyżej. Do tego czasu status KM3.4.1: **STOP / NIEODEBRANE**, bez kolejnego przebiegu i bez deklaracji zgodności LIVE.
