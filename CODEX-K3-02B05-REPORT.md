# K3-02B-05 — Lejek: komunikat błędu i Kontakt na karcie Deala

WYKONANE lokalnie. Odbiór Recenzenta 02 i właściciela oraz weryfikacja wizualna LIVE pozostają NIEZWERYFIKOWANE.

## Źródła i punkt wyjścia

- Zakres: zadanie właściciela K3-02B-05, KM3; dostarczony opis porównania Bigin i LIVE `01a1a333` przy 1536×1024. Nie odczytywano danych klientów.
- Zadany BASE_SHA: `ebd39377e67a88cc93112c65c9f4f845847bb0a4`. Obiekt niedostępny lokalnie (`git cat-file -t`: exit 128); nie potwierdzam zgodności tej kopii z tym SHA.
- Rzeczywisty HEAD przed/po: `5a496b8134d9a4a209e223eb1b3a9441d262453a`. Brak nowego FINAL_SHA — bez commita.
- Odczytano AGENTS.md, checkpoint `~/.hermes/cache/k3/CHECKPOINT-K3-01-20261103-0102.md`, skill `k3-screen-delivery` z sekcją UXKIN oraz [ui-from-screenshot](https://raw.githubusercontent.com/uxkin/agent/main/.agents/skills/ui-from-screenshot/SKILL.md). Checkpointu nie zmieniano: jest poza zakresem plików i zapisywalnym obszarem tej sesji.
- Odczytano lokalną dokumentację Next.js dotyczącą obsługi błędów.

## Różnica → decyzja → wynik testu

| Różnica | Decyzja | Dowód |
|---|---|---|
| Fałszywe „Nie wczytano lejków: Brak przypisanego konta.” | Dotychczasowy bootstrap odrzuca operację przy pustym `accountId`, zanim nastąpi pobranie. W tym przypadku nie ustawiamy błędu pobrania. Nie zmieniono bootstrapu ani kolejności żądań. | Test chwilowego braku konta, następnie udanego odczytu; brak banera i fałszywego toastu. |
| Komunikat prawdziwego błędu | Zamiast toastu użyto stanu `pipelineError` i warunkowego `role="alert"`. Stan pochodzi z istniejących bloków catch; sukces inicjalizacji lub odświeżenia go czyści. Treść pozostaje `Nie wczytano lejków: ${crmErrorMessage(error)}`. | Test odrzuconego pobrania z tekstem błędu i test błąd → sukces. |
| Brak Kontaktu pod tytułem | Dodano wiersz z relacji `deal.contact`: przycięte `name`, a gdy jest puste — imię i nazwisko. Klasy `truncate text-xs text-slate-600`; pełna nazwa w `title`. Bez zastępowania nazwy numerem telefonu. | Testy desktop/mobile kolejności tytuł → Kontakt → kwota → data, akcji oraz wariantu imię + nazwisko. |
| Pusty Kontakt | Nie powstaje element wiersza dla braku relacji, pustego obiektu, pustej nazwy ani samych spacji. | Pięć wariantów, każdy sprawdzony na desktop i mobile. |
| Kolumny, sumy, liczniki i akcje | Zachowano istniejące komponenty i logikę. | Istniejące testy liczby kolumn (3 i 6), sum/liczników, kolorów, drag&drop i nakładki; testy ZADZWOŃ/WIADOMOŚĆ. |

Prawdziwy błąd pozostaje widoczny także wtedy, gdy tablica przechowuje dane z poprzedniego udanego pobrania. Sama obecność kart nie służy do ukrywania błędów kolejnego odczytu.

## Zakres

Zmiany tej paczki wyłącznie w:

- `src/components/pipelines/pipeline-board.tsx` — nazwa Kontaktu w istniejącym `PipelineDealCard`.
- `src/app/(dashboard)/pipelines/page.tsx` — stan i prezentacja błędu lejków.
- `src/app/(dashboard)/pipelines/page.test.tsx` — 11 nowych przypadków i syntetyczny harness do wykonania efektu pobrania.
- `CODEX-K3-02B05-REPORT.md` — ten raport.

Nie zmieniono zapytań, filtrów, RLS, konfiguracji, zależności, tras, geometrii, kolorów etapów ani plików Meta/WhatsApp. Zastane zmiany AGENTS.md, CODEX-K3-01-A-REPORT.md oraz nieśledzone zlecenia i public/review/lejek.html pozostawiono.

## Weryfikacja

- `npx vitest run "src/app/(dashboard)/pipelines/page.test.tsx"`: **62/62 PASS**, w tym 11 nowych przypadków. Dane syntetyczne; próby sieci i użycia bazy blokowane i weryfikowane w harnessie.
- `npm run typecheck -- --incremental false`: **PASS**, exit 0. Wyłączono wyłącznie zapis cache kompilatora.
- ESLint na trzech plikach TSX: **0 błędów**, jedno zastane ostrzeżenie o nieużywanym `eslint-disable` przy czyszczeniu etapów.
- `git diff --check`: **PASS**.
- Pierwszy przebieg: 60/62; dwie nowe asercje kwoty zakładały polski separator, podczas gdy istniejący formatter korzysta z locale środowiska. Skorygowano wyłącznie asercję; formatowania kwot nie zmieniano.

## UXKIN, koszt i ograniczenia

Wykorzystano istniejące `PipelinesPage`, `PipelineBoard`, `PipelineDealCard` i `StageSummary`. Dodano jedynie warunkowy alert i wiersz nazwy. Testy SSR sprawdzają oba warianty tablicy, ale nie mierzą pikseli ani faktycznego obcięcia tekstu w przeglądarce. Nie wykonywano porównania obrazów przy 1280/1440/1536 px; samych zrzutów Bigin/LIVE nie załączono do zadania. Nie deklaruję zgodności wizualnej z MASTER 00S ani PASS LIVE.

Jedna bieżąca sesja Codexa, bez dodatkowych agentów, Nous i API modeli. Dostępny odczyt sesji z 03.11.2026 22:27:58 UTC: plan Plus, użycie 5h 7%, tygodnia 97%. Nie jest to pomiar PRZED rozpoczęciem prac; brak podstaw do podania różnicy zużycia. Saldo Nous nieodczytane, nie podaję go jako zera.

Nie wykonano commita, pusha, publikacji ani operacji na bazie. Raport nie zmienia statusu checklisty i nie stanowi odbioru Recenzenta 02 ani właściciela.
