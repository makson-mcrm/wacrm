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

### Koszt
- 0 USD na kodowanie; Codex 5 h — ok. 51 % zapasu, tydzień 55 %; brak płatnych wywołań Nous.
