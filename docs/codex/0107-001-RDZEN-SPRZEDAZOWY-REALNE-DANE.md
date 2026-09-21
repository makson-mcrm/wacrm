# 01.07-001 — PRZYWRÓCENIE RDZENIA SPRZEDAŻOWEGO DO REALNEJ PRACY

## CEL BIZNESOWY
Doprowadzić istniejący mCRM AI do stanu, w którym Tomasz może rozpocząć realną pracę na prawdziwych klientach bez papierowego kalendarza i bez starego CRM.

Pierwszy pełny przepływ ma działać:
Kontakt/Osoba/Firma → Deal → telefon lub aktywność → wynik rozmowy → następny krok → termin → blocker → DZISIAJ → historia → ponowne otwarcie sprawy z zachowanymi danymi.

## PRIORYTET
P0. Ważniejszy niż szerokie czyszczenie starego WaCRM, nowe moduły i kosmetyka.

## ZAKRES
1. Sprawdź aktualny kod na tej gałęzi oraz AGENTS.md i GLOWNY_STAN_WDROZENIA.md.
2. Zweryfikuj istniejący przepływ P0 i napraw wyłącznie to, co blokuje jego pełne działanie.
3. Upewnij się, że można zapisać prawdziwy kontakt klienta, prawidłowo powiązać go z Dealem i zachować dane po ponownym wejściu.
4. Upewnij się, że zapis aktywności aktualizuje właściwy Deal: wynik rozmowy, next_action, next_action_at, blocker oraz historię.
5. Upewnij się, że DZISIAJ pokazuje właściwy następny krok i prowadzi do właściwego Deala bez duplikacji i bez przywracania starych terminów.
6. Jeżeli stare moduły WaCRM przeszkadzają w głównej nawigacji lub realnym przepływie P0, odetnij je od bieżącego UX w minimalnym zakresie. Nie usuwaj fundamentu WhatsApp ani kodu potrzebnego później do WhatsApp Business.
7. Zachowaj obecną architekturę i nie przepisuj aplikacji od zera.

## POZA ZAKRESEM
- redesign UX,
- wdrażanie nowych modułów zdrowie, finanse, smart home,
- Agents API,
- szerokie porządki repozytorium niepotrzebne do P0,
- integracja z zamkniętym systemem mFinanse/mBank,
- kasowanie fundamentu WhatsApp.

## DANE
Testy automatyczne mogą używać danych technicznych/fixture. Po stronie produktu nie twórz dla Tomasza osobnego „testowego CRM”. Celem jest bezpieczny przepływ gotowy do użycia na prawdziwych kontaktach w produkcji po przejściu prób.

## UX
Nie projektuj niczego od nowa. Pakiet z 13.09 jest tylko bazą. Późniejsze decyzje 17–18.09 mają pierwszeństwo. W tej paczce nie rób zmian wyglądu poza absolutnym minimum wymaganym do odblokowania przepływu.

## BEZPIECZEŃSTWO
Nie wysyłaj zmian bezpośrednio na main. Pracuj wyłącznie na gałęzi PR. Nie zmieniaj produkcyjnych danych. Jeżeli naprawa wymaga migracji danych/schema, opisz ją i przygotuj bezpiecznie, ale nie wykonuj ryzykownej/nieodwracalnej operacji bez wyraźnego powodu i dowodu.

## KRYTERIA ODBIORU
PASS dopiero gdy:
- relevant tests PASS,
- pełny build PASS,
- git diff --check PASS,
- jeden scenariusz regresyjny pokrywa Contact/Deal/Activity/DZISIAJ/history,
- dane po zapisie są trwałe w warstwie aplikacji,
- brak regresji istniejącego fundamentu WhatsApp,
- zakres nie wychodzi poza P0,
- GLOWNY_STAN_WDROZENIA.md jest zaktualizowany o: co zmieniono, pliki, testy, commit, co nadal niepotwierdzone, następny krok.

## RAPORT KOŃCOWY CODEX
Krótko:
1. Co naprawiono.
2. Co sprawdzono.
3. Wyniki testów/build.
4. Commit.
5. Co nadal blokuje realne LIVE.
6. Czy paczka jest gotowa do niezależnego odbioru 01.07.

Nie angażuj Tomasza w decyzje techniczne. Nie rozszerzaj zakresu.