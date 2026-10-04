# Design QA — MOBILE 02 KLIENCI + 08 AKTYWNOŚĆ

- Source visual truth: `C:/Users/HP/AppData/Local/hermes/cache/scratch/ux9/wzorzec_02.png` i `wzorzec_08.png` (1920 × 1081 px; prawa, mobilna część planszy).
- Browser-rendered implementation: `C:/Users/HP/AppData/Local/Temp/wacrm-mobile-02-viewport.png`, `wacrm-mobile-08-viewport.png` oraz pełne przewinięcia `wacrm-mobile-02-full.png`, `wacrm-mobile-08-full.png`.
- Combined comparisons: `C:/Users/HP/AppData/Local/Temp/wacrm-mobile-02-comparison.png` i `wacrm-mobile-08-comparison.png`.
- Viewport: 390 × 844 CSS px, device scale factor 1. Implementacja viewport 390 × 844 px; źródłowy telefon został wykadrowany i znormalizowany do 390 px szerokości.
- State: 02 z trzema realistycznymi kartami; 08 z wybranym klientem, dealem i pięcioma ostatnimi aktywnościami.

## Full-view comparison evidence

Oba wzorce i oba rendery zostały zestawione parami w jednym obrazie. 02 zachowuje mobilną hierarchię: wyszukiwarka, przewijane filtry, karty zamiast tabeli, status/deale/ostatni kontakt i duże akcje telefon/SMS. 08 zachowuje jednokolumnowy przepływ i czytelną hierarchię kart; pełny zrzut potwierdza kolejność kroków 1–12 oraz opcjonalną zmianę etapu dopiero po zapisie.

## Focused region comparison evidence

- 02: sprawdzono wyszukiwarkę, poziome filtry oraz trzy pełne karty. Przy szerokości 390 px dokument ma `scrollWidth = clientWidth = 390`, a dalsze filtry przewijają się wyłącznie we własnym kontenerze.
- 08: sprawdzono osobno górny kontekst klient/deal/historia i dolny formularz. Pięć typów rozmowy układa się 2 + 2 + 1, notatka ma duże pole i działające dyktowanie, a zapis nie jest zasłaniany ani przez formularz, ani przez dolną nawigację.

## Required fidelity surfaces

- Fonts and typography: zachowano istniejącą rodzinę, wagi i granatową hierarchię produktu; rozmiary mobilne nie wymagają pomniejszania tekstu.
- Spacing and layout rhythm: karty mają 12 px wewnętrznego odstępu, kontrolki co najmniej 44 px, sekcje nie wychodzą poza viewport; globalny shell ma bezpieczny odstęp od dolnej nawigacji i paska systemowego.
- Colors and visual tokens: zachowano produktowe kolory; poprawiono wyłącznie kontrast SMS w ciemnym motywie i tekst dolnej nawigacji.
- Image quality and assets: nowe obrazy nie były potrzebne; użyto istniejących avatarów/fallbacków i ikon biblioteki.
- Copy and content: 02 pokazuje nazwę, telefon, status, liczbę deali i ostatni kontakt. 08 pokazuje dokładne kroki 1–12 wymagane kontraktem.

## Interaction evidence

W przeglądarce sprawdzono: zmianę filtra 02, wpisywanie w wyszukiwarkę, aktywne karty i akcje; w 08 wybór typu rozmowy, wyniku, wpisanie notatki, następnego kroku i blockera oraz przełączenie zakładek historia/nowa aktywność. Brak framework error overlay i brak błędów konsoli; jedyne żądanie 404 dotyczyło nieprodukcyjnego endpointu tymczasowego podglądu demo.

## Comparison history

1. P1: cały blok zapisu 08 był `sticky` i zasłaniał typ rozmowy. Fix: zapis wrócił do końca sekwencji, a ochronę przed dolną nawigacją zapewnia globalny padding i safe area. Post-fix: `wacrm-mobile-08-full.png`.
2. P2: przycisk SMS w ciemnym motywie miał ciemne tło i niski kontrast. Fix: jawne białe tło, ciemny tekst i obramowanie. Post-fix: `wacrm-mobile-02-full.png`.
3. P0/P1/P2 po poprawkach: brak.

## Findings

Brak otwartych P0/P1/P2. Różnice względem plansz są akceptowalne: implementacja 08 jest dłuższa, ponieważ kontrakt wymaga dodatkowych pól następnego kroku, terminu i blockera oraz pełnej kolejności 1–12.

final result: passed
