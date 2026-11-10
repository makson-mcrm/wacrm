# KM3.2.08 — LEJEK BIGIN 02B — raport końcowy

Data: 10.11.2026, Europe/Warsaw. **Wynik: FAIL — zatrzymanie na istniejącej bramce kodu.** Nie jest to stwierdzenie awarii ekranu; oznacza brak spełnienia warunków technicznego domknięcia i odbioru. Nie ogłaszam sukcesu LIVE ani PASS właściciela.

## Stan zastany i poprzednia paczka

Repo: /Users/mcrm-ai/wacrm-a, detached HEAD `13a273a9ab14c7cee24b4323ddfaa52a639e491c`. Przed zapisaniem dokumentów drzewo było czyste.

Odczytano najnowszy [checkpoint 18:15](/Users/mcrm-ai/.hermes/cache/k3/CHECKPOINT-K3-01-20261110-1815.md), [wynik wykonawcy](/Users/mcrm-ai/wacrm-a/docs/codex/CODEX-KM3208.md), [panel stanu](/Users/mcrm-ai/wacrm-a/public/review/stan.json), [pomiar wzorca](/Users/mcrm-ai/.hermes/k3/render/km3208/delta_final.json) i [pomiar TEST](/Users/mcrm-ai/.hermes/cache/k3/render/km3208/pomiar_final_20261110-181422.json).

Poprzednia paczka D4–D6 jest wykonana w `7cba0d9` i według checkpointu wdrożona na TEST, build `01a1c637-db6f-70c5-a283-048b9a9b6f29`, źródła `64cb783`. Pomiar z 18:14 potwierdza nagłówek 15px/550/rgb(33,33,41), kontrolki 14px i wiersze panelu 13px/400. Raport poprzedniej paczki: typecheck RC=0, 2358 PASS / 1 skipped / 0 FAIL. To wcześniejsze wyniki, nie testy tego przebiegu.

**Poprzednia paczka nie ma potwierdzonego odbioru Tomasza.** Zarówno checkpoint, jak i panel stanu mówią „czeka na odbiór”. Nie powtarzano wykonanych poprawek. Starszy CHECKPOINT-KM3.2.08.json opisuje nieaktualną blokadę TUS i nie został przyjęty jako bieżący stan. Dla kolejnego buildu `01a1c66c-93c7-7327-abc5-af665b279cf2` checkpoint podaje running; jego completed nie zweryfikowano.

## Kontrakt i bramki

Przygotowano jeden [kontrakt D2](/Users/mcrm-ai/wacrm-a/docs/codex/TASK-KM3-2-08-02B-D2.md): 13 pól, pełne ścieżki, jedna ewentualna poprawka 02B, test całego ekranu, funkcji i trwałości, warunki STOP. Kontrakt zapisano w repo, ponieważ kanoniczny katalog ~/.hermes/k3/zlecenia jest poza obszarem zapisu sandboxa. Nie zarejestrowano aktywnej paczki.

BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` pochodzi z ostatniego niezależnego odczytu produkcji z 18:05; hash surowej odpowiedzi jest zgodny. **Nie uzyskano świeżego potwierdzenia aktualnego BASE_SHA.** Nie podmieniono znacznika czasu ani danych źródłowych. W dostępnych narzędziach nie znaleziono konektora Hostinger do niezależnego nowego odczytu; nie czytano sekretów ani nie tworzono własnego klienta.

| Istniejąca bramka | Tryb | Wynik |
| --- | --- | --- |
| ~/.hermes/skills/software-development/k3-screen-delivery/scripts/zlecenie_gate.py | rzeczywista walidacja kontraktu, bez --lock | PASS, RC=0, 13 pól / 11 plików |
| ~/.hermes/k06/bramka_kod.py | --zlecenie … --repo /Users/mcrm-ai/wacrm-a --lock, bez --codex | FAIL, RC=1: prod-build.json starszy niż 15 min |

Bramka kodu zakończyła kontrolę przed swoim wywołaniem D2 i przed zapisem locka. Jej próba zapisu odmowy do ~/.hermes/k06/audit-bramka.jsonl została zablokowana przez sandbox (PermissionError). To dodatkowa granica środowiska, a nie PASS. Nie kopiowano ani nie zmieniano skryptów bramek, nie ustawiano tokenów, nie ponawiano po odmowie.

### Rzeczywisty log zlecenie_gate.py

```text
BRAMKA D2: PASS
 - plików w zakresie: 11 | kontrakt: 13 pól
DECYZJA: można uruchomić jednego Codexa.
```

### Rzeczywisty log bramka_kod.py

```text
BRAMKA KODU: FAIL
 - prod-build.json starszy niż 15 min — odczytaj build ponownie z API
DECYZJA: NIE uruchamiać Codexa.
Traceback (most recent call last):
  File "/Users/mcrm-ai/.hermes/k06/bramka_kod.py", line 331, in <module>
    sys.exit(main(sys.argv))
             ~~~~^^^^^^^^^^
  File "/Users/mcrm-ai/.hermes/k06/bramka_kod.py", line 288, in main
    return deny(perrs, path)
  File "/Users/mcrm-ai/.hermes/k06/bramka_kod.py", line 110, in deny
    log({"ts": __import__("time").strftime("%Y-%m-%dT%H:%M:%S"),
    ~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         "file": path, "decision": "DENY", "reasons": why})
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/mcrm-ai/.hermes/k06/bramka_kod.py", line 101, in log
    with open(AUDIT, "a", encoding="utf-8") as f:
         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
PermissionError: [Errno 1] Operation not permitted: '/Users/mcrm-ai/.hermes/k06/audit-bramka.jsonl'
```

## LIVE, wygląd, funkcje i trwałość

Istniejący [TEST LIVE — Lejek](https://test.makson.space/pipelines). **Adres nie został zweryfikowany w tym przebiegu i nie jest linkiem do nowej dostawy.** Po odmowie bramki zatrzymano pracę zgodnie ze zleceniem.

| Warunek odbioru | Wynik tego przebiegu |
| --- | --- |
| Rzeczywisty TEST LIVE i aktualny completed build | Niezweryfikowane |
| Dwa aktualne pełne zrzuty 1536×1024, nakładka i pixelmatch | Niewykonane |
| Minimum 90% zgodności całego ekranu | Nieudowodnione |
| Diff ramy <0,5% | Nieudowodnione |
| Krytyczne funkcje 100% | Nietestowane |
| Zapis i odczyt po przeładowaniu, sprzątnięcie rekordu testowego | Nietestowane; nie tworzono rekordów |
| PASS właściciela | Brak potwierdzenia |

Zachowane wcześniejsze dowody pełnego ekranu przy jednakowych wymiarach:

- [BIGIN — WZORZEC, 10.11 18:03, 1536×1024](/Users/mcrm-ai/.hermes/cache/k3/render/km3208/bigin_km3208_20261110-180319_1536.png).
- [mCRM — wcześniejszy TEST, 10.11 18:14, 1536×1024](/Users/mcrm-ai/.hermes/cache/k3/render/km3208/mcrm_km3208_20261110-181422_1536.png).

Starszy delta_final.json podaje mismatch regionów sprzed poprzedniej poprawki: pasek 11,02%, rail 13,8%, panel 9,38%, toolbar 20,05%, nagłówek kolumny 27,98%. **Nie są one nowym pomiarem, wynikiem pixelmatch całego ekranu ani dowodem zgodności ≥90%.** Późniejsze zgodne wartości D4–D6 również nie dowodzą zgodności całego ekranu. W checkpointach pozostaje otwarta różnica wyszukiwarki 672 vs 237px i 5 ikon vs 1; brak nowego pomiaru nie pozwala jej uznać za naprawioną.

Nie nadaję nowego statusu ekranu ZGODNY I DZIAŁA / DZIAŁA CZĘŚCIOWO / NIE DZIAŁA bez bieżącej obserwacji LIVE. Wynik zadania i bramki: FAIL.

## Koszty i granice

- Nie uruchomiono drugiego Codexa, subagentów ani modelu Nous. Nie wykonano płatnych wywołań API; dodatkowy koszt takich wywołań: 0 USD. Bieżąca praca odbyła się w obecnej sesji abonamentowej.
- Pasywny codex-limity.sh: 5h użyte 37%, pozostało 63%; tydzień użyte 57%, pozostało 43%; dodatkowe kredyty: brak, balance=0. Jest to odczyt ze skryptu w tej sesji, nie zmiana limitów.
- Pasywne hermes usage --provider nous --json: RC=1, środowisko Hermesa odmówiło zapisu ~/.hermes/installs/bf4d52a860ebc8b1/pm-runtime/.prepare.lock. Salda Nous nie potwierdzono. Nie zmieniano uprawnień ani nie ponawiano inną drogą.
- limity.json pozostał ze starym odczytem 18:02:18 (34%/51%); nie został odświeżony. Nawet przy świeżej produkcji nie stanowiłby świeżego dowodu dla bramki.

## Checkpoint zatrzymania

Bez zmian kodu aplikacji, produkcji, TEST, sekretów, limitów, ledgeru, danych i zabezpieczeń. Nie uruchomiono testów po odmowie bramki. Jedynymi lokalnymi artefaktami zadania są kontrakt D2 i ten raport.

Do wznowienia potrzebne są prawdziwe świeże odczyty wymagane przez istniejącą bramkę oraz dozwolony zapis jej kanonicznego zlecenia/audytu/locka. W tej sesji nie ma możliwości rozszerzenia sandboxa. Żaden warunek nie został zastąpiony fikcyjną datą, dodatkowym Codexem ani zgodą domniemaną. Po usunięciu blokady przez właściwe środowisko należy użyć tego samego kontraktu i istniejących bramek; nie odtwarzać zakończonych D4–D6.


## Dopisek — naprawa kontraktu KM3.2.08, 2026-11-10T19:42:17+01:00

**BRAMKA D2: PASS, RC=0 — wyłącznie naprawa i walidacja kontraktu.** Poprzedni FAIL bramki kodu i checkpoint powyżej pozostają historycznym wynikiem poprzedniego przebiegu. Nie uruchomiono ponownie bramki kodu ani kolejnego Codexa.

Gotowe zlecenie: `/Users/mcrm-ai/wacrm-a/docs/codex/TASK-KM3-2-08-02B-D2.md`. Zachowano tę samą paczkę KM3.2.08; uporządkowano ID, 13 pól, pełne ścieżki 12 istniejących plików (11 poprzedniego zakresu + sam kontrakt), opis istniejącego raportu, historyczność odczytów i tryb samej walidacji. Wymagania dalszego domknięcia ekranu pozostają zapisane, bez wykonywania ich w tym przebiegu.

Odczytano istniejący kontrakt, kanoniczne historyczne TASK-KM3.2.08.md, niniejszy raport, lokalne wymagania D2 oraz skrypty zlecenie_gate.py i bramka_kod.py. Uruchomiono oryginalny skrypt wskazywany przez bramkę kodu, bez modyfikowania mechanizmu bramek.

BASE_SHA: `0f7317df7d017d1c4d33412e29a4df9eee108583`. Porównanie prod-build.json z prod-build.raw.json potwierdziło ten sam commit, completed build `01a1aba4-0a96-73ba-8260-a57704acd0a3` i zgodność raw_sha256 `59a8cb60c0b591d42984cb08e4e5a98d9ea01c44eab75399dbb78cb67c6a3237`. Odczyt źródłowy nadal ma czas 10.11.2026 18:05; nie uzyskano nowego odczytu API Hostingera i nie zmieniano dat. To dowód zgodności z zachowanym rzeczywistym wdrożeniem, nie świeże potwierdzenie produkcji ani zgoda na kodowanie.

Polecenie (bez --lock, --release, --codex):

```sh
python3 /Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/scripts/zlecenie_gate.py /Users/mcrm-ai/wacrm-a/docs/codex/TASK-KM3-2-08-02B-D2.md --repo /Users/mcrm-ai/wacrm-a
```

Rzeczywisty wynik:

```text
BRAMKA D2: PASS
 - plików w zakresie: 12 | kontrakt: 13 pól
DECYZJA: można uruchomić jednego Codexa.
RC=0
```

Komunikat skryptu o możliwości uruchomienia Codexa jest standardowym wyjściem walidatora; bieżące polecenie właściciela zabrania jego uruchomienia i po PASS zakończono naprawę dokumentu. PASS D2 nie oznacza PASS bramki kodu, wyniku LIVE ani odbioru Tomasza.

Kontrola sum przed/po: wszystkie śledzone pliki repo, zewnętrzne checkpointy wymienione w kontrakcie, kanoniczne historyczne zlecenie, prod-build.json, surowa odpowiedź produkcji, limity.json i stan active_package.lock pozostały bez zmian. Poprzednia treść tego raportu zachowana bajt w bajt; dodano wyłącznie ten dopisek. Kod, historia, TEST, produkcja i sekrety bez zmian; bez nowej paczki i bez testów aplikacji.
