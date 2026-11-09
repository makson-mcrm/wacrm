# CODEX-KM3-4-2 — checkpoint techniczny

Data: 09.11.2026. Status: **NIEZAKOŃCZONE — blokery zakresu i środowiska**. PASS właściciela nie nadany.

## Stan wejściowy i bramka

- Katalog: `/Users/mcrm-ai/wacrm-a`; czyste drzewo wejściowe, odłączony HEAD `f2b42c0e5e3e85fdbd472dc760c8980d111b264a` (KM3.4.1), zamiast aktywnej gałęzi z opisu.
- BASE_SHA z kontraktu: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Istniejący wpis bramki: `~/.hermes/k06/audit-bramka.jsonl`, `2026-11-09T17:57:01`, `ALLOW_GATE_ONLY`, plik `TASK-KM3.4.2.md`; lock tej samej paczki od `17:57:06`. Nie uruchamiano drugiego Codexa.
- Odczyt limitów ze skryptu `codex-limity.sh`: 60% pozostałe w oknie 5 h i 64% tygodniowo; źródło `rollout-2026-11-09T17-57-06-01a1c13d-f9a1-7fe2-8323-4c6040a3412d.jsonl`. To odczyt zapisanej sesji, nie gwarancja bieżącego limitu.
- `hermes usage --provider nous --json` nie wykonało odczytu: brak prawa zapisu `.prepare.lock` w instalacji Hermesa. Nous nie wywoływano do pracy.
- Przeczytano `mcrm-wykonawca/SKILL.md` oraz lokalny przewodnik Next.js `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`.

## Zmiany w dozwolonym zakresie

- `src/app/layout.tsx` już w wejściowym HEAD ma na `<html>` dokładnie `style={{ ...BIGIN_CSS_VARS, ...biginGeometryCssVars(), ...SHELL_CSS_VARS }}`. Nie wymagał zmiany. Stałe `SHELL_CSS_VARS` wynoszą 285px / 64px / 48px.
- `src/lib/banking/qualify.test.ts`: oba oczekiwania flag `bankQualification` i `cardExtensions` ustawiono na `false`. Zachowano wszystkie asercje zawartości samodzielnie renderowanego panelu i zakaz sieci.
- `src/app/(dashboard)/pipelines/page.test.tsx`: domyślny brak nadpisania oraz jawne `false` oczekują ukrytych dodatków, `true` oczekuje obecności. Zachowano asercje rdzenia Bigin, danych kart, KPI, filtrów, AI i akcji. Źródłowa flaga musi być `false`; lista dodatków nadal sprawdzana.
- `src/lib/ui/surface-flags.test.ts`: istniejące testy flag `false`, palety `#093E53` i paska 48px już przechodziły. Dodano regresję sprawdzającą literalne trzy deklaracje w atrybucie `style` rzeczywistego `<html>` renderowanego przez `RootLayout`. Opcjonalny `KM3_RENDER_DIR` zapisuje pełny wynik SSR do `root-layout.html` dla pomiaru w przeglądarce.
- Logiki ekranów, danych, kodu bankowego, bazy, sekretów i `.env` nie zmieniano. Bez nowych zależności, commitów, pushu i publikacji. Nie dodano skipów ani osłabień asercji.

## Weryfikacja

1. Bazowy wycinek trzech plików testowych: 249 PASS / 3 FAIL, 252 testy. Porażki: kwalifikacja bankowa i dwa przypadki strony lejka. Log `/tmp/km3-4-2-baseline.log`.
2. `npm run typecheck`: **RC=0**, brak błędów. Log `/tmp/km3-4-2-typecheck.log`.
3. `KM3_RENDER_DIR=/tmp/km3-4-2-evidence npx vitest run`: **RC=1**, 2237 PASS / 2 FAIL / 1 istniejący skipped, 2240 testów, 142 pliki (140 PASS / 2 FAIL). Log `/tmp/km3-4-2-vitest.log`.
4. `git diff --check`: **RC=0**.
5. Artefakt pełnego SSR `/tmp/km3-4-2-evidence/root-layout.html` powstał podczas pełnych testów. Test potwierdził obecność wszystkich trzech wartości bezpośrednio na `<html>`.

## Blokery i następny krok

### Dwa testy poza zakresem

Pozostałe porażki nie są w czterech plikach dopuszczonych kontraktem:

- `src/components/pipelines/pipeline-board.test.tsx:175`: przypadek `override === undefined` nadal liczy `enabled = override !== false`. Wymagana korekta oczekiwania do `override === true` i opisu testu; pozostawić asercje rdzenia i obu stanów flagi.
- `src/components/pipelines/deal-form.test.tsx:596`: obecność Asystenta AI nadal oczekiwana dla `extensions !== false`. Wymagana korekta do `extensions === true`; zachować cały test odczytu, edycji, zapisu i powrotu.

Wysłano pytanie o rozszerzenie zakresu o te dwa pliki. Do czasu odpowiedzi pozostają nietknięte. Po rozszerzeniu poprawić oczekiwania, ponowić pełny Vitest i typecheck, zaktualizować raport. Limit dwóch prób nie został wykorzystany przez ponawianie tej samej nieskutecznej poprawki.

### Odczyt getComputedStyle

**Nie potwierdzono odczytu w przeglądarce.** Samo SSR nie zastępuje tego kryterium.

- Próba uruchomienia headless Chromium przez wskazany Python/Playwright: sandbox blokuje MachPortRendezvousServer (`Permission denied (1100)`).
- Alternatywa przez istniejący CDP `127.0.0.1:9400`: sandbox blokuje połączenie (`connect EPERM`).
- Nie ponawiano tych metod ani nie obchodzono ograniczeń. Skrypt pomiaru: `/tmp/km3-4-2-browser.py`; log CDP: `/tmp/km3-4-2-browser.log`.
- W środowisku dopuszczającym Playwright odczytać `getComputedStyle(document.documentElement).getPropertyValue(...)` dla trzech zmiennych. Oczekiwane wartości: `285px`, `64px`, `48px`. Docelowo potwierdzić na rzeczywistej trasie aplikacji; przygotowany artefakt SSR pozwala osobno zweryfikować emisję stylu przez RootLayout.

### Build TEST i checkpoint

Nie wdrażano buildu TEST: kontrakt wprost zakazuje publikacji. Brak nowego numeru wdrożenia, pomiaru zdalnego, visual diff i odbioru wizualnego; nie podaje się linku do ekranu jako dowodu tej paczki. Lokalnego buildu nie wykonywano przy czerwonej bramce pełnych testów.

Żądana lokalizacja checkpointu `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza zapisywalnym zakresem sandboxa. Ten raport jest checkpointem w dozwolonym katalogu repozytorium. Zapis checkpointu we wskazanej lokalizacji wymaga wykonania przez środowisko mające tam prawo zapisu.
