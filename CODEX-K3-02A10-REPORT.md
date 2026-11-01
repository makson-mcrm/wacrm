# K3-02A-10 — Kontakt 02A

Wynik lokalny: GOTOWE. Data: 2026-11-01, Europe/Warsaw.
BASE_SHA i końcowy HEAD: `83574f7be7819ac1f828183530692aae0ac1192a`. Bez commita i pusha.

## Wykonane poprawki

1. Nagłówek: usunięto akapit `contactDetailsDesc` („Szczegóły Kontaktu”), również z drzewa dostępności. Przycisk „Wróć do listy” ma `xl:hidden`; na desktopie pozostają breadcrumbs „Klienci › nazwa”. Avatar, nazwa, tagi, kontakt i akcje są zachowane.
2. Tytuły kart w trzech kolumnach: wspólna typografia `text-sm font-black text-slate-950`, również dla „Next action”. Usunięto `uppercase` i `tracking-wide` z „Aktywne Deale (n)”. Liczniki nadal pochodzą ze wspólnego `displayCount` używanego przez zakładki.
3. Puste „Next action”: jedna linia „Ustal następne działanie”, bez pustego terminu. Istniejące działanie nadal pokazuje treść i termin; nie zmieniono wyboru działania, priorytetu ani zapisu danych.
4. Historia: ikona SVG i etykieta typu dla aktywności, notatek i zdarzeń kolejki. Obsługiwane m.in. Rozmowa, WhatsApp, E-mail, Spotkanie, Notatka, Ankieta. Brak lub nieznany typ daje „Aktywność”. WhatsApp rozpoznawany z istniejącego typu, tytułu wiadomości lub kanału w już przekazanej analityce. „Ankieta — otrzymana” ma ikonę i etykietę „Ankieta”; pełna treść nadal jest dostępna po rozwinięciu. Bez nowych zapytań.
5. Pięć kart info: stałe `h-36`, jednakowa struktura tytuł z ikoną → wartość → podtytuł. Brak podtytułu pokazuje `—`. Zachowano istniejącą datę dodania do CRM i miejsce na jej linię. Długie wartości są skracane wizualnie i zachowane w tekście oraz `title`. Pięć kolumn i tokeny odstępów pozostają bez zmian.

## Walidacja

| Komenda                                                                              | Wynik                                                                  |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run test`                                                                       | PASS, 1906/1906 testów, 140 plików; minimum 1886 spełnione             |
| `npm run typecheck`                                                                  | PASS, kod wyjścia 0                                                    |
| `npm run lint`                                                                       | PASS, kod wyjścia 0; 0 błędów, 43 istniejące ostrzeżenia               |
| `diff -u /private/tmp/k3-02a10-lint-before.log /private/tmp/k3-02a10-lint-after.log` | PASS, kod 0; identyczny lint przed i po, bez nowych błędów i ostrzeżeń |
| Prettier `--check` dla pięciu zmienionych plików TSX                                 | PASS                                                                   |
| `git diff --check`                                                                   | PASS                                                                   |

Dodano 20 testów. Pokrywają brak opisu nagłówka, widoczność powrotu poniżej `xl`, jednolitą typografię ośmiu tytułów kart, puste i istniejące Next action, etykiety i ikony typów oraz stałą strukturę i wysokość pięciu kart info. Istniejący test ankiety rozszerzono o ikonę i etykietę. Regresja obejmuje osiem zakładek w jednym pasku, „Więcej”, cztery główne akcje, trzy akcje w menu, siedem stopek „Zobacz wszystkie →” i spójne liczniki.

`src/components/sales/activity-history.test.tsx` nie istnieje; testy renderowania historii znajdują się w dozwolonym `contact-detail-sections.test.tsx`.

Weryfikacja lokalna na danych syntetycznych: SSR i kompilacja rzeczywistych klas Tailwind, w tym breakpoint `xl` oraz wysokość kart. Bez odbioru wizualnego LIVE i bez wdrożenia. Bez sieci, zmian bazy, zapytań Supabase, zależności, `.env`, geometrii 00S, layoutu, konfiguracji Next i nagłówków HTTP. Nie uruchamiano połączeń przez Nous.

## git diff --stat

Pełny wynik dla śledzonych plików drzewa roboczego:

```text
 CODEX-K3-01-A-REPORT.md                            |  83 ++++++++++
 .../contacts/contact-detail-sections.test.tsx      | 175 ++++++++++++++++++++-
 .../contacts/contact-detail-sections.tsx           |  42 +++--
 .../contacts/contact-detail-view.test.tsx          |  57 ++++++-
 src/components/contacts/contact-detail-view.tsx    |   5 +-
 src/components/sales/activity-history.tsx          |  79 +++++++++-
 6 files changed, 407 insertions(+), 34 deletions(-)
```

`CODEX-K3-01-A-REPORT.md` był zmodyfikowany przed zadaniem i nie był tu edytowany. Zastane nieśledzone `docs/codex/TASK-K3-02A10.md` i `package-lock.json` pozostawiono bez zmian.

Wynik ograniczony do plików kodu i testów tej paczki:

```text
 .../contacts/contact-detail-sections.test.tsx      | 175 ++++++++++++++++++++-
 .../contacts/contact-detail-sections.tsx           |  42 +++--
 .../contacts/contact-detail-view.test.tsx          |  57 ++++++-
 src/components/contacts/contact-detail-view.tsx    |   5 +-
 src/components/sales/activity-history.tsx          |  79 +++++++++-
 5 files changed, 324 insertions(+), 34 deletions(-)
```

Nowy `CODEX-K3-02A10-REPORT.md` pozostaje nieśledzony, dlatego zwykły `git diff --stat` go nie uwzględnia.
