# KM3.4.3 — testy dodatków ukrytych przy flagach false

Data: 2026-11-09, zakończenie kontroli 18:05 CET.

## Naprawione

- `src/components/pipelines/pipeline-board.test.tsx`: oczekiwana domyślna wartość dodatków to `false`. Istniejące trzy przypadki (brak nadpisania, `false`, `true`) renderują teraz stronę Lejka z rzeczywistą tablicą. Sprawdzają brak/obecność pięciu KPI i siedmiu filtrów dodatkowych, sześć kolumn oraz obie karty (desktop i mobile). Zachowano asercje danych i akcji kart.
- `src/components/pipelines/deal-form.test.tsx`: trzy nazwane przypadki podają oczekiwaną flagę `false`, `false`, `true`. Pierwszy nadal sprawdza rzeczywistą konfigurację domyślną bez nadpisania, drugi jawne wyłączenie, trzeci włączenie dodatków. Pomocnicze operacje otwarcia i edycji wybierają rdzeń również przy braku nadpisania. Po zapisie i ponownym otwarciu test sprawdza widoczną nazwę deala, etap, następny krok, brak Asystenta AI i edytora dodatków oraz zapisane dane i warszawską godzinę. Relacja etapu jest dostarczana w danych syntetycznych, ponieważ atrapa zapytań nie wykonuje JOIN.
- Zmiany wykonawcze ograniczono do dwóch dozwolonych plików testowych. Nie zmieniano komponentów, flag, tokenów, danych aplikacji, bazy, KM4, sekretów, `.env` ani zależności. Nie usunięto przypadków i nie dodano skipów.

## Przetestowane

| Kontrola | Wynik | Log |
| --- | --- | --- |
| Pierwszy przebieg dwóch plików | RC=0, 34 PASS | `/tmp/km3-4-3-targeted.log` |
| `npm run typecheck` po końcowej zmianie | RC=0, 0 błędów | `/tmp/km3-4-3-typecheck.log` |
| `npx vitest run` po końcowej zmianie | RC=0, 142 pliki PASS; 2239 PASS / 1 istniejący skipped / 0 FAIL; 2240 testów | `/tmp/km3-4-3-vitest.log` |
| `git diff --check` | RC=0 | kontrola drzewa roboczego |

Zachowano liczbę 2240 przypadków z KM3.4.2. Dwie dotychczasowe porażki zostały usunięte przez dopasowanie testów do ukrytej powierzchni i dodatkowe asercje rdzenia. Nie było nieudanego przebiegu poprawionych testów ani potrzeby ponawiania nieskutecznej metody.

## Nieodebrane

- Wynik techniczny testów jest zielony; PASS właściciela nie został nadany.
- Nie utworzono nowego buildu TEST ani wdrożenia: zlecenie wprost zakazuje publikacji. Nie wykonywano commita ani pushu. Nie przedstawia się istniejącego buildu jako dowodu wdrożenia KM3.4.3.
- Zlecenie wskazuje gałąź `k3/bigin-02b-20261105`; udostępniony worktree jest w stanie detached HEAD na `f09c4496b9be6dd895913c78a90b28fc3653ef81` (KM3.4.2). Nie przełączano gałęzi. BASE_SHA produkcji: `0f7317df7d017d1c4d33412e29a4df9eee108583`.

## Ograniczenia środowiska i checkpoint

- Przed edycją istniał lock `TASK-KM3.4.3.md` z 18:02:40. Wywołanie `bramka_kod.py --lock` nie mogło ponownie zapisać locka ani audytu poza sandboxem. Osobna walidacja D2 bez zapisu zakończyła się PASS: 13 pól, 2 pliki. Zachowano istniejącą rejestrację paczki.
- Pasywny odczyt `codex-limity.sh` o 18:03 CET: 56% pozostałego okna 5 h, 63% tygodnia; reset okna 5 h o 19:09. Źródło: ostatni wpis `rate_limits` w `rollout-2026-11-09T18-02-40-01a1c143-10b9-77b1-aaa1-fae74ed13482.jsonl`. To zapis sesji, nie gwarancja bieżącego salda.
- `hermes usage --provider nous --json` nie wykonało odczytu: brak prawa zapisu `.prepare.lock` w instalacji Hermesa. Nie uruchamiano Nous ani płatnego API, nie odczytywano plików poświadczeń i nie zmieniano uprawnień.
- Lokalizacja `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza zapisywalnym zakresem sandboxa. Ten raport stanowi checkpoint w repozytorium: zmiany pozostają niecommitowane, pełne testy i typecheck są zielone, publikacja jest zabroniona.

## Decyzja właściciela

Odbiór pozostaje po stronie Tomasza. Nie jest potrzebna żadna czynność techniczna właściciela do uzyskania powyższego wyniku testów.
