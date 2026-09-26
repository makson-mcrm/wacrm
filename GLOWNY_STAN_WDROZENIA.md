# GŁÓWNY STAN WDROŻENIA mCRM AI

Aktualizacja: 2026-09-26 około 17:15 Europe/Warsaw
Właściciel biznesowy: Tomasz
Rola: 01.07 — Strategiczny Wdrożeniowiec mCRM AI
Repozytorium: makson-mcrm/wacrm
Status: FORMALNE PRZEKAZANIE OKNA 01.07 — po utracie jakości starego okna

## BRAMKA 0 — OBOWIĄZUJE PRZED KAŻDYM URUCHOMIENIEM CODEXA

Przed każdym uruchomieniem Codexa 01.07 musi odczytać:
1. ten plik `GLOWNY_STAN_WDROZENIA.md`,
2. aktualny plan wykonawczy,
3. finalny pakiet `UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026`.

Następnie musi ustalić numer aktualnej paczki i kryterium PASS. Jeśli źródła są niespójne — STOP bez uruchamiania Codexa.

Zakazane jako zamiennik zatwierdzonego UX: stary ekran, stare WaCRM, `/quick-call` w starej/uproszczonej formie, „tymczasowe minimum”, własny redesign. Tomasz nie przypomina, która grafika obowiązuje.

Finalny PDF 9 ekranów jest jedynym źródłem prawdy dla wyglądu. Plansza 08 jest źródłem prawdy dla AKTYWNOŚCI.

## AKTUALNY CEL

Najbliższy cel biznesowy: na poniedziałek rano Tomasz ma móc realnie rejestrować telefony sprzedażowe bez gubienia danych.

Bezpośredni cel pozostawiony przez stare okno po ostatniej decyzji Tomasza: doprowadzić WYŁĄCZNIE ekran AKTYWNOŚĆ do działającego LIVE zgodnego 1:1 z finalną planszą 08. Nie ruszać innych ekranów, dopóki ten efekt nie jest widoczny i sprawdzony.

Docelowy przepływ AKTYWNOŚCI: Klient/Deal → Akcja/telefon → Wynik rozmowy → notatka/dyktowanie → następny krok → termin → blocker → zapis → trwałość danych/historia.

## OSTATNIA ZATWIERDZONA DECYZJA

1. BRAMKA 0 obowiązuje bez wyjątku.
2. Finalny pakiet `UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026` zastępuje stare grafiki i uproszczenia.
3. Tomasz polecił następnie: „daj tylko działające okno aktywność”.
4. Po formalnym przejęciu nie uruchamiać żadnej nowej pracy Codexa, nie tworzyć nowego planu i nie pytać Tomasza o technikalia.

## AKTUALNY RZECZYWISTY STAN KODU

### main
Aktualny head `main` przed tym zapisem stanu: `640e5f8aca89e63088c5278a37b10c2d0ac54f40`.
To commit dokumentacyjny „PREP SOBOTA 26.09 — stan + spec 003/004 + plan startowy”; nie wniósł zmian funkcjonalnych.

Ostatni potwierdzony funkcjonalny merge 002: `8a68c42d29486d53e35c562df0f616950f7c0918` — merge PR #10 „finalny AppShell 002”.

Aktualny plik `src/components/sales/quick-activity-form.tsx` na main ma blob SHA `c7e80ab0efc726c8002164490151174c31879497` i nadal odpowiada wersji obecnej w repo, nie lokalnej zmianie Codexa zgłoszonej dziś.

### PR #11
Aktywny PR #11: `01.07-003 — KLIENCI + DEAL + rejestr — NIE SCALAĆ`.
Branch: `codex/0107-003-klienci-deal-rejestr`.
Rzeczywisty head PR #11: `6d22708f80f88684420f460a26a70c986f623067`.
Head nie zawiera dzisiejszych lokalnych commitów Codexa.

Codex raportował lokalne, niewidoczne w repo commity, m.in.:
- `dedf2c2cf74c5c0f23f7a355de302d31beebff7c` — przygotowana AKTYWNOŚĆ,
- wcześniej `c7b4aa5a56970b3ac36a06754dcf7fd1730f4458` — inna lokalna wersja AKTYWNOŚCI,
- wcześniejsze lokalne HOTFIX-y 002.

Żaden z tych lokalnych SHA nie jest obecnie committem dostępnym w GitHubie. Raport lokalnego commita ≠ dostarczenie.

## CO FAKTYCZNIE DZIAŁA LIVE

Potwierdzone ze zrzutów Tomasza z 26.09:
- produkcja Hostinger się otwiera i Tomasz może wejść do zalogowanej aplikacji,
- AppShell/sidebar pokazuje strukturę 9 ekranów, w tym AKTYWNOŚĆ,
- stary/uproszczony ekran rejestracji aktywności `/quick-call` otwiera się i był wcześniej funkcjonalny w podstawowym zakresie.

Nie wolno tego traktować jako PASS finalnej AKTYWNOŚCI.

## CO NIE DZIAŁA / NIE MA PASS LIVE

- AKTYWNOŚĆ zgodna z finalną planszą 08: NIEPOTWIERDZONE / brak widocznego wdrożenia na LIVE.
- Tomasz nie zobaczył dziś działającej planszy 08 na LIVE.
- DZISIAJ: ostatni pokazany stan LIVE zatrzymywał się na „Układam aktualny plan dnia...”; Codex przygotował hotfix lokalnie, ale nie ma dowodu wdrożenia tej poprawki na main/LIVE.
- 002 nie ma pełnego niezależnego LIVE PASS.
- 003 nie ma LIVE PASS i PR #11 nie zawiera ostatnich lokalnych zmian Codexa.
- 004 jako formalna paczka nie ma LIVE PASS.
- pełny przepływ poniedziałkowy klient → telefon → wynik → next action → termin → blocker → historia → trwały zapis nie został dziś odebrany na finalnym UX.

## CO JEST NIEDOKOŃCZONE

1. Fizyczne przeniesienie gotowej lokalnej zmiany AKTYWNOŚCI zgodnej z planszą 08 do prawdziwego repozytorium.
2. Commit na właściwej gałęzi / main zgodnie z bezpiecznym trybem wdrożenia.
3. Deploy na LIVE.
4. Krótki odbiór LIVE planszy 08 i trwałości zapisu.

## OSTATNIE ZAKOŃCZONE ZLECENIE CODEXA

Ostatni wynik Codexa w PR #11: komentarz `#issuecomment-5847316225` „GOTOWE DO WDROŻENIA — AKTYWNOŚĆ”.

Poprzedni pełniejszy wynik kodowy: Codex zgłosił lokalny commit `dedf2c2cf74c5c0f23f7a355de302d31beebff7c`, testy 1029/1029, typecheck/lint/check:migrations/diff-check PASS; build zatrzymany na zewnętrznym foncie Inter. Codex sam zaznaczył, że LIVE PASS nie jest potwierdzony.

WAŻNE: ostatnie polecenie odzyskania zmiany (`#issuecomment-5847279377`) wymagało zwrócenia KOMPLETNEJ treści `src/components/sales/quick-activity-form.tsx` oraz zmienionego testu, aby 01.07 mógł zapisać pliki uwierzytelnionym konektorem GitHub. Odpowiedź `#issuecomment-5847316225` podała ponownie opis i odnośniki/linie, ale nie dostarczyła w trwałym komentarzu pełnej treści wymaganych plików. Kryterium tego polecenia NIE zostało spełnione. Nie wdrożono zmiany do repo ani LIVE.

## PRACE AKTUALNIE URUCHOMIONE LUB OCZEKUJĄCE

Codex:
- brak potwierdzonego aktywnego zadania, które nadal wykonuje kod w tej chwili; ostatnie polecenie odzyskania zakończyło się komentarzem 5847316225,
- nie wolno uruchamiać nowego zadania Codexa w ramach tego przekazania.

Oczekujące wykonanie:
- odzyskanie z istniejącego wyniku/artefaktu pełnej gotowej zmiany AKTYWNOŚCI i fizyczne zapisanie jej do repo, bez projektowania od nowa.

## AKTUALNY BLOCKER

Główny blocker: transport gotowej zmiany Codexa do GitHuba.

GitHub → uruchomienie Codexa działa.
Codex → lokalne kodowanie/testy działa.
Codex → trwały commit/push do repo nie działał z powodu braku poświadczeń w środowisku zadania.
Ostatnia próba obejścia przez prośbę o pełną treść plików nie dostarczyła pełnych plików, tylko ponowny raport opisowy.

## DOKŁADNIE JEDEN NASTĘPNY KROK DLA NOWEGO OKNA

Wznowić WYŁĄCZNIE odzyskanie już przygotowanej zmiany AKTYWNOŚCI z istniejącego wyniku Codexa i fizycznie zapisać ją do GitHuba przez uwierzytelniony konektor, bez nowego projektowania i bez uruchamiania nowej pracy Codexa; po fizycznym zapisie dopiero wdrożyć i sprawdzić LIVE planszę 08.

Jeśli istniejące trwałe źródła nie zawierają kompletnej treści gotowej zmiany, nowe okno ma najpierw odczytać istniejący wynik/task/komentarze i odzyskać artefakt; nie wolno zgadywać kodu ani wracać do starego UX.

## CZEGO NOWEMU OKNU NIE WOLNO RUSZAĆ

- nie uruchamiać nowej pracy Codexa przed wykonaniem powyższego jednego kroku,
- nie ruszać innych ekranów niż AKTYWNOŚĆ,
- nie wracać do `/quick-call` jako „tymczasowego minimum”,
- nie używać starej grafiki WaCRM ani wcześniejszych makiet,
- nie tworzyć nowego planu paczek,
- nie rozpoczynać 005–010 ani szerokiego 003/004,
- nie używać Work/Cloud Browser,
- nie angażować Tomasza w technikalia, kopiowanie kodu, GitHub, logi ani testy techniczne,
- nie deklarować PASS bez rzeczywistego LIVE.

## NAJWAŻNIEJSZE BŁĘDY DZISIEJSZEGO WDROŻENIA — NIE POWTARZAĆ

1. Uruchomiono prace bez konsekwentnego zastosowania finalnego UX jako jedynego źródła prawdy i pokazano Tomaszowi stary/uproszczony ekran.
2. Zamiast widocznego wdrożenia wykonano serię lokalnych prac Codexa, których wynik nie trafiał do repo.
3. Powtarzano HOTFIX 002 i kolejne warianty bez najpierw rozwiązania transportu Codex → GitHub.
4. Mieszano 002/003/AKTYWNOŚĆ zamiast utrzymać jedno źródło stanu i jeden wynik biznesowy.
5. Padły komunikaty sugerujące pracę „w tle” i terminy bez pewnego mechanizmu wykonawczego.
6. Ustawiono przypomnienie na 16:50, ale powiadomienia były wyłączone; zadanie wykonało się dopiero około 16:52:50 i nie mogło dostarczyć użytkownikowi użytecznego alarmu. Po weryfikacji zostało wyłączone.
7. Raport Codexa „GOTOWE” był mylony z gotowością produktu. Obowiązuje: raport/test/commit lokalny ≠ LIVE PASS.
8. Tomasz musiał wielokrotnie przypominać o nowych grafikach; od teraz BRAMKA 0 ma temu zapobiegać.
9. Nie wolno po raz kolejny przepalać limitu na opisanie tego samego problemu zamiast fizycznego zapisu do repo i testu LIVE.

## LIMITY — OSTATNI POTWIERDZONY STAN

Źródło: zrzut panelu Usage przesłany przez Tomasza 26.09.2026 około 16:15–16:17 Europe/Warsaw (dokładna minuta nie była dostępna 01.07 w metadanych czatu).

- limit 5-godzinny: 81% pozostało,
- limit tygodniowy: 97% pozostało.

To jest ostatni potwierdzony odczyt. Nie wolno podawać świeższego procentu bez nowego zrzutu/pomiaru z panelu Usage.

Work użyty dziś do mCRM: NIE.
Próg STOP z powodu limitu: NIEPOTWIERDZONY; problemem był proces/transport, nie komunikat limitu.

## CODEX — DZISIEJSZE URUCHOMIENIA I PONOWIENIA

Na podstawie potwierdzonych odpowiedzi bota GitHub/Gmail z 26.09:
- 7 zakończonych uruchomień Codexa dotyczących PR #10/#11,
- z tego 5 miało charakter ponowienia/iteracji istniejącego celu (3 kolejne iteracje HOTFIX 002 po pierwszej próbie oraz 2 kolejne iteracje AKTYWNOŚCI/odzyskania po pierwszej próbie),
- 0 potwierdzonych aktywnych zleceń w chwili przekazania,
- nie uruchamiać kolejnego w ramach starego okna.

## AUTOMATY — STAN FAKTYCZNY

mCRM:
- `mCRM — ciągłość 002→010` — WYŁĄCZONY; był monitorem/condition-watch, nie niezawodnym silnikiem wdrożenia.
- `mCRM — nadzór bez Codexa` — WYŁĄCZONY; monitor tylko stanu, nie wykonawca kodu.
- `Start 7 ekranów mCRM` — WYŁĄCZONY; przypomnienie/startowe, nie wykonawca.
- `mCRM — STARY monitoring — wyłączony` — WYŁĄCZONY.
- `mCRM — kontrola pierwszego etapu` — WYŁĄCZONY.
- jednorazowe `Sprawdź grafikę mCRM` na 16:50 — wykonało się około 16:52:50 przy wyłączonych powiadomieniach; po weryfikacji WYŁĄCZONE. Było tylko przypomnieniem/kontrolą, nie wykonywało wdrożenia.

Wniosek: w chwili przekazania NIE MA aktywnego automatu mCRM, który sam koduje, zapisuje wynik do repo, wdraża i odbiera LIVE. Nie wolno obiecywać autonomicznego wdrożenia na podstawie samych Zaplanowanych zadań ChatGPT.

## DOKŁADNIE CO MA ZOSTAĆ WZNOWIONE

Wyłącznie: istniejąca, już przygotowana AKTYWNOŚĆ zgodna z finalną planszą 08 — odzyskanie kompletnej zmiany z istniejącego wyniku Codexa → fizyczny zapis do GitHuba przez uwierzytelniony konektor → deploy → krótki test LIVE.

Nie projektować ponownie. Nie uruchamiać nowej paczki. Nie przechodzić dalej przed wynikiem tego kroku.

## ŹRÓDŁA PRAWDY DLA NOWEGO OKNA

1. Dokument Drive `01.07 — STRATEGICZNY WDROŻENIOWIEC mCRM AI — ROLA I PROCEDURA PRZEJĘCIA — OBOWIĄZUJE`.
2. Ten plik `GLOWNY_STAN_WDROZENIA.md`.
3. Repo `makson-mcrm/wacrm`, rzeczywisty `main` i PR #11.
4. Drive: `UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026` + audyt + checklista; plansza 08 dla AKTYWNOŚCI.
5. Rzeczywiste LIVE Hostinger; bez LIVE nie ma PASS.

## KOMENDA DLA NOWEGO OKNA

PRZEJMIJ WDROŻENIE mCRM OD AKTUALNEGO STANU.

Najpierw odczytaj rolę 01.07, ten plik i finalny UX. Następnie rozpocznij od dokładnie jednego zapisanego następnego kroku. Nie pytaj Tomasza o historię, którą możesz odczytać sam.
