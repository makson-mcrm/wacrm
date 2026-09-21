# 01.07 — KOLEJKA WYKONAWCZA DO 25.09.2026

Status: OBOWIĄZUJE dla bieżącego ciągu Codex.
Właściciel wdrożenia: 01.07 — Strategiczny Wdrożeniowiec mCRM AI.
Wykonawca: Codex.

## ZASADA CIĄGŁEJ PRACY
Codex realizuje paczki 002→010 kolejno, bez oczekiwania na ręczne zatwierdzenie 01.07 po każdej paczce.
Dla każdej paczki: wykonaj → uruchom wymagane testy/build/diff-check → porównaj z kryteriami paczki → zapisz wynik i dowody w GLOWNY_STAN_WDROZENIA.md → jeśli PASS, przejdź od razu do następnej paczki.
STOP tylko gdy:
1) potrzebna jest prawdziwa decyzja/uprawnienie człowieka,
2) nie da się spełnić kryterium bez ryzykownej/nieodwracalnej operacji,
3) limit lub brak dostępu realnie blokuje dalszą pracę.
W STOP zapisz: numer paczki, ostatni zakończony krok, dokładny następny krok, rodzaj blokady.

## ŹRÓDŁA OBOWIĄZUJĄCE
- finalny pakiet UX 9 ekranów z 18.09.2026 + audyt + checklista,
- PLAN T12 V5 zatwierdzony 17.09.2026,
- MASTER mCRM AI,
- audyt procesu sprzedaży i obsługi,
- 02 — AGENT API — v1.2.
Bez redesignu. Ekran bez minimalnej działającej funkcji = NIEODEBRANY.

## 002 — FUNDAMENT + DZISIAJ + P0
Cel: wspólny AppShell/nawigacja/wyszukiwanie/+Dodaj/responsywność + finalny DZISIAJ + potwierdzenie trwałego P0.
PASS: finalny wygląd DZISIAJ zgodny z planszą; realna pozycja prowadzi do właściwej sprawy; klient→aktywność→next action→termin→DZISIAJ→historia zachowuje dane; testy/build/diff-check PASS; brak regresji.

## 003 — KLIENCI + DEAL + REJESTR PRZED DEALEM
Cel: klient/firma, surowy telefon bez obowiązkowego Deala, źródło/kategoria/próba/wynik/notatka/licznik prób, utworzenie Deala, next action/termin/blocker.
PASS: można znaleźć/dodać klienta, zapisać kontakt przed Dealem, utworzyć/powiązać Deal i wrócić do zachowanych danych; zgodność z planszami KLIENCI/DEAL; testy/build PASS.

## 004 — AKTYWNOŚĆ/DZWONIENIE + POMIAR SPRZEDAŻY
Cel: telefon→wynik→dyktowanie/notatka→next action→termin→blocker→historia oraz wiarygodne liczniki sprzedaży.
PASS: obsługa Odebrał/Nie odebrał/Oddzwonić i nowego numeru; zapis trafia do właściwego klienta/Deala i historii; mierzone: telefony, wartościowe rozmowy, realne tematy, przesunięcia, wnioski/decyzje/uruchomienia/prowizje; testy/build PASS.

## 005 — KOMPLETACJA + KOMUNIKACJA
Cel: co mamy/czego brakuje, wymagania banków A-B-C, checklisty braków, zatwierdzone szablony WhatsApp/SMS/e-mail, przypomnienia, historia komunikacji.
PASS: z klienta/Deala można przygotować komunikat z właściwego szablonu i braków; dane klienta/sprawy podstawiają się poprawnie; użytkownik może edytować przed wysłaniem; historia zostaje; minimalny WhatsApp nie niszczy istniejącego fundamentu.

## 006 — WIEDZA BANKOWA V1 + RÓWNOLEGŁE BANKI
Cel: najpierw mBank; kwalifikacja, checklisty, aktualne druki, źródło i wersja procedury; 2–3 procesy bankowe w jednej sprawie.
PASS: dla Deala można zobaczyć wymagania/braki i źródło wiedzy mBank; jedna sprawa obsługuje 2–3 banki z osobnymi statusami/brakami bez trzech niezależnych Deali; system nie udaje decyzji za Tomasza.

## 007 — LEJEK + KALENDARZ + ZADANIA
Cel: finalne ekrany i funkcje spięte z Deal/next action/terminami.
PASS: Deal zmienia etap; termin/zadanie pojawia się we właściwym miejscu i w DZISIAJ; brak dublowania; 6 aktywnych etapów lejka; filtry zadań i tydzień roboczy działają; testy/build PASS.

## 008 — FINANSE SPRZEDAŻOWE MINIMUM
Cel: uruchomienie→prowizja oczekiwana→FV/rozliczenie→prowizja otrzymana, z danych Deala.
PASS: na sprawie i w Finansach widać oczekiwaną/otrzymaną prowizję i status uruchomienia/FV/rozliczenia; brak równoległego systemu danych; wiadomo co jest blisko pieniędzy.

## 009 — ASYSTENT mCRM / AGENT API V1
Cel: jeden Asystent w aplikacji, nie osobny system.
PASS: jawny kontekst Klient/Deal/next action/termin/blocker; krótkie podsumowanie; propozycja następnego kroku; wykrycie braków/ryzyk; robocza wiadomość do klienta; brak samodzielnego wysyłania lub ważnej zmiany statusu; deterministyczne reguły pozostają w zwykłym kodzie.

## 010 — ODBIÓR CAŁOŚCI 9 EKRANÓW + LIVE
Cel: pełny przepływ sprzedażowy i zgodność 9 ekranów.
PASS techniczny: testy/build/diff-check PASS; wszystkie paczki 002–009 oznaczone PASS z dowodami.
PASS LIVE: klient→telefon→wynik→notatka/dyktowanie→next action→termin→DZISIAJ→historia→lejek/kalendarz/zadania→prowizja + WhatsApp/szablon/kompletacja + wiedza bankowa + Asystent minimum działa na LIVE i dane pozostają po ponownym wejściu.
Jeżeli zalogowanego LIVE nie można sprawdzić bez człowieka, zapisz POTRZEBNA DECYZJA/UPRAWNIENIE: „końcowy test właścicielski LIVE”, bez udawania GOTOWE.

## KOMUNIKATY DO 01.07 / TOMASZA — TYLKO 3
1. GOTOWE 9/9 — wszystkie paczki 002–010 zakończone i końcowy stan opisany.
2. POTRZEBNA DECYZJA/UPRAWNIENIE — dokładnie czego potrzeba i dlaczego.
3. PRACA ZABLOKOWANA — limit/brak dostępu/błąd uniemożliwia dalszy ciąg; podaj ostatni ukończony punkt i następny krok.

Nie zatrzymuj się na zwykłym PASS paczki. Nie angażuj Tomasza jako kuriera ani testera technicznego.