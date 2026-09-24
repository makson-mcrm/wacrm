# 01.07-004 — AKTYWNOŚĆ / DZWONIENIE + POMIAR SPRZEDAŻY

STATUS: SPECYFIKACJA WYKONAWCZA — SOBOTA 26.09.2026

## CEL
Dostarczyć jeden szybki, realny przepływ pracy handlowca: wybór klienta/Deala → działanie → wynik → notatka/dyktowanie → następny krok → termin → blocker → zapis → DZISIAJ / historia / pomiar.

Źródło UX: finalny pakiet „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026”, plansza AKTYWNOŚĆ + audyt + checklista. Bez redesignu.

## WARUNEK STARTU
004 wolno uruchomić dopiero po pełnym LIVE PASS 003. Jeżeli 003 nie ma PASS — STOP.

## PRZEPŁYW GŁÓWNY
WYSZUKAJ/WYBIERZ → KLIENT + DEAL → AKCJA → WYNIK → DYKTUJ/NOTATKA → opcjonalne AI → ROZPOZNANO → NEXT ACTION + TERMIN + BLOCKER → ZAPIS.

## WYMAGANE FUNKCJE
- wyszukanie/wybór istniejącej osoby,
- jawny wybór Deala; przy wielu Dealach system nie zgaduje,
- obsługa nowego/nieznanego numeru bez istniejącego Kontaktu,
- możliwość zadzwonienia najpierw, a utworzenia/powiązania Kontaktu/Deala później,
- typy akcji co najmniej: telefon / wiadomość / spotkanie / notatka,
- obowiązkowy wynik rozmowy: Odebrał / Nie odebrał / Oddzwonić,
- notatka tekstowa i wejście do dyktowania; AI opcjonalne, nie blokuje zwykłego zapisu,
- next action + termin + blocker zapisane do jawnego Deala,
- zapis aktywności do historii,
- po zapisie DZISIAJ pokazuje aktualny next action/termin bez odtwarzania starego terminu,
- przełożenie rozmowy aktualizuje właściwy Deal,
- jeden aktywny następny krok na aktywny Deal.

## POMIAR T12 — MINIMUM
System ma wiarygodnie zliczać, bez podwójnego liczenia:
- nowe telefony/próby kontaktu,
- wartościowe rozmowy,
- nowe realne tematy,
- sprawy przesunięte o etap,
- sprawy przybliżone do prowizji / uruchomienia, jeśli takie zdarzenie wystąpi.

Każda metryka musi mieć jasne zdarzenie źródłowe. Brak danych ≠ zero. Nie tworzyć sztucznych KPI na ekranie DZISIAJ.

## ZASADY DANYCH
- account scope obowiązkowy,
- aktywność powiązana z konkretną Osobą i — jeśli istnieje — konkretnym Dealem,
- wynik, notatka, next action, termin i blocker nie mogą trafiać do innego Deala,
- Deal jest źródłem prawdy dla aktualnego next action + termin + blocker,
- historia jest append-only dla zdarzeń sprzedażowych.

## POZA ZAKRESEM
- pełne E2E WhatsApp i szablony — 005,
- wiedza bankowa/kwalifikacja,
- finanse,
- szeroka automatyzacja AI,
- kosmetyka niezwiązana z przepływem sprzedażowym.

## KRYTERIA TECHNICZNE
- lint PASS,
- typecheck PASS,
- testy PASS,
- build PASS,
- check:migrations PASS,
- git diff --check PASS,
- regresja P0 roundtrip PASS,
- brak konfliktu z aktualnym main.

## LIVE PASS 004
004 ma PASS dopiero, gdy na rzeczywistym LIVE da się wykonać pełny kontrolowany scenariusz:
1. wyszukaj klienta,
2. wybierz jawny Deal,
3. zapisz telefon,
4. wybierz wynik,
5. zapisz notatkę,
6. ustaw next action + termin + blocker,
7. zapisz,
8. po ponownym wejściu aktywność jest w historii,
9. DZISIAJ pokazuje właściwy aktualny next action/termin,
10. pomiar zwiększa właściwą metrykę dokładnie raz,
11. scenariusz „Nie odebrał + kolejna próba” działa,
12. scenariusz nowego numeru działa bez wymuszenia Deala,
13. phone/tablet/desktop bez krytycznej regresji.

## ZASADA TRANSPORTU
Codex = wykonawca kodu, ale wynik istnieje dopiero po fizycznym zapisie commita na właściwym branchu/PR GitHub. Lokalny commit bez aktualizacji head PR = NIEGOTOWE.

## STOP
Dwie kolejne próby bez realnego postępu / zmiany head → STOP. Nie powtarzać zadań i nie spalać limitu.
