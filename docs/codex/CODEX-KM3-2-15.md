# KM3.2.15 — naprawa tła Inboxa

Data: 2026-11-07. Wynik: poprawka wykonana; typecheck i kompilacja CSS zielone. Pełny lokalny build zablokowany pobieraniem fontu. Formalny odbiór pozostaje po stronie Tomasza.

## Stan wejściowy i zakres

- Repozytorium: `makson-mcrm/wacrm`, katalog roboczy `/Users/mcrm-ai/wacrm-a`.
- Zadana gałąź źródłowa: `k3/bigin-02b-20261105`.
- Zadany BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`; potwierdzony jako przodek HEAD.
- Faktyczny HEAD worktree: `a687523a353477611a2aafeb7b435096bd0b21e7` (detached HEAD, zgodny ze wskazanym worktree). Drzewo przed zmianą było czyste.
- Skill: `mcrm-wykonawca`, odczytany z lokalnego katalogu umiejętności Hermesa. Jawne ograniczenia tego zadania mają pierwszeństwo przed historycznymi instrukcjami publikacji i commitowania.

## Wykonana zmiana

- `src/app/globals.css`: dodana wyłącznie klasa `.inbox-doodle-bg` z `background-image: url("/inbox-doodle.svg")` oraz `background-repeat: repeat`.
- `src/components/inbox/message-thread.tsx`: wspólny ciąg klas tła zastąpiony przez `bg-background inbox-doodle-bg`.
- Zmiany kodu: 6 dodanych i 1 usunięta linia. Poza tym dodano wyłącznie niniejszy wymagany raport.
- Bez zmian plików bankowych, logiki, danych, bazy, sekretów i zależności. Bez commita, pushowania i publikacji.

## Weryfikacja

| Kontrola | Wynik i dowód |
| --- | --- |
| `npm run typecheck` | Kod wyjścia 0, TypeScript bez błędów. Log: `/tmp/km3-2-15-typecheck.log`. |
| Wyszukanie dawnego zapisu klasy tła z url do pliku SVG w całym `src/` | 0 wystąpień. |
| Testy Inboxa | Brak plików testowych i specyfikacji w `src/components/inbox`; warunkowego polecenia Vitest nie uruchamiano. |
| PostCSS + istniejący `@tailwindcss/postcss` | Kod wyjścia 0. Wygenerowana klasa zachowuje poprawny URL i powtarzanie tła. Log: `/tmp/km3-2-15-css.log`. |
| Parsowanie i minifikacja wygenerowanego CSS przez istniejący `lightningcss` | Kod wyjścia 0. Log: `/tmp/km3-2-15-css-minify.log`. |
| `git diff --check` | Kod wyjścia 0. |
| `NEXT_TELEMETRY_DISABLED=1 npm run build:webpack` | Kod wyjścia 1, jedna próba. Blokada: `getaddrinfo ENOTFOUND fonts.googleapis.com`, następnie błąd `next/font`: `Failed to fetch Inter from Google Fonts` w `src/app/layout.tsx`. Log: `/tmp/km3-2-15-build.log`. |

Wynik minifikacji właściwej klasy:

```css
.inbox-doodle-bg{background-image:url(/inbox-doodle.svg);background-repeat:repeat}
```

Build użył istniejącego skryptu webpack, zgodnego z opisaną w skillu ścieżką Hostingera. Lokalnie dostępny Next.js zgłosił wersję 16.3.6; manifest repo deklaruje 16.4.1. Zależności są istniejącym dowiązaniem do `/Users/mcrm-ai/wacrm-km2/node_modules`; nie instalowano ani nie aktualizowano pakietów. Wygenerowany CSS jest poprawny, ale nie stanowi to dowodu zielonego pełnego builda TEST na Hostingerze. Zdalnego builda ani wdrożenia nie uruchamiano.

## Checkpoint i blokady

Checkpoint tego przebiegu zapisano w niniejszym raporcie: HEAD i zmiany wskazane powyżej, typecheck 0, CSS 0, build 1 z powodu DNS Google Fonts. Nie ponawiano builda tą samą metodą i nie zmieniano fontów ani konfiguracji poza zakresem zadania.

Wymagany zapis do `~/.hermes/cache/k3/CHECKPOINT-*.md` jest niedostępny: ten katalog leży poza katalogami dopuszczonymi do zapisu przez sandbox `workspace-write`, a podnoszenie uprawnień jest wyłączone. Nie próbowano obchodzić ograniczenia ani zapisywać poza sandboxem.

Następny krok odbioru: ponowny build TEST w środowisku z działającym dostępem do Google Fonts, na stanie zawierającym te dwie podmiany. W tym przebiegu obowiązywał zakaz publikacji i pushowania, więc poprawka pozostaje lokalna.

Koszt nowych wywołań Nous: 0 USD — nie uruchamiano Nous ani żadnego dodatkowego modelowego API. Nie wykonano zakupów, instalacji ani nowego zlecenia Codexa; praca odbyła się w bieżącym przebiegu. Brak świeżego pomiaru limitów abonamentu; nie przypisywano im fikcyjnych wartości.
