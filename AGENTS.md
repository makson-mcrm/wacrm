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