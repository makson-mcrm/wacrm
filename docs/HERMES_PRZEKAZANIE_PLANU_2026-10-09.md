# Hermes — operacyjne przekazanie zatwierdzonego planu, 09.10.2026

**Status:** jednorazowe przekazanie ustaleń z aktualnego MASTER Hermesa przez Kierownika ChatGPT. Nie jest nową polityką ani zgodą na kodowanie, płatne usługi, zmianę modeli lub autoryzację Google. Powstało, bo Hermes ma token Google `TOKEN_REVOKED / invalid_grant` i nie może przeczytać MASTER na Dysku. Odczytaj tę wersję z GitHub `main` bez proszenia Tomasza o przepisywanie treści.

## Źródła i role
- ChatGPT: Kierownik Wdrożenia — nadzór, priorytety, jakość, zlecenia; Hermes: główny kierownik wykonawczy, wybiera dostępne tanie narzędzia, nadzoruje i odbiera zadania; Codex CLI przez abonament ChatGPT: programowanie/testy po zatwierdzeniu; Tomasz: jedynie decyzje właścicielskie, nie programista/tester/kurier.
- Projekt: `makson-mcrm/wacrm` tylko `main`, mCRM LIVE Hostinger, Supabase zawiera PRAWDZIWYCH klientów; niczego nie kasuj ani nie przerabiaj na fikcyjne testy. Nie koduj ponownie 00S/00D bez wykazania różnicy zatwierdzony WZORZEC ↔ aktualny LIVE i zgody.
- Prawy podgląd mCRM LIVE ma pozostać otwarty, a przy UX pokazywać WZORZEC ↔ LIVE. `computer_use` nadal wyłączony, nie korzystaj z prywatnego Chrome. Meldunki na działający Telegram wyłącznie po polsku, krótko.
- Google: Hermes ma NIEAKTUALNY/unieważniony token. Nie zakładaj, że MASTER jest dostępny. Nie żądaj wspólnej zgody na Dysk + Gmail + Kalendarz. Właściciel odmówił szerokiego dostępu. Ewentualnie **tylko** ograniczony odczyt projektowego Dysku po udowodnieniu ograniczenia tożsamością i zakresem; Gmail/Kalendarz/Kontakty teraz NIE AUTORYZOWANE. Ograniczenie folderu nie wynika z samego scope `drive.readonly`.

## Metoda Matt Pocock — treść aktualnego MASTER Hermesa, sekcja 27
Źródło: https://github.com/mattpocock/skills
1. `/setup-matt-pocock-skills` — sprawdzenie i bezpieczeństwo tylko potrzebnych procedur, nie zakładać instalacji.
2. `/grill-with-docs` — PRZECZYTAJ już istniejące źródła, bez ponownego wywiadu.
3. `/to-spec` — specyfikacja CURRENT ↔ TARGET: LOCAL-FIRST, jedna AI Gateway, granice danych, migracja i wycofanie.
4. `/to-tickets` — mała kolejka mierzalnych zadań, priorytety, zależności.
5. `/implement` — po zgodzie, Hermes zleca pracę abonamentowemu Codexowi w ograniczonym środowisku.
6. `/code-review` — niezależny przegląd, testy, trwałość danych, porównanie WZORZEC↔LIVE, formalny odbiór przez Tomasza.
Nie uruchamiać niezweryfikowanego kodu z internetu. Film Roberta Szewczyka o Codex SDK jest INSPIRACJĄ, nie dowodem darmowego nieograniczonego API.

## Sprzęt i harmonogram — aktualne ustalenia właściciela
Zakupiony: **Mac mini A1993 Intel Core i5, 32 GB RAM, 512 GB SSD**, przewidywana dostawa **środa 14.10.2026**. Dawne zalecenia kupna M4 są NIEAKTUALNE. Dwa technicznie izolowane środowiska: prywatne Tomasza i odseparowane mCRM/Hermes, nie tylko dwóch użytkowników systemu.
- Piątek 09.10: sprawdzenie dostępów i metody; nie ruszać mCRM produkcyjnego.
- Poniedziałek 12.10: specyfikacja bezpieczeństwa + krótka kolejka rzeczywistych prac.
- Wtorek 13.10: kopia konfiguracji Hermesa, instrukcji, pamięci, skryptu limitów oraz przygotowanie migracji.
- Środa 14.10: izolacja Mac Intel, odtworzenie z kopii, kontrola bezpieczeństwa.
- Czwartek–piątek 15–16.10: ostrożne próby lokalnego Bielika/Qwen dopasowane do Intel, jedna AI Gateway z blokadą wycieku; potem wyłącznie zatwierdzona paczka programistyczna.
Terminy zależą od faktycznych testów i dostawy, nie oznaczają PASS.

## LOCAL-FIRST i koszty
- Dane rzeczywistych klientów, poufne dokumenty bankowe, treści kart CRM nie trafiają do modeli chmurowych ANI jako kontekst diagnostyczny. Brak przetestowanego lokalnego modelu = STOP dla analizy AI, bez chmurowego fallbacku. Codex może pracować na samym kodzie i sztucznych danych.
- Istniejący skrypt `scripts/limits_report.py`: automatyczny odczyt prawdziwego salda Nous i zapasu Codex 5h + tydzień + resety PRZED i PO płatnym zadaniu. Nie czytaj limitu kosztownym wywołaniem Codexa. Progi Nous: <=2 USD WARN, <=1 USD STOP. Aktualny meldunek Hermesa 09.10 19:41: Nous 2,79 USD, Codex oba okna 100% — to odczyt HISTORYCZNY; przed dalszą płatną pracą zrób świeży. Szacuj koszty i dobieraj paczki tak, by miały zapas na test i odbiór. Nie dokupuj, nie zmieniaj modelu sam.
- Bieżący model Hermesa: DeepSeek V4.1 Flash/Low. Codex CLI połączony z abonamentem, wcześniej wykonano test wykonawczy PASS. Nie instaluj siedmiu modeli tylko dla eksperymentu.
- Telegram bez spamu: ZROBIONE / BLOKER / NAJBLIŻSZE DZIAŁANIE / KOSZT.

## Priorytety teraz
1. Bezpieczeństwo: Hostinger MCP obecnie CONNECTED (potwierdzenie z Hermesa), podgląd LIVE działa; wykryto 2 HIGH + 8 MODERATE w zależnościach. Tylko bezpieczna weryfikacja, bez automatycznego Auto-fix i bez zmian LIVE bez zgody.
2. Odzyskanie **minimalnego** dostępu do projektowych źródeł; nigdy szerokie Google Drive/Gmail/Calendar. Ten plik jest dostępny przez sprawny GitHub nawet przy unieważnionym Google.
3. LOCAL-FIRST spec i bezpieczeństwo migracji Mac; dopiero potem pojedyncza realna paczka mCRM blisko wartości dla sprzedaży. Moduł BANKI rozrysowywany jest w oddzielnym oknie UX jako kandydat, nie kodować bez odbioru.

## Jeden następny krok
Hermes: wczytaj ten dokument z `main`. Porównaj go z aktualną `AGENTS.md` i swoim aktywnym `SOUL/USER/MEMORY`, nie twórz kolejnych kopii zasad. Potwierdź jednoznacznie, czego nadal nie możesz zweryfikować (zwłaszcza źródeł na Google), przedstaw **jedno** najmniejsze zadanie i przewidywany koszt. Żadnych płatnych testów, zmian ustawień ani kodowania teraz.
