---
name: mcrm-ux-gate
description: Use when realizujesz numerowany wzorzec mCRM (np. 00A, 02A, 03A) — prowadzi przez bramki 0-3: źródła, WZORZEC ↔ LIVE, zgoda Tomasza, mała paczka, odbiór na publicznym LIVE. Nie nadpisuje AGENTS.md.
---

# mCRM — BRAMKA UX WYKONAWCZA (procedura)

Ten skill opisuje PROCEDURĘ. Nadrzędnym dokumentem wykonawczym repo pozostaje `AGENTS.md`; przy sprzeczności wygrywa `AGENTS.md` i decyzja Tomasza.

Obowiązuje pętla:
**JEDEN NUMER WZORCA → WZORZEC ↔ LIVE → LIMITY → ZGODA TOMASZA → MAŁA PACZKA → LIVE → PORÓWNANIE → PASS/NIE PASS.**

## BRAMKA 0 — ŹRÓDŁA I ZAKRES (bez kodu)
1. Ustal dokładny numer wzorca i jego zakres (jeden numer naraz).
2. Załaduj wyłącznie źródła obowiązujące: UX 2.3 („03 — MAPA UX 2.3 … 05.10.2026”), UX FINAL 18.09, zatwierdzone plansze i numerowane wzorce, decyzje Tomasza.
3. Wskaż komponenty wspólne, pliki potencjalnie do zmiany, duplikaty i ryzyko regresji.
4. Brak jednoznacznego wzorca → `STOP — BRAK WZORCA / DECYZJA WYMAGANA OD TOMASZA`. Nie wybieraj planszy i nie twórz własnej.

## BRAMKA 1 — WZORZEC ↔ LIVE ORAZ LIMITY (bez kodu)
1. Przygotuj parę 1:1: lewa — wzorzec (numer, urządzenie, źródło planszy); prawa — publiczny LIVE (data i godzina zrzutu), ten sam typ urządzenia i porównywalna rozdzielczość.
2. Wypisz maksymalnie 3 różnice; jeśli różnic jest więcej, zawęź do 1–3 najważniejszych i zgłoś STOP.
3. Oceń wyłącznie jako `MOJA OCENA: ZGODNE` albo `MOJA OCENA: NIEZGODNE`. Nie nadawaj PASS.
4. Odczytaj limity pasywnie: Codex 5h, Codex tydzień, Nous przed. Brak pasywnego odczytu → `BRAK ŚWIEŻEGO ODCZYTU` (nie zgaduj). Brak danych o limitach/budżecie → `STOP — ZAKAZ NOWEJ PŁATNEJ PRACY`.
5. Podaj przewidywane zużycie paczki.

## ZGODA TOMASZA
Bez jawnej zgody nie ma kodu. Zgoda dotyczy jednego numeru i jednego zakresu plików.

## BRAMKA 2 — MAŁA PACZKA
1. Zapisz `BASE_SHA`.
2. Tylko zatwierdzony numer, tylko wskazane pliki, bez innych ekranów, bez nowych funkcji, bez własnego UX, bez szerokiego refaktoru.
3. Codex uruchamiany wyłącznie po jawnej zgodzie Tomasza.

## BRAMKA 3 — ODBIÓR NA PUBLICZNYM LIVE
1. LIVE oznacza wyłącznie publiczne środowisko Hostinger.
2. Zbierz: świeży zrzut LIVE, parę WZORZEC ↔ LIVE, test zapisu i trwałości (utwórz → zapisz → wyjdź → wejdź ponownie → potwierdź), kontrolę regresji ekranów wcześniejszych.
3. Raport paczki w formacie: START / KONIEC / CZAS / NUMER WZORCA / CODEX 5H PRZED-PO / CODEX TYDZIEŃ PRZED-PO / NOUS PRZED-PO / EFEKT NA PUBLICZNYM LIVE / PASS-NIE PASS-STOP / NASTĘPNY JEDEN KROK.
4. Stan kończy się `PASS`, `NIE PASS` albo `STOP`.
5. `PASS` zatwierdza wyłącznie Tomasz po obejrzeniu pary WZORZEC ↔ LIVE. Build, commit i testy automatyczne nie są PASS.
6. `3-FAIL RULE`: po trzech kolejnych `NIE PASS` tego samego numeru STOP i analiza przyczyny.

## ZAKAZY
- Nie rozstrzygaj sporów źródeł samodzielnie.
- Nie rozszerzaj zakresu po cichu.
- Nie uruchamiaj Codexa po limitach i nie uruchamiaj go tylko po to, aby odczytać limit.
- Nie kończ stanu bez wyraźnego PASS / NIE PASS / STOP.
- Nie przenoś pracy na Tomasza, jeśli możesz ją wykonać sam.

## NOUS — SALDO I PROGI
Źródłem prawdy jest **świeży odczyt rzeczywistego salda konta**: `GET https://portal.nousresearch.com/api/oauth/account` tokenem z `auth.json` → pole `paid_service_access.total_usable_credits`. Zakaz opierania decyzji na historycznym, ręcznie wpisanym budżecie (nie używać dawnego „budżetu 9 USD” jako aktualnego salda).
Odczyt przed każdą płatną paczką i po niej; raportować rzeczywistą zmianę PRZED → PO. Brak odczytu → `BRAK ŚWIEŻEGO ODCZYTU — NIE ZGADUJĘ`.
Progi: **≤ 2 USD → OSTRZEŻENIE**; **≤ 1 USD → STOP (zakaz nowej płatnej pracy)**; poniżej 1 USD wyłącznie po jawnej decyzji Tomasza.
Automat: `scripts/limits_report.py` (Nous + Codex 5h + tydzień + resety w jednym przebiegu).

## CODEX — LIMITY
Odczyt pasywny, automatyczny: `GET https://chatgpt.com/backend-api/wham/usage` tokenem z `auth.json` (`credential_pool.openai-codex`) → `primary_window` (5 h) i `secondary_window` (tydzień): `used_percent` + `reset_at`. Fallback, gdy API nie odpowiada: najnowszy `~/.codex/sessions/**/rollout-*.jsonl`, wpis `rate_limits` z `limit_id: "codex"`.
Nie uruchamiać Codexa po to, aby poznać limit. Brak odczytu → `BRAK ŚWIEŻEGO ODCZYTU`.