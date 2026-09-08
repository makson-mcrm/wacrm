# M3 DZISIAJ — część A

## Istniejące źródła danych

- `work_queue_items`: aktywna kolejka, odłożenie, stan i ręczny priorytet.
- `deals` + `pipeline_stages`: etap, blocker, next action, termin, uruchomienie, FV i prowizja.
- `sales_activities`: planowane i przełożone działania, next action oraz kolejny kontakt.
- `calendar_events`: zajęte bloki, godziny i lokalizacja.
- `daily_priorities`: gotowy zapis maksymalnie sześciu spraw Ivy Lee.

Nie jest potrzebna migracja. Ranking jest warstwą odczytu, a zaakceptowany plan może zostać zapisany w istniejącym `daily_priorities`.

## Minimalny ranking

1. `PRZYCHOD_TERAZ`: blocker na etapie 4+, uruchomienie/FV/prowizja, decyzja, wniosek, zaawansowany Deal z terminem dziś lub zaległym.
2. `PRZYCHOD_POZNIEJ`: nowy telefon, wartościowy kolejny kontakt, nowy realny temat, Deal bez ruchu i zaległe działanie.
3. `T12`: standardowo jedna pozycja; druga tylko gdy ma do 20 minut i jest związana z wybranym Dealem/sprawą.
4. `PRYWATNE`: widoczne w planie, lecz poza sześcioma głównymi sprawami.

Kolejność grup jest twarda, dlatego ręczny priorytet T12 nie wyprze przychodu. Ręczny priorytet działa w obrębie tej samej grupy. W `TERAZ` pozostaje jedna aktywna sprawa sprzedażowa; następne trafiają do `NASTEPNY_BLOK`, a reszta do `POZNIEJ_DZISIAJ`.

## Kontekst bez nowego modelu

Kontekst jest wyliczany z istniejącego tekstu lokalizacji/tytułu kalendarza: `Rzeszów` lub `biuro` oznacza `RZESZOW_BIURO`, a `dom`, `komputer`, `online` lub `zdalnie` oznacza `DOM_KOMPUTER`. Brak sygnału daje `DOWOLNY`.

Do czasu osobnego UX wpisy `T12:` i `PRYWATNE:` w `daily_priorities.title` są rozpoznawane bez zmiany schematu.

## Następny krok po resecie

Dodać adapter odczytu Supabase oparty o powyższe pięć źródeł, podłączyć `buildTodayPlan` do mobilnego `/dashboard`, wyrenderować trzy krótkie sekcje i sprawdzić cały przepływ na iPhone. Dopiero po testach wdrażać LIVE.

