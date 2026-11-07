# KM4.1 — kwalifikacja bankowa deala

07.11.2026. **Kod gotowy lokalnie; odbiór TEST NIEUKOŃCZONY. PASS nadaje wyłącznie Tomasz.**

## Stan i zakres

- Repo `/Users/mcrm-ai/wacrm-a`, detached HEAD `1ffbfc4702e6a53eaf1f21f654f38d888853b8bd`, zgodny z podanym WORKTREE. Drzewo na początku czyste. Podany BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem HEAD. Nie cofano wykonanych prac KM3.2.11 ani nie przełączano gałęzi.
- Zrealizowano bieżące zlecenie KM4.1; nie otwierano dodatkowych zadań z historycznej kolejki AGENTS.md.
- Odczytano skills `mcrm-wykonawca` i `k3-screen-delivery`, źródło `docs/banking-knowledge-mbank-foundation.md`, istniejącą kartę, flagi i testy powierzchni. Obejrzano wskazany `bigin_card_deal.png`: przedstawia formularz tworzenia transakcji nad kartą kontaktu, nie pełną kartę istniejącego deala. Nie deklarowano zgodności graficznej na podstawie tego obrazu.
- Rozbieżność ścieżek w zleceniu: komponent utworzono w `src/components/deals/bank-qualification.tsx`, zgodnie z zamkniętą listą plików. Nie utworzono drugiego komponentu w `src/lib/banking/`.

## Efekt w kodzie

| Plik | Zachowanie |
| --- | --- |
| `src/lib/banking/knowledge.ts` | Rejestr mBanku z produktami, wymaganiami, etykietą, źródłem i datą odczytu. Dokument źródłowy nie zawiera konkretnych produktów, progów kredytowych ani procedury dokumentowej — oznaczono BRAK DANYCH. Fakty opisują routing i wymagany kontekst, nie zdolność kredytową. Data 07.11 oznacza odczyt pliku repo, nie sprawdzenie aktualnej oferty banku. |
| `src/lib/banking/qualify.ts` | Czysta funkcja `qualifyDeal(deal, knowledge)` pokazuje fakty rejestru i braki produktu, etapu oraz następnego kroku. Statyczna etykieta AI nie wystarcza do uznania wyniku za wniosek modelu. Oddzielna funkcja analizy lokalnej zwraca WNIOSEK AI dopiero po odpowiedzi lokalnego wykonawcy. |
| `src/components/deals/bank-qualification.tsx` | Panel z wyborem mBanku, dziewięcioma pozycjami, kolorowymi etykietami, uzasadnieniami, źródłami i datami. Analiza uruchamiana ręcznie; wynik nie jest zapisywany. Zmiana kontekstu lub banku usuwa poprzedni wynik i anuluje poprzednie żądanie. |
| `src/app/(dashboard)/deals/[id]/page.tsx` | Panel pod czterema istniejącymi zakładkami w prawej kolumnie wariantu Bigin. Nie zmieniono pól, zakładek ani autorskich sekcji karty. |
| `src/lib/ui/surface-flags.ts` | Dodano tylko `bankQualification: true`; `cardExtensions` i pozostałe flagi pozostają `false`. |
| `src/lib/banking/qualify.test.ts` | 18 testów syntetycznych: fakty, puste pola, niewymyślanie kryteriów, render modułu, lokalny POST, błędy, przekierowania i anulowanie. |

## LOCAL-FIRST

Jedynym wyjściem sieciowym nowego modułu jest `POST http://127.0.0.1:11434/api/generate`, model `SpeakLeash/bielik-4.5b-v3.0-instruct:Q8_0`, `stream: false`. Adresu ani modelu nie można nadpisać danymi deala lub rejestru. Żądanie ma `redirect: error`, pomija credentials i referrer, limit czasu 60 sekund oraz obsługę anulowania. Brak retry i adaptera chmurowego.

Prompt zawiera tylko produkt, nazwę etapu, następny krok i jawny rejestr. Nie przekazuje całego obiektu deala, kontaktu, dokumentów ani danych logowania. Odpowiedź jest zwykłym tekstem React, bez HTML i zewnętrznych linków. Nie ma logowania treści ani zapisu do bazy.

Przy niedostępności, błędzie HTTP, niepoprawnej/pustej odpowiedzi lub przekierowaniu: **BRAK DANYCH — model lokalny niedostępny**. Testy kontrolują dokładny adres każdego modelowego `fetch` i brak drugiego wywołania przy błędzie. Są to dowody dla nowego modułu, nie audyt wszystkich historycznych ścieżek AI aplikacji.

`127.0.0.1` oznacza komputer przeglądarki użytkownika. Działanie z domeny TEST wymaga uruchomionego tam Bielika oraz dozwolonego połączenia lokalnego przez przeglądarkę/Ollamę. Nie zmieniano CORS, CSP, uprawnień, konfiguracji modeli ani nie instalowano modelu.

## Weryfikacja

| Kontrola | Wynik i dowód |
| --- | --- |
| `npm run typecheck` | Drugi przebieg: RC=0, `/private/tmp/km4-1-typecheck-final.log`. Pierwszy wykrył typ opcjonalnego pola wymagania; poprawiono typ rejestru. |
| `npx --no-install vitest run src/lib/banking src/lib/ui` | 6 plików, **98/98 testów**, RC=0; oba przebiegi zielone, końcowy log `/private/tmp/km4-1-tests-final.log`. W tym 18 nowych testów KM4.1. |
| ESLint czterech nowych plików źródłowych | RC=0, bez błędów i ostrzeżeń; `/private/tmp/km4-1-lint.log`. |
| `git diff --check` | Bez błędów. |
| Lokalny build TEST, `npm run build:webpack` | RC=0. Izolowana kopia `/private/tmp/km4-1-build`, bez `.env` i sekretów, syntetyczne zmienne, wyłączona telemetria i istniejące lokalne pliki fontów zamiast pobierania Google Fonts. Log `/private/tmp/km4-1-build.log`; BUILD_ID `QZgy7p_bmjlGpTOkGvHJw`. Porównanie bajtowe sześciu plików: 6/6 zgodne z worktree, manifest SHA-256 `/private/tmp/km4-1-source-manifest.json`. |
| Ostrzeżenia builda | Istniejący middleware/Edge Runtime i dynamiczna zależność next-intl. Użyto zastanych zależności bez instalacji; build zgłasza Next 16.3.6, a manifest deklaruje 16.4.1. |
| Faktyczna dostępność modelu | `GET http://127.0.0.1:11434/api/tags`: curl RC=7, HTTP 000, brak połączenia. Nie wykonano rzeczywistej analizy Bielikiem. |

## Ekran TEST i blokery

**Brak działającego linku do karty zawierającej tę paczkę.** Nie podano starszej karty TEST jako dowodu nowego kodu. Trasa po przyszłym wdrożeniu: `/deals/<id-deala-testowego>`; nie tworzono fikcyjnego deala w rzeczywistej bazie.

Wykonano maksymalnie dwie próby dodatkowego renderu pełnej karty: pierwsza nie zastosowała mocka nawigacji w harnessie poza repo, druga zakończyła się odmową zapisu `node_modules/.vite-temp` przez sandbox. **STOP tej metody**, logi `/private/tmp/km4-1-preview/render.log` i `render-final.log`. Istniejące testy powierzchni karty przechodzą; nie są dowodem wizualnym.

Pomocniczy lokalny bundle samego panelu zbudował się poprawnie, ale serwer na `127.0.0.1:43141` dostał `PermissionError: Operation not permitted` przy bind. Jedna próba przeglądarki headless również zakończyła się odmową uprawnień systemowych. Logi `/private/tmp/km4-1-preview/server.log` i `browser.log`. Nie ponawiano z podwyższonymi uprawnieniami i nie używano okien właściciela. Test klikany, zrzut pełnej karty i rzeczywista analiza pozostają **NIEPRZETESTOWANE**.

Nie wykonano publikacji na `test.makson.space`, ponieważ bieżące zlecenie jawnie zabrania publikacji. Nie ma zdalnego buildu ani biznesowego PASS. Następny krok odbioru to uruchomienie przygotowanego kodu na dozwolonym TEST z syntetycznym dealem i lokalnym Bielikiem, następnie pokazanie pełnej karty Tomaszowi.

## Koszt i checkpoint

Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**; salda całego konta Nous nie odczytywano. Jedna bieżąca sesja abonamentowego Codexa, bez dodatkowych sesji, podagentów, płatnego API i zakupów.

Pasywne odczyty Codexa: przed kodowaniem pozostało **87% 5 h / 93% tygodnia**, po weryfikacji **82% / 92%**. Reset 5 h: 07.11.2026 14:14; tygodnia: 13.11.2026 10:24. Źródło: `mcrm-wykonawca/scripts/codex-limity.sh`, rollout `rollout-2026-11-07T10-09-53-01a1b545-81d8-7e23-b52a-efe05d3a7151.jsonl`. Są to odczyty zaokrąglone, nie koszt w USD.

Docelowe `~/.hermes/cache/k3/CHECKPOINT-*.md` jest poza dozwolonym obszarem zapisu. Skill [k3-screen-delivery](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md:639) nakazuje: „Sandbox Codexa nie ma zapisu do `~/.hermes` — zlecenie ma kazać mu zostawić notatkę w repo”. Niniejszy raport jest checkpointem Codexa; nie twierdzono, że zapisano plik w cache Hermesa.

Pozostawiono wyłącznie sześć plików implementacji i ten raport. Bez commita, pusha, publikacji, zmian `.env`, sekretów, zależności, bazy, RLS ani danych rzeczywistych.
