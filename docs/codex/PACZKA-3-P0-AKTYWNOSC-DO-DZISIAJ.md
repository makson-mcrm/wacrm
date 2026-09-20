# PACZKA 3 — P0 — AKTYWNOŚĆ → DEAL → DZISIAJ

## CEL
Domknąć minimalny rdzeń sprzedażowy po rozmowie: po zapisaniu aktywności w jawnie wybranym Dealu następne działanie, termin i blocker mają być zapisane jako jedno źródło prawdy Deala i poprawnie pojawić się w DZISIAJ we właściwym czasie, bez duplikacji i bez podmiany przez stare aktywności.

## STAN
- Paczka 1 zabezpiecza jawny kontekst Deala dla aktywności/historii.
- Paczka 2 chroni next action Deala w adapterze DZISIAJ przed nadpisaniem przez starszą aktywność.
- QuickActivityForm już potrafi zapisać activity + zaktualizować Deal.
- DZISIAJ już buduje plan z Dealów, aktywności, kolejki i priorytetów.

## ZAKRES
1. Zweryfikuj i popraw tylko przepływ: WYNIK/DYKTUJ → ZAPISZ → NEXT ACTION → TERMIN → BLOCKER → DZISIAJ.
2. Po zapisie aktywności dla konkretnego Deala:
   - Deal przechowuje aktualne next_action, next_action_at i blocker,
   - DZISIAJ pokazuje ten sam next action i termin,
   - zaległe działanie jest widoczne jako zaległe,
   - działanie na dziś jest widoczne dziś,
   - działanie na jutro/poźniej nie jest błędnie traktowane jako pilne TERAZ,
   - stare planowane aktywności nie nadpisują aktualnego next action Deala.
3. Link z pozycji DZISIAJ ma otwierać właściwy kontekst tego samego Deala/aktywności, bez zgadywania.
4. Nie twórz nowego systemu zadań ani nowego źródła next action.
5. Dodaj regresyjne testy tego pełnego round-trip.
6. Zachowaj istniejący UX; bez redesignu.

## POZA ZAKRESEM
- pełny AppShell/fundament UX,
- LEJEK, ZADANIA, KALENDARZ, FINANSE,
- WhatsApp,
- Asystent,
- nowe KPI,
- szeroki refaktor,
- deploy „przy okazji” bez zakończonego kodu i testów.

## KRYTERIUM AKCEPTACJI
PASS tylko gdy:
1. aktywność zapisana dla Deal A aktualizuje wyłącznie Deal A,
2. aktualny next action/termin/blocker Deala są tym, co widzi DZISIAJ,
3. starsza aktywność nie może podmienić aktualnego kroku Deala,
4. zaległe / dziś / później są klasyfikowane poprawnie,
5. klik z DZISIAJ prowadzi do właściwego Deala,
6. brak duplikatu tej samej sprawy w DZISIAJ,
7. testy regresyjne PASS i build PASS,
8. brak zmian poza najmniejszym koniecznym zakresem.

## DOWÓD
Na końcu podaj krótko:
- co zmieniono biznesowo,
- jakie scenariusze regresyjne dodano,
- wynik testów/build,
- listę plików zmienionych w tej paczce.

## ZASADY WIĄŻĄCE
- Tomasz zatwierdza kierunek biznesowy; agent kodujący odpowiada za implementację, testy i przygotowanie zmiany.
- Nie angażuj Tomasza technicznie.
- Czytaj i stosuj AGENTS.md.
- Nie projektuj nowego UX.
- Jedno źródło prawdy: active Deal.next_action + next_action_at + blocker.
- Minimalizm interfejsu nie może zubażać modelu danych ani historii.
