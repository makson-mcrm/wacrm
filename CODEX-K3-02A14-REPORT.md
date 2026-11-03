# K3-02A-14 — etap B: korekty robocze, odbiór nieukończony

## ZROBIONE

KM3 / K3-02A-14, 03.11.2026. Korekta w trzech dozwolonych plikach kodu
oraz aktualizacja tego raportu. Bez zmian logiki, etykiet, tras, zapytań,
RLS, sekretów, zależności i `layout-geometry.ts`. Bez commita, pusha i publikacji.
Bramki ani audytu nie uruchamiano: przyjęto PASS przekazany w aktualnym zleceniu
właściciela, nadrzędnym wobec wcześniejszego raportu blokady tej samej paczki.

Źródła: lokalne `02A.jpg` FINAL-PASS (1536×1024), `MAPA-UXKIN-02A.md`,
`MAPA-02A.md`, geometria 00S 160/56/24/16/12 oraz
[k3-screen-delivery, sekcja UXKIN](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md).
Kolory docelowe pochodzą z próbek podanych w zleceniu; nie wykonano nowego
pomiaru ΔE ani nie deklaruje się zgodności obrazu.

Zlecony BASE_SHA: `f11ed6799bf75130deb5baa6b2bcbf42b99c6029`.
Zastany lokalny HEAD: `d1b3ef103a772e3845008cc7def7ccdeda0f1959`.
Pracowano na zastanych plikach, bez fetch, checkoutu i odtwarzania poprzednich paczek.
Diff opisuje zmiany względem lokalnego HEAD, nie potwierdza zgodności obu baz.

- Powłoka 02A korzysta z istniejących tokenów. Nadpisania ogranicza
  `[data-slot='app-shell']:has([data-contact-detail-view])`; sam widok dostaje
  te same tokeny. Pozostałe ekrany bez otwartej karty nie otrzymują nadpisań.
- Menu desktop ma `background-color: var(--sidebar)`: ta reguła jest konieczna,
  ponieważ istniejący Sidebar używa również sztywnej klasy tła.
- Treść używa `bg-app-surface`, siedem sekcji `bg-card border-border`.
  Istniejące karty info i Next action otrzymują powierzchnię/obramowanie z tokenów.
  Zachowano ich geometrię, promienie i grubości obramowań.
- Nagłówek: `py-3 → py-2.5` (12 → 10 px), `min-h-[85px] → min-h-[80px]`.
  Akcje wyrównano przez `items-center`; zachowano wszystkie dane, elementy i akcje.
  80 px jest minimum CSS; rzeczywista wysokość wymaga pomiaru DOM.
- Tytuły pięciu kart info i ośmiu sekcji kolumn: 12.5 px / 600;
  wartości kart info: 13 px / 500; podtytuły: 11 px / 400.
  Typografia nagłówka klienta pozostaje bez zmian. Treści wierszy sekcji,
  statusy i metadane zachowują swoje istniejące style.
- Cztery akcje otrzymują wspólne selektory potomne `hover:` / `focus-visible:`:
  obrys `solid 2px` w kolorze `--ring`. Jawne `outline-solid` zastępuje
  `outline-none` wspólnego Button; `focus-visible:ring-0` wyłącza dodatkowy
  standardowy pierścień, aby nie dublować obrysu. Obrys nie zmienia geometrii.

Lista nadpisanych istniejących tokenów:

| Token | Wartość 02A |
| --- | --- |
| `--background` | `#f4f5f7` |
| `--foreground` | `#1b2730` |
| `--app-surface` | `#f8f9fb` |
| `--sidebar` | `#05322b` |
| `--sidebar-foreground` | `#ffffff` |
| `--card` | `#fafafa` |
| `--card-foreground` | `#1b2730` |
| `--popover` | `#fafafa` |
| `--popover-foreground` | `#1b2730` |
| `--border` | `#e6e9ee` |

Nie dodano tokenów ani systemu motywu; `--ring` jest używany bez zmiany wartości.

`git diff --stat -- <trzy dozwolone pliki kodu>`:

```text
 src/app/globals.css                                |  43 ++++++
 .../contacts/contact-detail-view.test.tsx           | 172 ++++++++++++++++++++-
 src/components/contacts/contact-detail-view.tsx    |  20 +--
 3 files changed, 218 insertions(+), 17 deletions(-)
```

Raport jest zastanym plikiem nieśledzonym, więc nie występuje w zwykłym
`git diff --stat`. Zastane zmiany `CODEX-K3-01-A-REPORT.md` oraz nieśledzone
`docs/codex/TASK-K3-02A14.md` i `package-lock.json` pozostawiono bez edycji.

## CZY CRM DZIAŁA

| Kontrola końcowa | Wynik |
| --- | --- |
| `npm run test` | PASS — 143 pliki, 1997 testów PASS, 1 opcjonalny test renderu pominięty; 37.13 s |
| `npm run typecheck` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 błędów, 43 ostrzeżenia |
| Nowe błędy/ostrzeżenia lint | 0; logi PRZED i PO identyczne |
| Render / DOM | NIEZWERYFIKOWANE — osobna próba przeglądarkowa zakończona błędem środowiska |

Bateria końcowa uruchomiona o 11:01:32 CET. Pominięty test to wyłącznie
opcjonalny test przeglądarkowy opisany niżej; obowiązkowe testy jednostkowe przeszły.
Logi: `/private/tmp/k3-02a14-{tests,typecheck,lint}-final.log`.

Testy pilnują tokenów i zakresu 02A, typografii, prawdziwego wyniku kompilacji
klas stanów Tailwind, paddingu/minimum nagłówka dla 1280/1440/1536 px,
avatara/nazwy/telefonu/e-maila/czterech akcji, ośmiu zakładek, pięciu kart info,
siedmiu stopek i breadcrumbs poza kartą. Istniejące testy układu zachowują
proporcje ze wspólnego `--columns-three`; nie zastępują pomiaru przepełnień DOM.

Pierwsza bateria ujawniła błąd nowej asercji oczekującej nieznormalizowanego
selektora CSS; asercję poprawiono do faktycznego wyniku kompilacji Tailwind.
Nie zmieniano funkcji aplikacji dla dopasowania testu.

## CO BLOKUJE

**Render 1536/1440/1280, rzeczywista wysokość, computed styles i poziome
przepełnienia DOM: NIEZWERYFIKOWANE. Odbiór Recenzenta 02 i właściciela: brak.**

Jedna próba opcjonalnego testu przeglądarkowego, wyłącznie przez `npm run test`,
zakończyła się błędem środowiska przy starcie Chromium:

```text
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer:
Permission denied (1100)
```

Przeglądarka nie uruchomiła strony; nie powstały PNG ani `dom.json`.
Nie ponawiano próby ani nie zmieniano uprawnień/sandboxa. Test nie korzysta
z sieci, serwera aplikacji, prawdziwych danych ani modeli. Wykorzystuje istniejący
Playwright wskazany zmienną `K3_PLAYWRIGHT_MODULE` i katalog `K3_RENDER_DIR`;
bez obu zmiennych jest jawnie pomijany. Próba: 103 testy jednostkowe PASS,
1 test przeglądarkowy FAIL z powodu uprawnień.

Przygotowano HTML izolowanego komponentu SSR ze sztucznymi danymi i ramą 00S:
`/private/tmp/k3-02a14-render/component-ssr.html`.
Rama powłoki i część prymitywów są fixture testowym; to nie render pełnej
aplikacji ani LIVE. Nawet przyszły PASS tego testu wymaga porównania
pełnej aplikacji przez Recenzenta 02 i właściciela.

Checkpoint `~/.hermes/cache/k3/CHECKPOINT-K3-01-20261103-0102.md` odczytano.
Nie zapisano go: leży poza zakresem plików zlecenia i dozwolonym zapisem.
Stan do istniejącego checkpointu: `K3-02A-14 | korekty robocze wykonane |
render/DOM BLOKER Chromium Permission denied | bez publikacji | odbiór oczekuje`.

## KOSZT I LIMIT

Jeden abonamentowy Codex Plus, bez podagentów, Nous i dodatkowych płatnych API.
Pasywne odczyty z bieżącego rollout:
`~/.codex/sessions/2026/11/03/rollout-2026-11-03T10-53-40-01a1a0d4-264c-75d3-8c65-f18a11d293b7.jsonl`.

| Pomiar (CET) | Użycie 5 h | Użycie tygodnia |
| --- | --- | --- |
| PRZED 10:54:10 | 3% | 89% |
| PO 11:03:03 | 10% | 90% |

Budżet paczki: ≤5 pp tygodnia; wzrost **1 pp**, pozostało 4 pp budżetu.
Zmiana użycia okna 5 h: +7 pp. Zapas końcowy: 90% okna 5 h, 10% tygodnia. Odczyty są zaokrąglone i nie oznaczają dokładnego
kosztu tokenów. Saldo Nous nieznane, bez nowych połączeń Nous.
Resety z odczytu PO (Europe/Warsaw): 5 h `2026-11-03T15:49:19+01:00`, tydzień `2026-11-04T10:12:22+01:00`.

## JEDEN NASTĘPNY KROK

Recenzent 02 w środowisku umożliwiającym uruchomienie przeglądarki sprawdza
render, DOM i pozostałe różnice względem wzorca; następnie odbiór właściciela.
Nie oznaczać paczki jako ODEBRANE ani nie publikować na podstawie testów kodu.
