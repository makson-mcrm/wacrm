# 01.07 — AUTONOMICZNA KOLEJKA WYKONAWCZA mCRM AI

Status: OBOWIĄZUJE od 21.09.2026. Zastępuje wcześniejsze warianty kolejki 002–013.
Właściciel wdrożenia: 01.07 — Strategiczny Wdrożeniowiec mCRM AI.
Wykonawca: Codex.

## ZASADA PROWADZENIA
Tomasz nie jest kurierem, testerem technicznym ani ręcznym wyzwalaczem kolejnych paczek.

Przepływ jednej paczki:
01.07 zleca → Codex wykonuje → Codex testuje i zapisuje dowody → 01.07/automat wykonuje niezależny odbiór → PASS = następna paczka bez angażowania Tomasza → FAIL = jedna poprawka tej samej paczki.

Jednocześnie aktywna jest maksymalnie jedna paczka.
Nie wolno przejść dalej na podstawie samego komunikatu Codexa „gotowe”.

## STOP
STOP tylko gdy:
1. potrzebna jest prawdziwa decyzja lub uprawnienie człowieka,
2. potrzebna byłaby operacja nieodwracalna lub wysokiego ryzyka,
3. limit/Usage albo brak dostępu realnie blokuje pracę,
4. konieczna byłaby zmiana zatwierdzonego zakresu lub źródła prawdy.

Przy STOP zapisz w GLOWNY_STAN_WDROZENIA.md: numer paczki, ostatni zakończony krok, dokładny następny krok i rodzaj blokady.
Przy limicie nie zakładaj istnienia wyzwalacza po resecie. Wznowienie odbywa się przez okresową kontrolę tego samego wątku; najwyżej jedna próba na przebieg.

## UPRAWNIENIA
Codex może bez dodatkowej zgody wykonywać zwykłe bezpieczne działania potrzebne do realizacji paczki w istniejącej gałęzi roboczej: czytać/edytować kod, uruchamiać testy, build, diff-check, tworzyć commity i aktualizować dokument stanu w granicach przyznanych uprawnień.

Nie wolno automatycznie zatwierdzać: usuwania danych produkcyjnych, nieodwracalnych zmian LIVE, zmian bezpieczeństwa konta, zakupów/usług, obchodzenia zabezpieczeń ani innych działań wysokiego ryzyka.
Jeżeli mimo tego potrzebny jest Tomasz, zgłoś jedną konkretną czynność.

## ŹRÓDŁA OBOWIĄZUJĄCE
- finalny pakiet UX 9 ekranów z 18.09.2026 + audyt + checklista,
- 01.05 — PLAN T12 V5 — ZATWIERDZONY — 17.09.2026,
- 00 — MASTER mCRM AI — v2.0 — OBOWIĄZUJE,
- AUDYT PROCESU SPRZEDAŻY I OBSŁUGI — ŹRÓDŁO WYMAGAŃ mCRM — 17.09.2026,
- 02 — AGENT API — v1.2 — OBOWIĄZUJE,
- 00 — MASTER — FINANSE I MAJĄTEK — v2.0 — OBOWIĄZUJE,
- 00 — MASTER IKIGAI — STRATEGIA GŁÓWNA — v2.0 — OBOWIĄZUJE,
- GLOWNY_STAN_WDROZENIA.md i rzeczywisty kod/LIVE.

Bez redesignu. Ekran bez minimalnej działającej funkcji = NIEODEBRANY.

# 9 PACZEK

## 002 — FUNDAMENT + DZISIAJ + P0
Zakres: wspólny AppShell, nawigacja, wyszukiwanie, +Dodaj, responsywność, finalny DZISIAJ i trwały rdzeń P0.
PASS: realna pozycja prowadzi do właściwej sprawy; klient→aktywność→next action→termin→DZISIAJ→historia zachowuje dane; testy/build/diff-check PASS; brak krytycznej regresji.

## 003 — KLIENCI + DEAL + REJESTR PRZED DEALEM
Zakres: klient/firma, telefon bez obowiązkowego Deala, źródło/kategoria/próba/wynik/notatka/licznik prób, utworzenie/powiązanie Deala, next action/termin/blocker.
PASS: można znaleźć/dodać klienta, zapisać kontakt przed Dealem, utworzyć/otworzyć właściwy Deal i wrócić do zachowanych danych; zgodność z planszami KLIENCI/DEAL; testy/build PASS.

## 004 — AKTYWNOŚĆ / DZWONIENIE + POMIAR
Zakres: telefon→wynik→dyktowanie/notatka→next action→termin→blocker→historia; liczniki sprzedaży.
PASS: Odebrał/Nie odebrał/Oddzwonić i nowy numer działają; zapis trafia do właściwego klienta/Deala i historii; mierzone są telefony, wartościowe rozmowy, realne tematy, przesunięcia oraz zdarzenia blisko prowizji; testy/build PASS.

## 005 — WIEDZA BANKOWA + KWALIFIKACJA + 2–3 PROCESY BANKOWE
Zależność krytyczna: wiedza i wybór banku są przed kompletacją.
Zakres: mBank jako pierwsze źródło V1; wymagania, źródło i wersja procedury; kwalifikacja; wybór maksymalnie 2–3 procesów bankowych w jednej sprawie z osobnymi statusami i wymaganiami.
PASS: system nie wymyśla procedur; rozróżnia FAKT / WNIOSEK AI / BRAK DANYCH; jeden Deal obsługuje wybrane procesy bez kopiowania sprawy do wielu niezależnych Deali; historia i źródła zostają zachowane.

## 006 — KOMPLETACJA + KOMUNIKACJA
Zależność: kompletacja korzysta wyłącznie z wymagań wybranych procesów z 005.
Zakres: co mamy/czego brakuje per bank, wspólna lista bez duplikatów, WhatsApp/SMS/e-mail, zatwierdzone szablony, przypomnienia i historia komunikacji.
PASS: lista braków wynika z rzeczywistych wymagań wybranych banków; dane klienta/sprawy podstawiają się poprawnie; użytkownik może edytować przed wysłaniem; historia zostaje; nic nie wysyła się samodzielnie bez zatwierdzonej reguły lub akceptacji.

## 007 — LEJEK + KALENDARZ + ZADANIA + RYTM DNIA
Zakres sprzedażowy: finalne LEJEK/KALENDARZ/ZADANIA spięte z Deal/next action/terminami.
Zakres życiowy: ochrona porannej modlitwy/medytacji, ruchu/biegu, Modlitwy Jabesa na rozpoczęcie pracy, PRZYCHODU TERAZ, PRZYCHODU PÓŹNIEJ oraz wieczornego rachunku sumienia/wdzięczności. Garmin/MATA tylko jako potrzebny syntetyczny kontekst.
PASS: Deal zmienia etap; termin/zadanie pojawia się we właściwym miejscu i w DZISIAJ; brak dublowania; 6 aktywnych etapów; filtry zadań i tydzień roboczy działają; rytm dnia nie jest wypierany przez automatyczne priorytety.

## 008 — FINANSE V1 — PEŁNE MINIMUM
Źródło: aktywny MASTER projektu 05.
Zakres: FIRMA / PRYWATNE / CAŁOŚĆ; import dostępnych plików/wyciągów i historii bez ręcznego przepisywania; salda; zobowiązania; cash flow 30/60; aktywne długi i raty; transfery FIRMA↔PRYWATNE bez podwójnego liczenia; prowizje/faktury; uruchomienie→prowizja oczekiwana→FV/rozliczenie→prowizja otrzymana; miesięczna checklista do księgowej; szkic e-maila do księgowej po zatwierdzeniu; Najbliższy krok CFO.
PASS: dane są rzeczywiste i zachowane; trzy zakładki działają; import działa dla obsługiwanego pliku; transfery nie zawyżają CAŁOŚCI; prowizje nie tworzą równoległego systemu; checklista pokazuje komplet/braki; szkic maila nie wysyła się sam; telefon działa.

## 009 — ASYSTENT mCRM — ARCHITEKTURA GOTOWA POD AGENT API
Priorytet: nie zatrzymywać rdzenia CRM po to, by teraz budować pełnego Asystenta.
Źródło prawdy o kliencie pozostaje w mCRM/Supabase.
Zakres teraz: przygotować wyraźną warstwę narzędzi/funkcji mCRM, przez którą późniejszy Asystent będzie mógł odczytać Klienta/Deal, historię, next action, termin, blocker, etap, dane finansowania, braki i ryzyka oraz przygotować propozycję następnego kroku i wiadomości. Model nie manipuluje bazą bezpośrednio; zapisy i akcje przechodzą przez kontrolowane funkcje mCRM z regułami uprawnień.
PASS: istnieje stabilny interfejs narzędzi do odczytu potrzebnego kontekstu i bezpiecznych dozwolonych akcji; brak drugiej bazy prawdy; minimum ekranu Asystenta ma jawny kontekst Klient/Deal; pełny Agents API może zostać dołożony później bez przebudowy modelu danych.

## 010 — KOŃCOWY ODBIÓR 9 EKRANÓW + FUNKCJI + LIVE
Zakres: pełny przepływ i zgodność wszystkich 9 zatwierdzonych ekranów z rzeczywistymi funkcjami.
PASS techniczny: testy/build/diff-check PASS i paczki 002–009 mają dowody odbioru.
PASS LIVE: klient→telefon→wynik→notatka/dyktowanie→next action→termin→DZISIAJ→historia→bank/banki→wymagania→kompletacja→komunikacja→lejek/kalendarz/zadania→prowizja działa na LIVE i dane pozostają po ponownym wejściu; Finanse mają pełne minimum V1; Asystent ma jawny kontekst i warstwę narzędzi.
Jeżeli zalogowanego LIVE nie można sprawdzić bez człowieka, zgłoś jedną końcową czynność właścicielską zamiast udawać GOTOWE.

## ODBIÓR I AUTOMATYCZNE PRZEJŚCIE
Po każdej paczce Codex zapisuje dowody w GLOWNY_STAN_WDROZENIA.md.
01.07/automat sprawdza niezależnie: zakres zmian, testy/build/CI, zgodność z kryteriami i — gdy wymagane — LIVE.
PASS → następna paczka.
FAIL → jedna poprawka tej samej paczki.
Brak dowodu → NIEODEBRANE.

## POWIADOMIENIA DLA TOMASZA
Powiadom tylko przy zdarzeniu: PACZKA UKOŃCZONA / PACZKA NIE PRZESZŁA KONTROLI / POTRZEBNE UPRAWNIENIE / BLOKER / LIMIT — OCZEKIWANIE / WZNOWIONO / GOTOWE CAŁOŚĆ.
Format zawsze: CO ZROBIONO / CZY DZIAŁA / CO ROBI SYSTEM DALEJ / CZY TOMASZ MUSI COŚ ZROBIĆ.
Nie raportuj zwykłych commitów ani postępu bez zmiany stanu.
