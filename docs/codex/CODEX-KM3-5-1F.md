# KM3.5.1F — scalona poprawka UX Lejka i nagłówka

Data: 09.11.2026. Kontynuacja **tej samej paczki KM3.5.1** według bieżącego polecenia właściciela. Stan techniczny: **typecheck RC=0; Vitest RC=0, 2332 PASS / 0 FAIL / 1 istniejący skip (2333)**. Nie jest to PASS wizualny.

## Stan wejściowy i zakres

Worktree `/Users/mcrm-ai/wacrm-a`, detached HEAD `d5df333f85588326ee1cf692ac842d05d23eecb0`; drzewo wejściowe czyste. Kontrakt: `/Users/mcrm-ai/.hermes/k3/zlecenia/TASK-KM3.5.1.md`, rozszerzony bieżącym poleceniem (identyczna treść w `PROMPT-KM3.5.1F.md`). BASE_SHA produkcji: `0f7317df7d017d1c4d33412e29a4df9eee108583`.

Zachowano moduły menu mCRM i font Inter. Nie zmieniono danych, modelu, API, zapytań ani wartości `surfaceFlags`. Nie uruchamiano serwera dev, commita, pusha, publikacji ani wdrożenia na produkcję lub TEST.

Zmiany produkcyjne w kodzie:

| Plik | Zmiana |
| --- | --- |
| `src/components/layout/header.tsx` | Widoczne logo i tytuł modułu, kompaktowe istniejące Dodaj, linki Zadania/Powiadomienia/Ustawienia, menu Pomoc. Zachowano konto, motyw i wylogowanie. |
| `src/app/(dashboard)/pipelines/page.tsx` | Plan sprzedaży otwiera istniejące `PipelineSettings`; toolbar otrzymuje obecny stan strony i callbacki. Usunięto konkurencyjny skrót ⌘K filtra lokalnego. |
| `src/components/pipelines/pipeline-board.tsx` | Wspólny `PipelineToolbar`: Wszystkie Transakcje → wybór istniejącego lejka; Czas Utworzenia → istniejące sortowanie; + Transakcja → istniejący formularz. |
| `src/components/pipelines/deal-card.tsx` | Jednowierszowy tytuł z tooltipem, znaczniki wiersza sprawy/kontaktu do siatki 60 px. Te same dane, linki i handlery. |
| `src/components/layout/global-add.tsx` | Opcjonalny `compact` zmienia prezentację istniejącego plusa. Lista akcji i wariant dolnej nawigacji pozostają te same. |
| `src/components/layout/global-crm-search.tsx` | Placeholder `Szukaj (⌘K)`, ref wejścia i listener ⌘K/Ctrl+K z cleanupem. Istniejące zapytania i wyniki pozostają bez zmian. |
| `src/app/globals.css` | Ikony nagłówka, zwarty Inter, siatka karty i toolbar w jednym rzędzie; panel filtrów dostępny na każdej szerokości. |

## Podłączenie każdego elementu do istniejącej akcji

| Element | Istniejąca akcja / cel | Dowód |
| --- | --- | --- |
| Logo mCRM | `Link` → `/dashboard` | Test nagłówka sprawdza href. Tytuł modułu jest tekstem informacyjnym. |
| `+` nagłówka | Ten sam `GlobalAdd`, tryb `compact` | Test sprawdza użycie komponentu i wszystkie sześć dotychczasowych celów poniżej. |
| Dodaj: Aktywność / Deal / Kontakt / Firma / Zadanie / Spotkanie | `/quick-call`, `/pipelines?new=deal`, `/contacts?new=contact`, `/companies?new=company`, `/tasks?new=task`, `/calendar?new=event` | Bez zmian w routingu. Test porównuje komplet hrefów istniejącego menu. |
| Zadania | `/tasks` | Test href i braku klasy ukrywającej ikonę. |
| Powiadomienia | `/notifications` | Jak wyżej; pojedynczy link na wszystkich szerokościach. |
| Ustawienia | `/settings` | Test href. |
| Pomoc | Istniejący `DropdownMenu`; pozycje jako `DropdownMenuItem render={<Link ... />}` | Test obecności triggera i obu celów menu. |
| Pomoc → Asystent / Audyt CRM | `/assistant`, `/audyt-crm` | Test hrefów elementów `render`. |
| Szukaj (⌘K) | Ten sam `GlobalCrmSearch` i wyszukiwanie deali, kontaktów i firm | Test zmienia zapytanie przez handler inputa, wykonuje debounce z mockami odczytu i sprawdza linki wyników. |
| ⌘K / Ctrl+K | `inputRef.current.focus()` globalnej wyszukiwarki | Test wywołuje zarejestrowany listener obu skrótów; sprawdza fokus, `preventDefault`, respektowanie modala i odpięcie listenera. |
| Wyniki wyszukiwarki | `/deals/:id`, `/contacts?open=:id`, `/companies?open=:id` | Test sprawdza istniejące cele oraz zamknięcie wyników klawiszem Escape. |
| Motyw | Zachowany `ModeToggle` → `toggleMode` | Komponent i handler niezmienione. |
| Konto → profil / ustawienia / wylogowanie | `/settings?tab=profile`, `/settings?tab=whatsapp`, `signOut` | Dotychczasowe menu zachowane; test wywołuje handler wylogowania. |
| Potoki zespołu: `+` | `setNewPipelineOpen(true)` → dotychczasowy dialog → `handleCreatePipeline` | Test kliknięcia ustawia istniejący stan dialogu; kod tworzenia bez zmian. Uprawnienie nadal `edit-settings`. |
| Plan sprzedaży | `setSettingsOpen(true)` → `PipelineSettings` dla wybranego lejka | Test kliknięcia sprawdza `open`, tożsamość `pipeline` i przekazane etapy. Bez lejka przycisk jest nieaktywny. |
| Lista lejków | `setSelectedPipelineId(pipeline.id)` | Test wybiera drugi lejek w panelu i sprawdza ten sam wybór w toolbarze. Istniejący efekt ładowania etapów/deali bez zmian. |
| Wszystkie Transakcje ▾ | `DropdownMenu` z istniejących `pipelines` → ten sam `setSelectedPipelineId` | Test wybiera lejek w menu i odczytuje stan strony. Aktualna pozycja oznaczona `aria-current`. |
| Czas Utworzenia ▾ | `setSortBy` → istniejące `visibleDeals` | Test zmienia natywny select i sprawdza kolejność kart dla daty/nazwy bez mutacji danych. Istniejące testy obejmują też kwotę. |
| + Transakcja | `handleAddDeal()` → dotychczasowy `DealForm` | Test klika przycisk toolbara, sprawdza otwarcie tego samego formularza, pipelineId i pierwszy etap. Zachowano bramkę roli; bez wybranego lejka przycisk jest zablokowany. |
| Filtry | Natywne `details/summary` → istniejące `search`, `dealView`, `ownerFilter` | Dotychczasowe testy wyszukiwania/statusu/właściciela zachowane. Filtry w jednym popoverze, bez duplikacji kontrolek. |
| Więcej → Resetuj widok | Istniejące settery resetujące wyszukiwanie, status, właściciela i sortowanie | Ten sam handler strony. |
| Więcej → Odśwież tablicę | `refreshStages()` i `refreshDeals()` | Ten sam handler i istniejące odczyty. |
| Więcej → Zarządzaj lejkami | `setSettingsOpen(true)` | Ten sam panel co Plan sprzedaży. |
| Karta: klik / Enter / Spacja | `onEdit(deal)` → `handleEditDeal` → `router.push('/deals/:id')` | Nowy test wywołuje klik i Enter aż do `router.push`; dotychczasowa obsługa Spacji zachowana. |
| Tytuł karty | Dotychczasowy link `/deals/:id`, nowa karta przeglądarki | Test href i target; zachowana izolacja kliknięcia od rodzica. |
| Drag & drop | Dotychczasowe `onDealMoved` → `updateDeal` | Dotychczasowe testy prawidłowych/nieprawidłowych celów bez zmian. |
| Dodatki karty pod flagą | `CallAction` → `tel:`, `WhatsAppAction` → istniejące `/quick-call?...` | Testy obu wartości flagi nadal sprawdzają telefon, wiadomość, datę aktywności i akcję dodawania w kolumnie. |

Nie dodano nowych atrap ani nowych endpointów. Wyjątki nieaktywności wynikają z istniejących uprawnień lub braku wybranego lejka.

## Geometria i typografia

Zachowano istniejące tokeny KM3.5.1: pasek 48/43 px, rail 64/63 px, panel potoków 221/199 px, początek tablicy y=115, desktop x=295, telefon x=272, kolumny 230 px, karta 220 px, przyciski 32/29 px. Breakpoint ramy kompaktowej nadal 1280 px; dolna nawigacja nadal do 767 px.

Karta rdzenia ma `box-sizing: border-box`, wiersze 16 + 14 + 16 px, padding pionowy 2 × 6 px i obramowanie 2 × 1 px = **60 px**. Tytuł Inter 13/16 px, weight 500; opis/kontakt 11/14 px; kwota 12/16 px, weight 500; data 11/16 px. Sprawa i kontakt współdzielą drugi wiersz, kwota i data trzeci. Długie treści mają ellipsis; tytuł, opis i kontakt zachowują pełną treść w tooltipie.

Reguły zwartej karty są ograniczone do istniejącego `[data-bigin-pipeline-cards]`. `AppShell` ustawia go tylko przy `pipelineExtensions=false`; rozszerzony wariant zachowuje dotychczasowy układ i dostępność akcji. Nie zmieniono flag ani kodu shellu.

Toolbar ma jeden rząd z `flex-wrap: nowrap` i poziomym przewijaniem przy braku miejsca. Na telefonie zachowuje tekst etykiet i przyciski 29 px. Globalne menu rozwijają się przez istniejące portale, filtry mają pozycjonowanie fixed i ograniczenie do viewportu. Tytuł modułu i nazwa konta zwijają się na małych ekranach; akcje pozostają dostępne.

## Testy i weryfikacja

| Sprawdzenie | RC | Wynik / dowód |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów; `/tmp/km3-5-1f-typecheck.log` |
| `npx vitest run` — końcowy przebieg | **0** | **144 pliki, 2332 PASS / 0 FAIL / 1 istniejący skip (2333)**; `/tmp/km3-5-1f-vitest.log` |
| Zestaw czterech plików komponentów | **0** | 201 PASS / 0 FAIL; `/tmp/km3-5-1f-targeted.log` |
| ESLint zmienionych komponentów i nowego testu | **0** | 0 błędów; 1 wcześniejsze ostrzeżenie o zbędnym `eslint-disable` w niezmienionym fragmencie strony; `/tmp/km3-5-1f-eslint.log` |
| `git diff --check` | **0** | Brak błędów whitespace. |
| Porównanie z HEAD: `surface-flags.ts`, `layout-geometry.ts`, `sidebar.tsx`, `src/types`, `src/lib/deals`, `src/app/api` | **0** | Brak zmian. |
| Porównanie bloków źródła strony z HEAD | **0** | Ładowanie, tworzenie, aktualizacja, filtry i algorytm sortowania identyczne; jedyna usunięta logika to stary lokalny listener ⌘K. |

Zmiany testów: nowy `src/components/pipelines/pipeline-ux-actions.test.tsx` (**14 przypadków**) oraz aktualizacja `pipeline-board.test.tsx`, `pipelines/page.test.tsx`, `layout/app-shell.test.tsx`, `lib/mcrm/ux-board.test.ts`. Liczba testów wzrosła z 2319 do 2333. Nie usunięto testów ani nie dodano skipów. Asercje układu sprawdzają tokeny 32/29, siatkę i typografię karty 60 px, jeden rząd i zachowanie flag. Przegląd React: listenery mają cleanup, akcje korzystają z bieżącego stanu strony, istniejąca lista wyników nie jest mutowana, kontrolki mają etykiety dostępności.

**Granica dowodu:** testy interakcji działają w środowisku Node i wywołują rzeczywiste handlery z komponentów przez harness stanu. Testy linków sprawdzają cele nawigacji, a nie przejście w przeglądarce. Testy CSS i SSR nie są pomiarem renderu DOM ani dowodem zgodności pikselowej z Bigin.

## Bramki, limity i checkpoint

- Pasywny `codex-limity.sh`: RC=0, okno 5 h użyte 38% / **62% zapasu**, tydzień użyte 43% / **57% zapasu**, dodatkowe kredyty 0. Źródło: zapis `rollout-2026-11-09T23-05-52-01a1c258-a7c3-7451-8fb1-7180a9fa60b0.jsonl`; jest to odczyt zapisanego limitu przed pracą.
- `hermes usage --provider nous --json`: RC=1, odmowa zapisu `.prepare.lock` poza writable roots. Saldo Nous niezweryfikowane. Nie używano Nous ani płatnego API do kodowania/testów.
- `bramka_kod.py --zlecenie .../TASK-KM3.5.1.md --repo /Users/mcrm-ai/wacrm-a --lock`: RC=1, D2 zwróciła błąd; dodatkowo odmówiono zapisu `audit-bramka.jsonl` poza sandboxem. Bezpośrednie sprawdzenie D2 doszło do zapisu `active_package.lock` i zakończyło się `PermissionError`, bez komunikatu walidacyjnego. Istniejący lock wskazuje tę samą paczkę od 21:10:13. **Nie uzyskano nowego PASS bramki**, nie zmieniano jej plików ani locka. Kontynuowano bieżącą, jawnie zleconą poprawkę tej samej paczki w aktualnej sesji Codexa; nie uruchamiano kolejnego procesu Codexa.
- Próba pomiaru `pomiar_pw.py` wskazanym interpreterem: **RC=1, `connect EPERM 127.0.0.1:9400`**. Odczytano istniejący `render/ii1/bigin_measure.json` i zatwierdzone tokeny z AGENTS.md. Nie zmieniano sesji przeglądarki właściciela.
- **Visual Diff ramy: NIEZMIERZONY. Nowa wersja na TEST: niewdrożona. PASS wizualny: nieprzyznany.** Brak świeżego pomiaru uniemożliwia podanie procentu zgodności. Nie podano linku odbioru.
- Zastosowano wskazane w kontrakcie `mcrm-wykonawca`, `k3-screen-delivery` i przegląd `vercel:react-best-practices`, z nadrzędnością bieżących decyzji i AGENTS.md. Przed edycją przeczytano lokalny przewodnik Next.js `01-directives/use-client.md`.

Checkpoint zapisano w tym raporcie wewnątrz dozwolonego worktree. Scalona poprawka jest lokalna, po technicznej weryfikacji; wdrożenie TEST i pomiar wizualny pozostają poza wykonanym zakresem tego przebiegu. Ostateczny PASS ekranu należy wyłącznie do Tomasza.
