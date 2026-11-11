---
name: mcrm-ux-gate
description: Obowiązkowa bramka bieżącego KM3 Bigin-first. Jeden ekran, jedna paczka, jeden abonamentowy Codex; rozpoznanie pełnego ekranu, kontrola funkcji, TEST i odbiór właściciela.
---

# mCRM — BRAMKA UX WYKONAWCZA (KM3, BIGIN-FIRST)

**Źródło wyglądu i interakcji: wyłącznie rzeczywiście zalogowane Bigin DEMO.** 00S, 00A–00D, FINAL-PASS i HEL są archiwalne. D1 określa zakres funkcjonalny; istniejące API, relacje i funkcje WaCRM pozostają chronione. Ten skill jest procedurą — aktywny AGENTS.md i aktualne decyzje D1–D3 mają pierwszeństwo.

## BRAMKA 0 — WZNOWIENIE I BEZPIECZEŃSTWO
1. Odczytaj najnowszy checkpoint, aktywne zadanie D1, lokalny plan i findings.md; zachowaj istniejące niezapisane zmiany. Sprawdź aktywny profil i katalog.
2. Zweryfikuj rzeczywiście załadowane SOUL/USER/MEMORY/AGENTS i skille; nie zakładaj poprawności na podstawie nazwy lub wpisu w Drive.
3. Przed użyciem Codexa potwierdź uruchomienie abonamentowego CLI *z procesu Hermesa*, autoryzację, katalog, gałąź i limit. delegate_task nie jest dowodem Codex CLI.
4. Sprawdź **techniczną** blokadę płatnego Nous dla tej paczki. Nie uruchamiaj płatnego modelu do pomiarów, koordynacji, porównań ani napraw. Brak dowodu blokady = STOP, bez automatycznego fallbacku.
5. Pracuj tylko na syntetycznych danych i sprawdzonej izolacji TEST. Nie przenoś klientów, sekretów, logów prywatnych i poufnej pamięci do chmury.

## BRAMKA 1 — PEŁNY OBRAZ BIGIN ↔ WaCRM
1. Jedna kontrolowana sesja przeglądarki. Zalogowane Bigin i TEST: te same wymiary, skala i dane syntetyczne. Nie myl ekranu logowania ze wzorcem.
2. Rozpoznaj **wszystkie** widoczne kontrolki, menu, stany zwinięcia, formularze, sortowanie, filtry, przewijanie i zachowania. Nie kończ po trzech różnicach.
3. Zapisz dla każdej różnicy: ELEMENT → STAN → BIGIN → WaCRM → PLIK/STYLE → ZMIANA → TEST. Rozdziel globalny SHELL od panelu Lejka.
4. Przeprowadź testy kliknięć, zapisu, powrotu, trwałości, responsywności oraz pełnego renderu. Wynik automatu: 0=techniczne kryteria spełnione, 1=różnice aplikacji, 2=blokada środowiska.
5. Próg obrazowy ustal po kalibracji. Brak funkcji krytycznej zawsze oznacza FAIL, niezależnie od procentu pikseli.

## BRAMKA 2 — JEDNA PACZKA / JEDEN CODEX
1. Zachowaj numer KM3.2.08, właściwy katalog, aktualny stan bazowy i identyfikator sesji. Nie zakładaj równoległego wykonawcy.
2. Zbuduj jeden kontrakt CEL / STAN / ZAKRES / RÓŻNICE / ZAKAZY / IMPLEMENTACJA / TEST / ODBIÓR. Dołącz właściwe fragmenty findings.md **w treści kontraktu**, nie tylko link.
3. Przekazanie musi obejmować: dowody Bigin, aktualny render, pełną mapę różnic i ochronę modelu danych, API, komunikacji oraz własnych funkcji (surfaceFlags).
4. Wykonuj kontrolę osobno od zmian Codexa. FAIL aplikacji wraca do **tej samej sesji** na poprawkę; FAIL narzędzia lub publikacji uruchamia naprawę środowiska, nie przejście na płatny model.
5. Maksymalnie dwie bezskuteczne poprawki tej samej usterki; potem STOP i konkretna przyczyna. Nie omijaj bramki_kod.py, limitów, zgód ani warunków bezpieczeństwa.

## BRAMKA 3 — TEST I DOWÓD
1. Publikuj dopiero po technicznej kontroli, autoryzowaną i sprawdzoną ścieżką, **wyłącznie na TEST**; nie pakuj .env ani innych sekretów.
2. Niezależnie potwierdź commit/build/trasę na https://test.makson.space. Testuj pełny SHELL, Lejek, filtry, zapis/odczyt, responsywność i brak regresji.
3. Zapisz PRZED/PO: lista różnic, pełne porównanie Bigin↔mCRM, wyniki interakcji i trwałości, identyfikator przebiegu, koszt/limity, dowód TEST.
4. **Technicznie wykonane** tylko na podstawie dowodów związanych z konkretnym commitem i buildem; jednostkowe PASS ani sam numer buildu nie wystarczają.
5. **ODEBRANE** wyłącznie po właścicielskim PASS Tomasza. KM3.2.08 pozostaje otwarte do tego momentu. Nie zaczynaj kolejnego ekranu.

## ZAKAZY
- Nie używaj archiwalnych makiet/00S/FINAL-PASS jako równorzędnych wzorców.
- Nie kasuj funkcji, API, danych, integracji WaCRM; nie odsłaniaj własnych dodatków bez decyzji.
- Nie uruchamiaj płatnego Nous, równoległych Codexów ani nowej kolejki.
- Nie omijaj bramek, nie osłabiaj testów i nie uznawaj niezalogowanego TEST za wynik.
- Nie angażuj Tomasza w terminal, przeklejanie logów i ręczne techniczne testy.
