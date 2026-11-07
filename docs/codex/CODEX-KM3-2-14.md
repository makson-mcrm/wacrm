# KM3.2.14 — paleta i obramowania Bigin

07.11.2026: **kod gotowy lokalnie; odbiór NIEZAKOŃCZONY**. Testy i typecheck poprawne. Brak udanego builda i zrzutów. PASS nadaje wyłącznie Tomasz.

## Źródła i zakres

- WORKTREE: `/Users/mcrm-ai/wacrm-a`, czysty na wejściu, detached HEAD `a476a70f5b982f970b1182af10ee3d1509d8ebef`.
- BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem HEAD. Nie cofano worktree ani nie przełączano gałęzi `k3/bigin-02b-20261105` w innej kopii.
- Zlecenie KM3.2.14 oraz trzy obejrzane PNG Bigin z `/Users/mcrm-ai/.hermes/k3/render/`: `bigin_pipeline_1536.png`, `bigin_hash_contacts.png`, `bigin_card_contact.png`.
- Zastosowano skille `k3-screen-delivery` i `mcrm-wykonawca`. Szczegółowe zlecenie wyprzedza starsze instrukcje: żadnego commita, pusha ani publikacji.
- Specyfikacja różnicy: jedna wspólna paleta zamiast dotychczasowych powierzchni; bez zmiany geometrii, routingu, logiki danych lub flag.

## Zmieniono

Dokładnie siedem wskazanych źródeł oraz raport i lokalne artefakty istniejącego pulpitu.

| Token | Wartość |
| --- | --- |
| BRAND_SIDEBAR_BG | `#093E52` |
| BRAND_SIDEBAR_BG_ALT | `#0B4A63` |
| BRAND_PAGE_BG_PIPELINE | `#F9FBFC` |
| BRAND_PAGE_BG | `#FFFFFF` |
| BRAND_ROW_BG | `#FCFDFD` |
| BRAND_BORDER | `#E0E9EE` |
| BRAND_HOVER | `#F0F7FB` |
| BRAND_LINK | `#7EB5F4` |
| BRAND_INFO_BANNER | `#DFF9F3` |

Dotychczasowe tokeny `LIST_*` i `PIPELINE_CONTENT_BACKGROUND` wskazują wspólną paletę; obramowanie zmieniono z `#E8ECEF` na `#E0E9EE`. Wspólna tabela dostaje kolor linków i hover wierszy, także dla istniejących list korzystających z tego helpera.

`AppShell` ustawia tło Lejka i pozostałych ekranów, neutralne powierzchnie oraz obramowania. Nagłówek otrzymuje ciemne tło również poza dotychczasowymi trasami Bigin. Istniejący pasek informacyjny list ma `#DFF9F3`. Sidebar na desktopie i w mobilnym drawerze ma ten sam ciemny panel; aktywne menu i hover używają `#0B4A63`, aktywny tekst jest biały. Kolor tekstu treści korzysta z istniejącego `LIST_TEXT_COLOR`, aby jasna powierzchnia pozostawała czytelna także przy odziedziczonym trybie ciemnym.

Dzisiaj: tło wierszy, obramowanie, hover i linki z tokenów. Zadania: wspólne tokeny tabeli i linków. Inbox: białe panele, neutralne tła kontrolek, obramowania, wiersze rozmów, zaznaczenie/hover i linki; style pozostają ograniczone do wariantu Bigin.

Nie kasowano autorskich funkcji. Dotychczasowe gałęzie rozszerzeń i ich historyczne klasy emerald/slate pozostają w kodzie pod istniejącymi flagami `false`. Nie zmieniano flag ani plików bankowych, bazy, RLS, sekretów, `.env`, modeli AI lub zależności.

## Weryfikacja

| Kontrola | Wynik i dowód |
| --- | --- |
| `npm run typecheck` | RC=0; [log](km3-2-14-evidence/typecheck.log) |
| `npx vitest run src/lib/ui 'src/app/(dashboard)'` | RC=0, **158/158**, 3 pliki; [log](km3-2-14-evidence/vitest.log) |
| ESLint siedmiu źródeł | RC=0, 0 błędów, 2 zastane ostrzeżenia (`ClipboardList`, `DesktopWorkspaces`); [log](km3-2-14-evidence/lint.log) |
| `git diff --check` | RC=0 |
| Render pełnych stron z AppShell | RC=0; dane syntetyczne, mocki auth/routera/bazy, bez uruchamiania efektów sieciowych; [log](km3-2-14-evidence/render.log) |
| Lokalny `npm run build:webpack` | RC=1: pobieranie Inter, `ENOTFOUND fonts.googleapis.com`; [log](km3-2-14-evidence/build.log) |
| Zrzuty / hover w przeglądarce / DOM | **NIEPRZETESTOWANE**; [blokada](km3-2-14-evidence/browser.txt) |

Dodano 14 przypadków testowych: dziewięć dokładnych wartości HEX i pięć tras powłoki. Uzupełniono istniejące asercje trzech stron o użycie kolorów w rzeczywistym markupie, obramowania, wiersze, hover i linki. Testy powłoki sprawdzają też rzeczywisty Sidebar. Dotychczasowe testy przywracania dodatków po włączeniu flag pozostają poprawne. Nie testowano operacji na rzeczywistej bazie.

Pierwszy typecheck wykrył brak typu dla własnych zmiennych CSS w `AppShell`; poprawiono przez `CSSProperties`. Drugie sprawdzenie tego błędu i końcowe sprawdzenie finalnego kodu były poprawne. Nie powtarzano nieskutecznego builda ani startu Chromium bez zmiany przyczyny.

## Pulpit i granice dowodu

[Istniejący pulpit — lokalna wersja](../../public/review/status.html) ma bieżący stan i cztery pełne rendery HTML: [Dzisiaj](../../public/review/km3-2-14/dashboard.html), [Zadania](../../public/review/km3-2-14/tasks.html), [Inbox](../../public/review/km3-2-14/inbox.html), [Kontakty](../../public/review/km3-2-14/contacts.html). To rzeczywiste komponenty i CSS z `globals.css`, z fontem zastępczym Arial. Są to artefakty syntetyczne, bez publikacji. [Manifest](km3-2-14-evidence/manifest.json) wiąże je z hashami siedmiu źródeł.

**Brak nowych zrzutów, nakładki, mapy różnic, pomiaru DOM i potwierdzenia wizualnego 1:1.** Chromium headless zakończył się kodem `-6` przed udostępnieniem CDP, bez wyjaśniającego stderr. Alternatywne narzędzie CUA zgłosiło `The browser access host is unavailable`. Nie otwierano okien właściciela ani nie używano jego sesji/danych. Przyczyna awarii Chromium nie została ustalona.

Build wykonano raz w `/private/tmp/km3-2-14-build-source`, ze śledzonych źródeł z bieżącym diffem, bez `.env*`, z syntetycznym adresem i kluczem Supabase oraz istniejącymi zależnościami. Zatrzymał się na fontach przed końcowym uzupełnieniem wspólnego hover list i kolorów tekstu; nie jest dowodem kompilacji finalnego diffu. Nie zmieniano konfiguracji fontów poza zakresem. Wbudowane ponowienia pobrania fontu należą do Next. **Zdalnego builda TEST nie uruchamiano**, ponieważ zlecenie zabrania publikacji. Nie ma nowego UUID wdrożenia.

Znane braki z KM3.2.13 pozostają: podłączenie trzech tras do geometrii 65/49 i dodatki AI wewnątrz komponentów Inbox. Ta paczka zmienia kolory; nie deklaruje zamknięcia poprzedniego odbioru ani zgodności wszystkich elementów całej aplikacji z Bigin.

## Koszt i checkpoint

- Jeden bieżący przebieg abonamentowego Codexa, bez podzadań i nowej sesji modelu. Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Nie odczytywano salda ani poświadczeń Nous.
- Pasywny odczyt w trakcie: 5h 13% użyte / 87% pozostało, tydzień 12% / 88%. Odczyt przy końcowej weryfikacji: 5h 19% / 81%, tydzień 13% / 87%; [dowód](km3-2-14-evidence/limits.log). Resety: 07.11 23:43 i 13.11 10:24. Brak dodatkowych kredytów. Procenty są zaokrąglone i nie określają dokładnego kosztu zadania.
- HEAD pozostał `a476a70`; **nie wykonano commita, pusha ani publikacji**. Nie wyliczano fikcyjnego FINAL_SHA dla niezacommitowanego diffu.
- Checkpoint pozostaje w tym raporcie. `~/.hermes` jest poza dozwolonym zapisem tego sandboxa. Skill [k3-screen-delivery, linia 639](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md:639) wymaga: „Sandbox Codexa nie ma zapisu do `~/.hermes` — zlecenie ma kazać mu zostawić notatkę w repo”. Wpis do `~/.hermes/cache/k3/CHECKPOINT-*.md` ma zachować Hermes poza tym przebiegiem. Nie próbowano obejścia ograniczeń zapisu.

Punkt wznowienia KM3.2.14: zachować obecny diff, raport i pulpit; po usunięciu blokad środowiskowych wykonać build finalnych źródeł oraz prawdziwe zrzuty 1536×1024 i pomiary. Publikacja TEST wymaga odrębnego upoważnienia. Odbiór Tomasza pozostaje otwarty.
