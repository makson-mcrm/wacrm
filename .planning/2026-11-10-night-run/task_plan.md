# Task Plan: mCRM Bigin-first — 10–12.11.2026

## Goal

Dowieźć mCRM AI zgodny 1:1 z demo Bigin, ekran po ekranie, z trwałym testem Playwright i bez przekraczania budżetu — z odbiorem wyłącznie właściciela.

## Next Step

Odblokować publikację TEST (Hostinger file API 401) albo uzyskać zgodę na restart gatewaya (`--yes`) i domknąć H-01; następnie opublikować `a155693` i zmierzyć Lejek.

## Current Phase

F1 — II.1: publikacja i odbiór Lejka

## Phases

### F1: II.1 — publikacja i odbiór Lejka (Bigin-first)

- [ ] Publikacja `a155693` na TEST (blokada: upload 401)
- [ ] Pomiar Bigin ↔ TEST: 4 szerokości + ciągłe zwężanie + zwijanie panelu
- [ ] Lejek → Deal → powrót i trwałość
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
