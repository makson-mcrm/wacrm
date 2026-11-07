# KM3.2.16 — usunięcie artefaktów renderu

Data: 2026-11-07. Wynik: zmiany w zadanym zakresie wykonane; typecheck i kompilacja Tailwinda poprawne. Pełny build lokalny oraz kryterium braku encji w public/docs pozostają NIE PASS. Formalny odbiór należy do Tomasza.

## Stan i zakres

- Zadana gałąź źródłowa: `k3/bigin-02b-20261105`.
- BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, potwierdzony jako przodek HEAD.
- Worktree: `/Users/mcrm-ai/wacrm-a`, detached HEAD `70ad137c6fd6eb41b66bcfbf7e9880f7821075e2`. Początkowe drzewo czyste.
- Zastosowany skill: `mcrm-wykonawca`, odczytany z lokalnego katalogu umiejętności Hermesa. Jawny zakres zadania i zakaz commitowania/publikacji mają pierwszeństwo.

## Wykonane zmiany

- Usunięto `public/review/km3-2-14/inbox.html` i `public/review/km3-2-14/app.css`.
- W `docs/codex/CODEX-KM3-2-15.md` doprecyzowano opis kontroli: klasa tła z url do pliku SVG. Dokument na wejściu nie zawierał literalnego zapisu arbitralnej klasy tła; opis nie zawiera nawiasów kwadratowych ani apostrofów.
- Dodano niniejszy wymagany raport.
- Bez zmian w `src/`, plikach bankowych, logice, danych, bazie, sekretach i zależnościach. Bez commita, pushowania i publikacji; HEAD pozostał bez zmian.

## Weryfikacja

| Kontrola | Wynik i dowód |
| --- | --- |
| `NEXT_TELEMETRY_DISABLED=1 npm run build:webpack` | Kod 1, jedna próba. Brak błędu modułu `./&`; build przerwany błędem DNS `getaddrinfo ENOTFOUND fonts.googleapis.com` i `Failed to fetch Inter from Google Fonts` w `src/app/layout.tsx`. Log: `/tmp/km3-2-16-build.log`. |
| `npm run typecheck` | Kod 0. Log: `/tmp/km3-2-16-typecheck.log`. |
| PostCSS z istniejącym `@tailwindcss/postcss` na `src/app/globals.css` | Kod 0, wygenerowano 232622 bajty CSS; brak URL z encją apostrofu lub jej fragmentem hash. Log: `/tmp/km3-2-16-css.log`. |
| Szukanie encji apostrofu w `public` i `docs` | NIE PASS: pozostało 12 wystąpień w `public/review/km3-2-14/contacts.html`, w selektorach klas przycisków. Plik jest poza zatwierdzonym zakresem i pozostał bez zmian. |
| Szukanie arbitralnej klasy tła w raporcie KM3.2.15 | 0 wystąpień. |
| `git diff --check` | Kod 0. |
| `git diff --name-only -- src` | Pusty wynik. |

Nie ponawiano builda: blokada dotyczy dostępu DNS do Google Fonts i nie uzasadnia kolejnej identycznej próby. Użyto istniejących zależności; nie instalowano pakietów. Kompilacja CSS potwierdza brak problematycznego URL, ale nie zastępuje pełnego builda TEST. Zdalnego builda TEST nie uruchamiano z uwagi na zakaz pushowania i publikacji.

## Blokady i checkpoint

1. Zielony pełny build wymaga środowiska z działającym dostępem do Google Fonts. Fontów i konfiguracji aplikacji nie zmieniano.
2. Globalne kryterium braku encji wymaga rozszerzenia zakresu o `contacts.html`; zgłoszono pytanie o zgodę na tę zmianę. Bez odpowiedzi plik pozostaje nietknięty.
3. Checkpoint w `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza dozwolonymi katalogami zapisu sandboxa, przy wyłączonej eskalacji uprawnień. Nie zapisano tam pliku; stan checkpointu zachowano w niniejszym raporcie.

Koszt nowych wywołań Nous: 0 USD — nie wykonywano wywołań Nous ani innych modelowych API. Praca w bieżącym przebiegu Codexa, bez nowego zlecenia i dodatkowych opłat za usługi. Brak świeżego pomiaru limitów abonamentu; nie przypisywano im wartości historycznych ani fikcyjnych.

Następny krok w ramach odbioru KM3.2.16: rozstrzygnięcie zakresu `contacts.html`, następnie zielony build TEST w środowisku z dostępem do fontu. Do tego czasu kryteria odbioru nie są w pełni spełnione.
