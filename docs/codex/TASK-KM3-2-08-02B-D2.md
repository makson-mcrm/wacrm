# KM3.2.08 — LEJEK BIGIN 02B — kontrakt D2 domknięcia

ID: KM3.2.08

Oznaczenie dokumentu: 02B-D2, naprawa kontraktu istniejącej KM3.2.08. Nie jest to nowa paczka. Bieżące polecenie właściciela obejmuje wyłącznie naprawę dokumentu i walidację istniejącym zlecenie_gate.py, bez rejestracji paczki i bez kolejnego Codexa. Opis domknięcia ekranu poniżej zachowuje wymagania istniejącego zlecenia; jego wykonanie nie należy do tego przebiegu.

KAMIEŃ: KM3.2 — odbiór istniejącego Lejka 02B względem prawdziwego Bigin.

CEL: Zweryfikować cały istniejący ekran /pipelines na rzeczywistym TEST LIVE. Po PASS obu istniejących bramek wykonać najwyżej jedną zbiorczą poprawkę wyłącznie potwierdzonych różnic 02B, jeżeli jest potrzebna. Minimum 90% zgodności całego ekranu, 100% funkcji krytycznych, diff ramy <0,5%. Ostateczny PASS wizualny wydaje Tomasz.

BASE_SHA: 0f7317df7d017d1c4d33412e29a4df9eee108583

Podstawa BASE_SHA: ostatni niezależny zapis produkcji, prod-build.json z 10.11.2026 18:05, build 01a1aba4-0a96-73ba-8260-a57704acd0a3, state completed. W przebiegu naprawy porównano ten zapis z prod-build.raw.json: commit, UUID buildu i stan są zgodne, SHA-256 surowej odpowiedzi wynosi 59a8cb60c0b591d42984cb08e4e5a98d9ea01c44eab75399dbb78cb67c6a3237 i zgadza się z zapisanym raw_sha256. BASE_SHA wskazuje produkcję, a nie lokalny HEAD ani źródła TEST. To NIE jest świeży odczyt w tej sesji. Nie wolno uznać BASE_SHA za aktualnie potwierdzony ani rozpocząć kodowania, dopóki istniejąca bramka nie zaakceptuje świeżego, niezależnego stanu produkcji. Nie zmieniać daty starego zapisu.

Lokalny punkt startowy: /Users/mcrm-ai/wacrm-a, detached HEAD 13a273a9ab14c7cee24b4323ddfaa52a639e491c, na początku naprawy istnieją dwa nieśledzone dokumenty: ten kontrakt oraz CODEX-KM3-2-08-02B-REPORT.md; reszta drzewa bez zmian. Nie cofać do produkcyjnego BASE_SHA: zawiera on starszy kod niż istniejący Lejek.

## ZAKRES PLIKÓW

W tym przebiegu wolno zmienić wyłącznie ten kontrakt i dopisać dowód walidacji do istniejącego raportu, zachowując jego poprzednią treść. Pozostałe pliki to zachowany zakres istniejącego domknięcia trasy /pipelines, bez upoważnienia do zmiany kodu w przebiegu naprawy kontraktu. Wszystkie wymienione pliki istnieją.

- `/Users/mcrm-ai/wacrm-a/docs/codex/TASK-KM3-2-08-02B-D2.md` — istniejący kontrakt, naprawa w miejscu.

- `/Users/mcrm-ai/wacrm-a/src/components/pipelines/pipeline-board.tsx`
- `/Users/mcrm-ai/wacrm-a/src/components/pipelines/pipeline-board.test.tsx`
- `/Users/mcrm-ai/wacrm-a/src/components/pipelines/pipeline-ux-actions.test.tsx`
- `/Users/mcrm-ai/wacrm-a/src/components/pipelines/deal-card.tsx`
- `/Users/mcrm-ai/wacrm-a/src/components/pipelines/deal-card.test.tsx`
- `/Users/mcrm-ai/wacrm-a/src/components/layout/header.tsx` — wyłącznie jawny wariant /pipelines, bez zmiany pozostałych tras.
- `/Users/mcrm-ai/wacrm-a/src/components/layout/global-crm-search.tsx` — wyłącznie wariant rozmiaru /pipelines.
- `/Users/mcrm-ai/wacrm-a/src/app/globals.css` — wyłącznie selektory Lejka; zakaz zmiany globalnych wartości innych ekranów.
- `/Users/mcrm-ai/wacrm-a/src/lib/ui/layout-geometry.ts` — wyłącznie stałe Lejka.
- `/Users/mcrm-ai/wacrm-a/src/lib/ui/layout-geometry.test.ts`
- `/Users/mcrm-ai/wacrm-a/docs/codex/CODEX-KM3-2-08-02B-REPORT.md` — istniejący raport; tylko dopisanie wyniku naprawy, bez usuwania wcześniejszego FAIL i checkpointu.

## ZAKAZY

Nie commituj, nie pushuj. Bez publikacji przez wykonawcę kodu; TEST dopiero po technicznym PASS, istniejącym autoryzowanym kanałem. Produkcji nie wdrażać ani nie modyfikować. Nie zmieniać innych ekranów, sekretów, limitów, ledgeru, zabezpieczeń, RLS, uprawnień, konfiguracji połączeń ani mechanizmów bramek. Nie odświeżać znaczników czasu bez nowego odczytu źródła. Nie uruchamiać drugiego Codexa, subagentów ani Nous. Nie tworzyć projektu, metodologii, panelu odbioru ani tunelu. Nie usuwać autorskich funkcji mCRM i nie odsłaniać surfaceFlags. Inter zostaje. Nie wykonywać historycznego run-km3208.sh: przepisuje daty starych danych i uruchamia kolejnego Codexa. Odmowa bramki oznacza STOP zmian kodu. Zgodnie z bieżącym poleceniem właściciela błędy kontraktu należy poprawić w tym samym dokumencie i powtórzyć samą walidację D2 aż do PASS lub wskazania konkretnej przeszkody wymagającej decyzji właściciela; zakaz obchodzenia bramki pozostaje.

## ŹRÓDŁA

Wymagania kontraktu D2 odczytano z `/Users/mcrm-ai/.hermes/dokumenty/D2.txt`, sekcje „PROJEKT 06 — OBOWIĄZUJĄCA BRAMKA WYKONAWCZA HERMES/CODEX” oraz techniczna bramka przeciw pętli poprawek K3/K4. To lokalny zapis D2, bez twierdzenia o świeżej synchronizacji Drive. Schemat 13 pól i reguły plików sprawdzono w istniejącym skrypcie wskazanym przez bramka_kod.py, nie w starszej kopii cache. W kwestii wzorca obowiązuje nowsze AGENTS.md z 09.11.2026.

Jedyny wzorzec: rzeczywiste zalogowane demo Bigin, CDP 127.0.0.1:9400, 1536×1024. Żadna historyczna plansza 00S nie zastępuje Bigin.

- `/Users/mcrm-ai/.hermes/cache/k3/CHECKPOINT-K3-01-20261110-1815.md` — najnowszy checkpoint; zastępuje starszy CHECKPOINT-KM3.2.08.json o blokadzie TUS.
- `/Users/mcrm-ai/.hermes/k3/render/km3208/delta_final.json` — poprzedni pomiar Bigin, regiony i D4–D6.
- `/Users/mcrm-ai/.hermes/cache/k3/render/km3208/bigin_km3208_20261110-180319_1536.png` — poprzedni pełny zrzut wzorca.
- `/Users/mcrm-ai/.hermes/cache/k3/render/km3208/mcrm_km3208_20261110-181422_1536.png` — poprzedni pełny zrzut TEST.
- `/Users/mcrm-ai/.hermes/cache/k3/render/km3208/pomiar_final_20261110-181422.json` — poprzednie pomiary DOM TEST.
- `/Users/mcrm-ai/wacrm-a/docs/codex/CODEX-KM3208.md` — wynik poprzedniej paczki.
- `/Users/mcrm-ai/wacrm-a/public/review/stan.json` — czeka na odbiór Tomasza; brak dowodu PASS właściciela.
- `/Users/mcrm-ai/.hermes/cache/k3/prod-build.json` i wskazana w nim surowa odpowiedź API — weryfikacja produkcyjnego BASE_SHA bez zmiany produkcji.

Poprzednia paczka: commit 7cba0d9, wdrożenie TEST 01a1c637-db6f-70c5-a283-048b9a9b6f29 ze źródeł 64cb783. Nagłówek 15px/550/rgb(33,33,41), toolbar 14px, wiersze panelu 13px/400 są wykonane i zmierzone. Nie powtarzać. Commit 13a273a zmienia panel stanu, nie ekran. Checkpoint podaje następny build 01a1c66c-93c7-7327-abc5-af665b279cf2 jako running, więc aktualnego completed nie zakładać.

## SKILLS

Istniejący `/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md`, w zakresie zgodnym z niniejszym zleceniem i zakazami użytkownika. Obowiązkowe istniejące bramki: `/Users/mcrm-ai/.hermes/k06/bramka_kod.py` oraz wskazany przez niego `/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/scripts/zlecenie_gate.py`. Nie kopiować, nie poprawiać ani nie zastępować ich własną walidacją.

## MODEL

Obecna sesja Codex CLI w abonamencie ChatGPT, bez dodatkowego procesu Codex i bez płatnych wywołań API. Bramka uruchamiana wyłącznie do walidacji, bez --codex.

## BUDŻET

Jedna paczka; najwyżej jedna zbiorcza poprawka po PASS. 0 USD dodatkowych wywołań API, 0 wywołań Nous. Historyczny odczyt codex-limity.sh opisany w raporcie poprzedniego przebiegu (nie nowy pomiar naprawy kontraktu): 5h 37% użyte / 63% pozostało, tydzień 57% / 43%. Nie nadpisywać limity.json. Historyczne pasywne hermes usage --provider nous --json zakończyło się odmową zapisu .prepare.lock środowiska Hermesa; salda nie potwierdzono. Zakaz uruchamiania drugiego Codexa ma pierwszeństwo przed skillem sugerującym wywołanie dla odświeżenia limitów.

## TESTY

Bieżąca naprawa: uruchomić wyłącznie poniższą istniejącą bramkę, bez --lock, --release i bez --codex:

```sh
python3 /Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/scripts/zlecenie_gate.py /Users/mcrm-ai/wacrm-a/docs/codex/TASK-KM3-2-08-02B-D2.md --repo /Users/mcrm-ai/wacrm-a
```

Oczekiwany wynik: BRAMKA D2: PASS, RC=0, 13 pól i 12 istniejących plików. Przy FAIL poprawić dokument i powtórzyć tę samą walidację w tym przebiegu. PASS kontraktu nie uruchamia kodowania, testów aplikacji, wdrożenia ani nowej paczki. Nie uruchamiać teraz bramka_kod.py: nie ma trybu bez zapisu audytu, a jej poprzednia odmowa pozostaje w raporcie; nie odświeżać fikcyjnie produkcji ani limitów.

Zachowane warunki ewentualnego dalszego wykonania istniejącego zlecenia (poza tym przebiegiem):

Przed kodem: walidacja kontraktu istniejącym zlecenie_gate.py bez locka, następnie bramka_kod.py --zlecenie TEN_PLIK --repo /Users/mcrm-ai/wacrm-a --lock. Tylko PASS wszystkich warunków pozwala kontynuować. Nie obchodzić bramki, gdy odmawia z powodu starej produkcji lub limitów.

Po PASS: headless Playwright, istniejąca zalogowana sesja Bigin i TEST, jednakowy viewport 1536×1024. Pełne zrzuty (pasek, rail, panel, toolbar, kolumny i karty), getBoundingClientRect/getComputedStyle, nakładka i pixelmatch. Podać maskę różnic danych oraz osobno diff całego ekranu i ramy; nie uznawać zmierzonej typografii za procent zgodności całego ekranu. Skontrolować obcinanie i nachodzenie elementów. Istniejące pomiary responsywności są punktem odniesienia, nie nowym dowodem LIVE.

Potwierdzić lub odrzucić historyczne rozbieżności paska (wyszukiwarka 672 vs 237 px, 5 ikon vs 1), przesunięcie kolumny x=300 vs 295 i nagłówki. Dopiero aktualny pomiar uzasadnia jedną zbiorczą poprawkę; bez poprawki, jeżeli ekran spełnia kryteria. Nie zmieniać wartości D4–D6, jeśli nadal są zgodne.

Funkcje krytyczne: wczytanie tablicy i właściwych danych, wybór potoku, zwijanie/rozwijanie panelu, filtrowanie/wyszukiwanie/sortowanie, otwarcie istniejącej karty, utworzenie oznaczonej syntetycznej transakcji na TEST, edycja i zmiana etapu, zgodność sum i liczników. Trwałość: po zapisie przeładowanie strony i niezależny ponowny odczyt w zalogowanym kontekście; następnie usunięcie wyłącznie rekordu testowego i potwierdzenie usunięcia po odświeżeniu. Błąd RLS/uprawnień raportować, nie naprawiać w tej paczce. Nie edytować danych klienta ani Bigin. Otwarcie karty to tylko test wejścia z Lejka, bez zmian innych ekranów.

Po zmianie kodu: npm run typecheck, następnie npx vitest run dla właściwego zakresu; pełny npx vitest run przed technicznym domknięciem. Nie pisać testów wyłącznie powtarzających deklaracje CSS. W raporcie RC, licznik PASS/FAIL/skipped i rzeczywisty zakres dowodu. Po odmowie bramki testów nie uruchamiać.

## DOWODY

Jeden raport CODEX-KM3-2-08-02B-REPORT.md: stan poprzedniej paczki i brak/obecność odbioru właściciela; lokalny SHA i niezależnie potwierdzony build TEST; log obu bramek; pełne zrzuty i ich daty/wymiary; maski, nakładka i liczba diff w pikselach/%; tabela funkcji i dowód trwałości; rzeczywiste koszty oraz ograniczenia pomiaru. Zachować istniejący kanał odbioru. Nie przedstawiać starszych dowodów jako bieżących.

## ODBIÓR

Odbiór bieżącej naprawy dokumentu: rzeczywisty BRAMKA D2: PASS (RC=0) dla tego samego pliku, 13 pól, pełne ścieżki istniejących plików, BASE_SHA zgodny z udokumentowaną odpowiedzią produkcji, zachowana historia i checkpointy. To nie jest odbiór ekranu ani PASS bramki kodu.

Zachowane wymagania odbioru ekranu, poza tym przebiegiem. Wymagania łączne: działający rzeczywisty TEST LIVE, zgodność całego ekranu minimum 90%, diff ramy <0,5%, krytyczne funkcje 100%, potwierdzona trwałość danych. Brak dowodu lub niedziałający LIVE = FAIL technicznego domknięcia. Status ekranu tylko według dowodów: ZGODNY I DZIAŁA / DZIAŁA CZĘŚCIOWO / NIE DZIAŁA. PASS odbioru wyłącznie Tomasza; wcześniejsze zielone testy i wdrożenie nie są odbiorem. Bez LIVE nie ogłaszać sukcesu.

## CHECKPOINT

Ten kontrakt zapisano w repo, ponieważ sandbox pozwala pisać tylko w /Users/mcrm-ai/wacrm-a i katalogach tymczasowych. Kanoniczna lokalizacja ~/.hermes/k3/zlecenia jest poza dozwolonym zapisem; nie kopiować tam przez inne narzędzie. Odmowę bramki i tę granicę zapisać w jednym raporcie w repo, bez zmiany checkpointów zewnętrznych, limitów lub ledgeru. Przy FAIL walidacji kontraktu poprawić ten sam dokument i ponowić samą bramkę D2 zgodnie z bieżącym poleceniem. Zakończyć po PASS kontraktu albo po wskazaniu konkretnej przeszkody wymagającej decyzji właściciela. Nie zmieniać istniejących checkpointów ani kodu. Wynik naprawy dopisać do istniejącego raportu. Kanoniczne historyczne TASK-KM3.2.08.md pozostaje zachowane; gotowy naprawiony kontrakt tego samego zadania ma ścieżkę /Users/mcrm-ai/wacrm-a/docs/codex/TASK-KM3-2-08-02B-D2.md.
