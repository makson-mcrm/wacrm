# KM3.2.08-BIGIN-SURFACE-02 — Lejek 02B

05.11.2026. **LOKALNIE DO ODBIORU — kod i testy.** Nie wykonano odbioru wizualnego. PASS nadaje wyłącznie Tomasz.

BASE_SHA i niezmieniony HEAD: `0f7317df7d017d1c4d33412e29a4df9eee108583`.
Paczka powstała na istniejących niezacommitowanych zmianach BIGIN-CORE, które zachowano wraz z ich raportem. Nie odtwarzano poprzedniej paczki i nie przełączano gałęzi. Bez commita, pusha i publikacji.

## Wynik i pliki

- `src/lib/ui/surface-flags.ts` — nowy, jeden przełącznik `surfaceFlags.pipelineExtensions: false` oraz jawny rejestr `pipelineSurfaceExtensions`.
- `src/app/(dashboard)/pipelines/page.tsx` — istniejący blok nagłówka, Archiwum, filtrów, KPI i Asystenta AI renderuje się tylko po włączeniu przełącznika. Pasek Bigin i tablica pozostają widoczne. Bez zmian stanów, zapytań, obliczeń, relacji, obsługi akcji i zapisu danych.
- `src/components/pipelines/deal-card.tsx` — ten sam przełącznik ukrywa ostatnią aktywność oraz istniejące akcje ZADZWOŃ/WIADOMOŚĆ. Ich kod, warunki dostępności i adresy pozostają. Nazwa sprawy, kontakt, kwota, data i przejście do Deala są zachowane.
- `src/components/pipelines/pipeline-board.tsx` — ten sam przełącznik ukrywa przyciski „Dodaj deal” pod etapami desktop/mobile. Wariant mobilny dostał etykietę „Transakcja”. Zachowane kolumny desktop 220 px, odstęp 10 px, jasne powierzchnie, białe karty, sumy, liczniki, stan pusty i przeciąganie.
- `src/components/pipelines/pipeline-board.test.tsx` — render rzeczywistych kart: sześć kolumn, komplet danych, domyślny brak dodatków i przywrócenie akcji istniejącym przełącznikiem.
- `src/app/(dashboard)/pipelines/page.test.tsx` — pełna powierzchnia z domyślną flagą, jawnym `false` i `true`; obecność rdzenia Bigin; brak/obecność dodatków, także na mobile i w nakładce przeciągania. Dotychczasowe asercje dodatków zachowane w wariancie włączonym. Regresje wyszukiwania, sortowania, filtrów, sum, kontaktów, błędów i drag&drop nadal sprawdzane.
- `docs/codex/CODEX-KM3-2-08-BIGIN-SURFACE-02.md` — ten raport, jedyny nowy dokument paczki.

## Co ukryto i gdzie później włączyć

Po decyzji Tomasza zmienić **wyłącznie `pipelineExtensions: false` na `pipelineExtensions: true` w `src/lib/ui/surface-flags.ts`**. Przywraca cały poniższy zestaw w istniejących miejscach, bez migracji i bez `.env`. To przełącznik prezentacji, nie bramka bezpieczeństwa AI ani uprawnień.

| Ukryty dodatek | Zachowane miejsce po włączeniu |
| --- | --- |
| Nagłówek „Lejek sprzedaży” i opis „Wszystkie aktywne sprawy (Tomasz)” | Nad filtrami |
| Archiwum z licznikiem | W nagłówku |
| Produkt, Tag, Bank, Priorytet | Dotychczasowy blok filtrów |
| Tylko przeterminowane, Bez next action, Więcej filtrów | Dotychczasowy blok filtrów |
| Wybór/zarządzanie lejkami i Wyczyść filtry | Rozwijana część filtrów |
| Pięć KPI: Aktywne sprawy, Przychód TERAZ, Przychód PÓŹNIEJ, Z blockerem, Z next action | Pod filtrami |
| Asystent AI / AI+ / Przeanalizuj lejek | Pod KPI |
| Ostatnia aktywność | Pod datą karty |
| ZADZWOŃ i WIADOMOŚĆ | Na dole karty, z dotychczasowymi warunkami kontaktu/telefonu |
| Dodaj deal | Pod etapami desktop/mobile |

## Weryfikacja

Końcowy przebieg po poprawieniu typów syntetycznej fixture kontaktu:

```text
npx vitest run src/components/pipelines/pipeline-board.test.tsx 'src/app/(dashboard)/pipelines/page.test.tsx'
Test Files  2 passed (2)
Tests       80 passed (80)
Start at    14:00:45
Duration    4.02s
exit code 0

npm run typecheck
tsc --noEmit
exit code 0
```

- Testy pełnej strony sprawdzają brak KPI, filtrów, panelu/odnośnika AI, akcji kontaktowych i ostatniej aktywności przy rzeczywistym domyślnym ustawieniu; osobno potwierdzają ponowne renderowanie po `true`.
- Syntetyczna tablica ma sześć operacyjnych kolumn, a karta zachowuje nazwę, kontakt, kwotę i datę. Archiwum nadal istnieje w danych, lecz nie w podstawowej powierzchni.
- Testy obejmują desktop, mobile oraz nakładkę przeciągania. Dostęp do bazy i `fetch` w testach strony jest zablokowany; asercje potwierdzają brak wywołań.
- `git diff --check` bez błędów. Przegląd React: brak nowych hooków, efektów, zapytań i zmian obsługi zdarzeń; flagi warunkują wyłącznie JSX.
- Vitest zgłasza istniejące ostrzeżenie konfiguracji Vite o przyszłym `configLoader: native`; testy kończą się kodem 0. Nie zmieniano konfiguracji poza zakresem.
- Nie uruchamiano builda, serwera dev, bramki ani skryptów zewnętrznych. Nie dodano zależności. Bez zmian bazy, RLS, GRANT-ów, sekretów, `.env`, modeli AI, Hostingera i innych ekranów.

## Źródła i ograniczenia podglądu

Odczytano poprzedni raport BIGIN-CORE, aktualne lokalne D1/D2 z decyzją BIGIN-FIRST 05.11.2026 (`~/.hermes/dokumenty/D1.txt`, `D2.txt`), `k3-screen-delivery`, `mcrm-wykonawca` oraz instrukcję UXKIN ui-from-screenshot. Zastosowano przegląd `react-best-practices`.

Obejrzano zapisany zrzut demo Bigin `~/.hermes/cache/k3/km14/bigin_lejek_live2.png`, 1536×1024: pasek nad tablicą, kolumny, krótkie białe karty, stan pusty. Szerokość 220 px i odstęp 10 px pochodzą z pomiarów podanych w zleceniu. Nie wykonywano nowego próbkowania kolorów ani pomiaru zalogowanego DOM. Zachowano istniejące kolory powierzchni z CORE: tło `#f8f9fb`, kolumny `#f1f3f6`, karty `#ffffff`.

Adresy źródłowe: [Bigin demo](https://bigin.zoho.eu/bigin/org20093561480/Home#/deals/kanban), [wzorzec — zakładka 1](https://test.makson.space/review/lejek.html), [instrukcja UXKIN](https://raw.githubusercontent.com/uxkin/agent/main/.agents/skills/ui-from-screenshot/SKILL.md).

Próba odczytu obu ekranów WWW była niedostępna. Narzędzie przeglądarki zwróciło `The browser access host is unavailable`. **Nie pokazano aktualnego renderu tej lokalnej wersji i nie wykonano porównania wizualnego 1:1.** Zlecenie dopuszcza uruchamianie wyłącznie Vitest i typecheck, więc nie uruchamiano serwera podglądu. Publiczny review nie zawiera tej paczki; nie przedstawiam go jako wyniku. Geometria jest sprawdzona w deklaracjach CSS, nie w rzeczywistym DOM. Test SSR nie potwierdza interakcji przeglądarkowych.

## Checkpoint i koszt

Docelowy `~/.hermes/cache/k3/CHECKPOINT-*.md` leży poza katalogami zapisu dozwolonymi przez sandbox tej sesji. **Nie zapisano checkpointu w tym katalogu.** Nie próbowano obchodzić ograniczenia. Stan do utrwalenia przez istniejącego wykonawcę Hermesa:

```text
ID: KM3.2.08-BIGIN-SURFACE-02
Stan: LOKALNIE DO ODBIORU — kod i testy; bez odbioru wizualnego i PASS Tomasza
BASE_SHA/HEAD: 0f7317df7d017d1c4d33412e29a4df9eee108583
Flaga: src/lib/ui/surface-flags.ts / pipelineExtensions=false
Testy: 80/80, 2 pliki; typecheck: exit 0
Raport: docs/codex/CODEX-KM3-2-08-BIGIN-SURFACE-02.md
Commit/push/publikacja: brak
Następne: pokazać lokalny render i porównać z Bigin; odbiór wyłącznie Tomasz
```

Nie uruchamiano dodatkowej sesji Codexa, płatnego Nous ani płatnego API modelu. Brak niezależnego odczytu liczników abonamentu przed/po; nie podaję fikcyjnego zużycia ani salda. Przebieg nie dokupuje zasobów i nie zmienia konfiguracji dostawców.
