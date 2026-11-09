# KM3.2.21 — firma jako tytuł karty, nazwa deala zawsze widoczna

09.11.2026. Zmiana lokalna przygotowana do odbioru Tomasza. Testy komponentów pipelines: **30/30, 0 FAIL**; testy strony Lejka: **74/74, 0 FAIL**; typecheck i lokalny build testowy: **kod 0**. Formalny PASS nadaje wyłącznie Tomasz.

## Stan i zakres

- Repo: `makson-mcrm/wacrm`, worktree `/Users/mcrm-ai/wacrm-a`.
- Zadany BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`, potwierdzony jako przodek HEAD.
- Rzeczywisty HEAD: `c47acfa4ff8cd5eaa0340a0921c8dafdd836ff31`, detached HEAD, zgodny ze wskazanym worktree `c47acfa`; początkowo czysty. Nie przełączano gałęzi źródłowej `k3/bigin-02b-20261105`.
- Źródło wykonania: TASK-KM3.2.21 i istniejący kod. Odczytano skill `mcrm-wykonawca`; aktualne polecenie ogranicza pracę do lokalnej zmiany i testów, bez publikacji oraz commita.
- Zmieniono wyłącznie dwa wskazane pliki kodu/testów oraz dodano niniejszy jawnie wymagany raport odbioru.

## Zmiana i dowód

`src/components/pipelines/deal-card.tsx`: zachowano pogrubiony tytuł z nazwą firmy. Bezpośrednio po nim renderuje się osobny akapit z `deal.title`, `text-xs`, kolorem `#475569` oraz pełną nazwą w atrybucie `title`. Kolejny akapit pokazuje kontakt. Przy braku firmy nazwa deala pozostaje tytułem. Zachowano istniejący fallback firmy z relacji `deal.company`, link do deala, kwotę, datę i dodatki pod `surfaceFlags.pipelineExtensions`.

`src/components/pipelines/deal-form.test.tsx`:

- Harness rozwija rzeczywisty komponent `BiginDealCard`, do którego obecnie deleguje strona kartoteki. Asercja szuka dokładnego tekstu `Sprawa syntetyczna Alfa` w dzieciach elementu HTML wewnątrz `section[data-bigin-deal-card]`; nie opiera się na pozycji nagłówka ani samym obiekcie `deal` przekazanym jako prop.
- Test ponownego wejścia używa aktualnego przycisku „Edytuj transakcję” i rzeczywistych handlerów `DealForm`. Sprawdza otwarcie formularza, zmianę etapu, zapis, ponowny odczyt, zmianę następnego działania i terminu, kolejny odczyt i ponowne otwarcie. Zachowano kontrole kontaktu, opisu, kwoty, etapu oraz dokładnego przeliczenia czasu: `2026-07-06T10:30` w Warszawie → `2026-07-06T08:30:00.000Z`. Zapisane następne działanie jest także sprawdzane jako tekst `dd` na karcie.
- Trzy dodatkowe przypadki sprawdzają firmę z `company_name`, firmę z relacji `company` oraz brak firmy. Weryfikują obecność nazwy deala w drzewie, pogrubienie i link tytułu, kolejność firma → deal → kontakt oraz mniejszy rozmiar i wymagany kolor drugiej linii.
- Nie zmieniono flag powierzchni, kodu strony kartoteki ani kodu formularza. Nie usunięto żadnego istniejącego przypadku testowego.

Testy używają syntetycznych rekordów i istniejącej atrapy bazy w pamięci. Nie stanowią E2E przeglądarki ani dowodu trwałości w rzeczywistym Supabase.

## Weryfikacja

| Kontrola | Wynik | Log |
| --- | --- | --- |
| `npx vitest run src/components/pipelines` | **30/30, 0 FAIL, kod 0** | `/private/tmp/km3-2-21-vitest.log` |
| `npm run typecheck` | **Kod 0** | `/private/tmp/km3-2-21-typecheck.log` |
| `npx vitest run 'src/app/(dashboard)/pipelines'` | **74/74, 0 FAIL, kod 0** | `/private/tmp/km3-2-21-pipelines-page.log` |
| Lokalny build testowy `npm run build:webpack` | **Kod 0**, kompilacja, TypeScript, **85/85** stron | `/private/tmp/km3-2-21-build.log` |
| `git diff --check` | Bez błędów | Terminal sesji |

Build wykonano w `/private/tmp/km3-2-21-build`, z kopii bieżących śledzonych plików roboczych. Oba zmienione pliki porównano bajtowo z worktree, a po buildzie ponownie potwierdzono zgodność ich SHA256. Wykluczono wszystkie `.env*`; proces dostał oczyszczone środowisko, syntetyczny adres `https://synthetic.invalid` i syntetyczny klucz Supabase. Korzystał z istniejących zależności oraz lokalnego mocka fontów (`NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/private/tmp/km3-2-10-font-mock.cjs`), z wyłączoną telemetrią. Runtime: Next.js 16.3.6. Ostrzeżenia dotyczą istniejącej konwencji middleware i użycia API Node w Edge Runtime; build zakończył się kodem 0. Bez instalacji, uruchamiania serwera i wywołań modeli.

Każdą kontrolę uruchomiono jeden raz. Nie było potrzeby ponawiania ani zbliżania się do bramki dwóch prób tą samą metodą.

## Checkpoint i ograniczenia

Stan do przejęcia przez Hermesa: niezacommitowany diff dwóch wskazanych plików w worktree `c47acfa`, testy i typecheck jak wyżej, następna czynność to odbiór Tomasza. Nie otwarto kolejnego zadania.

Wymagany `~/.hermes/cache/k3/CHECKPOINT-*.md` znajduje się poza dozwolonymi katalogami zapisu sandboxa `workspace-write`, a eskalacja jest wyłączona. Nie zapisano pliku i nie obchodzono ograniczenia; ten raport zachowuje checkpoint do przeniesienia przez uprawnionego kierownika.

- Bez zmian w plikach bankowych, bazie, sekretach, `.env`, zależnościach i flagach. Bez commita, pushowania, publikacji TEST/LIVE.
- Lokalny build testowy nie oznacza zielonego wdrożenia na serwerze TEST; publikacja została wyraźnie zabroniona.
- Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Bez nowej sesji Hermesa, Codex API i subagentów. Nie odczytywano salda konta Nous.
- Pasywny odczyt przed edycją (około 11:32 czasu lokalnego): użycie Codex 5 h **42%**, tygodnia **21%**, dodatkowe kredyty: brak. Po testach i buildzie (11:34): 5 h **45%**, tydzień **22%**. Źródło: `/Users/mcrm-ai/.codex/sessions/2026/11/09/rollout-2026-11-09T11-29-58-01a1bfdb-88ec-7752-905a-5796b6822af9.jsonl`. Resety wskazane przez skrypt: 09.11.2026 14:09 i 13.11.2026 10:24 czasu lokalnego. Wskaźniki dotyczą całych okien abonamentu, a nie dokładnego kosztu tej paczki.
