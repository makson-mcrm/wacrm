# Task Plan: mCRM Bigin-first — 10–12.11.2026

## Goal

Dowieźć mCRM AI zgodny 1:1 z demo Bigin, ekran po ekranie, z trwałym testem Playwright i bez przekraczania budżetu — z odbiorem wyłącznie właściciela.

## Next Step

Czeka wyłącznie odbiór właściciela dla Lejka na `https://test.makson.space/pipelines` (build `01a1c59b`).
Po PASS: paczka KM1.4.01+05 (limity USD/dzień/płatne wywołania + wymuszenie opisu zgody), potem F3.

## Current Phase

F1 — II.1: publikacja i odbiór Lejka

## Phases

### F1: II.1 — publikacja i odbiór Lejka (Bigin-first)

- [x] Publikacja `a155693` na TEST (build `01a1c31a`, archiwum `wacrm-km351g.tgz`)
- [x] Pomiar Bigin ↔ TEST: 4 szerokości + zwijanie panelu (wynik: D1, D2, D3)
- [x] Lejek → Deal → powrót i trwałość (37 kart / 6 kolumn bez zmian)
- [x] Poprawka D1–D3 wdrożona i zacommitowana (`88b8015`), bramki 2358 PASS / 0 FAIL
- [x] Publikacja `88b8015` na TEST — **build `01a1c59b` completed 13:21:58Z** (archiwum `wacrm-km351h.tgz`, SHA-256 zgodny)
- [x] Pomiar po poprawce: 1536/1280/1024/390 = Bigin co do piksela (panel 220/198/198/198, kolumna x 295/272, karta 220×79 r=4, kwota widoczna)
- [ ] Odbiór właściciela (PASS tylko Tomasz)
- **Status:** in_progress

### F2: Trwały test Playwright wyglądu, stanów i interakcji

- [x] `pomiar_ciagly.py` — progi i `pageOverflow`
- [x] `ux_probe.py` — odkrycie kontrolek, stan PRZED/PO, delta vs Bigin
- [ ] Wpięcie do każdego odbioru ekranu (FAIL = plik:linia + px)
- **Status:** in_progress

### F3: Kolejne ekrany wyłącznie po PASS właściciela

- [ ] Deal, Kontakty, Firmy, Aktywności/Kalendarz — jedna paczka = jeden ekran
- **Status:** pending

### F4: Własne funkcje mCRM po odebraniu podstawy

- [ ] AI, WhatsApp, notatki głosowe, analizy pod `surfaceFlags`
- **Status:** pending

### F5: Wieczorny Bielik i test Local-First

- [ ] Lokalny model + bramka 8787, dane identyfikujące nie opuszczają Maca
- **Status:** pending

### F6: H-01, Hindsight, wznowienie po restarcie, odbiór końcowy
- [x] Guard kosztów w `build_api_request()` (12/12 PASS syntetycznie)
- [x] Hindsight: `zapisz_stan.sh` (state + checkpoint + verify)
- [ ] Restart gatewaya (`--yes`) i dowód po restarcie
- [ ] Odbiór końcowy właściciela
- **Status:** in_progress

## Key Questions

1. Czy Hostinger odblokuje upload (sesja File Browser / 2FA)? — otwarte.
2. Czy właściciel zatwierdzi `restart --yes` (10 s przerwy w czacie)? — otwarte.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Archiwum wgrywać do rootu `public_html` | `review-build/` znika po każdym publishu („Syncing public_html”) |
| `no_progress_minutes=0` domyślnie | detektor bezruchu włączamy per paczka, żeby nie blokować zwykłych rozmów |
| PASS tylko właściciel | testy kodu i % zgodności obrazu nie są odbiorem |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Upload TEST HTTP 401 | 5 | Zmiana ścieżki: nowy token + root; nadal 401 → eskalacja do właściciela |
| Bramka: `prod-build.json` starszy niż 15 min | 1 | Skrypt startowy odświeża znacznik przed wywołaniem |
| Restart gatewaya odmówiony (live session) | 1 | Wariant `--yes` — czeka na zgodę właściciela |

## Notes

- Jeden Codex jednocześnie; kod wyłącznie przez bramkę; produkcja `0f7317df` nietknięta.
- Nie powielamy D1–D3: ten plan śledzi wykonanie, nie przepisuje dokumentacji.

### KM1.5: Uzbrojenie Hermesa (10.11.2026)

| # | Element | Stan | Dowód |
|---|---|---|---|
| 1 | planning-with-files | PASS | plugin 0.3.0 enabled; plan wstrzykiwany co turę (bloki PWF-DATA) |
| 2 | RTK | OTWARTE | brak instalacji i brak zweryfikowanego źródła pakietu |
| 3 | Codex Delegate | PASS | 4 przebiegi przez `bramka_kod.py` → `codex exec`, abonament, 0 USD; shim blokuje bezpośrednie `codex` |
| 4 | Skill-Retrieval | OTWARTE | brak wtyczki/skilla; wybór skilla robi kierownik ręcznie |
| 5 | UXKIN ui-from-screenshot | OTWARTE | brak skilla; równoważnik: `f1_probe.py`/`f1_compare.py` + `weryfikacja-responsywnosci` |
| 6 | Playwright/CDP | PASS | dzisiejsze pomiary Bigin i TEST na 4 szerokościach z zalogowanych sesji |

Test całego przepływu: KM1.4.01 — plan → bramka PASS → Codex → 11/11 testów → checkpoint Hindsight.

#### KM1.5 — aktualizacja 16:05 (domknięcie 3 otwartych)
| # | Element | Stan | Dowód |
|---|---|---|---|
| 2 | RTK | **PASS** | `rtk 1.2.0` (oss) w `~/.local/bin`; `rtk ls -R` 15873 B → 540 B (**96%**); `rtk gain` 21,9%; brak flagi `--agent hermes` → integracja jako prefiks polecenia |
| 4 | Skill-Retrieval | **PASS (wbudowane)** | indeks 70 skilli z frontmattera; test doboru 4/4: KM3.2.08→`k3-screen-delivery`, KM1.4.01→`kontrola-kosztow-ai`, KM1.5→`planning-with-files`, responsywność→`weryfikacja-responsywnosci`; bez płatnego LLM |
| 5 | UXKIN ui-from-screenshot | **PASS** | skill `ui-from-screenshot` (MIT, bez konta/MCP) + powiązanie z `f1_probe.py`/`f1_compare.py` i `weryfikacja-responsywnosci` |
- Nowy skill `rtk-output-compression` z procedurą użycia i ograniczeniami.
- Test końcowy przepływu: plan `2026-11-10-night-run` → checkpoint → dobór skilla → zapis `01-checkpoint-2026-11-10T16:02:52`.
