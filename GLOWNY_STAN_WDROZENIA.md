# GŁÓWNY STAN WDROŻENIA mCRM AI

Aktualizacja: 2026-09-22 Europe/Warsaw
Właściciel biznesowy: Tomasz
Kierownik strategiczny: 01.07 — Strategiczny Wdrożeniowiec mCRM AI
Repozytorium: makson-mcrm/wacrm

## AKTUALNY CEL

Do piątku 25.09.2026 doprowadzić LIVE do realnej codziennej sprzedaży na zatwierdzonym pakiecie UX 9 ekranów: DZISIAJ / KLIENCI / DEAL / LEJEK / KALENDARZ / ZADANIA / FINANSE / AKTYWNOŚĆ / ASYSTENT. Rdzeń ma obsługiwać prawdziwego klienta, telefon/aktywność, wynik rozmowy, notatkę/dyktowanie, następny krok, termin, blocker, historię i pomiar sprzedaży. Do piątku w minimum również: WhatsApp + zatwierdzone szablony/kompletacja oraz Finanse sprzedażowe minimum. Bez budowania Agents API od zera przed stabilnym rdzeniem.

## OSTATNI POTWIERDZONY MAIN

cf6fc9110aae4b1dbf8335e9b118ad73734971ca — merge PR #4 „01.07-001 — rdzeń sprzedażowy do realnej pracy”.

## KRYTYCZNA KOREKTA 01.07-001

PR #4 został scalony, ale zawierał wyłącznie 2 pliki dokumentacyjne (GLOWNY_STAN_WDROZENIA.md oraz opis zlecenia 01.07-001). Nie zawierał zmian kodu aplikacji. Dlatego nie wolno uznawać 01.07-001 za wdrożoną funkcję ani za dowód poprawy rdzenia sprzedażowego. Wcześniejsze określenie tego merge jako „wdrożenia rdzenia” było błędne.

## CO JEST POTWIERDZONE

- LIVE Hostinger otwiera się po zalogowaniu i pokazuje działający ekran „Dzisiaj” na rzeczywistych danych użytkownika.
- Widoczny LIVE nadal odpowiada wcześniejszemu/staremu układowi, a nie finalnemu pakietowi UX 9 ekranów z 18.09.
- PR #3 dotyczący roundtrip aktywność → Deal → DZISIAJ został wcześniej scalony do main.
- Aktualny main zawiera poprawki odzyskiwania hasła i wcześniejsze wywołanie wdrożenia Hostinger.
- Finalny pakiet UX jest utrwalony na Drive w folderze „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026”: PDF + audyt + checklista.

## CO NIE JEST JESZ POTWIERDZONE

- Finalny UX 9 ekranów na LIVE.
- Pełny realny przepływ: klient → telefon → wynik → next action → termin → DZISIAJ → historia → prowizja na aktualnym LIVE.
- Minimalny WhatsApp + finalne szablony + kompletacja na aktualnym LIVE.
- Finanse sprzedażowe minimum i Asystent minimum w finalnym UX.
- Czy ostrzeżenia Hostinger o bezpieczeństwie są zamknięte w sposób pozwalający uznać produkcję za bezpieczną do stałej pracy.

## ŹRÓDŁO UX — OBOWIĄZUJE

Folder Drive: „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026”.
PDF: „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026.pdf”.
Załączniki: „01 — AUDYT UX — ZAŁĄCZNIK DO 9 EKRANÓW — 18.09.2026” oraz „02 — CHECKLISTA ODBIOROWA UX — 9 EKRANÓW — 18.09.2026”.
Nie wolno wracać do 13.09 jako wersji finalnej ani redesignować zatwierdzonych plansz.

## PLAN PACZEK DO PIĄTKU — JEDNA NARAZ

01.07-002 — FUNDAMENT + DZISIAJ.
01.07-003 — KLIENCI + DEAL + lekki rejestr przed Dealem.
01.07-004 — AKTYWNOŚĆ/DZWONIENIE + pomiar sprzedaży.
01.07-005 — WHATSAPP + finalne szablony + kompletacja minimum.
01.07-006 — LEJEK + KALENDARZ + ZADANIA.
01.07-007 — FINANSE sprzedażowe minimum + ASYSTENT minimum bez budowy Agents API od zera.
01.07-008 — pełny odbiór 9 ekranów/LIVE + tylko poprawki krytyczne.

## BUDŻET LIMITÓW — OSTATNI POTWIERDZONY STAN

Odczyt z panelu Usage z 21.09 około 17:30:

- limit 5h: 77% pozostało; reset był wskazany za około 23 min,
- limit tygodniowy: 59% pozostało; reset za około 4 dni 19 godz.
  01.07 nie ma samodzielnego odczytu aktualnych procentów; nie zgaduje świeżego stanu.
  Planistycznie do piątku: maksymalnie 49 punktów procentowych tygodniowego budżetu na paczki i 10 punktów rezerwy na błędy krytyczne. To alokacja, nie prognoza faktycznego zużycia.
  Work: 0 jako plan bazowy. Jedno aktywne zlecenie Codex naraz.

## ZASADA ODBIORU

Ekran bez minimalnej działającej funkcji = NIEODEBRANY.
Raport Codexa ≠ odbiór.
Każda paczka: kod → testy/build → zgodność z zatwierdzonym UX → rzeczywiste działanie LIVE → aktualizacja tego pliku → decyzja 01.07.
Tomasz wykonuje dopiero końcowy krótki test biznesowy po odbiorze technicznym.

## STOP LIMITU I WZNOWIENIE

STOP uznajemy wyłącznie po rzeczywistym odrzuceniu/uniemożliwieniu uruchomienia Codex z powodu limitu. Wtedy zapisujemy numer paczki, ostatni zamknięty punkt i dokładnie jeden następny krok. Bez serii ponowień. Po resecie pierwsza zaplanowana kontrola podejmuje jedną próbę wznowienia tej samej paczki.

## NASTĘPNY KROK

01.07-002 pozostaje NIEGOTOWA do czasu wdrożenia i niezależnego odbioru LIVE.
Zakres kodowy paczki obejmuje zatwierdzony fundament 9 ekranów, bezpieczny
odczyt DZISIAJ w granicach konta i dnia Europe/Warsaw, jawne stany
ładowania/błędu oraz istniejący roundtrip P0 do właściwego Deala i historii.
Po wdrożeniu wykonać kryteria odbiorowe zapisane w
`docs/codex/0107-002-FUNDAMENT-DZISIAJ-P0.md`. Nie wykonywać 01.07-003 przed
pełnym PASS 01.07-002.

## PO PIĄTKU / DO 30.09

28.09 — Wiedza bankowa V1 (najpierw mBank) + minimalna obsługa 2–3 banków w jednym Dealu.
29.09 — Finanse V1 rozszerzone + wspólne wejście mCRM/RACHUNEK/MATA.
30.09 — kontrola jakości danych T12 + tylko minimalny przepływ Zdrowie/Żywienie, jeśli rdzeń sprzedażowy jest stabilny. Bez Smart Home/EV/pełnego Agents API przed stabilnością rdzenia.
