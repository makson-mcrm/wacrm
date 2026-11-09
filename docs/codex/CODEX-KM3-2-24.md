# KM3.2.24 — testy dziedziczenia globalnego standardu Bigin

09.11.2026. **Testy: 2172 PASS, 0 FAIL, 1 wcześniejszy SKIP (2173 łącznie); typecheck i końcowy lokalny build TEST: kod 0.** Formalny PASS nadaje wyłącznie Tomasz.

## Stan bazowy i zakres

- Repo `/Users/mcrm-ai/wacrm-a`, czysty start na detached HEAD `f0259ac16734bcea5198012c405c5c57a261e099` — KM3.2.23.
- Zadany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem HEAD. Gałąź `k3/bigin-02b-20261105` znajduje się w innym worktree. Zachowano bieżące prace po KM3.2.23; bez przełączania i cofania gałęzi.
- Źródła: TASK-KM3.2.24, istniejące `globals.css`, `layout-geometry.ts` i raport KM3.2.23. Zastosowano skill `mcrm-wykonawca`; aktualny zakaz commita, pusha i publikacji ma pierwszeństwo przed historycznymi procedurami tego skilla.
- Zmieniono wyłącznie dwa wskazane pliki testów i niniejszy wymagany raport. Kod aplikacji, pliki bankowe, baza, sekrety, `.env` i zależności pozostają bez zmian.

## Zmiana asercji

1. `surface-flags.test.ts`: parser CSS sprawdza rzeczywiste deklaracje globalne i powiązania semantycznych aliasów z `var(--bigin-*)`. Jedno miejsce ustala wymagane wartości `--bigin-panel: #093e52`, `--bigin-accent: #0b4a63` i `--bigin-panel-text: #ffffff` w `:root`.
2. Każdy wcześniejszy przypadek trasy pozostał. Siedem testów dawnej ramy 160 px wymaga teraz globalnych 65 px; nadal sprawdzają wysokość nagłówka i brak banera. Lejek zachowuje 285/49/60/220/10 i sprawdza referencje do globalnej palety. Kontrole nagłówka, białych ikon, tekstu, dolnej krawędzi i flag pozostały, a reguł szukają w globalnym CSS.
3. Osobne przypadki `/contacts`, `/companies`, `/quick-call`, `/dashboard`, `/calendar` sprawdzają aktywację globalnego shellu, połączenia zmiennych i brak literalnych `#093E52`/`#0B4A63` w źródle danego ekranu, niezależnie od wielkości liter. Dodano analogiczną kontrolę źródeł Zadań, Inbox, listy i karty Deala, Lejka oraz karty Firmy. Istniejące rendery karty Kontaktu i Firmy nadal są sprawdzane.
4. `app-shell.test.tsx`: test rzeczywistej ramy sprawdza mapowanie panelu, aktywnego koloru i tekstu na `var(--bigin-*)` w globalnym selektorze shellu. Porównanie palety CSS z TypeScript ignoruje wyłącznie wielkość liter zapisu hex; nadal weryfikuje każdy token i jego wartość.
5. Nie usunięto przypadków, nie dodano `skip`, atrap sukcesu ani lokalnych kolorów. Dodano siedem przypadków; pełny zestaw wzrósł z 2166 do 2173.

## Weryfikacja

| Kontrola | Wynik | Dowód lokalny |
| --- | --- | --- |
| `npx vitest run` — próba 1 | Kod 0; 142/142 pliki; 2172 PASS, 0 FAIL, 1 SKIP | `/private/tmp/km3-2-24-vitest-attempt-1.log` |
| `surface-flags.test.ts` w pełnym zestawie | 109/109 PASS | Ten sam log |
| `app-shell.test.tsx` w pełnym zestawie | 12/12 PASS | Ten sam log |
| `npm run typecheck` — próba 1 | Kod 0, bez błędów | `/private/tmp/km3-2-24-typecheck-attempt-1.log` |
| Końcowy `npm run build:webpack` — próba 1 | Kod 0; kompilacja, TypeScript, 85/85 stron | `/private/tmp/km3-2-24-build.log` |
| Zgodność źródeł buildu | 560/560 śledzonych plików `src/` identycznych bajtowo | `/private/tmp/km3-2-24-build-source-sha256.json` |
| `git diff --check` | Kod 0 | Terminal sesji |

Jedyny wcześniejszy SKIP to opcjonalny test przeglądarkowy `contact-detail-view.test.tsx`, zależny od `K3_PLAYWRIGHT_MODULE` i `K3_RENDER_DIR`. Nie zmieniano go ani nie dodawano nowych pominięć. Wynik oznacza zero błędów pełnego zestawu; nie oznacza wykonania pominiętego testu przeglądarkowego.

Testy i typecheck uruchomiono w oczyszczonym środowisku, offline, bez konfiguracji produkcyjnej, z istniejącymi mockami i danymi syntetycznymi. Pełny zestaw obejmuje istniejące testy bankowe, zgodnie z wymaganym poleceniem; nie edytowano ich plików. Pierwszy przebieg przeszedł, bez ponowień.

Build TEST wykonano w `/private/tmp/km3-2-24-build`, z kopii aktualnych śledzonych plików, bez `.env*`, z istniejącym `node_modules`, syntetycznym adresem `https://synthetic.invalid` i kluczem oraz lokalną atrapą fontów `/private/tmp/km3-2-10-font-mock.cjs`. Telemetria była wyłączona. Runtime istniejących zależności: Next.js 16.3.6, webpack. BUILD_ID: `6EYU70FBVpZBJdQxqAgye`. Pozostały wcześniejsze ostrzeżenia middleware/Edge Runtime i cache webpacka; brak błędów. Po zakończeniu ponownie potwierdzono zgodność 560/560 źródeł z worktree. To lokalny build testowy, bez wdrożenia na serwer TEST i bez odbioru LIVE.

## Koszt i checkpoint

- Nowe wywołania Nous: **0**, koszt tych wywołań: **0 USD**. Bez dodatkowego Codex API, nowych usług, instalacji zależności i subagentów. Salda Nous nie odczytywano; nie podaje się historycznego salda jako bieżącego.
- Pasywny odczyt limitów Codex przed edycją, **12:02:58 CET**: użycie 5 h **69%**, tydzień **25%**, plan Plus, brak dodatkowych kredytów. Po buildzie o **12:06:44 CET** odczytano najnowszą próbkę z **12:06:35 CET**: **73% / 26%**. To wskazania okien abonamentu, nie dokładny koszt paczki. Źródło: metadane `rate_limits` z `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T12-02-14-01a1bff9-1329-7591-8fbe-bbea696ce7ae.jsonl`; wyciąg w `/private/tmp/km3-2-24-limits.json`.
- **Checkpoint KM3.2.24:** diff dwóch testów + niniejszy raport + logi + manifest źródeł. Zapis `~/.hermes/cache/k3/CHECKPOINT-*.md` jest niedostępny w tej sesji: katalog znajduje się poza dozwolonymi korzeniami zapisu `workspace-write`, a eskalacja jest wyłączona. Nie obchodzono ograniczenia; stan do odbioru zachowano tutaj.
- Bez commita, pusha i publikacji. Następny krok: odbiór Tomasza na podstawie dowodów; nie uruchamiano kolejnej paczki.
