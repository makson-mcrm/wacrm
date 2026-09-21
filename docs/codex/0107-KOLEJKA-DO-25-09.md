# 01.07 — AUTONOMICZNA KOLEJKA WYKONAWCZA mCRM AI

Status: OBOWIĄZUJE od 21.09.2026. Zastępuje wcześniejszą kolejność 002–010 w tym pliku.
Właściciel wdrożenia: 01.07 — Strategiczny Wdrożeniowiec mCRM AI.
Wykonawca: Codex.

## ZASADA CIĄGŁEJ PRACY
Codex realizuje paczki kolejno, bez oczekiwania na ręczne zatwierdzenie 01.07 po każdej poprawnej paczce.
Dla każdej paczki: wykonaj → uruchom wymagane testy/build/diff-check → porównaj z kryteriami paczki → zapisz wynik i dowody w GLOWNY_STAN_WDROZENIA.md → jeśli PASS, przejdź od razu do następnej paczki.

STOP tylko gdy:
1) potrzebna jest prawdziwa decyzja/uprawnienie człowieka,
2) nie da się spełnić kryterium bez ryzykownej/nieodwracalnej operacji,
3) limit lub brak dostępu realnie blokuje dalszą pracę,
4) potrzebna byłaby zmiana zatwierdzonego zakresu lub źródła prawdy.

W STOP zapisz: numer paczki, ostatni zakończony krok, dokładny następny krok, rodzaj blokady.

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

# ETAP A — GOTOWOŚĆ SPRZEDAŻOWA — CEL DO PIĄTKU 25.09

## 002 — FUNDAMENT + DZISIAJ + P0
Cel: wspólny AppShell/nawigacja/wyszukiwanie/+Dodaj/responsywność + finalny DZISIAJ + potwierdzenie trwałego P0.
PASS: finalny wygląd DZISIAJ zgodny z planszą; realna pozycja prowadzi do właściwej sprawy; klient→aktywność→next action→termin→DZISIAJ→historia zachowuje dane; testy/build/diff-check PASS; brak regresji.

## 003 — KLIENCI + DEAL + REJESTR PRZED DEALEM
Cel: klient/firma, surowy telefon bez obowiązkowego Deala, źródło/kategoria/próba/wynik/notatka/licznik prób, utworzenie Deala, next action/termin/blocker.
PASS: można znaleźć/dodać klienta, zapisać kontakt przed Dealem, utworzyć/powiązać Deal i wrócić do zachowanych danych; zgodność z planszami KLIENCI/DEAL; testy/build PASS.

## 004 — AKTYWNOŚĆ/DZWONIENIE + POMIAR SPRZEDAŻY
Cel: telefon→wynik→dyktowanie/notatka→next action→termin→blocker→historia oraz wiarygodne liczniki sprzedaży.
PASS: obsługa Odebrał/Nie odebrał/Oddzwonić i nowego numeru; zapis trafia do właściwego klienta/Deala i historii; mierzone: telefony, wartościowe rozmowy, realne tematy, przesunięcia, wnioski/decyzje/uruchomienia/prowizje; testy/build PASS.

## 005 — WIEDZA BANKOWA V1 + KWALIFIKACJA BANKÓW
WAŻNA ZALEŻNOŚĆ: wiedza bankowa i kwalifikacja są PRZED kompletacją. System nie może tworzyć listy braków bez wiedzy, do którego banku/procesu przygotowujemy sprawę.
Cel: najpierw mBank jako pierwsze obowiązujące źródło wiedzy; dla konkretnego Deala pokazać kwalifikację, wymagania, źródło i wersję procedury oraz umożliwić wybór banku/banków do dalszego procesu.
PASS: system wskazuje wymagania na podstawie zatwierdzonego źródła i oznacza FAKT / WNIOSEK AI / BRAK DANYCH; nie wymyśla banków ani procedur; mBank działa jako V1; Tomasz może zatwierdzić lub zmienić bank/banki dla konkretnej sprawy bez tworzenia fikcyjnych decyzji automatycznych.

## 006 — RÓWNOLEGŁE BANKI + WYMAGANIA A/B/C
Cel: jedna sprawa klienta może prowadzić maksymalnie 2–3 wybrane procesy bankowe, każdy z własnym statusem, wymaganiami, brakami, źródłem wiedzy i wersją procedury.
PASS: jeden Deal nie jest kopiowany do trzech niezależnych Deali; wybrane procesy bankowe mają osobne statusy i wymagania; zmiana banku nie niszczy historii; system zachowuje źródło i datę/wersję wiedzy.

## 007 — KOMPLETACJA + KOMUNIKACJA + WHATSAPP/SMS/E-MAIL
ZALEŻNOŚĆ: kompletacja korzysta z wybranych banków i ich zatwierdzonych wymagań z 005–006.
Cel: co mamy / czego brakuje per wybrany bank; wspólna lista dokumentów bez duplikatów; gotowe komunikaty do klienta; WhatsApp/SMS/e-mail; przypomnienia; historia komunikacji.
PASS: lista braków wynika z rzeczywistych wymagań wybranych banków; z klienta/Deala można przygotować wiadomość z właściwego szablonu i braków; dane klienta/sprawy podstawiają się poprawnie; użytkownik może edytować przed wysłaniem; historia zostaje; minimalny WhatsApp nie niszczy istniejącego fundamentu; system nie wysyła samodzielnie bez zatwierdzonej reguły/akceptacji.

## 008 — LEJEK + KALENDARZ + ZADANIA + RYTM DNIA
Cel sprzedażowy: finalne ekrany LEJEK/KALENDARZ/ZADANIA spięte z Deal/next action/terminami.
Cel życiowy: DZISIAJ/Kalendarz/Zadania chronią rytm dnia zamiast być wyłącznie listą sprzedażową.
Minimalny rytm do uwzględnienia operacyjnie: rano cisza + modlitwa/medytacja chrześcijańska; krótkie ćwiczenia lub zaplanowany bieg; Modlitwa Jabesa na rozpoczęcie pracy; PRZYCHÓD TERAZ; PRZYCHÓD PÓŹNIEJ; wieczorem około 21:00 rachunek sumienia + wdzięczność + wyciszenie. Garmin/MATA dostarcza tylko potrzebny syntetyczny kontekst treningu/regeneracji, bez mieszania w CRM zbędnych wrażliwych danych.
PASS: Deal zmienia etap; termin/zadanie pojawia się we właściwym miejscu i w DZISIAJ; brak dublowania; 6 aktywnych etapów lejka; filtry zadań i tydzień roboczy działają; chronione bloki rytmu dnia nie są wypierane przez automatyczne priorytety sprzedażowe; testy/build PASS.

# ETAP B — FINANSE / AI / DOMKNIĘCIE — REALIZOWAĆ PO STABILNYM ETAPIE A; CEL NA 25–30.09 W GRANICACH LIMITU

## 009 — FINANSE V1 — FIRMA / PRYWATNE / CAŁOŚĆ + IMPORT DANYCH
Źródło funkcjonalne: 00 — MASTER — FINANSE I MAJĄTEK — v2.0.
Cel: jeden ekran FINANSE ma obsługiwać zakładki FIRMA / PRYWATNE / CAŁOŚĆ i przyjmować dostępne pliki finansowe bez ręcznego przepisywania historii.
Zakres minimum: import plików/wyciągów i dostępnej historii; salda; zobowiązania z terminami/statusami; cash flow 30/60; aktywne długi i raty; transfery FIRMA↔PRYWATNE jako przepływ wewnętrzny; CAŁOŚĆ bez podwójnego liczenia.
PASS: użytkownik może wgrać obsługiwany plik/wyciąg; dane są zachowane i przypisane do właściwej warstwy; FIRMA/PRYWATNE/CAŁOŚĆ działa; transfer wewnętrzny nie zawyża CAŁOŚCI; brak ręcznego przepisywania jako podstawowego procesu; telefon działa.

## 010 — FINANSE V1 — PROWIZJE / FAKTURY / KSIĘGOWA / NAJBLIŻSZY KROK CFO
Cel: połączyć sprzedażowe pieniądze z pełnym minimum finansowym.
Zakres: prowizje i faktury z mCRM; uruchomienie→prowizja oczekiwana→FV/rozliczenie→prowizja otrzymana; status płynności; jeden „Najbliższy krok CFO”; miesięczna checklista materiałów do księgowej; gotowy szkic e-maila do księgowej, wysyłany dopiero po zatwierdzeniu użytkownika.
PASS: dane prowizyjne nie są drugim równoległym systemem; checklista pokazuje komplet/braki; szkic maila korzysta z rzeczywistych danych/załączników i nie wysyła się sam; użytkownik widzi decyzję finansową, nie księgowy chaos.

## 011 — ASYSTENT mCRM / AGENT API V1
Cel: jeden Asystent w aplikacji, nie osobny system.
PASS: jawny kontekst Klient/Deal/next action/termin/blocker; krótkie podsumowanie; propozycja następnego kroku; wykrycie braków/ryzyk; robocza wiadomość do klienta; korzystanie z zatwierdzonej wiedzy bankowej tam, gdzie potrzebne; brak samodzielnego wysyłania lub ważnej zmiany statusu; deterministyczne reguły pozostają w zwykłym kodzie.

## 012 — WSPÓLNE WEJŚCIE mCRM / RACHUNEK SUMIENIA / MATA
Cel: jedno miejsce wejścia i spójna nawigacja do trzech działających obszarów bez przepisywania ich od zera i bez mieszania baz danych.
PASS: z mCRM można przejść do RACHUNKU SUMIENIA i MATY oraz wrócić; linki/stan nie wymagają pamiętania osobnych adresów; dane duchowe/zdrowotne nie są kopiowane do sprzedażowej bazy bez potrzeby.

## 013 — KOŃCOWY ODBIÓR 9 EKRANÓW + FUNKCJI + LIVE
Cel: pełny przepływ sprzedażowy i zgodność 9 ekranów z rzeczywistymi funkcjami.
PASS techniczny: testy/build/diff-check PASS; wszystkie wymagane paczki oznaczone PASS z dowodami.
PASS LIVE: klient→telefon→wynik→notatka/dyktowanie→next action→termin→DZISIAJ→historia→wybór banku→wymagania→kompletacja→komunikacja→lejek/kalendarz/zadania→prowizja działa na LIVE i dane pozostają po ponownym wejściu. Finanse mają FIRMA/PRYWATNE/CAŁOŚĆ i import plików; Asystent minimum ma jawny kontekst; rytm dnia jest chroniony.
Jeżeli zalogowanego LIVE nie można sprawdzić bez człowieka, zapisz POTRZEBNA DECYZJA/UPRAWNIENIE: „końcowy test właścicielski LIVE”, bez udawania GOTOWE.

## KOLEJNOŚĆ OCHRONY PRZY OGRANICZENIU LIMITU
1. P0 + trwały zapis + dzwonienie.
2. Klient/Deal/DZISIAJ + pomiar sprzedaży.
3. Wiedza bankowa/kwalifikacja → procesy bankowe → kompletacja/komunikacja.
4. Lejek/Kalendarz/Zadania + rytm dnia.
5. Finanse V1.
6. Asystent/Agent API V1.
7. Wspólne wejście mCRM/RACHUNEK/MATA.
Kosmetyka i rozszerzenia nigdy nie mają pierwszeństwa przed powyższym rdzeniem.

## KOMUNIKATY DO 01.07 / TOMASZA — TYLKO 3
1. GOTOWE CAŁOŚĆ — pełna wymagana kolejka zakończona i końcowy stan opisany; nie używaj GOTOWE, jeśli LIVE wymagany przez zakres nie został realnie potwierdzony.
2. POTRZEBNA DECYZJA/UPRAWNIENIE — dokładnie czego potrzeba i dlaczego.
3. PRACA ZABLOKOWANA — limit/brak dostępu/błąd uniemożliwia dalszy ciąg; podaj ostatni ukończony punkt i następny krok.

Nie zatrzymuj się na zwykłym PASS paczki. Nie angażuj Tomasza jako kuriera ani technicznego testera.