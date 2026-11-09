# AGENTS.md — mCRM AI · zasady obowiązujące (stan 09.11.2026)

> **Wersja nadrzędna.** Wpisy z 10–11.10.2026 (blokady Windows, stara numeracja L0–L4, historia KM1,
> limity „5 USD łącznie”) są **ARCHIWALNE i nieobowiązujące** — kopia: `~/.hermes/cache/k3/AGENTS-ARCHIWUM-2026-11-09.md`.
> Nie przenoś ich z powrotem.

## 1. Role

- **Tomasz** — wyłącznie właściciel biznesowy; wydaje ostateczny **PASS wizualny** na `test.makson.space`.
  Nie jest testerem, programistą ani kurierem.
- **Hermes** — kierownik wykonawczy: mierzy, zleca, testuje, wdraża, dostarcza dowód.
- **Codex CLI (abonament ChatGPT)** — jedyny wykonawca kodu.

## 2. ZERO KURIERA (bezwzględne)

Nie proś Tomasza o klikanie po oknach, kopiowanie komunikatów, przenoszenie plików ani dyktowanie różnic.
Wszystko, co da się zrobić narzędziami, robisz sam. Jedyna dopuszczalna prośba: czynność niedelegowalna
(logowanie do panelu, zgoda finansowa), opisana jednym zdaniem.

## 3. KOSZT — tylko abonament

- Kodowanie, testy, pomiary i CSS: **wyłącznie Codex CLI** (`auth_mode=chatgpt`, 0 USD API).
- Płatne Nous: **rezerwa nienaruszalna** (0 USD na kodowanie). Wybór Nous do prac = błąd krytyczny.
- Przed paczką: pasywny odczyt limitów (`codex-limity.sh`, `hermes usage --provider nous --json`).
  Brak zapasu → CHECKPOINT i STOP. Nigdy nie przechodź na płatne API „żeby dokończyć”.

## 4. BIGIN-FIRST 1:1

Jedyny wzorzec: **zalogowane demo Bigin** (1536×1024). Tokeny zmierzone 09.11.2026 (Playwright):

| element | Bigin | mCRM |
|---|---|---|
| pasek górny | **48 px** | 49 px → do zmiany na 48 |
| panel boczny | **285 px**, zwinięty **64 px** | 285 px |
| treść / tablica | x=285 / x=**295** | 285 / 295 |
| kolumna Lejka | 220 px, odstęp 10 px, karta 60 px | zgodne |
| panel — kolor | `rgb(9,62,83)` = **#093E53** | `#093E52` (1 punkt różnicy) |
| tło treści | `#F9FBFC` | zgodne |
| akcent aktywny | `#0B4A63` | zgodne |
| obramowania / wiersze | `#E0E9EE` / `#FCFDFD` | zgodne |
| font | `zoho-puvi-regular` | `Inter` (różnica świadoma) |

Autorskie dodatki mCRM: kod zostaje na zawsze, widoczność sterowana `surfaceFlags.*`.
Domyślnie `false` (powierzchnia = rdzeń Bigin), chyba że właściciel każe odsłonić.

## 5. PĘTLA AUTOMATYZACJI UX (twarda, bez pytania o zgodę)

1. Hermes uruchamia **headless Playwright** na zalogowanym demo Bigin (CDP `127.0.0.1:9400`, 1536×1024)
   i pobiera `getBoundingClientRect` + `getComputedStyle` dla paska, panelu, tablicy, kolumn, kart, tabel.
2. Zmierzone stałe wpisuje **Codex** do `src/lib/ui/layout-geometry.ts` i tokenów `--bigin-*`.
3. Hermes mierzy tę samą trasę na `test.makson.space` i liczy **Visual Diff (pixelmatch)**.
4. Iteracja CSS przez Codexa aż do odchylenia **< 0,5%** ramy (pasek, panel, tablica).
   Różnice treści (dane, nazwiska, kwoty) nie liczą się jako odchylenie ramy.
5. Meldunek z odbioru zawiera **liczbę diff**; bez pomiaru nie podaje się linku.

Skrypty pomiaru: `~/.hermes/k3/render/pomiar_pw.py` (Bigin) i `pomiar_mcrm.py` (mCRM),
uruchamiane interpreterem `~/.hermes/cache/scratch/pwenv/bin/python`.

## 6. Wdrożenie na TEST (bez GitHuba)

`tar --exclude=node_modules --exclude=.next --exclude=.git` → TUS (Hostinger MCP `generate-upload-url`)
→ `review-build/*.tgz` → `hosting_nodejs_start-build` (archive, node 22, app next, `build:webpack`, `.next`).
Numer builda z `hosting_get-deployment`. Push do GitHuba niemożliwy (brak poświadczeń) — nie obchodzić.

## 7. Bramka zlecenia

Zlecenie w `~/.hermes/k3/zlecenia/TASK-*.md` musi zawierać 13 pól kontraktu (ID, KAMIEŃ, CEL, ZAKRES PLIKÓW,
ZAKAZY, ŹRÓDŁA, SKILLS, MODEL, BUDŻET, TESTY, DOWODY, ODBIÓR, CHECKPOINT) + `BASE_SHA` = commit produkcji.
Ścieżki w zakresie **pełne** (bramka sprawdza istnienie plików). Kolejność: `bramka_kod.py --lock` → Codex → testy.

## 8. Odbiór

PASS nadaje wyłącznie Tomasz po zobaczeniu ekranu. Raport wykonawcy, zielone testy i numer builda to dowód
techniczny, nie odbiór. Statusy ekranu: **ZGODNY I DZIAŁA** · **DZIAŁA CZĘŚCIOWO** · **NIE DZIAŁA**.

## 9. Stan na 09.11.2026

- TEST: `test.makson.space` — build `01a1c147-d6a1-7103-a37c-fc02f715f3d6` (completed 09.11 18:12), źródło: archiwum
  `review-build/wacrm-i3.tgz` ze źródeł `907cf7d` (archiwum nie niesie numeru commita).
- Produkcja: bez zmian — commit `0f7317df`, build `01a1aba4`.
- Testy na `907cf7d`: 2239 PASS / 1 skipped / 0 FAIL (2240); `tsc` 0 błędów.
- Repo roboczy: kanoniczne `~/wacrm-km2` (`main`); worktree aktywnej paczki `~/wacrm-a` (detached HEAD `907cf7d`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
