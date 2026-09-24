# GŁÓWNY STAN WDROŻENIA mCRM AI

Aktualizacja: 2026-09-24 Europe/Warsaw
Właściciel biznesowy: Tomasz
Kierownik strategiczny: 01.07 — Strategiczny Wdrożeniowiec mCRM AI
Repozytorium: makson-mcrm/wacrm

## AKTUALNY CEL

Po resecie tygodniowego limitu w sobotę 26.09.2026 doprowadzić w pierwszej kolejności do stabilnego CRM MINIMUM LIVE:

002 — FUNDAMENT + DZISIAJ + P0
003 — KLIENCI + DEAL + lekki rejestr przed Dealem
004 — AKTYWNOŚĆ / DZWONIENIE + pomiar sprzedaży

Dopiero po stabilnym LIVE 002–004 wolno przechodzić dalej. Firma i technologia mają przywrócić realną sprzedaż, a nie konsumować limit na kosmetykę, audyty poboczne i równoległe eksperymenty.

## OSTATNI POTWIERDZONY MAIN

`8a68c42d29486d53e35c562df0f616950f7c0918` — merge PR #10 „finalny AppShell 002” z 22.09.2026.

To zastępuje stary wpis wskazujący PR #4 jako ostatni potwierdzony main.

## 002 — STAN

- Kod paczki 002 został scalony do `main` przez kolejne PR-y #7–#10.
- PR #10 zawierał poprawki finalnego AppShellu 002, w tym GlobalAdd i nawigację 9 ekranów.
- Pełny LIVE PASS 002 PO PR #10 NIE został jeszcze niezależnie potwierdzony na rzeczywistym zalogowanym LIVE względem finalnej planszy DZISIAJ + audytu + checklisty.
- W sobotę pierwsza bramka to rzeczywisty odbiór LIVE 002. Jeżeli FAIL — poprawiamy wyłącznie 002. 003 pozostaje STOP.

## 003 — STAN

Aktywny PR: #11
Branch: `codex/0107-003-klienci-deal-rejestr`
Head PR #11: `6d22708f80f88684420f460a26a70c986f623067`

STATUS: NIEGOTOWE / NIE SCALAĆ.

Powód:
- Codex został realnie uruchomiony i wykonał lokalne zmiany oraz testy,
- ale jego środowisko nie miało poświadczeń pozwalających zapisać lokalny commit na istniejącej gałęzi GitHub,
- dlatego head PR #11 nie zmienił się i ostatnie zmiany Codexa nie są fizycznie dostarczone do repo.

Wniosek: raport Codexa o lokalnym commicie bez zmiany head PR NIE jest dowodem wykonania.

## 004 — STAN

NIEURUCHOMIONA.
Specyfikacja przygotowana: `docs/codex/0107-004-AKTYWNOSC-POMIAR.md`.
004 wolno uruchomić dopiero po pełnym LIVE PASS 003.

## TRANSPORT CODEX → GITHUB — GŁÓWNY BLOCKER

Potwierdzony stan:
- GitHub → wywołanie Codexa: działa,
- Codex → wykonanie kodu/testów lokalnie: działa,
- Codex → fizyczny zapis wyniku jako nowy head istniejącego PR: w dotychczasowym trybie NIE działał z powodu braku poświadczeń zapisu.

Do czasu naprawy transportu NIE wolno przedstawiać automatyzacji jako samodzielnego wdrażania.

Kryterium PASS transportu:
- istniejący PR #11,
- Codex wykonuje minimalną kontrolowaną zmianę,
- bez ręcznego przenoszenia kodu przez Tomasza pojawia się nowy head SHA PR #11 w `makson-mcrm/wacrm`.

Po dwóch kolejnych próbach bez zmiany head: STOP, bez dalszego spalania limitu.

## ŹRÓDŁO UX — OBOWIĄZUJE

Folder Drive: „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026”.
PDF: „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026.pdf”.
Załączniki: „01 — AUDYT UX — ZAŁĄCZNIK DO 9 EKRANÓW — 18.09.2026” oraz „02 — CHECKLISTA ODBIOROWA UX — 9 EKRANÓW — 18.09.2026”.

Plansza określa wygląd, proporcje i hierarchię. Audyt określa zachowanie, responsywność i kryteria odbioru. Nie redesignować.

## DOKUMENTY WYKONAWCZE NA SOBOTĘ

- `docs/codex/0107-003-KLIENCI-DEAL-REJESTR.md`
- `docs/codex/0107-004-AKTYWNOSC-POMIAR.md`
- `docs/codex/0107-START-SOBOTA-2026-09-26.md`

## PR-Y — PORZĄDEK

- PR #5: ARCHIWALNY — zamknięty. Nie używać jako źródła prawdy.
- PR #6: ARCHIWALNY — zamknięty. Nie używać jako źródła prawdy.
- PR #7–#10: historia wykonania 002; scalone.
- PR #11: JEDYNY aktywny PR 003; NIE SCALAĆ przed dostarczeniem rzeczywistych zmian Codexa i spełnieniem warunków startu.

## BUDŻET LIMITU — 24.09.2026

Ostatni stan podany przez Tomasza:
- limit tygodniowy: około 5% pozostało przed sobotnim resetem.

Zasada do resetu:
- nie kodować nowych funkcji,
- nie ruszać 004,
- nie uruchamiać 005–010,
- pozostały limit Codexa przeznaczyć wyłącznie na test/naprawę transportu Codex → GitHub,
- zwykłym Chatem/GitHubem przygotować dokumentację, stan i kolejność bez spalania limitu Codexa.

## ZASADA ODBIORU

Raport Codexa ≠ odbiór.
Lokalny commit Codexa ≠ dostarczenie.
Testy/build ≠ LIVE PASS.

Każda paczka:
kod → fizyczny commit na właściwym PR → testy/build/checki → merge → deploy → rzeczywiste porównanie LIVE → PASS/FAIL.

Tomasz nie jest kurierem kodu ani testerem technicznym. Angażować go tylko do jednej koniecznej czynności właścicielskiej lub krótkiego końcowego testu biznesowego LIVE.

## KOLEJNOŚĆ SOBOTA 26.09

1. Odbiór LIVE 002 po PR #10.
2. Jeśli 002 FAIL — poprawka tylko 002.
3. Jeśli 002 PASS — test transportu Codex → istniejący PR #11.
4. Jeśli transport PASS — wykonanie 003 według zamkniętej specyfikacji.
5. Merge + LIVE PASS 003.
6. Dopiero wtedy 004.
7. 005–010 pozostają STOP do czasu stabilnego CRM MINIMUM LIVE.

## STOP

STOP gdy:
- 002 lub 003 nie ma rzeczywistego LIVE PASS,
- dwie kolejne próby transportu nie zmieniają head PR,
- potrzebne jest ryzykowne uprawnienie/decyzja właściciela,
- limit realnie blokuje pracę,
- źródła prawdy są sprzeczne.

## NASTĘPNY KROK

Do soboty: bez nowego kodu. Przygotowanie repo i dokumentów oraz jedna oszczędna próba rozwiązania transportu Codex → GitHub na PR #11. Po resecie sobotnim zacząć dokładnie od `docs/codex/0107-START-SOBOTA-2026-09-26.md`.
