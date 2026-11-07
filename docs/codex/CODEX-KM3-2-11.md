# KM3.2.11 — karta, wielokartowość i kalendarz tygodniowy

**W TOKU — nie jest to PASS ani gotowy ekran TEST.** Oczekuje odpowiedź na pytanie o cztery niezbędne pliki pominięte w zamkniętym zakresie zlecenia.

## Podstawa i źródła

- Zlecenie TASK-KM3.2.11 z bieżącej rozmowy, 07.11.2026.
- BASE_SHA ze zlecenia: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
- Rzeczywisty HEAD: `95b61fb1dfaf3c87e7ff8624055d2990d6acf969`, detached HEAD w `/Users/mcrm-ai/wacrm-a`; zgodny z podanym WORKTREE. Drzewo na początku było czyste. Nie przełączano gałęzi.
- Odczytano `AGENTS.md`, skills `k3-screen-delivery`, `mcrm-wykonawca` i referencje renderu lokalnego, testu headless oraz paczek bez publikacji. Bieżące zlecenie określa zakres KM3 i ma pierwszeństwo wobec historycznej kolejki KM1.
- Obejrzano `/Users/mcrm-ai/.hermes/k3/render/bigin_card_contact.png` i `bigin_pipeline_1536.png`, oba 1536×1024. Nie odczytywano danych rzeczywistych ani sesji produkcyjnej.

## Przygotowany kod w dozwolonym zakresie

| Plik | Zmiana |
| --- | --- |
| `src/lib/ui/layout-geometry.ts` | Osiem zamówionych tokenów, dodatkowo gutter czasu 40 px i wysokość nagłówka rekordu obliczona jako `148 − 33 − 49 = 66`. Warianty zmiennych CSS `cards` i `calendar`. |
| `src/app/(dashboard)/deals/[id]/page.tsx` | Nowy wariant Bigin: lewa kolumna 488 px, wiersze 44 px, cztery zakładki Oś czasu / Komentarze / Aktywności / Wiadomości. Historia korzysta z już pobieranych etapów i aktywności; komentarze ze starego zapisu `deal_notes`; aktywności z istniejącego komponentu; wiadomości z adresu e-mail kontaktu. Dotychczasowy kod autorski pozostał za warunkiem `cardExtensions`. |
| `src/app/(dashboard)/deals/kanban-card.tsx` | Wspólny link i obsługa pojedynczego kliknięcia, dwukliku, Cmd/Ctrl+klik oraz aktywacji klawiaturą. Nowa karta przez `window.open(href, '_blank', 'noopener')`. Pojedyncza akcja odroczona o 500 ms, anulowana przy dwukliku i odmontowaniu. Komponent nie został jeszcze podpięty w plikach spoza zakresu. |
| `src/app/(dashboard)/calendar/page.tsx` | Domyślnie pn–pt, etykiety 08:00–18:00, 11 wierszy po 56 px, 40 px osi czasu i pięć równych kolumn. Zakres nagłówka do piątku, strzałki z etykietami dostępności, trzy filtry Wszystkie / Spotkania / Zadania. Spotkania obejmują typy `spotkanie` i `meeting`, Zadania pozostałe typy istniejącej agendy. Zachowano dzień, miesiąc i opcję weekendów. Autorski panel najbliższego wydarzenia zachowany pod flagą rozszerzeń. |
| `src/lib/ui/surface-flags.test.ts` | Testy renderu karty i kalendarza na danych syntetycznych, filtrów, zawartości zakładek, przywrócenia dodatków oraz otwierania nowej karty bez wykonania pojedynczej akcji. Atrapa bazy rzuca błąd przy każdej próbie zapytania. |

Rozbieżność źródła: x=488 na obrazie oznacza szerokość panelu pól 423 px po odjęciu menu 65 px. W kodzie zastosowano wyraźne kryterium zlecenia `CARD_LEFT_PANEL_WIDTH = 488`, czyli szerokość samego panelu 488 px; jego prawa granica po integracji ramy wyniesie x=553. Nie jest to deklaracja zgodności obrazu 1:1.

## Blokada zakresu

Wysłano pytanie o minimalne rozszerzenie zakresu na:

1. `src/components/pipelines/deal-card.tsx` — podpięcie linku do nazwy deala na istniejącym Kanbanie; rzeczywisty komponent ma inną ścieżkę niż zamówiony nowy plik.
2. `src/app/(dashboard)/contacts/page.tsx` — podpięcie linku nazwy kontaktu do istniejącej pełnej karty `/contacts?open=<id>`.
3. `src/lib/ui/surface-flags.ts` — deklaracja `cardExtensions: false` w istniejącym centralnym module flag.
4. `src/components/layout/app-shell.tsx` — zastosowanie ramy 65/49 px i zerowego paddingu tylko na karcie deala oraz kalendarzu. Bez tego wewnętrzne zmienne strony nie zmieniają nadrzędnego menu i nagłówka.

Do otrzymania odpowiedzi te cztery pliki pozostają niezmienione. Nie użyto obejścia w postaci globalnych listenerów, modyfikowania nadrzędnego DOM ani drugiego źródła flag. Wariant karty odwołuje się do zamówionej, jeszcze niezadeklarowanej flagi; aktualny diff ma charakter WIP i nie przechodzi typecheck.

## Walidacja dotychczasowa

| Kontrola | Wynik |
| --- | --- |
| `npx --no-install vitest run src/lib/ui/surface-flags.test.ts` | Pierwszy przebieg: 39 zaliczonych, 4 niezaliczone. Cztery braki: centralna flaga, rama karty, rama kalendarza, podpięte linki. Log `/private/tmp/km3-2-11-surface-first.log`. |
| `npm run typecheck` | Pierwszy przebieg: 5 błędów TS2339, wszystkie z powodu brakującej deklaracji `cardExtensions`. Log `/private/tmp/km3-2-11-typecheck-first.log`. |
| ESLint pięciu plików źródłowych zakresu | Pierwszy przebieg wykrył regułę odczytu refa w renderze wspólnego linku. Poprawiono przez memoizację handlerów z zależnościami `href` i `onOpen`. Drugi przebieg: 0 błędów i ostrzeżeń. Log `/private/tmp/km3-2-11-lint-final.log`. |
| `git diff --check` | Bez błędów. |
| Pełny zamówiony zestaw deals/calendar/ui | Jeszcze nie uruchomiony; oczekuje integracji braków zakresu, aby nie zużywać drugiej próby na znany brak. |
| Build, pomiar DOM, zrzuty i test klikany | Jeszcze nie wykonane; typecheck jest warunkiem wstępnym builda. |

Brak commita, pusha, publikacji, instalacji zależności oraz zmian bazy, RLS, sekretów, plików `.env`, modeli AI i uprawnień.

## Ekran TEST i odbiór

Nie ma buildu TEST zawierającego tę paczkę. Ścieżki do docelowego sprawdzenia to `/pipelines`, `/deals/<id-syntetyczny>`, `/contacts?open=<id-syntetyczny>` i `/calendar`. Nie podano linków do starszego wdrożenia jako dowodu nowych zmian.

PASS może nadać wyłącznie Tomasz po zobaczeniu właściwego ekranu TEST. Zakaz publikacji pozostaje w mocy.

## Koszt i checkpoint

Nowe wywołania Nous w tej paczce: **0**, koszt tych wywołań: **0 USD**. Salda całego konta Nous nie odczytywano. Wykorzystano wyłącznie bieżącą sesję Codexa i dostępne lokalne narzędzia, bez nowych opłat i podagentów.

Pasywny odczyt przed implementacją: 5 h użyte 4%, pozostało 96%, reset 07.11.2026 14:14; tydzień użyte 6%, pozostało 94%, reset 13.11.2026 10:24; brak dodatkowych kredytów. Przy zatrzymaniu na zakresie pozostało 90% okna 5 h i 93% tygodnia (różnice zaokrąglone: −6 i −1 pp). Źródło obu odczytów: `rollout-2026-11-07T09-14-05-01a1b512-69a0-7812-b9fd-c867f73534ab.jsonl`, skrypt `mcrm-wykonawca/scripts/codex-limity.sh`.

Docelowy `~/.hermes/cache/k3/CHECKPOINT-*.md` znajduje się poza obszarem zapisu sandboxa. Zgodnie z sekcją „Checkpoint pisz poza Codexem” w skill `k3-screen-delivery` checkpointem przebiegu Codexa jest niniejsza notatka w repo; nie podjęto próby zapisu poza sandboxem.

**Punkt wznowienia:** HEAD bez zmian, lokalny diff pięciu plików źródłowych i ten raport. Czeka odpowiedź na zakres czterech podpięć. Po potwierdzeniu: dodać deklarację flagi, podpiąć wspólny link i geometrię w ramie, wykonać drugi przebieg testu powierzchni wraz z zamówionym zestawem, typecheck, build lokalny oraz dostępne dowody wizualne. Nie commitować ani nie publikować.
