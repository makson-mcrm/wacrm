# K3-02B-06 — WWW → CRM — raport wykonania, 04.11.2026

**Kod wymagał zmiany.** Implementację i testy wykonano lokalnie. Testy: **20/20 PASS**; `npm run typecheck`: **PASS** (oba polecenia zakończone kodem 0). Odbiór Recenzenta 02 i właściciela oraz weryfikacja LIVE pozostają niewykonane.

## Podstawa i granice diagnozy

- Zadany BASE_SHA: `781985cbcfcac69145106b10b9f0cb30eba41c0f`.
- Zastany lokalny HEAD: `df56b44c482af533b7a4f70e8cc5e6ae374dc893`. Nie potwierdzono tożsamości dostępnego kodu z zadaną rewizją ani produkcją; nie pobierano innych rewizji. Wnioski dotyczą lokalnych plików.
- Przed zmianą `savePublicLead` zapisywał `public_lead_submissions` oraz `contact_notes`. Nie aktualizował źródła/zgody/szczegółów kontaktu, nie zapisywał aktywności ani tagu. Parser pomijał metadane. Same GRANT-y nie dodają tych operacji.
- Bramka została wykonana i uzyskała PASS przez Hermesa według aktualnego polecenia. W tym przebiegu nie uruchamiano bramki, audytu ani skryptów spoza repo. Wcześniejsza blokada opisana w poprzedniej wersji raportu nie jest aktualną blokadą zadania.
- Odczytano skill `k3-screen-delivery`; aktualny zakres użytkownika wyklucza jego kroki publikacji, ponawiania bramki i zapisu checkpointu poza repo. Ten raport zachowuje lokalny punkt wznowienia.

## Wykonana zmiana

| Obszar | Zachowanie po poprawce |
| --- | --- |
| Parser | Przekazuje opcjonalne `source_page`, pięć pól UTM, `segment`, `selected_home_project`, ograniczone do 500 znaków każde. Dotychczasowe warunki akceptacji, wymagane pola i błędy pozostały bez zmian. Nie dodano wymaganych parametrów ani nie zmieniono odpowiedzi API. |
| Źródło kontaktu | `source = makson.space` wyłącznie z filtrem SQL `source IS NULL`, `account_id` i `id`. Istniejące źródło, również pusty ciąg, pozostaje zachowane. |
| Zgoda i metadane | `contact_consent = true`; `source_details` zawiera dostępne metadane, maksymalnie 500 znaków. Bez metadanych istniejące szczegóły nie są czyszczone. |
| Notatka | Zawiera zgodę, identyfikator wersji `makson.space/contact-v1`, kanał `formularz WWW`, czas ISO identyczny z `public_lead_submissions.consented_at` oraz metadane przed łącznym obcięciem do 500 znaków. Identyfikator wersji jest stałą tej implementacji; zgodności z konkretną treścią zgody na wdrożonej stronie nie weryfikowano. |
| Historia/następne działanie | `sales_activities.insert`: tytuł `Zgłoszenie: …`, powiązany kontakt/konto/użytkownik, typ `zadanie`, status `PLANOWANE`, `completed=false`, opis i `next_action` z preferowaną porą kontaktu. Nie wymyślano daty oddzwonienia, której payload nie podaje. |
| Kurs | Dla `EDUKACJA — BUDŻET` wyszukiwany jest tag danego konta. Jeśli go brakuje, powstaje tag ze stabilnym UUID wyliczonym z konta i nazwy; konflikt klucza głównego `23505` przy równoczesnych zgłoszeniach jest akceptowany. Przypięcie używa `upsert` z `onConflict: contact_id,tag_id` i `ignoreDuplicates: true`. |

Zachowano deduplikację kontaktu i dotychczasowy model obsługi błędów: błąd głównego zapisu zgłoszenia nadal przerywa zapis; błędy uzupełnienia CRM są logowane bez nowych kodów HTTP. Operacje nie tworzą transakcji: samo HTTP 201 nadal nie dowodzi pełnego zapisu, dlatego odczyt SQL po wdrożeniu jest konieczny. Ponowne zgłoszenie tworzy kolejną aktywność i notatkę, ale nie kolejny tag ani przypięcie. Stabilny UUID zabezpiecza równoczesne tworzenie tagu przez tę ścieżkę; nie zmienia sposobu tworzenia tagów przez inne moduły.

## Test syntetyczny — przed/po

| Dowód | PRZED | PO |
| --- | --- | --- |
| LIVE — źródło: zlecenie, nie własny pomiar | 04.11, build `01a1a38a`: HTTP 201, dedupe i notatka OK; `source=NULL`, `contact_consent=false`, `source_details=NULL`, aktywności=0. Pomiar wskazywał brak wymaganych uprawnień `service_role`. | **NIEWYKONANY**. Nie zmieniano uprawnień ani produkcji; brak potwierdzenia aktualnych GRANT-ów, HTTP i SQL po wdrożeniu. |
| Lokalna ścieżka DOMY — syntetyczny klient bazy | Brak odpowiednich operacji w kodzie. Zastane 13 testów nie sprawdzało nowych wymagań. | Po `parsePublicLead` i `savePublicLead`: źródło uzupełnione wyłącznie przy NULL, zgoda true, szczegóły z UTM/podstroną/segmentem/projektem ≤500 znaków, notatka ze śladem zgody, jedno zadanie `Zgłoszenie: …`. |
| EDUKACJA — BUDŻET — syntetyczny klient bazy | Brak zapisu tagów i przypięć. | Dwa zgłoszenia: jeden tag i jedno przypięcie; osobny test równoczesnych zgłoszeń również kończy się jednym tagiem i jednym przypięciem. |

Wykonane kontrole:

```text
npx vitest run src/lib/public-leads*
Test Files  1 passed (1)
Tests       20 passed (20)
Start at    09:52:56, 04.11.2026 (Europe/Warsaw)
Duration    740ms
exit_code   0

npm run typecheck
tsc --noEmit
exit_code   0
```

Zachowano 13 istniejących testów i dodano 7 przypadków: komplet DOMY; zachowanie źródła nie-NULL (dwa warianty); limit szczegółów i metadane w notatce; powtórne zgłoszenia edukacyjne; wybór tagu właściwego konta; równoczesne zgłoszenia edukacyjne. Test izoluje konto i sprawdza brak zapisu Deala. Klient bazy w testach stosuje filtry NULL/konta i modeluje konflikty klucza głównego tagu oraz unikalność przypięcia. Nie jest to test prawdziwego PostgREST, GRANT-ów ani LIVE. Po kontroli zmieniono wyłącznie formatowanie dodanej implementacji.

## Zakres i przekazanie

Zmieniono wyłącznie:

- `src/lib/public-leads.ts`
- `src/lib/public-leads.test.ts`
- `CODEX-K3-02B06-REPORT.md`

Zastane zmiany innych plików zachowano. Bez commita, pusha, publikacji, zmian RLS, polityk, kluczy, `.env`, schematu i danych produkcyjnych. Nie uruchamiano dodatkowego Codexa, subagentów ani płatnego API. Aktualnego zużycia abonamentu niezależnie nie mierzono.

Następny krok odbioru: Recenzent 02 porównuje poprawkę z aktualną rewizją wdrożeniową; po osobno autoryzowanym wdrożeniu należy wykonać test syntetyczny HTTP 201 i odczyt SQL wszystkich wskazanych pól, notatki, tagu/przypięcia oraz aktywności. Ten przebieg nie nadaje odbioru LIVE ani właścicielskiego PASS.
