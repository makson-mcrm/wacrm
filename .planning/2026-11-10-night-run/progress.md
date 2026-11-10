# Progress Log

## Session: 2026-11-10 (N-01)

### Current Status
- **Phase:** F1 — II.1 publikacja i odbiór Lejka
- **Started:** 2026-11-10 00:0x
- **Active plan:** `.planning/2026-11-10-night-run` (pointer `.planning/.active_plan`)

### Actions Taken
- Zainstalowano skill `planning-with-files` (hub, ścieżka `.hermes` = SAFE) i wtyczkę `planning-with-files` 0.3.0; wtyczka **enabled**, gateway przeładował komendy i hooki (tools doładują się w nowej sesji).
- Utworzono jeden aktywny plan 10–12.11 (`task_plan.md`, `progress.md`, `findings.md`), ustawiono wskaźnik `.active_plan`.
- Sprawdzono stan II.1 i H-01 (poniżej).

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `check-complete.sh` na planie | rozpoznaje fazy | 3 in_progress + 3 pending | PASS |
| `set-active-plan.sh --list` | plan [active] | `2026-11-10-night-run [active]` | PASS |
| `plugins list` | planning-with-files enabled | enabled, 0.3.0 | PASS |
| Guard kosztów (syntetyk) | 12/12 | 12/12 PASS | PASS |
| Upload TEST (TUS) | 201 + 204 | **401** (5 tokenów) | FAIL → B1 |
| `gateway restart` | nowy PID | odmowa: live session | FAIL → B3 |

### Errors
| Error | Resolution |
|-------|------------|
| B1: Hostinger upload 401 (także 5 B) | Eskalacja: odblokować sesję File Browser w hPanel albo nowa ścieżka publikacji; limit 20 min na starą metodę wykorzystany |
| B2: bramka odrzuca przy `prod-build.json` > 15 min | Skrypt startowy odświeża znacznik przed wywołaniem |
| B3: restart odmówiony („1 live session”) | Wariant `--yes` — czeka na zgodę właściciela |

### F1 — ścieżki publikacji (sprawdzone 10.11, 10:30)
| Ścieżka | Wynik |
|---------|-------|
| TUS upload (stara) | 401 × 5 tokenów — **wstrzymana, limit 20 min wykorzystany** |
| `git push` → GitHub → build z repo | brak poświadczeń („could not read Username for github.com”) |
| SSH/SFTP na serwer | port 22 — timeout (niedostępny) |
| GitHub branch `k3/bigin-02b-20261105` | head `8b60931` (11.10) — brak `a155693` |
| Build z archiwum już na serwerze | tylko `wacrm-km351f.tgz` = stan F (`64de33f`) |

Wniosek: **jedyny bloker** — sesja File Browser/API Hostingera wymaga odświeżenia po stronie właściciela.

### Checkpoint przed restartem
- `01-checkpoint-2026-11-10T10:33:10` (state + Hindsight, `verify` 3/3).
- Aktywny Codex: **0 procesów** (`ps aux | grep -c '[c]odex exec'` → 0).
- Wznowienie automatyczne: zadanie `18e3ab92d400` (00:38) → `f1-resume.sh` (PID usługi, guard 12/12, aktywny plan, next step, HTTP TEST); plan wskazuje `.planning/.active_plan`.

### Restart gatewaya (zatwierdzony przez właściciela)
- Komenda: `hermes gateway restart --yes` (tylko istniejąca usługa; produkcja nietknięta).
- Próba uruchomienia z procesu agenta **zablokowana przez warstwę bezpieczeństwa** (circuit breaker, 3 blokady z rzędu) — uruchomienie pozostaje po stronie właściciela.
- Po restarcie weryfikacja: nowy PID, guard H-01 (12/12), aktywny plan `2026-11-10-night-run`, wynik zadania `18e3ab92d400`, wstrzyknięcie planu w nowej turze (hook `pre_llm_call`).

### F1 — pomiar Bigin ↔ TEST (10.11, 12:40–12:55)
| szer. | Bigin panel / kolumna x | TEST panel / kolumna x | ocena |
|---|---|---|---|
| 1536 | 220 / 295 | 220 / 295 | zgodne |
| 1280 | **198 / 272** | 220 / 294 | **D1: 22 px** |
| 1024 | **198 / 272** | 220 / 294 | **D1: 22 px** |
| 390 | 198 / 272 | 198 / 272 | zgodne |

- **D2**: karta Bigin `.ignite-kv-card` 220×**79** px, r=4; TEST `[data-pipeline-deal]` 220×**60** px, r=3.5.
- **D3**: Bigin pokazuje 3. wiersz (kwota); TEST tylko 2 wiersze.
- Nakładki: 0 na 1536/1280/1024/390. `scrollWidth==clientWidth` wszędzie.
- Zwijanie panelu: 220 → 0 → 220 (`aria-expanded` true/false/true), kolumna x 295 → 115 → 295.
- Lejek → Deal → powrót: 37 kart / 6 kolumn → `/deals/24966ced…` (poprawne pola) → powrót 37 kart / 6 kolumn.
- Font: Inter (decyzja właściciela) — nie traktować jako różnicy.
- Codex H uruchomiony (8-sekcyjny kontrakt) na D1–D3.

### F1 — KM3.5.1H (D1–D3) — stan po przebiegach
- Commit **`88b8015`**: panel `199 px` ≤1280 (`PIPELINE_TEAM_PANEL_NARROW_WIDTH`), karta `79 px`
  (`PIPELINE_CARD_HEIGHT`), promień 4 px, trzeci wiersz z kwotą tylko przy `value > 0`.
- Bramki Hermesa: `npx vitest run` → **2358 PASS / 1 skip / 0 FAIL (2359)**; `npm run typecheck` → **RC 0**.
- Stare asercje układu (221/294/60) zaktualizowane do 199/272/79 w 3 plikach testowych — bez osłabiania funkcji.
- Archiwum: `/tmp/wacrm-km351h.tgz` (2,7 MB).
- **Bloker publikacji:** Hostinger TUS → 401 na 6 tokenach; wymagane odświeżenie sesji File Browser
  albo jednorazowe wgranie archiwum do `public_html`.
- Wnioski procesowe: rozszerzenie zakresu dopisywać do PROMPT (nie tylko TASK); po każdym przebiegu `--release`.

### F1 — publikacja KM3.5.1H na TEST (10.11, 14:17–14:25)
- Archiwum w `public_html` potwierdzone: SHA-256 `1955e8ba…377f26` = kopia lokalna (commit `88b8015`).
- Build **`01a1c59b-4f3b-72cd-b1d9-25460d0f7535`** → `completed`, publikacja 13:21:58Z, restart aplikacji 5,4 s.
- Pomiar po wdrożeniu: panel **220 / 198 / 198 / 198** px (1536/1280/1024/390) — identycznie jak Bigin;
  kolumna `x=295 / 272`, szerokość 230 px; karta **220×79 px, radius 4 px**, wiersz kwoty („50 000 zł”, 9 kart z kwotą);
  `overflowX = 0` na wszystkich czterech szerokościach; nakładki 0.
- Zwijanie panelu: 220 → **0** → 220 px (`aria-expanded` true/false/true), kolumna 295 → 115 → 295.
- Lejek → Deal → powrót: 37 kart / 6 kolumn → `/deals/24966ced-…` (poprawne pola) → 37 / 6.

### KM1.4.01 — kontrola kosztów (stan faktyczny)
- Działa: guard w `agent/turn_api_request.py` (wspólny `ledger.json` + `flock`), limity `max_calls_per_task=1500`,
  `max_minutes_per_task=720`, fail-closed przy braku/uszkodzonym `policy.json`, testy **12/12 PASS**.
- Braki (do jednej paczki naprawczej): **brak limitu USD na zadanie i na dzień**, **brak limitu płatnych wywołań**,
  `no_progress_minutes = 0` (detektor bezruchu wyłączony domyślnie, więc STOP przy braku postępu nie zadziała).

### KM1.4.05 — zgody
- Reguła w `SOUL.md` (linie 31–35) wymaga CEL/PO CO/SKUTEK/KOSZT/RYZYKO przed oknem „Uruchom”.
- Faktycznie: wyjaśnienie jest w treści wiadomości, ale **okno systemowe pokazuje samą komendę** — brak wymuszenia w UI.

### Koszt
- 0 USD na kodowanie; Codex 5 h — ok. 51 % zapasu, tydzień 55 %; brak płatnych wywołań Nous.

### KM1.5 — uzbrojenie Hermesa (10.11, 15:40–16:05)
- PASS: planning-with-files (plan wstrzykiwany co turę), Codex Delegate (4 przebiegi przez bramkę, 0 USD API),
  Playwright/CDP (zalogowane Bigin + TEST, 4 szerokości).
- OTWARTE: RTK (brak źródła pakietu), Skill-Retrieval (brak wtyczki), UXKIN ui-from-screenshot
  (równoważnik: `f1_probe.py` + `f1_compare.py` + skill `weryfikacja-responsywnosci`).
- Dowód blokady shimu: bezpośrednie `codex exec` → „BRAMKA KODU: ODMOWA — brak tokenu bramki”.
