# KM3.2.08-BIGIN-CHROME-03 — rama Lejka

Data: 05.11.2026. Stan: **WYKONANE W KODZIE, BEZ PUBLIKACJI; odbiór wizualny NIEZWERYFIKOWANY**.
PASS nadaje wyłącznie Tomasz.

## Podstawa i stan wejściowy

- BASE_SHA i lokalny HEAD: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Źródło: bieżące zlecenie, podane pomiary demo Bigin przy 1536×1024 oraz obejrzane obrazy
  `~/.hermes/k3/render/bigin_lejek.png` i `~/.hermes/k3/render/surface02_full.png`.
- Zastosowane skills: `k3-screen-delivery` (BIGIN-FIRST, pomiar i mapowanie regionów) oraz
  `mcrm-wykonawca`. Bez uruchamiania bramki, zewnętrznych skryptów i dodatkowego Codexa.
- Drzewo wejściowe zawierało niezacommitowane zmiany CORE/SURFACE-02: stronę i testy Lejka,
  tablicę i jej testy, `deal-card.tsx`, `surface-flags.ts`, wcześniejsze raporty oraz
  `__render_full.test.tsx`. Zachowano je; raport dotyczy wyłącznie zmian CHROME-03.

## Zakres tej paczki

| Plik | Zmiana |
| --- | --- |
| `src/components/layout/sidebar.tsx` | Tylko `/pipelines`: desktopowe menu #093E52 i wyłączenie kurczenia szerokości w flex. |
| `src/components/layout/app-shell.tsx` | Tylko `/pipelines`: wariant geometrii Bigin, tło całej ramy i main #F9FBFC oraz desktopowy padding poziomy z tokenu 10 px. |
| `src/lib/ui/layout-geometry.ts` | Tokeny Lejka: menu 285 px, padding 10 px; opcjonalny wariant `geometryCssVars('pipelines')`. Domyślne wartości innych ekranów pozostają dotychczasowe. |
| `src/app/(dashboard)/pipelines/page.tsx` | Tło workspace #F9FBFC zarówno podczas ładowania, jak i po wczytaniu. |
| `src/components/pipelines/pipeline-board.tsx` | Tło tablicy #F9FBFC na desktopie i mobile. Zachowane kolumny 220 px, odstęp 10 px i przewijanie poziome. |

Testy tej paczki: `src/components/layout/app-shell.test.tsx`,
`src/lib/ui/layout-geometry.test.ts`, `src/app/(dashboard)/pipelines/page.test.tsx`.
Pierwsze dwa rozszerzono o ramę Bigin i regresję pozostałych ekranów; w trzecim zaktualizowano
oczekiwany kolor tła. Nie zmieniano testów tablicy w tej paczce.

`surfaceFlags.pipelineExtensions` pozostaje `false`. Kod i dane dodatków pozostają zachowane.
Zmiany nie obejmują zapytań, bazy, RLS, sekretów, .env, modeli AI ani treści funkcjonalnej.

## Wartości przed / po

Wartości PRZED pochodzą z pomiarów przekazanych w zleceniu i stanu kodu wejściowego.
Wartości PO potwierdzono w renderowanym HTML rzeczywistych komponentów i deklaracjach
skompilowanego CSS Tailwind. **Nie są świeżym pomiarem DOM ani pikseli po zmianie.**

| Parametr przy docelowym 1536×1024 | Przed | Po w kodzie / CSS | Wzorzec Bigin |
| --- | --- | --- | --- |
| Szerokość menu | 160 px | 285 px | 285 px |
| Kolor menu | #20383D | #093E52 = rgb(9,62,82) | #093E52 |
| Tło workspace / tablicy | #F8F9FB; otoczenie zależne od motywu | #F9FBFC = rgb(249,251,252), także shell i main | #F9FBFC |
| Odstęp od menu do tablicy | 20 px | 10 px | 10 px |
| Początek pierwszej kolumny x | 180 px | 295 px = 285 + 10, wynik geometrii CSS | 295 px |
| Szerokość kolumn | 220 px | 220 px, flex-none | 220 px |
| Odstęp kolumn | 10 px | 10 px | 10 px |

Mapowanie regionów: menu → istniejący Sidebar i token szerokości; otoczenie workspace →
AppShell/main; workspace → istniejąca strona Lejka; kolumny → istniejący PipelineBoard.
Nie dodano nowych komponentów. Szerokość 285 px i padding 10 px obowiązują na desktopie
od breakpointu `lg` (64rem). Zachowano istniejący mobilny drawer 256 px.

## Weryfikacja

Końcowe polecenia:

```sh
npm run typecheck
npx vitest run src/lib/ui/layout-geometry.test.ts src/components/layout/app-shell.test.tsx src/components/pipelines/pipeline-board.test.tsx 'src/app/(dashboard)/pipelines/page.test.tsx'
```

- Typecheck: **kod wyjścia 0, bez błędów**.
- Vitest: **4 pliki, 92/92 testy**, kod wyjścia 0; końcowy przebieg 14:37:59, 4,31 s.
- Nowy test renderuje prawdziwe AppShell, Sidebar i PipelineBoard na danych syntetycznych.
  Sprawdza szerokość menu, kolor menu, wszystkie tła ramy, padding, 6 kolumn i przewijanie.
  Kompiluje użyte klasy Tailwind i kontroluje deklaracje CSS wraz z breakpointem, w tym
  width, flex-shrink, padding-inline, background-color, gap i flex-none.
- Test geometrii sprawdza 285 + 10 = 295; sześć tras poza zakresem (`/deals`, `/contacts`,
  `/dashboard`, `/calendar`, `/finances`, `/settings`) zachowuje dotychczasowy wariant ramy.
- Istniejące testy strony i tablicy weryfikują zachowanie danych kart oraz ukrycie dodatków
  przy domyślnym `surfaceFlags=false`.
- `git diff --check`: bez błędów.
- Pierwszy typecheck wykrył zwracanie liczby przez callback `walkDecls` w nowym teście;
  poprawiono callback na `void`. Po poprawce ponownie przeszły typecheck i wszystkie 92 testy.
- Vitest zgłasza ostrzeżenie o przyszłym loaderze konfiguracji Vite; nie wpływa na wynik.
- Nie uruchamiano istniejącego `__render_full.test.tsx`, który zapisuje pliki poza repo.

## Granice dowodu i odbiór

Próba sprawdzenia dostępnego podglądu przez Computer Use zwróciła
`The browser access host is unavailable` (brak dostępnych przeglądarek).
Nowy zrzut i pomiar DOM przy 1536×1024: **NIEZWERYFIKOWANE**. Nie deklaruje się zgodności
wizualnej ani wdrożenia. Zapis, drag & drop i zachowania hover/focus nie były testowane
w przeglądarce w tej paczce. Nie wykonywano operacji na danych rzeczywistych.

Nie wykonano commita, pusha, publikacji, bramki ani płatnych wywołań API przez narzędzia
tej paczki. Nie uruchomiono dodatkowej sesji Hermesa ani Codexa. Świeży stan limitów abonamentu
i rozliczenie konta nie były odczytywane; nie podaje się ich jako znanych wartości.

## Checkpoint

Docelowy wpis: `~/.hermes/cache/k3/CHECKPOINT-KM3-2-08-BIGIN-CHROME-03-20261105.md`.
**NIEZAPISANY**: katalog leży poza dozwolonymi korzeniami zapisu sandboxa; w tej sesji nie
można rozszerzyć uprawnień. Treść checkpointu zachowana tutaj, bez tworzenia drugiego raportu:

> KM3.2.08-BIGIN-CHROME-03: kod ukończony lokalnie na HEAD
> 0f7317df7d017d1c4d33412e29a4df9eee108583. Menu Lejka 285 px / #093E52,
> shell, main i tablica #F9FBFC, padding 10 px, x=295 wynika z CSS;
> kolumny 220 px / gap 10 px. surfaceFlags=false. Typecheck 0, Vitest 92/92.
> Wcześniejsze niezacommitowane zmiany zachowane. Brak commita/pusha/publikacji.
> Pomiar DOM i nowy render zablokowane niedostępnym hostem przeglądarki.
> Następny krok w tej samej paczce: pomiar lokalnego renderu 1536×1024 i odbiór Tomasza;
> bez otwierania kolejnego ekranu i bez automatycznej publikacji.
