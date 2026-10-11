# BLOKADA KOSZTÓW 11.10.2026 — STAN AKTUALNY

**STOP NOWYCH PŁATNYCH WYWOŁAŃ NOUS.** Ostatni odczyt Hermesa: globalnie 1,32/5,00 USD, KM1 0,87/0,50 USD (limit KM1 PRZEKROCZONY), Codex 5h 79%, tydzień 97%. Nie uruchamiać płatnej sesji, podzadania, automatycznego przeglądu ani cyklicznego raportu przez Nous. Nie doładowywać. Dotychczasowy test `km1_guard.py` NIE zabezpiecza rzeczywistej ścieżki wywołania płatnego modelu; brak technicznego odcięcia = STOP, nawet jeśli starsze sekcje instrukcji pozwalają kontynuować. Raporty i harmonogramy z płatnym modelem należy wyłączyć u źródła, zachowując bezpłatny watchdog Windows. Wznowienie wyłącznie po weryfikacji mechanicznej blokady wywołań, świeżych limitach i nowej decyzji właściciela.

Prace programistyczne mogą odbywać się jedynie przez **abonamentowy Codex CLI bez pośredniczącej płatnej sesji Hermesa**, pod warunkiem że nie używają prawdziwych danych klientów i nie ponoszą innych dodatkowych opłat. Kompilacja/testy w repo nie są odbiorem LIVE. Nie zakładać, że ta instrukcja sama zatrzymuje uruchomiony lokalny proces lub zmienia ustawienia dostawcy modelu — potrzebna rzeczywista konfiguracja środowiska Windows.

---
 
# JEDYNE ŹRÓDŁO KOLEJNOŚCI — CHECKLISTA V2 — 11.10.2026

**AKTUALNA, ZATWIERDZONA PRZEZ TOMASZA ZASADA WYKONANIA — WYPRZEDZA WSZYSTKIE SPRZECZNE HISTORYCZNE POLECENIA PONIŻEJ.** 
JEDYNA KOLEJKA: Google Docs [„01 — CHECKLISTA WDROŻENIA mCRM AI — 8 KAMIENI — WERSJA 2 — 11.10.2026”](https://docs.google.com/document/d/1QgRBCDwweZsZM21H55VNjvRw3L1zoAJHr2qO5YU7cMc/edit). Statusy z tego dokumentu są źródłem prawdy; NIE tworzyć równoległych planów, ticketów bez ID `KMx.y` ani autonomicznej kolejki L0→L4 poza KM1→KM8. Nie zmieniać numeracji. Obowiązuje aktualne polecenie Tomasza z 11.10.

**AKTUALNY STAN W CHECKLIŚCIE: KM1 = W TOKU.** Pierwszy NIEZAMKNIĘTY checkbox KM1.1: „L0/L1 przenieść z cache do trwałego katalogu”. Wykonuje **Hermes jako jedyny kierownik wykonawczy** na istniejącym Windows, bez kuriera: chronić pliki w `cache/scratch/mcrm-l0`, stworzyć trwały katalog i niezależną kopię + lokalny punkt powrotu; zachować wyniki 19/19, 1093 testów, typecheck, listę zmian; nie powtarzać wykonanych paczek i nie wypychać jeszcze AI na produkcyjny `main`. Odbierać status checkboxów tylko z dowodem; aktualizować **tę samą checklistę**, nie drugi plik.

**KM1 — MECHANICZNY NADZÓR AWARII I KOSZTÓW (11.10.2026):** Ostatnio zaobserwowano w lokalnym Hermesie „Result unavailable / The connection dropped” przy tworzeniu `km1_guard.py`, przerwaną odpowiedź i test z błędnym oczekiwaniem (użycie 0,12 USD z limitu 0,50 USD to NIE 80%). Status: test nie jest PASS; trwała kopia L0/L1 jeszcze niepotwierdzona. Ostatni na ekranie odczyt: saldo Nous 9,07 USD, czyli łączny spadek 0,50 USD od salda 9,57 USD, a w nowej serii KM1 0,05 z limitu dodatkowych 0,50 USD. Dane te są HISTORYCZNE — następna paczka wymaga aktualnego odczytu.

Priorytet zerokosztowy w aktywnym KM1: Hermes deleguje do abonamentowego Codexa **odrębny lokalny, bezpłatny monitor awarii na Windows**, uruchamiany przez Harmonogram zadań niezależnie od działającego procesu Hermesa i płatnego modelu. Monitor ma używać lokalnego heartbeat/znaczników postępu i dostępnego kanału Telegram: jeden komunikat o utracie heartbeat >30 min, awarii, niemożności wznowienia albo przekroczeniu limitu; ponowne wysyłanie alarmu najwyżej raz na zmianę stanu (bez pętli). Cisza 22:00–08:00; awarie nocne buforować do 08:15, blokady kosztowe obowiązują od razu. Monitor musi zostać przetestowany na sztucznej awarii i sztucznym przekroczeniu limitu, **bez płatnych wywołań**; potwierdź, że faktycznie wysłał testowe powiadomienie Telegram i że harmonogram uruchamia go również gdy Hermes został zamknięty. Jeśli brak poprawnego dostępu Telegram, oznacz BLOKER i zabezpiecz stan — nie udawaj, że alarmy działają. Monitor niezależny od procesu Hermesa nie zadziała przy wyłączonym lub odłączonym od sieci komputerze; nie obiecuj całodobowej niezawodności bez niezależnego serwera.

Nie ponawiać ślepo przyciskiem Retry przerwanej płatnej odpowiedzi: najpierw odczyt checkpointu, aktywnych procesów Codexa, kosztu i stanu zapisanych plików, by uniknąć podwójnego zlecenia. Po dwóch przerwaniach transmisji STOP nowych płatnych prób, lokalna diagnostyka i przełączenie na bezpłatny kanał. **Mechaniczna blokada wydatków ma działać na ścieżce faktycznego wywołania modelu; test samej funkcji pomocniczej nie dowodzi ochrony, jeżeli inne wywołania ją omijają.** Brak niezależnego dowodu przechwycenia wywołań = STOP nowych płatnych zadań. Nie dodawać nowej listy KM — to kontrola bezpieczeństwa istniejącego KM1.

**PRZED KAŻDĄ PACZKĄ:** `KM1 / KM1.1 (lub kolejny rzeczywiście otwarty punkt) / koszt planowany i pozostały / wynik mierzalny / warunek zamknięcia`. Metoda Matt Pocock: źródła → krótka specyfikacja → małe zadanie z ID KMx.y → abonamentowy Codex → testy → niezależny przegląd Hermesa → checkpoint → następny punkt, tylko wewnątrz aktywnego KM. KM2 nie otwierać przed zamknięciem KM1.

**BUDŻET MECHANICZNY** od 10.10: Nous 5,00 USD łącznie, historycznie zużyto 0,45 USD (pozostało 4,55 USD; saldo ostatnio 9,12 USD wg Hermesa), bez resetu. Przed/po paczce świeże saldo i limity Codex 5h/tydzień; brak świeżego odczytu STOP nowych płatnych zadań. Próg przekroczenia planu paczki o 50% = STOP + raport; trzy nieskuteczne próby = zmiana metody, bez kolejnych wydatków. Nous po 3 USD ostrzeżenie, po 4 USD praca niezbędna, przy 5 USD bezwzględny STOP. ZERO dokupowania kredytów; Codex tylko abonament ChatGPT Plus, ZERO płatnego Codex API. Watchdog tylko pasywny i bezpłatny, raporty Telegram po polsku z ciszą 22–08.

**RÓWNOLEGŁY PRIORYTET W RAMACH KM1, A NIE NOWY KAMIEŃ:** umożliwić Tomaszowi od razu rejestrację PRAWDZIWYCH telefonów/rozmów/rezultatu/następnego kroku/terminu/Kontaktu/Deala na istniejącym mCRM bez AI. Istnieją `/quick-call`, `src/components/sales/activity-board-08.tsx`, schemat `sales_activities` (ma `call_result`, `next_action`, `next_action_date`, `source`, `contact_id`, `deal_id`); zgodnie z odczytem struktury nie budować od zera. Weryfikować bez ryzyka dla danych rzeczywistych i bez fikcyjnych wpisów na produkcji. **DANE RZECZYWISTE W NORMALNYM CRM SĄ DOZWOLONE. DANE RZECZYWISTE DO AI CHMUROWEGO ZAKAZANE AŻ DO KM3, A POTEM TYLKO LOKALNIE.**

**KM7 i KM8:** wynik testów/Codexa/Hermesa nie zastępuje biznesowego odbioru; wyłącznie Tomasz nadaje „ODEBRANE” po osobistym sprawdzeniu kompletnego LIVE/ekosystemu. Dla KM8 obowiązuje wyłącznie właściwa aktualna wersja `04 — ROLE AGENTÓW — v1.4 — OBOWIĄZUJE` i istniejące MASTER-y, bez tworzenia pustych ról ani kopiowania KPI przez Tomasza. Jeżeli wersja v1.4 nie jest dostępna, zgłosić jako brak źródła dla KM8 dopiero gdy KM8 stanie się aktywne; nie podmieniać automatycznie na v1.3.

**To nie jest zgoda na samoczynne odpalenie lokalnego procesu Windows, nieudowodnione wdrożenie Hostinger ani zmianę produkcyjnego Supabase.** Przy faktycznym dostępie wykonawczym Hermes podejmuje czynności bez Tomasza. Stare priorytety i formaty raportów niżej zachować wyłącznie, jeśli nie kolidują z Checklista V2.

---

# DECYZJA WŁAŚCICIELA 11.10.2026 — DOKOŃCZYĆ KOLEJNE ETAPY WYŁĄCZNIE ABONAMENTOWYM CODEXEM

**NAJNOWSZA DECYZJA NADRZĘDNA WOBEC WCZEŚNIEJSZEGO „STOP PO L1”.** Tomasz polecił kontynuować prace aż do możliwego zakończenia L2–L4, ale wyłącznie przez małe paczki abonamentowego Codexa i bez niekontrolowanych kosztów. Hermes pozostaje jedynym lokalnym kierownikiem wykonawczym. Nie angażuj Tomasza w kodowanie, testy, logi, przenoszenie komend ani obsługę GitHub/Hostinger. Nie traktuj zmiany tego pliku jako samoczynnego uruchomienia Hermesa.

**FAKTY DO ODBIORU Z LOKALNEGO HERMESA:**
- Hermes zgłosił L0 PASS: `src/lib/ai/gateway/`, 19/19 testów, typecheck PASS, poprawione 2 luki (SYNTHETIC tylko w testach; sanityzacja błędów).
- Hermes zgłosił L1 PASS: `guard.ts`, `browser-stt-policy.ts`, ochrona generate/embeddings/transcribe/voice-textarea i MCP; 1093 testy PASS, typecheck PASS, negatywny test `AI_ROUTE_DENIED` i 0 `fetch`.
- Hermes zgłosił koszt Nous **9,57→9,20 USD**, tj. **0,37 USD** od startu limitu 5 USD; ostatni raportowany Codex 5h **81%→61%**, tygodniowy **96%→92%**. To historyczne wartości na koniec L1, przed każdą następną paczką odczytaj świeże.
- **11.10 odczyt GitHub:** aktualny `main` zawiera wyłącznie zmiany instrukcji, nie zawiera `src/lib/ai/gateway/` ani `src/lib/ai/guard.ts`. Dlatego PASS z komunikatu Hermesa wymaga odbioru rzeczywistych plików w izolowanej kopii, bez odtwarzania kodu od zera. Nie publikuj niesprawdzonego kodu produkcyjnie.
- Zapowiedziany lokalny dokument: `C:\Users\HP\Documents\L2-L4-I-MIGRACJA-MAC-MINI-PRZYGOTOWANIE-2026-10-11.md`; sprawdź go sam i zachowaj. Nie zmuszaj Tomasza do przenoszenia pliku.
- Wstępny PASS raportowany przez Hermesa nie zastępuje niezależnego testu kodu i ścieżek omijających bramkę. Nie przerabiaj L0/L1 od zera.

**NASTĘPNY JEDEN RZECZYWISTY KROK:** Hermes sprawdza stan procesu lokalnego i rzeczywiste pliki L0/L1; po niezależnym potwierdzeniu L0/L1 oraz pasywnym odczycie aktualnych limitów zleca Codexowi w `workspace-write` jedną małą paczkę **L1b — egzekucja polityki po stronie konsumenta MCP** na sztucznych danych, bez żadnych wywołań chmurowego AI z treściami klientów. Następnie niezależne testy i odbiór. Po PASS idź małymi, zależnymi paczkami przez przygotowania L2/L3/L4 i kod możliwy do przetestowania offline, bez produkcji. Ściśle metoda Matt Pocock (/grill-with-docs→/to-spec→/to-tickets→/implement→/code-review), pojedyncza paczka, maksimum trzy próby jednego błędu. W pierwszej kolejności nie powtarzaj gotowych prac ani testu hello.

**TWARDY BEZPIECZNIK:** Dotychczasowy limit Nous 5,00 USD **ŁĄCZNIE od startu zlecenia** pozostaje, nie odnowić licznika; na koniec L1 zużyto 0,37 USD. >=3 USD ostrzeżenie; >=4 USD tylko domknięcie niezbędnej paczki; >=5 USD STOP płatnego Nous, bez obejścia przez innego dostawcę. Nie uruchamiać nowego płatnego API, żadnego Codex API. Codex tylko w istniejącym abonamencie ChatGPT Plus. Minimalizować wywołania Nous do niezbędnego sterowania; wszystkie kodowanie i testy powierzaj Codexowi. Przed/po każdej paczce: świeże Nous, Codex 5h, tydzień, liczniki i resety; brak odczytu = bez płatnych paczek. Wyczerpanie limitu Codexa = zapis stanu, bezpłatne czynności i czekanie na odpowiedni reset, bez kupowania API. Szanuj ciszę Telegram 22:00–08:00, raporty jedynie 08:15/16:15 i środowy finał.

**GRANICA BEZPIECZEŃSTWA:** Brak Mac mini do środy 14.10 oznacza, że **nie wolno zadeklarować PASS połączenia Hostinger→Mac ani rzeczywistego E2E lokalnego L2/L4**. Można przygotować izolowaną konfigurację, testy z imitacją Maca, kopię migracyjną i instrukcję bez produkcyjnych sekretów, ale pozostałe bramki pozostają NIE PASS aż do realnego odbioru po dostawie i izolacji Maca. Żadnych rzeczywistych danych klientów, żadnych destrukcyjnych migracji Supabase, żadnego automatycznego LIVE, 00S, Deala i Banków.

**STOP** tylko na realnej nieprzekraczalnej blokadzie, progu budżetowym, ryzyku danych albo wymaganej niedelegowalnej decyzji; nie zatrzymuj wykonania tylko dlatego, że historyczna instrukcja mówiła STOP po L1. Jeśli jakiegoś etapu nie da się wykonać bez Maca, oznacz co przygotowano, zabezpiecz punkt kontrolny i czekaj do realnej możliwości testu. W środę raport: faktyczne PASS/NIE PASS, dowody, koszt łączny, limity, co przygotowano dla Maca i pierwszy krok po uruchomieniu. Nie przedstawiaj planu ani samego dokumentu jako wykonanej aplikacji.

---

# KM1 — NAJPIERW DOWÓD HERMES → CODEX → WERYFIKACJA → KOSZT (decyzja 10.10.2026)

**TA BRAMKA MA PIERWSZEŃSTWO PRZED L0 I PRZED KAŻDYM WIĘKSZYM KODOWANIEM.** Właściciel jednoznacznie nakazał: najpierw udowodniona samodzielna praca Hermesa z abonamentowym Codexem i rzeczywiste rozliczenie kosztów; potem mała bramka LOCAL-FIRST na danych sztucznych; dopiero po dalszym PASS — 00S → Deal → Banki.

**Dowód historyczny (09.10; nie uruchamiaj ponownie `hello.py`):**
- Hermes rzeczywiście zlecił Codex CLI 0.159.3, zalogowanemu abonamentem ChatGPT, wykonanie syntetycznych `hello.py` i `test_hello.py` w `workspace-write`, w izolowanym katalogu `C:\Users\HP\AppData\Local\hermes\cache\scratch\hermes-codex-test\`.
- Codex oddał pliki; nie mógł sam uruchomić Pythona z powodu odmowy uprawnień, a Hermes **osobno** uruchomił `python hello.py` i `pytest`; raportowano `HERMES-CODEX OK` i test PASS. To dowodzi wcześniejszej realnej delegacji i odbioru, nie stałej dostępności Codexa dziś.
- Koszt tamtego przebiegu według historycznego raportu: **Nous 3,52 → 3,49 USD**, tj. spadek salda o **0,03 USD** (koszt obsługi Hermesa, nie opłata za Codex API); **Codex 5h 100%→100% dostępności i tydzień 100%→100%** w zaokrąglonym odczycie; historyczny licznik Codexa **14 054 tokenów**. NIE twierdzić, że Codex zużył dokładnie 0 zasobów; odczyt procentowy jest zaokrąglony. Wartości historyczne NIE zastępują świeżego odczytu.

**KM1 — PASS PROCESOWY zatwierdzony przez właściciela 10.10.2026 na podstawie dowodów historycznych.** Nie powtarzaj ani `hello.py`, ani dodatkowego testu „czy Hermes umie wywołać Codexa”. Dowody: oryginalne zlecenie Hermes→Codex 09.10 na sztucznych `hello.py`/`test_hello.py`, samodzielny test i odbiór przez Hermesa; dodatkowo 10.10 Hermes zlecił Codexowi dwie małe poprawki mCRM i niezależny przegląd, a ich wyniki zostały przedstawione właścicielowi. To potwierdza przebieg przekazywania i odbioru, ale nie dowodzi, że proces Codexa jest w tej chwili aktywny. Zachowaj istniejące artefakty i historię, bez nowego audytu.

**KOSZT HISTORYCZNY KM1 (09.10):** saldo Nous 3,52→3,49 USD, ubytek 0,03 USD; Codex użyty z abonamentu ChatGPT, nie z oddzielnego płatnego API. Historyczny wskaźnik procentowy Codexa zaokrąglony; nie odczytywać z niego dokładnego kosztu ani dzisiejszego limitu. **Brak świeżego odczytu ≠ brak kosztu.**

**WŁAŚCICIEL JAWNIE ZATWIERDZIŁ 10.10 PRZEJŚCIE DO JEDNEJ MAŁEJ PACZKI L0, BEZ DALSZYCH PYTAŃ, jeśli KM1 uznano za PASS.** Hermes jest jedynym kierownikiem wykonawczym i teraz:
1. Nie używając płatnego modelu, pasywnie sprawdza aktualne saldo Nous, limity Codex 5h/tydzień i reset istniejącym `scripts/limits_report.py`, zapisując PRZED. Kontroluje, czy zapas wystarczy na jedną paczkę L0 + testy + niezależny odbiór. Nie wpisuje fikcyjnej kwoty 0.
2. Wyłącznie jeśli limity są wystarczające, daje abonamentowemu Codexowi **jedno małe L0** określone poniżej, `workspace-write`, syntetyczne dane, izolowany katalog, brak sieci modeli i brak `danger-full-access`. Koszt nowych płatnych połączeń Nous ma być 0; jeśli wymagałby dodatniego kosztu, STOP bez nowej zgody właściciela.
3. Hermes sam uruchamia testy z fałszywym adapterem, robi niezależny przegląd, zachowuje dowody; odczytuje aktualne saldo i limity PO, podaje realne różnice i czasy; pokazuje identyfikator pracy i pliki.
4. **STOP BEZWZGLĘDNY po L0**, niezależnie od wyniku; raport na Telegram po polsku: `L0 PASS/NIE PASS | testy/dowód | saldo Nous PRZED→PO | Codex 5h i tydzień PRZED→PO | propozycja L1`. Nie wykonuje L1, 00S, Deala, Banków ani kolejnej płatnej paczki bez kolejnego jawnego PASS właściciela. Jeżeli limity/narzędzia niedostępne, zgłasza jedną rzeczywistą blokadę; nie deleguje diagnostyki Tomaszowi.

**To jednorazowe upoważnienie obejmuje WYŁĄCZNIE L0; zakaz produkcyjnych zmian LIVE, danych klientów i rozszerzania zakresu.** Dopóki nie będzie zweryfikowanego lokalnego wykonawcy AI, nie uruchamiać funkcji AI na realnych danych.

KM1 ma historyczny PASS właściciela, a L0 jest odrębnie i wyłącznie jednorazowo zatwierdzone z bramką świeżych limitów. **Aktualizacja tego pliku nie uruchamia zdalnie sesji Windows Hermesa.** Hermes ma wykonać L0 po odczytaniu instrukcji w swojej czynnej sesji. Meldunek: istniejący Telegram, po polsku, jednorazowo.

---

# P0 — FUNDAMENT LOCAL-FIRST — ZAMROŻENIE KOLEJKI UX (decyzja Tomasza 10.10.2026)

**TA SEKCJA JEST NADRZĘDNA WOBEC STARSZEJ PĘTLI WYKONAWCZEJ UX PONIŻEJ.** Obowiązuje do formalnego PASS bezpieczeństwa lokalnego AI. Nie znosi zatwierdzonej grafiki 00S/FINAL-PASS; tylko odracza kodowanie/publikację docelowych ekranów na starej architekturze AI.

## Jedyny kierownik wykonawczy i jedno aktywne zadanie
- **Hermes jest JEDYNYM kierownikiem wykonawczym mCRM.** Zleca kod abonamentowemu Codexowi, zarządza kolejką, sam uruchamia testy i niezależnie odbiera. ChatGPT pełni rolę nadrzędnego nadzoru i wsparcia dokumentacyjnego, nie drugi równoległy wykonawca. Tomasz: właściciel, nie programista, tester, kurier komend, operator Git/Hostinger.
- Po weryfikacji **KM1 PASS** jedyny następny bilet to **L0 — polityka bramki AI, na danych sztucznych, bez sieci i produkcji**. STOP: 00S, Deal, Banki, rozwój UX, integracje modeli zewnętrznych, publikacja dzisiejszych paczek bezpieczeństwa do czasu rozstrzygnięcia zgodności LOCAL-FIRST. Nie podejmuj nowych projektów.
- Dwa lokalne pakiety Codexa z 10.10 mają pozostać zachowane; według dzisiejszego raportu końcowa paczka leży w `C:\Users\HP\Documents\ODBIOR-BEZPIECZENSTWA-FINAL-2026-10-10\`. Nie zakładaj, że są już w GitHub; zweryfikuj dopiero w osobnym zadaniu.
- **Brak pełnej izolacji środowiska lokalnego oznacza: ZERO rzeczywistych danych klientów w modelach lub testach.** Przed programowaniem tylko sprawdzenie kopii repo i pasywnych limitów. Nie wykonuj żadnych niezatwierdzonych operacji w produkcji.

## Metoda Matt Pocock — wykonaj, nie odtwarzaj projektu
Z istniejących MASTER, FINAL-PASS i niniejszego AGENTS.md wykonaj sekwencję:
1. `/setup-matt-pocock-skills`: sprawdź czy rzeczywiście są bezpieczne/zainstalowane (nie instaluj w ciemno).
2. `/grill-with-docs`: tylko przeczytaj istniejące źródła, bez nowego wywiadu z Tomaszem.
3. `/to-spec`: krótka RÓŻNICA obecny kod → lokalna bramka; jasna klasyfikacja danych i granice narzędzi.
4. `/to-tickets`: wyłącznie małe zależne zadania, jedno aktywne.
5. `/implement`: Codex w `workspace-write`, na danych syntetycznych, bez `danger-full-access`, bez płatnego Nous bez zgody.
6. `/code-review`: niezależny odbiór z testami i dowodem, a nie tylko raport wykonawcy.
Kodowanie dopiero po zakresie i odczycie faktycznych limitów Codexa; nie przepalaj budżetu na nieskończone ponowienia. Tylko `main` jest gałęzią wdrożeniową; L0 opracuj w izolowanej kopii roboczej, nie wysyłaj bezpośrednio na LIVE.

## Kontrakt architektury LOCAL-FIRST
- **Dane osobowe klientów, rozmowy, kredyty, dokumenty finansowe, poufna wiedza bankowa** -> wyłącznie kontrolowana, rzeczywiście lokalna bramka AI na odizolowanym Mac mini. **Brak lokalnego modelu/połączenia = AI ODMAWIA; nigdy nie przełącza do OpenAI, Claude, Gemini, DeepSeek, Nous ani żadnego innego modelu chmurowego.**
- Chmura AI wyłącznie dla treści publicznych lub **udowodnionej** skutecznej anonimizacji z jawnym dopuszczeniem; sama etykieta „anonimowe”, ukrycie nazwiska lub fikcyjny identyfikator nie stanowi dowodu. `UNKNOWN` blokuj.
- Zwykły mCRM (Kontakt, Deal, statusy banków, następne działanie, zapis) ma działać bez lokalnego AI. Obecna Supabase przechowuje prawdziwe dane i NIE jest migrowana w L0.
- Kontrola obowiązuje nie tylko w API AI, ale też w **Hermes/MCP, wynikach narzędzi, indeksowaniu dokumentów, dyktowaniu, automatycznych odpowiedziach, logach, kopiach i integracjach**. Żaden wynik narzędzia zawierający dane klienta nie może zasilić chmurowego modelu Hermesa.
- Najistotniejsze obecne ścieżki: `src/lib/ai/generate.ts` → `providers/openai.ts` i `anthropic.ts`; `src/lib/ai/embeddings.ts` → OpenAI; `src/app/api/ai/transcribe/route.ts` → OpenAI Whisper; `src/components/ui/voice-textarea.tsx` → przeglądarkowe rozpoznawanie mowy o niegwarantowanej lokalności. `deal-analysis`, `deal-assistant`, `draft`, `auto-reply`, `playground` mogą zbudować kontekst klienta. Przeglądarka w trybie SpeechRecognition nie jest automatycznie lokalnym STT.
- **Odczyt w dniu 10.10:** w Supabase `ai_configs=0` (0 aktywnych, 0 kluczy), `ai_usage_log=0`, `deal_ai_analyses=0`; to stan konfiguracji, nie dowód ochrony kodu. Produkcyjne rekordy klientów/firm/deali istnieją. Nie odczytuj ich do chmurowego agenta.

## L0 — PIERWSZA MAŁA PACZKA, TYLKO DANE SZTUCZNE
Cel: utworzyć centralny, niezależny od sieci mechanizm decyzji AI i testowy lokalny adapter (mock). Zakres: `src/lib/ai/gateway/` — klasyfikacja `CLIENT_PERSONAL | BANK_CONFIDENTIAL | PUBLIC | VERIFIED_ANONYMIZED | SYNTHETIC | UNKNOWN`, jawne decyzje `LOCAL_ONLY | EXPLICIT_CLOUD_ALLOWED | DENY`, fałszywy lokalny wykonawca i `*.test.ts`. Nie łączyć z żywym Maciem ani z Supabase. Zakaz prawdziwych loginów/kluczy/danych.

Warunki PASS L0 (automatyczne, bez udziału Tomasza):
- klient->mock-local: PASS; klient->cloud: DENY; poufne bankowe->cloud: DENY; UNKNOWN->cloud: DENY;
- mock-local niedostępny -> `LOCAL_AI_UNAVAILABLE`, 0 zapasowych połączeń do chmury;
- PUBLIC/VERIFIED_ANONYMIZED -> chmura tylko po osobnej, jawnej regule; SYNTHETIC tylko w testach;
- wszystkie wyjściowe próby modelowe liczone przez mock; test negatywny 0 wysyłek poza dozwoloną trasę;
- logi błędów nie zawierają treści klienta, tokenów ani tajnych danych;
- 0 zapisu / modyfikacji produkcyjnej bazy i 0 zmian publicznego LIVE.
Po testach: niezależny przegląd Codexa, ścisły dowód, koszty i STOP. **PASS L0 nie jest jeszcze PASS całego LOCAL-FIRST** i nie odblokowuje UX.

Następna kolejka, aktywowana osobno po PASS poprzedniego kroku:
**L1:** wpiąć politykę we wszystkie obecne wyjścia AI/embeddings/dyktowanie/auto-reply oraz MCP, fail-closed i regresja zwykłego CRM;
**L2:** po dostarczeniu Mac mini Intel i zweryfikowanej izolacji uruchomić bezpieczny szyfrowany i uwierzytelniany kanał Hostinger→Mac, bez publicznego portu Mac;
**L3:** objąć kontrolą poufne pliki, logi, integracje, kopie i dane wiedzy;
**L4:** fikcyjny Deal → lokalna analiza → zapis → wyjście → odczyt → trwałość, test Mac offline i dowód ZERO chmurowych wywołań.
Dopiero po **formalnym PASS L0–L4** i odpowiedniej zgodzie wrócić do zamrożonych `00S → Deal → Banki`, bez projektowania od nowa.

Meldunek do Tomasza WYŁĄCZNIE po rzeczywistym wyniku, po polsku, maks. 5 linii: `L0 PASS/NIE PASS | dowód | koszt | blocker | następne`. Nie zlecaj mu terminala, haseł, Git, testów, przenoszenia dokumentów ani roli kuriera.

---

# mCRM AI — TRYB WYKONAWCZY UX 2.3 (obowiązuje od 05.10.2026)

## 0. ŹRÓDŁO PRAWDY
1. „03 — MAPA UX 2.3 — mCRM AI + SUPERAGENT HERMES + EKOSYSTEM TOMASZA — WERSJA WYKONAWCZA — 05.10.2026” — dokument obowiązujący.
2. „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026” — baza wizualna.
3. Zatwierdzone plansze i numerowane wzorce (np. 00A — SHELL desktop).
4. Decyzje Tomasza — jedyny właściciel decyzji UX.
Kod i stan wykonawczy: GitHub `main` + aktualny `GLOWNY_STAN_WDROZENIA.md`.
Działanie: wyłącznie publiczny LIVE Hostinger. Dane: aktualny Supabase.
Nie projektować UX od nowa. Nie ufać nazwie commita jako dowodowi zgodności.

## 1. PĘTLA WYKONAWCZA — JEDEN NUMER NARAZ
JEDEN NUMER WZORCA → WZORZEC ↔ LIVE → LIMITY → ZGODA TOMASZA → MAŁA PACZKA → LIVE → PORÓWNANIE → PASS/NIE PASS.
W jednym przebiegu realizowany jest dokładnie jeden numer wzorca. Numer zamknięty = odebrany cząstkowo. Nie otwierać kolejnego numeru przed zamknięciem poprzedniego. Jeśli numer zostaje zatrzymany przez STOP, limit, decyzję Tomasza lub blocker techniczny, zapisz dokładny stan i później wznów od tego miejsca bez ponownego audytu.

## 2. BRAMKA PRZED KODEM — WZORZEC ↔ PUBLICZNY LIVE
Przed jakąkolwiek zmianą kodu obowiązkowo:
- WZORZEC ↔ PUBLICZNY LIVE: ten sam typ urządzenia i porównywalna rozdzielczość, podpis obejmujący numer wzorca, urządzenie, źródło planszy oraz datę i godzinę zrzutu LIVE,
- limity: Codex 5h przed, Codex tydzień przed, Nous przed,
- przewidywane zużycie paczki.
Brak tej bramki = brak zgody = brak kodu.

## 3. ZAKAZ INTERPRETACJI UX
Nie wybierać planszy, nie tworzyć własnego wzorca, nie „dopasowywać” dokumentów ani nie rozstrzygać sporów źródeł samodzielnie.
Brak jednoznacznego wzorca: STOP — BRAK WZORCA / DECYZJA WYMAGANA OD TOMASZA.

## 4. STOP, GDY WYMAGANA JEST ZGODA TOMASZA
Jeżeli wymagana jest zgoda właściciela (kod, paczka, wybór wzorca, płatna praca), raport kończy się STOP i oczekiwaniem na decyzję. Zakaz przechodzenia dalej bez tej zgody.

## 5. LIMITY I BUDŻET — BRAMKA BEZWZGLĘDNA
- Brak aktualnych danych o limitach i budżecie: STOP — ZAKAZ NOWEJ PŁATNEJ PRACY.
- Nie uruchamiać Codexa wyłącznie po to, aby odczytać limit; najpierw odczyt pasywny. Brak pasywnego odczytu raportować jako BRAK ŚWIEŻEGO ODCZYTU — nie zgadywać.
- **NOUS — źródłem prawdy jest świeży odczyt rzeczywistego salda konta.** Zakaz opierania decyzji na historycznym, ręcznie wpisanym budżecie. Odczyt automatyczny: `GET https://portal.nousresearch.com/api/oauth/account` tokenem z `auth.json` (`providers.nous`) → pole **`paid_service_access.total_usable_credits`** (obok `purchased_credits_remaining` i `subscription.credits_remaining`). Pole `current.creditsRemaining` z `/api/billing/subscription` to wyłącznie kredyty subskrypcji i NIE jest saldem konta — nie używać go do decyzji.
- Saldo odczytywać przed każdą płatną paczką i po niej; raportować rzeczywistą zmianę (PRZED → PO), nie szacunek. Pole `current.creditsRemaining` z `/api/billing/subscription` NIE jest saldem konta.
- Progi ochronne salda Nous: **≤ 2 USD → OSTRZEŻENIE**, **≤ 1 USD → STOP** (zakaz nowej płatnej pracy), **poniżej 1 USD tylko po jawnej decyzji Tomasza**.
- Tomasz nie sprawdza portalu ręcznie i nie przepisuje salda. Odczyt realizuje skrypt nadzorczy: `scripts/limits_report.py`.
- Codex uruchamiany wyłącznie po jawnej zgodzie Tomasza.

## 6. PASS
PASS jest binarny: PASS / NIE PASS.
Build, commit i testy automatyczne nie są PASS.
Formalny PASS wizualny zatwierdza wyłącznie Tomasz po obejrzeniu WZORZEC ↔ LIVE. Ocena wykonawcy („MOJA OCENA: ZGODNE / NIEZGODNE”) nie zastępuje PASS.
3-FAIL RULE: po trzech kolejnych NIE PASS tego samego numeru STOP i analiza przyczyny przed dalszą pracą.

## 7. MAŁA PACZKA
Tylko zatwierdzony numer, tylko wskazane pliki, bez innych ekranów, bez nowych funkcji, bez własnego UX, bez szerokiego refaktoru.
Przed zmianą zapisać `BASE_SHA`. Po zmianie raportować zakres `BASE_SHA..FINAL_SHA` oraz listę zmienionych plików.

## 8. RAPORT PACZKI — OBOWIĄZKOWY FORMAT
START / KONIEC / CZAS / NUMER WZORCA / CODEX 5H PRZED-PO / CODEX TYDZIEŃ PRZED-PO / NOUS PRZED-PO / EFEKT NA PUBLICZNYM LIVE / PASS-NIE PASS-STOP / NASTĘPNY JEDEN KROK.

## 9. LIVE I GAŁĘZIE
LIVE oznacza wyłącznie publiczne środowisko Hostinger.
`main` pozostaje jedyną gałęzią wykonawczą. Bez branchy per ekran.

## 10. DEFINICJA REALNEGO POSTĘPU
Realny postęp = działająca nowa część CRM na publicznym LIVE albo realnie usunięty blocker, który odblokował dalsze wdrożenie.
Nie liczyć jako postępu: planu, audytu, dokumentu, commita, builda, CI ani samego raportu.

## 11. WIDOCZNY PODGLĄD — OBOWIĄZKOWY
Przy pracy nad UX podgląd jest narzędziem pracy, nie dodatkiem.
Utrzymywać widoczny układ: ZATWIERDZONY WZORZEC ↔ AKTUALNY LIVE.
Nie raportować zgodności wizualnej bez pokazania porównania. Brak podglądu przy pracy UX = BŁĄD WYKONANIA.

## 12. ZERO KURIERA
Tomasz nie jest programistą, testerem technicznym, operatorem narzędzi, strażnikiem sesji ani kurierem między systemami.
Agent sam odczytuje stan, korzysta z istniejących konektorów i uprawnień, diagnozuje i wykonuje maksymalną możliwą pracę bez angażowania Tomasza.
Powtórzenie tego samego problemu organizacyjnego = BŁĄD PROCESU do trwałej naprawy.

## 13. DOSTĘPY, HOSTINGER, NOWA INFRASTRUKTURA
Na początku bloku pracy wykonać jeden zbiorczy preflight dostępów. Preferować istniejące konektory/API/CI nad ręcznym logowaniem.
Jeżeli dostęp działa w bieżącej sesji, nie pytać o niego ponownie.
Cloud Browser → auth.hostinger.com / hPanel to ścieżka ZNANA JAKO NIESKUTECZNA. Nie kierować Tomasza do logowania ani Redeploy w Hostingerze przez Cloud Browser. Wracać do metod bezobsługowych: połączenie Hostinger↔GitHub, GitHub Actions/CI, API/konektory, konfiguracja deploy w repo.
Nie tworzyć nowego hostingu, nowej bazy, nowego konta ani równoległego CRM. Nowa ścieżka publikacji tylko gdy używa tego samego `main`, tego samego Supabase, nie wymaga migracji danych, nie tworzy równoległego systemu i realnie skraca drogę do LIVE.

## 14. OGRANICZENIE ZAANGAŻOWANIA TOMASZA
Nie projektować pracy tak, aby Tomasz musiał wracać co kilka minut, klikać po jednym kroku, przenosić komunikaty, pilnować następnego kroku albo pamiętać ustalenia techniczne. Niedelegowalne czynności właścicielskie grupować w jeden pakiet: CO / GDZIE / PO CO / KOLEJNOŚĆ.

## 15. TRYB UCZENIA
Powtarzający się problem: nazwij problem, wskaż warstwę (rola / instrukcja / dostęp / deploy / UX / odbiór / monitoring), popraw trwały mechanizm, sprawdź efekt, dopiero potem kontynuuj.
Poprawka procesu jest wdrożona dopiero gdy znalazła się w aktywnej instrukcji, wykonawca ją stosuje, zachowanie się nie powtarza i istnieje mierzalny skutek.

## 16. AGENT API — KIERUNEK, NIE BLOKER
Docelowo jeden Asystent mCRM w aplikacji. Najpierw stabilny rdzeń sprzedażowy; Agent API nie może blokować oddania podstawowego CRM.

## 17. KOMUNIKACJA Z TOMASZEM
Tomasz otrzymuje wyłącznie informacje użyteczne biznesowo: GOTOWE / NIEGOTOWE / CO DZIAŁA NA LIVE / CO SYSTEM ROBI DALEJ / CZY TOMASZ MUSI COŚ ZROBIĆ.
Nie przerzucać na Tomasza logów, GitHuba, deployu, testów technicznych ani pilnowania następnego kroku.

## 18. DANE RZECZYWISTE I PORZĄDEK PO TESTACH — DECYZJA WŁAŚCICIELA 09.10.2026
- mCRM jest używany przez Tomasza na PRAWDZIWYCH danych klientów, firm, Dealów, aktywności i dokumentów. Nie uznawaj rzeczywistej bazy ani wpisów użytkownika za testowe.
- Kategoryczny zakaz kasowania, zerowania, nadpisywania lub masowej zmiany danych rzeczywistych; zakaz wykonywania testów destrukcyjnych na produkcyjnej bazie.
- Hermes i Codex testują na danych sztucznych w odseparowanym środowisku, bez dopisywania kolejnych fikcyjnych klientów do rzeczywistej kartoteki.
- Dotychczasowe testowe rekordy Hermesa/Codexa trzeba docelowo usunąć z właściwej bazy, ale tylko po jednoznacznej identyfikacji pochodzenia, weryfikacji powiązań i zabezpieczeniu rekordów rzeczywistych. Rekord niepewny = NIE USUWAĆ. Przed jakimkolwiek usuwaniem przygotuj właścicielowi krótkie zestawienie i uzyskaj jego zgodę; nigdy nie kasuj automatycznie.
- Nie obciążaj Tomasza programowaniem, diagnostyką, technicznym testowaniem ani ręcznym sprawdzaniem każdego rekordu.
- Nie wysyłaj prawdziwych danych klientów ani dokumentów finansowych do chmurowych modeli AI, w tym podczas prób, analizy i automatycznego wywoływania agentów. Przy braku lokalnego bezpiecznego przetwarzania wstrzymaj wywołanie.

## 19. HERMES → CODEX, TELEGRAM PO POLSKU I LOCAL-FIRST — 09.10.2026
- Role: ChatGPT = Kierownik Wdrożenia i nadzór; Hermes = wykonawca i zleceniodawca; abonamentowy Codex = programista. Tomasz = właściciel i zatwierdzający wzorzec oraz ważne decyzje, NIE programista i NIE tester. Bez niepotrzebnych pytań ani delegowania diagnostyki na właściciela.
- Kanał Telegram Hermesa jest już skonfigurowany. Raporty/statusy/potwierdzenia dla Tomasza, także te wysyłane przez Telegram, muszą być WYŁĄCZNIE PO POLSKU i maksymalnie krótkie: ZROBIONE / BLOKER / WIDOCZNY EFEKT / NASTĘPNY KROK. Nie wysyłać technicznych logów, angielskich meldunków ani częstych komunikatów bez rzeczywistego postępu.
- Codex: logowanie przez abonament ChatGPT było potwierdzone, CLI 0.159.3; test Hermes→Codex zakończył się 09.10 wynikiem PASS w katalogu testowym (pliki hello.py i test_hello.py). Dalsze zlecenia tylko na kodzie/sztucznych danych i w ograniczonym sandboxie typu workspace-write. Zakaz danger-full-access jako domyślnego trybu. Przed każdą nową paczką świeży odczyt limitu 5h, tygodniowego i salda Nous istniejącym skryptem; odczyt historyczny NIE jest świeżym. Kod zmieniać dopiero po zatwierdzeniu zakresu i zgodnie z bramkami niniejszego AGENTS.md. Rezultat musi być niezależnie weryfikowalny i utrwalony.
- LOCAL-FIRST: dane klientów, dokumenty finansowe, poufne informacje bankowe i powiązane konteksty nie mogą być przekazywane do żadnego modelu chmurowego, w tym podczas programowania, analizy, testów i raportowania. Dla rzeczywistych danych AI wyłącznie zweryfikowany lokalny model przez jeden kontrolowany AI Gateway. Brak gotowego lokalnego przetwarzania = STOP, bez przełączenia awaryjnego do chmury. Obecna implementacja OpenAI/Anthropic nie dowodzi spełnienia tego warunku.
- Rzeczywisty CRM i Supabase nadal istnieją; migracja LOCAL-FIRST nie została wykonana. Nie kasować danych klientów. Dotychczasowe testowe rekordy usunąć dopiero po jednoznacznej identyfikacji i zgodzie Tomasza. Brak pełnego potwierdzenia dostępu Hermesa do Supabase/Hostinger/Gmail/Kalendarza oraz kompletnej integracji WhatsApp nie może być raportowany jako PASS.
- Bezpieczeństwo Hermesa: computer_use wyłączono 09.10 w konfiguracji narzędzi; nie przywracać. Oddzielny roboczy podgląd przeglądarki nie jest sam w sobie dowodem pełnej izolacji środowisk. Nie wchodzić do prywatnego Chrome, bankowości, profilu ani przechowywanych haseł Tomasza.
- Bieżący wzorzec: zatwierdzone 00S/00D + FINAL-PASS. Przed kodem porównanie wzorca z widocznym LIVE, po kodzie niezależny odbiór; żadnego nowego projektowania i żadnego cofania się do zaliczonej AKTYWNOŚCI 08 bez wskazanego błędu.

## 20. OPTYMALIZACJA LIMITÓW I ZADAŃ — OD 09.10.2026
- Kierownik Wdrożenia i Hermes aktywnie zarządzają obciążeniem Nous i abonamentowego Codexa, a nie tylko odczytują liczby na końcu. Harmonogram zadań dostosować do dostępnych zapasów 5h/tygodnia i czasu resetów.
- Przed i po każdej kosztownej paczce używaj istniejącego pasywnego raportu `scripts/limits_report.py` na Windows: rzeczywiste saldo Nous, zapas Codex 5h i tygodniowy oraz resety; zapisuj godzinę i zmianę salda. Raport w razie błędu ≠ 0; bez świeżych danych STOP płatnych zadań.
- Nous <= 2 USD: OSTRZEŻENIE, odroczyć pracę niższego priorytetu; Nous <= 1 USD: STOP płatnej pracy Nous bez nowej zgody właściciela. Zakaz automatycznego dokupowania kredytów i przerzucania na inne płatne API.
- Codex w ramach logowania ChatGPT przeznaczać na programowanie i testy rzeczywistego mCRM; małe zadania z pełnym testem i niezależnym przeglądem muszą zmieścić się w obu oknach limitów. Jeśli nie — wstrzymaj i odłóż na reset zamiast zużyć limit bez wyniku. Limit tygodniowy ma pierwszeństwo nad nowym oknem 5h.
- Tanie modelowanie bez danych poufnych: korzystaj z najmniej kosztownego modelu zapewniającego poprawną jakość oraz już znanej dokumentacji i zwięzłych zleceń. Nie ponawiaj szerokich audytów ani prostych testów Codexa. Dane rzeczywistych klientów nigdy nie trafiają do żadnego modelu chmurowego, niezależnie od kosztu.
- Dzienny polski meldunek na istniejący Telegram: Nous saldo, Codex 5h/tydzień, terminy resetów, rzeczywista wykonana praca i co przełożono. Wysyłaj alarmy tylko gdy potrzebne, bez nadmiaru komunikatów. Tomasz nie sprawdza ręcznie limitów ani nie jest kurierem.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->