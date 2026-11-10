# CODEX-MAP1 — toolbar Lejka i Potoki zespołu

Data: 10.11.2026. Zmiany wykonane w `/Users/mcrm-ai/wacrm-a`.
Status: implementacja i weryfikacja techniczna zakończone. Odbiór wizualny pozostaje po stronie Tomasza.

## Mapa ELEMENT → FUNKCJA

| Element | Funkcja | Plik:linia |
| --- | --- | --- |
| Właściciel zmiany | Widoczny przycisk dropdownu w toolbarze; radio z aktualnym wyborem, „Wszyscy”, „Nieprzypisane” i unikalnymi właścicielami. | `src/app/(dashboard)/pipelines/page.tsx:771` |
| Lista właścicieli | Wyliczana lokalnie z deali bieżącego lejka pasujących do pozostałych filtrów i widocznych etapów. Pomija rekordy testowe. Nazwa pochodzi z już pobranego profilu, z e-mailem i opisem zastępczym jako fallback. Wybór właściciela nie usuwa pozostałych opcji. | `src/app/(dashboard)/pipelines/page.tsx:507` |
| Filtrowanie kart | Porównuje `ownerId` z istniejącym polem `Deal.assigned_to`; zawęża dane przekazywane do obecnej tablicy. | `src/app/(dashboard)/pipelines/page.tsx:479` |
| URL właściciela | `changeOwnerFilter` zapisuje `?owner=<id>` przez natywne `replaceState`; „Wszyscy” usuwa parametr. Zachowuje pozostałe parametry, hash oraz stan historii Next. Efekt odtwarza wybór po odświeżeniu i przy `popstate`. | `src/app/(dashboard)/pipelines/page.tsx:519`, `src/app/(dashboard)/pipelines/page.tsx:529` |
| Rozmiar filtra | Przycisk ma wysokość/min-height 32 px i tekst 14 px. Reguła dotyczy wyłącznie filtra właściciela. | `src/app/globals.css:724` |
| Resetuj widok | Czyści również parametr `owner` w URL. | `src/app/(dashboard)/pipelines/page.tsx:799` |
| Istniejące wejście `new=deal` | Po otwarciu formularza usuwa zużyte parametry formularza, zachowując m.in. `owner`. | `src/app/(dashboard)/pipelines/page.tsx:340` |
| Klonuj z szablonu | Wywołuje istniejącą akcję „Dodaj lejek”: `setNewPipelineOpen(true)`. Korzysta z tego samego dialogu tworzenia i bramki `edit-settings`. | `src/app/(dashboard)/pipelines/page.tsx:611` |
| Dla zespołów / Dla branży | Każda grupa listuje istniejące `pipelines`; wybór wywołuje obecne `setSelectedPipelineId`. Chevron oraz `aria-expanded`, `aria-controls` i `hidden` odzwierciedlają stan grupy. | `src/app/(dashboard)/pipelines/page.tsx:615` |
| Pamięć zwinięcia grup | Niezależny zapis w localStorage pod kluczami `mcrm:pipelines:group-teams-collapsed` i `mcrm:pipelines:group-industries-collapsed`; odczyt po hydratacji. Odmowa dostępu do storage nie blokuje zwijania. | `src/app/(dashboard)/pipelines/page.tsx:552`, `src/app/(dashboard)/pipelines/page.tsx:561` |

## Testy i RC

| Polecenie | RC | Wynik końcowy |
| --- | --- | --- |
| `npm run typecheck` | **0** | **0 błędów** |
| `npx vitest run` | **0** | **145 plików PASS; 2393 testy PASS, 1 skipped, 0 FAIL; 2394 łącznie** |

Pełny Vitest: start 22:41:27, czas 26,04 s według wyjścia runnera. Próg ≥2372 testów spełniony również przy liczeniu wyłącznie testów PASS.

Dodano 21 przypadków MAP1 w `src/components/pipelines/pipeline-ux-actions.test.tsx:433`. Obejmują widoczność i rozmiar filtra, unikalność ID, fallback nazw, zawężanie kart, przełączanie właściciela, „Wszyscy”, zachowanie innych parametrów URL, odświeżenie, `popstate` i sprzątanie listenera, nieznane ID, nieprzypisane deale, pozostałe filtry, reset widoku, wejście `new=deal`, obie grupy i ich pamięć, odmowę storage, wybór lejka, pustą listę oraz istniejący dialog tworzenia i jego uprawnienia.

Test renderowania strony w `src/app/(dashboard)/pipelines/page.test.tsx:876` dostosowano do portalu dropdownu; nadal sprawdza rzeczywiste karty przy łączeniu filtra właściciela, statusu i produktu. Opcje dropdownu weryfikują nowe testy MAP1.

## Zakres i ryzyka

- W obecnym modelu właściciela identyfikuje `assigned_to`; nie dodawano pola bazy `ownerId` ani zmian API/Supabase.
- Repozytorium nie zawiera osobnego dialogu wyboru szablonu lejka. Zastosowano przewidziany w zleceniu fallback do „Dodaj lejek”, z istniejącym zestawem etapów.
- Obie grupy celowo pokazują tę samą pobraną listę lejków; model nie zawiera klasyfikacji zespołów/branż. Nie dodano zapytań.
- Pamięć zwinięcia działa w danej przeglądarce. Przy zablokowanym localStorage grupy działają w bieżącej sesji, ale zapis nie przetrwa odświeżenia.
- Nieznany właściciel w URL pozostawia pustą tablicę do czasu wybrania „Wszyscy”; filtr nie resetuje samoczynnie wskazanego ID.
- Wymiary panelu, kolumn, kart i nagłówka, `surfaceFlags`, dane klientów, routing i `.env*` nie były modyfikowane. Zastaną zmianę `.planning/2026-11-10-night-run/progress.md` pozostawiono nietkniętą.
- Zgodnie ze zleceniem uruchomiono wyłącznie wskazane narzędzia testowe; bramki i skryptów spoza repo nie uruchamiano. Nie wykonano wdrożenia ani pomiaru przeglądarkowego/pixelmatch; liczba diff wizualnego nie została zmierzona, a techniczny wynik nie stanowi PASS wizualnego.
