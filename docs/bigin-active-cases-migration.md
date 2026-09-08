# Bigin → mCRM AI: aktywne sprawy (część A)

Zakres obejmuje wyłącznie 5–10 aktywnych spraw po zatwierdzeniu raportu dry-run. W tej części nie ma funkcji zapisującej ani migracji schematu.

## Mapowanie

| Bigin              | mCRM AI                                   | Zasada                                                                                    |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Kontakt            | `contacts`                                | Telefon → e-mail → dokładne imię/nazwisko + Firma                                         |
| Firma              | `companies`, `contact_companies`          | NIP → dokładna nazwa; konflikt NIP/nazwa wymaga decyzji                                   |
| Deal               | `deals`, `deal_contacts`                  | Automatyczny MERGE wyłącznie po trwałym `externalDealId` Bigin                            |
| Etap               | `pipeline_stages`                         | Jawna tabela `BiginStageMapping`, bez zgadywania                                          |
| Następny krok      | `deals.next_action`                       | Jeden aktualny krok                                                                       |
| Termin             | `deals.next_action_at`                    | Oryginalna strefa czasu jest normalizowana do ISO                                         |
| Notatki / historia | `deals.notes`, `deal_notes`               | Treść i dostępny oryginalny czas pozostają bez zmian                                      |
| Data pozyskania    | `contacts.created_at`, `deals.created_at` | Dla nowych rekordów data źródłowa; przy MERGE tylko data wcześniejsza                     |
| Źródło migracji    | `source`, `source_details`                | Nowe rekordy: `source=Bigin`; każdy rekord dostaje marker z ID Bigin i pierwotnym źródłem |

## Bezpieczeństwo i KPI

- Planer dry-run jest czystą funkcją i nie ma dostępu do zapisu.
- Loader Supabase wykonuje tylko `SELECT`, zawsze w ramach `account_id` i aktywnego RLS.
- Niepuste dane istniejącego Kontaktu nie są nadpisywane. Różny telefon/e-mail trafia do decyzji.
- Jeden Kontakt może wskazywać wiele Dealów. Tożsamość Kontaktu nigdy nie jest kluczem deduplikacji Deala.
- Nowy Deal z Bigin ma `source=Bigin`; plan ma jawne `countAsNewLead=false` i `countAsNewDeal=false`. Późniejszy executor nie może zwiększać `daily_sales_metrics`.
- Import nie przechodzi do zapisu, jeżeli choć jedna encja ma status `requires_decision` albo `conflict`.

## Kontrakt wejścia

Każda sprawa musi mieć stabilne `externalDealId`, nazwę, etap oraz Kontakt. Zalecane są: `externalId` Kontaktu i Firmy, telefon, e-mail, NIP, pierwotna data pozyskania, pierwotne źródło, produkt, następny krok, termin oraz historia z datami.

```ts
const report = await prepareBiginActiveCasesDryRun({
  db,
  accountId,
  cases: exportedActiveCases,
  stageMappings: approvedStageMappings,
});
```

Raport zwraca cztery jawne sekcje: `willMerge`, `willCreate`, `requiresDecision`, `conflicts`. Dopiero raport z `canImport=true`, przejrzany przez Tomasza, może zostać przekazany do przyszłego executora zapisu.
