# 01.07-002 — FUNDAMENT + DZISIAJ + P0

## Cel biznesowy

Dać sprzedawcy jedno bezpieczne wejście do codziennej pracy: zatwierdzoną
nawigację mCRM AI oraz DZISIAJ zbudowane wyłącznie z aktualnych danych jego
konta. Z pozycji dnia użytkownik ma przejść do właściwego kontekstu
Klienta/Deala i wykonać aktywność w istniejącym przepływie P0.

## Zakres tej paczki

1. Fundament aplikacji utrzymuje dziewięć zatwierdzonych ekranów:
   DZISIAJ / KLIENCI / DEAL / LEJEK / KALENDARZ / ZADANIA / FINANSE /
   AKTYWNOŚĆ / ASYSTENT.
2. DZISIAJ czyta Deale, planowane aktywności, kolejkę, priorytety i kalendarz
   tylko z aktywnego konta.
3. Dzień sprzedażowy oraz jego granice są liczone w `Europe/Warsaw`, także
   przy zmianie czasu letniego i zimowego.
4. Plan nie pokazuje pustego sukcesu przed zakończeniem odczytu. Błąd danych
   zatrzymuje planszę i daje bezpieczne ponowienie zamiast prezentować
   niepełną listę jako aktualną.
5. Deal pozostaje źródłem prawdy dla next action, terminu i blockera. Rekordy
   aktywności, kolejki oraz priorytetów tej samej sprawy są scalane, nie
   dublowane.
6. Kliknięcie sprawy otwiera AKTYWNOŚĆ z jawnym identyfikatorem tego samego
   Deala/Klienta/Firmy. Zapis wyniku tworzy historię i aktualizuje następny
   krok, termin oraz blocker istniejącym przepływem P0.

## Kryteria PASS

PASS dopiero gdy wszystkie punkty są spełnione:

- testy daty biznesowej, adaptera DZISIAJ, rankingu, roundtripu i kontraktu UX
  przechodzą,
- pełny lint, typecheck, testy, kontrola migracji oraz build przechodzą,
- `git diff --check` przechodzi,
- na LIVE po zalogowaniu widać zatwierdzony fundament i aktualne DZISIAJ,
- na LIVE jedna rzeczywista sprawa przechodzi ścieżkę:
  DZISIAJ → właściwy Deal → aktywność/wynik → next action → termin → blocker
  → ponowne DZISIAJ → historia,
- na LIVE nie ma duplikatu sprawy, starego terminu ani danych innego konta,
- niezależny odbiór techniczny potwierdza powyższe.

Samo przygotowanie środowiska, zielony build lub raport wykonawcy nie daje
PASS. Do czasu potwierdzenia LIVE paczka pozostaje **NIEGOTOWA** i nie wolno
rozpoczynać 01.07-003.
