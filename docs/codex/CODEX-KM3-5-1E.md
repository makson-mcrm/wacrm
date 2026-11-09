# KM3.5.1E — opcjonalny Nowy dzień bez globalnej nakładki

Data: 09.11.2026. Kontynuacja **tej samej paczki KM3.5.1**, poprawka zatwierdzona w bieżącym poleceniu właściciela. Wynik techniczny: **typecheck RC=0; pełny Vitest RC=0, 2318 PASS / 0 FAIL / 1 istniejący skip (2319)**. To nie jest PASS wizualny.

## Stan wejścia i kontrakt

- Worktree `/Users/mcrm-ai/wacrm-a`, detached HEAD `cc989ed2bd05cd78dab521047f24f5df222bcb4e`; drzewo wejściowe czyste.
- Zlecenie `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md` oraz bieżące polecenie rozszerzające tę samą paczkę o naprawę `DailyStartCard`.
- BASE_SHA kontraktu: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Odczytany istniejący lock wskazuje `TASK-KM3.5.1.md` od 21:10:13; ostatni historyczny wpis `ALLOW_GATE_ONLY` dla tego kontraktu: 21:29:28.
- Wykonano `python3 ~/.hermes/k06/bramka_kod.py --zlecenie ~/.hermes/k3/zlecenia/TASK-KM3.5.1.md --repo /Users/mcrm-ai/wacrm-a --lock`: **RC=1**, komunikat „bramka D2 odrzuciła zlecenie”, następnie `PermissionError` zapisu `/Users/mcrm-ai/.hermes/k06/audit-bramka.jsonl` poza writable roots. Nie uzyskano nowego PASS bramki; nie zmieniano jej plików ani istniejącego locka. Kontynuowano bieżącą, jawnie zatwierdzoną korektę tej samej paczki w aktualnej sesji Codexa, bez uruchamiania kolejnego procesu Codexa.
- Zastosowano `mcrm-wykonawca` i `k3-screen-delivery`, z nadrzędnością bieżącego polecenia i aktualnego `AGENTS.md`. Przed edycją przeczytano lokalny przewodnik Next.js `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`.

## Przyczyna i zmiana

`AppShell` montował `DailyStartCard` na każdej trasie. Po efekcie klienta komponent sprawdzał szerokość i lokalny zapis dnia, a następnie wyświetlał pełnoekranowy `fixed inset-0 z-[80]` z `lg:hidden`. Poniżej 1024 px blokował dostęp do zawartości Lejka i nawigacji. Dotychczasowy mock `DailyStartCard: () => null` uniemożliwiał wykrycie montowania nakładki w testach shellu.

1. `src/components/layout/app-shell.tsx` — usunięto import i montowanie `DailyStartCard` ze wspólnej ramy.
2. `src/components/layout/daily-start-card.tsx` — osadzony, domyślnie zamknięty natywny panel `details/summary`. Brak pozycjonowania `fixed`, `inset-0`, warstwy zasłaniającej ekran, semantyki modala, `matchMedia` i `lg:hidden`. Użytkownik sam rozwija panel, a rozpoczęcie dnia wymaga kliknięcia. Zachowano cytat oraz dotychczasowy klucz `mcrm-ai-day-started:YYYY-MM-DD` w localStorage. Po rozpoczęciu panel pozostaje dostępny, a przycisk pokazuje „DZIEŃ ROZPOCZĘTY” i jest nieaktywny.
3. `src/app/(dashboard)/dashboard/page.tsx` — wejście osadzono tylko na `/dashboard`, w obu wariantach istniejącej flagi `dashboardExtensions`. W wariancie domyślnym znajduje się po planie dnia, więc nie przesuwa istniejących wierszy.
4. `src/components/layout/app-shell.test.tsx` — mock jest celowo widoczny i przypomina dawną nakładkę. Dodano brak montowania karty i modala na `/pipelines` przy zadanych szerokościach 390/768/1024/1536, obecność treści i nawigacji, brak połączenia klas `fixed` i `inset-0`, brak importu/renderowania karty w źródle shellu.
5. `src/components/layout/daily-start-card.test.tsx` — nowy test zamkniętego panelu, kliknięcia jako jedynego zapisu rozpoczęcia dnia, odczytu istniejącego zapisu oraz osadzenia w obu wariantach strony Dzisiaj.
6. `docs/codex/CODEX-KM3-5-1E.md` — raport i checkpoint.

Nie zmieniono danych CRM, API, zapytań, flag, zależności ani innych stron. Tokeny geometrii, globalny CSS, Header, Sidebar, MobileBottomNav i strona Lejka są identyczne z HEAD. Rama desktopu 1536 px zachowuje dotychczasowe deklaracje. Jedynym nowym elementem treści jest wymagane opcjonalne wejście na Dzisiaj, dostępne niezależnie od szerokości.

## Weryfikacja

| Komenda | RC | Wynik / dowód |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów; `/tmp/km3-5-1e-typecheck.log` |
| `npx vitest run src/components/layout/app-shell.test.tsx src/components/layout/daily-start-card.test.tsx` | **0** | 86 PASS / 0 FAIL; `/tmp/km3-5-1e-targeted.log` |
| `npx vitest run` | **0** | **143 pliki; 2318 PASS / 0 FAIL / 1 skip (2319)**, 28,44 s; `/tmp/km3-5-1e-vitest.log` |
| `git diff --check` | **0** | brak błędów whitespace |
| `git diff --exit-code HEAD -- src/lib/ui/layout-geometry.ts src/app/globals.css src/lib/ui/surface-flags.ts src/components/layout/header.tsx src/components/layout/sidebar.tsx src/components/layout/mobile-bottom-nav.tsx 'src/app/(dashboard)/pipelines/page.tsx'` | **0** | brak zmian w geometrii, CSS, flagach, nawigacji i stronie Lejka |

Liczba testów wzrosła o **9** względem KM3.5.1D (2310 → 2319). Nie usuwano istniejących przypadków ani nie dodawano skipów. Wyszukanie użyć komponentu potwierdza, że jedyny kod strony montujący `DailyStartCard` to `/dashboard`.

## Granice dowodu i checkpoint

Macierz szerokości jest testem renderu statycznego z zadanym `window.innerWidth`, a nie pomiarem DOM lub interakcji w przeglądarce. Test komponentu wywołuje handler i efekty w izolowanym harnessie; natywnego rozwijania `details` nie testowano w przeglądarce.

**Visual Diff ramy: NIEZMIERZONY. Pomiar nowej wersji na TEST: niewykonany.** Nie deklarowano zgodności pikselowej ani odbioru ekranu. Nie uruchamiano serwera dev, commita, pusha, publikacji ani builda Hostingera, zgodnie z kontraktem tej paczki. Zmiany pozostają lokalne, gotowe do dalszej weryfikacji i wdrożenia przez kierownika. PASS wizualny należy wyłącznie do Tomasza; bez pomiaru nie podano linku odbioru. Checkpoint zapisano w tym raporcie wewnątrz dozwolonego worktree.

## Limity i koszt

Pasywny odczyt `bash ~/.hermes/skills/software-development/mcrm-wykonawca/scripts/codex-limity.sh`: **RC=0**, okno 5 h użyte 33% / pozostało **67%**, tydzień użyte 42% / pozostało **58%**; dodatkowe kredyty 0. Źródło: zapis sesji `rollout-2026-11-09T22-45-00-01a1c245-8d52-7960-a4f0-203e830f6606.jsonl`. Jest to odczyt zapisanego limitu, nie gwarancja stanu na koniec pracy.

`hermes usage --provider nous --json`: **RC=1**, instalacja nie może zapisać `.prepare.lock` poza worktree. Saldo Nous pozostaje niezweryfikowane; nie zmieniano uprawnień. Nie wywoływano Nous ani płatnego API do kodowania lub testów.
