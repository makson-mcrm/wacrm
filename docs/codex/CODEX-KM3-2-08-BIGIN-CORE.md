# KM3.2.08-BIGIN-CORE — Lejek 02B

Data: 05.11.2026. Stan: kod zmieniony lokalnie i testy zakończone; brak odbioru wizualnego i PASS Tomasza.
BASE_SHA i niezmieniony HEAD: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
Praca na dostarczonym, czystym checkoutcie z odłączonym HEAD. Bez przełączania gałęzi, commita, pusha i publikacji.

## Zmienione pliki

- `src/components/pipelines/pipeline-board.tsx`: kolumny desktop 220 px, odstęp 10 px, przewijanie poziome, etykieta „Transakcja”, nazwa etapu, suma i licznik, „Ten etap jest pusty”. Wspólna karta na desktop, mobile i w nakładce przeciągania.
- `src/components/pipelines/deal-card.tsx`: biała karta z nazwą sprawy, kontaktem, kwotą i datą; zachowane „Ostatnia aktywność”, ZADZWOŃ i WIADOMOŚĆ oraz odnośnik do Deala. Data oznacza planowane zamknięcie, a gdy go brak — utworzenie. Kontakt bez nazwy nie tworzy pustego wiersza. Obsługa klawiatury karty nie przechwytuje Enter/Space wewnętrznych akcji.
- `src/app/(dashboard)/pipelines/page.tsx`: pasek nad tablicą, poniżej istniejącego Asystenta AI; lokalne wyszukiwanie po sprawie/kontakcie z ⌘K i Ctrl+K, widoki wszystkich/otwartych/zamkniętych transakcji, filtr właściciela i cztery sposoby sortowania. Menu „Więcej” resetuje widok, odświeża dane lub otwiera istniejące ustawienia lejka. Loading pokazuje sześć kolumn o docelowej szerokości.
- `src/components/pipelines/pipeline-board.test.tsx`: rzeczywisty DealCard zamiast atrapy; sześć kolumn, geometria deklarowana w CSS, stan pusty, komplet danych i akcji karty, ponowny odczyt zmienionego etapu.
- `src/app/(dashboard)/pipelines/page.test.tsx`: zachowanie dotychczasowych testów, sześć kolumn operacyjnych, funkcje mCRM i ich kolejność w renderowanym HTML, wyszukiwanie, widoki, właściciel, łączenie filtrów i sortowanie bez modyfikacji danych wejściowych.
- Ten wymagany raport — jedyny nowy dokument w repozytorium.

## Weryfikacja

```text
npx vitest run src/components/pipelines/pipeline-board.test.tsx 'src/app/(dashboard)/pipelines/page.test.tsx'
Test Files  2 passed (2)
Tests       73 passed (73)
Duration    3.87s

npm run typecheck
tsc --noEmit
exit code 0
```

Testy używają syntetycznych danych. Dostęp do bazy i fetch są zablokowane w testach strony; asercje potwierdzają brak ich wywołań. Istniejące testy drag&drop, kwot, odmiany liczników, kontaktu i błędów pobrania przechodzą. Nie wykonywano builda, bramki, skryptów zewnętrznych ani wywołań modeli AI. Nie zmieniono zależności, schematu bazy, sekretów ani konfiguracji hostingu.

## Źródła i różnice względem Bigin

Odczytano istniejące lokalne D1/D2 z decyzją BIGIN-FIRST 05.11.2026 oraz wskazane umiejętności, w tym pełne instrukcje UXKIN. Obejrzano lokalny zrzut demo: `~/.hermes/cache/k3/km14/bigin_lejek_live2.png` (1536×1024). Kolumny 220 px i odstęp 10 px pochodzą z potwierdzonych pomiarów w zleceniu. Nie wykonano nowego pomiaru zalogowanego Bigin.

| Różnica / element | Decyzja w tej paczce | Dowód / ograniczenie |
| --- | --- | --- |
| Jasne tło, białe karty | Zachowane jawne powierzchnie `#f8f9fb`, `#f1f3f6`, `#ffffff` | Testy renderu; brak nowego próbkowania pikseli |
| Kolumny i odstęp | Stałe 220/10 px zamiast równomiernego rozciągania | Test klas CSS; pomiar rzeczywistego DOM pozostaje do wykonania |
| Nazwy i liczba etapów | Istniejące sześć etapów operacyjnych mCRM oraz osobne Archiwum | Bez zmiany rekordów i seedów na etapy demo Bigin |
| KPI, PRODUKT/TAG/BANK/PRIORYTET, AI | Zachowane w dotychczasowej kolejności i miejscu nad tablicą | Test renderu; zajmują więcej wysokości niż demo Bigin |
| Ostatnia aktywność i akcje kontaktowe | Pozostają na karcie, zwiększając jej wysokość względem Bigin | Testy rzeczywistej karty |
| Właściciel zmiany | W tej paczce filtruje już przypisanych właścicieli; nie realizuje masowej zmiany właściciela | Test połączenia filtrów; brak nowej operacji zapisu |
| Wybór widoku | Filtr statusu w istniejącej tablicy, bez nowego ekranu listy/tabeli | Testy statusów open/won/lost |
| Menu i globalny pasek aplikacji | Poza zakresem, niezmienione | Bez deklaracji zgodności całej ramy z Bigin |
| Mobile | Zachowany wybór jednego etapu i rozwijanie sekcji | Dotychczasowe testy mobile przechodzą |

## Ograniczenia odbioru i checkpoint

- Narzędzie przeglądarki zgłosiło `The browser access host is unavailable`; wskazane adresy Bigin i porównania były również niedostępne przez odczyt WWW. Nie uzyskano aktualnego renderu ani pomiarów DOM menu/paska/kolumn/kart przy 1536×1024. Skrót klawiaturowy i menu wymagają dodatkowego sprawdzenia w działającej przeglądarce; test SSR nie dowodzi ich klikalności.
- Dev nie został uruchomiony: zlecenie dopuszcza wyłącznie uruchamianie Vitest i typecheck. Istniejący publiczny podgląd nie zawiera tych lokalnych zmian. Nie deklaruję zgodności wizualnej ani gotowego podglądu tej wersji.
- `~/.hermes/cache/k3/` znajduje się poza katalogami dopuszczonymi do zapisu przez sandbox tej sesji. Nie zapisano tam pliku CHECKPOINT i nie obchodzono ograniczenia. Ten raport zachowuje stan paczki: BASE_SHA, pełną listę plików, wyniki testów, brak publikacji i pozostały odbiór przez Hermesa/Tomasza.
- Nie uruchomiono nowej sesji Codexa, płatnego Nous ani płatnego API. Limity przed startem przyjęto zgodnie z potwierdzeniem w zleceniu; brak niezależnego odczytu zużycia abonamentu po przebiegu.

Następna czynność wykonawcza Hermesa: pokazać tę lokalną wersję w istniejącym podglądzie, zmierzyć i porównać z Bigin przy 1536×1024 oraz zapisać checkpoint w swoim katalogu. Publikacja pozostaje wstrzymana do decyzji Tomasza. PASS nadaje wyłącznie Tomasz.
