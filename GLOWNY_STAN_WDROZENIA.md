# GŁÓWNY STAN WDROŻENIA mCRM AI

Aktualizacja: 2026-09-27 Europe/Warsaw
Właściciel biznesowy: Tomasz
Kierownik: 01.07 — Strategiczny Wdrożeniowiec mCRM AI
Wykonawca: 01.08 — jeden kanoniczny Work `Preflight wdrożenia mCRM`
Repozytorium: `makson-mcrm/wacrm`

## 1. CEL TWARDY
Jak najszybciej doprowadzić cały sprzedażowy mCRM do użytecznego LIVE. Nie obowiązuje zasada „jedna plansza na dzień”. Obowiązuje: ile da się poprawnie i bezpiecznie dowieźć w dostępnym czasie i limicie.

Najbliższy próg biznesowy: Tomasz ma móc realnie pracować na klientach bez starego CRM: otworzyć Klienta/Deal, zarejestrować kontakt/telefon, wynik/notatkę, next action, termin, blocker, zapisać, wyjść, wejść ponownie i zobaczyć trwały stan.

## 2. TRYB WYKONAWCZY
Obowiązuje root `AGENTS.md` na `main` jako twarda instrukcja wykonawcza repo.

Najważniejsze zasady:
- ZERO KURIERA: Tomasz nie jest operatorem technicznym ani strażnikiem sesji,
- domyślna akcja = WYKONAJ,
- blocker = podzadanie do rozwiązania, nie STOP,
- preferować istniejące konektory/API/CI nad ręcznym logowaniem,
- nie kończyć po jednym commicie/buildzie/teście/ekranie,
- po PASS natychmiast brać następny krytyczny element,
- wszystkie niedelegowalne czynności właścicielskie grupować w jeden pakiet,
- przy UX obowiązkowy widoczny podgląd WZORZEC vs AKTUALNY EKRAN/LIVE.

## 3. ŹRÓDŁO PRAWDY UX
`UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026`.
Dla aktualnej AKTYWNOŚCI źródłem wizualnym jest plansza 08.

Nie projektować UX od nowa. Nie ufać nazwie commita jako dowodowi zgodności.

## 4. AKTUALNY STAN KODU
Potwierdzone na `main`:
- `f6979f247ad723f700613f6c12c7a375506ea8e1` — `fix: dopasuj mobilną AKTYWNOŚĆ 08 do planszy`,
- `acbcc139bcb31376722395fc38d7c5cc9908f4d8` — dodany workflow `Hostinger Deploy`,
- `e86e28a52e9843431b2185247f62c2a79df9fbc6` — wzmocniony root `AGENTS.md`: ZERO KURIERA / ciągła praca / obowiązkowy podgląd / 9 ekranów.

CI dla commita `acbcc139` zakończył się powodzeniem, ale osobny workflow Hostinger Deploy zakończył się FAIL.

## 5. AKTUALNY BLOCKER — HOSTINGER
Workflow Hostinger Deploy został uruchomiony i zatrzymał się natychmiast na kroku `Require existing Hostinger connection`.

Potwierdzona przyczyna z logów GitHub Actions:
`Repository secret HOSTINGER_API_TOKEN is not configured.`

To znaczy, że nowy workflow sam wprowadził zależność od sekretu `HOSTINGER_API_TOKEN`, którego repo obecnie nie ma. Nie wolno traktować tego jako dowodu, że Tomasz musi ręcznie logować się do GitHub. GitHub jest dostępny przez uwierzytelniony konektor.

Zadanie wykonawcy: sprawdzić wszystkie istniejące ścieżki publikacji Hostinger i usunąć sztuczny blocker. Najpierw wykorzystać istniejące połączenia/konektory/konfigurację Hostinger↔GitHub; nowy sekret tylko wtedy, gdy rzeczywiście jest konieczny i nie istnieje bezpieczna prostsza ścieżka.

## 6. AKTYWNOŚĆ 08 — WARUNEK PASS
PASS dopiero po wszystkich punktach:
1. krytyczna zgodność z planszą 08,
2. pełny przepływ,
3. zapis testowy,
4. wyjście,
5. ponowne wejście,
6. trwałość/historia,
7. poprawny publiczny LIVE.

Dodatkowo przy odbiorze wizualnym Work ma utrzymywać widoczny układ: plansza 08 obok aktualnego ekranu roboczego/LIVE. Sam opis zgodności nie wystarcza.

## 7. PO PASS 08 — NIE CZEKAĆ
Po PASS AKTYWNOŚCI 08 Work nie kończy zadania i nie czeka na Tomasza. Natychmiast przechodzi do następnego krytycznego ekranu/zależności z finalnego pakietu 9 ekranów, zgodnie z aktualnym stanem repo i potrzebą biznesową.

Kierunek: cały 9-ekranowy CRM sprzedażowy, nie jedna plansza dziennie.

## 8. KIERUNEK AGENT API
Agent API pozostaje kolejną warstwą systemu, nie osobnym projektem i nie blockerem rdzenia. Docelowo jeden Asystent mCRM ma działać na jawnych narzędziach/funkcjach i kontekście Klient/Deal/next action/termin/blocker.

Najpierw stabilny CRM i kontrolowana warstwa narzędzi. Potem Agent API V1: podsumowanie sprawy, braki/ryzyka, następny krok, robocza wiadomość. Bez bezpośredniego, niekontrolowanego manipulowania bazą.

## 9. WIDOCZNY POSTĘP
Work ma stale pokazywać:
`ETAP / TERAZ ROBIĘ / WYNIK / NASTĘPNY KROK / GOTOWOŚĆ CAŁEGO CRM`.

Przy UX dodatkowo: zatwierdzony wzorzec vs aktualny ekran.

Brak podglądu po jawnej prośbie Tomasza = błąd wykonania, nie temat do kolejnego dokumentu.

## 10. ZASADA UCZENIA Z BŁĘDÓW
Jeżeli ten sam problem pojawia się drugi raz, nie dopisujemy wyłącznie kolejnej notatki. Trzeba wskazać warstwę, która zawiodła (rola / instrukcja repo / stan / dostęp / deploy / odbiór), poprawić ją w trwałym miejscu i wykazać zmianę w działaniu.

Dokumentacja jest użyteczna tylko wtedy, gdy wpływa na zachowanie wykonawcy. Root `AGENTS.md` i ten plik są po to, aby kolejne okno nie odkrywało od zera tych samych zasad.

## 11. CZEGO NIE WOLNO RAPORTOWAĆ JAKO POSTĘP
Nie nazywać postępem:
- samego planu,
- dopisania dokumentu,
- samego commita bez skutku na LIVE,
- samego CI,
- samego znalezienia blockera,
- samego raportu Worka.

Postęp biznesowy = mierzalnie więcej działającego CRM na LIVE albo usunięty realny blocker umożliwiający dalsze wdrożenie.

## 12. BIEŻĄCY NASTĘPNY KROK
Naprawić publikację Hostinger bez ręcznego logowania GitHub przez Tomasza, opublikować aktualny `main`, pokazać plansza 08 vs LIVE, wykonać pełny test trwałości i dopiero wtedy uznać PASS 08. Następnie kontynuować kolejne ekrany bez czekania na ręczne „dalej”.
