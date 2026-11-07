# KM3.2.13 — Dzisiaj / Zadania / Inbox

Stan 07.11.2026: **DZIAŁA CZĘŚCIOWO — DO DOMKNIĘCIA. NIEODEBRANE na TEST.** PASS nadaje wyłącznie Tomasz.

## Stan bazowy i zakres

- Repo: `/Users/mcrm-ai/wacrm-a`; czyste drzewo wejściowe, detached HEAD `4fb6de82f0009e0879e534bcda43216a316f87ce` (wskazany WORKTREE).
- Gałąź ze zlecenia: `k3/bigin-02b-20261105`; BASE_SHA `0f7317df7d017d1c4d33412e29a4df9eee108583` jest przodkiem HEAD.
- Zmieniono pięć wskazanych źródeł oraz ten raport i istniejące dane pulpitu `public/review/stan.json`.
- Nie wykonano commita, pusha ani publikacji. HEAD nie zmieniono.
- Stosowano `k3-screen-delivery`, `mcrm-wykonawca` i przegląd `vercel:react-best-practices`. Obejrzano trzy wskazane PNG Bigin z `~/.hermes/k3/render/`; użyto istniejących tokenów i szczegółowych wymagań zadania. PNG listy/karty nie stanowią osobnych wzorców Dzisiaj ani Inbox.

## NAPRAWIONE

| Powierzchnia | Zmiana |
| --- | --- |
| Flagi | `dashboardExtensions`, `tasksExtensions`, `inboxExtensions` w typie i obiekcie; wszystkie `false` |
| Dzisiaj | Biała lista dotychczasowego planu dnia, nagłówek 66 px i wiersze 44 px z tokenów; stan pusty, wczytywanie i ponowienie po błędzie; dotychczasowy ekran z KPI i Asystentem zachowany w gałęzi flagi |
| Zadania | Tabela: checkbox wykonania / Temat / Termin / Powiązanie / Właściciel; wiersze 32 px, obramowanie `#E8ECEF`; zachowane filtry, wykonanie, zmiana terminu i linki |
| Właściciel zadania | Deal: profil `assigned_to`, przy braku przypisania profil autora; Kontakt/Aktywność: profil autora. Profile pobierane w ramach konta, brak nazwy = `—`; bez przypisywania wszystkich rekordów bieżącemu użytkownikowi |
| Inbox | Dwie szpalty, lewa 360 px na desktopie, nagłówek 49 px, zachowany wybór rozmowy, deep link, wątek i mobilny powrót; banery kanałów i prawy panel kontaktu zachowane pod flagą |

Wymiary szczegółowe mają pierwszeństwo przed ogólnym opisem celu: Dzisiaj 148/44, Zadania tabela od 138 i wiersz 32, Inbox lista 360 i nagłówek 49. **Położenie y=148/138 wymaga jeszcze podłączenia tras do wspólnej powłoki — poniżej.** Nie deklaruję, że sama stała albo CSS variable stanowi dowód położenia ekranu.

## PRZETESTOWANE

| Kontrola | Wynik |
| --- | --- |
| `npm run typecheck` | RC=0; [log](/tmp/km3-2-13-typecheck.log) |
| `npx vitest run src/lib/ui 'src/app/(dashboard)'` | RC=0, **144/144**, 3 pliki; [log](/tmp/km3-2-13-vitest.log) |
| ESLint pięciu wskazanych źródeł | 0 błędów; dwa ostrzeżenia dotyczące zastanych `ClipboardList` i `DesktopWorkspaces`; [log](/tmp/km3-2-13-lint.log) |
| `git diff --check` | RC=0 |
| Lokalny `npm run build:webpack` | RC=1: `ENOTFOUND fonts.googleapis.com`, brak pobrania Inter w niezmienianym `src/app/layout.tsx`; [log](/tmp/km3-2-13-build.log) |

Testy renderują rzeczywiste strony na danych syntetycznych. Klient bazy w testach powierzchni rzuca błąd przy próbie zapytania; efekty sieciowe nie są uruchamiane. Sprawdzono flagi, kontrakt tokenów, wiersze, kolumny, filtr i edytor terminu, stany Dzisiaj, podział Inbox oraz powrót starych powierzchni po włączeniu flag.

Nie testowano zapisu do rzeczywistej bazy ani interakcji w przeglądarce. Testy nie obejmują jeszcze wymaganej geometrii trzech tras w `AppShell`; ich zielony wynik nie oznacza domknięcia kryterium 65/49/148.

Build wykonano raz w `/private/tmp/km3-2-13-build-source`, kopiując śledzone źródła z bieżącymi zmianami i pomijając wszystkie pliki `.env*`; zastosowano syntetyczny URL/klucz Supabase, bez instalowania zależności. Wbudowane ponowienia pobrania fontu pochodzą z Next, nie z ponownego uruchomienia zadania. Nie ponawiano builda bez usunięcia przyczyny.

## NIEODEBRANE / BLOKADA

1. **Powłoka 65/49 i pozycja treści nie są domknięte.** `src/components/layout/app-shell.tsx` wybiera zestaw `lists` według trasy. `/dashboard`, `/tasks` i `/inbox` nie należą do tego zestawu; pozostają domyślne 160/56 i padding. Wymagana minimalna zmiana jest poza wskazaną listą pięciu źródeł. Wysłano pytanie o rozszerzenie zakresu; bez odpowiedzi nie zmieniano tego pliku. Nie stosowano obejścia przez globalne selektory CSS z wnętrza strony.
2. **AI wewnątrz aktywnego wątku Inbox:** `src/components/inbox/message-thread.tsx` nadal posiada `AiThreadBanner`, a `src/components/inbox/message-composer.tsx` przycisk szkicu AI. Strona nie może ich warunkowo wyłączyć istniejącym interfejsem komponentów. Nie usuwano wątku ani komponowania wiadomości. Pytanie o objęcie banera flagą pozostaje otwarte; pełne schowanie dodatków AI wymaga także komponera.
3. **Build TEST nie został uruchomiony.** Zlecenie zabrania publikacji. Nie ma nowego UUID ani wdrożonych ekranów tej paczki; stary adres TEST nie jest dowodem obecnego diffu. Lokalny build dodatkowo blokuje font.
4. Brak pomiaru DOM, zrzutów całej aplikacji, nakładki i mapy różnic. Nie nadawano zgodności wizualnej ani PASS.

### Konkretny zakres do domknięcia powłoki

W `AppShell` należy objąć `isBiginList` warunkami:

```ts
(pathname === '/dashboard' && !surfaceFlags.dashboardExtensions) ||
(pathname === '/tasks' && !surfaceFlags.tasksExtensions) ||
(pathname === '/inbox' && !surfaceFlags.inboxExtensions)
```

To wykorzysta istniejące `geometryCssVars('lists')` i istniejące style panelu/headera bez kopiowania powłoki do trzech stron. Po dopuszczeniu zmiany należy dodać w obecnym teście render `AppShell` dla wszystkich trzech tras i asercje 65/49 oraz powrotu poprzedniej ramy przy flagach `true`. W komponentach Inbox baner i przycisk szkicu powinny renderować się wyłącznie przy `surfaceFlags.inboxExtensions`. Jest to propozycja do zatwierdzenia zakresu, **nie wykonana zmiana**.

## Koszt, limit i checkpoint

- Jeden bieżący przebieg abonamentowego Codexa, bez podzadań i bez nowej sesji modelu. Nowe wywołania Nous: **0**, koszt tych wywołań **0 USD**. Nie odczytywano salda Nous ani poświadczeń.
- Zastany `limity.json` z 18:42:29: 5h 31% użyte, tydzień 10%; źródło jest wcześniejszym rolloutem, więc nie traktowano tego jako świeżego stanu bieżącego okna.
- Pasywny odczyt w trakcie pracy: 5h **6% użyte / 94% pozostało**, reset 07.11 23:43; tydzień **11% użyte / 89% pozostało**, reset 13.11 10:24; dodatkowe kredyty: brak. Źródło: rollout bieżącej sesji `rollout-2026-11-07T18-42-54-01a1b71b-2f05-7db3-82ce-4c53e79da104.jsonl`. Zaokrąglone procenty nie są kosztem dokładnym.
- Odczyt końcowy: 5h **9% użyte / 91% pozostało**, tydzień **12% użyte / 88% pozostało**, te same resety; [log](/tmp/km3-2-13-limits.log). Różnica względem odczytu w trakcie: +3/+1 punkty procentowe użycia, nie dokładna miara zużycia jednego zadania.
- Checkpoint stanowi ten raport i lokalny diff. Skill [k3-screen-delivery](/Users/mcrm-ai/.hermes/skills/software-development/k3-screen-delivery/SKILL.md:639) mówi: „Sandbox Codexa nie ma zapisu do `~/.hermes` — zlecenie ma kazać mu zostawić notatkę w repo”. Nie próbowano zapisu poza dozwolonymi katalogami; wpis w `~/.hermes/cache/k3/CHECKPOINT-*.md` pozostaje do wykonania przez Hermesa.
- Zaktualizowano **lokalne** dane istniejącego pulpitu `public/review/stan.json`; nie publikowano pulpitu.
- Punkt wznowienia: HEAD `4fb6de8`, pięć źródeł i dowody w lokalnym diffie; najpierw rozstrzygnięcie zakresu powłoki/komponentów Inbox, potem odpowiednie testy, pomiar i dopiero osobno autoryzowane wdrożenie na TEST.

Nie modyfikowano plików bankowych, bazy, RLS, sekretów, `.env`, modeli AI, tokenów geometrii ani zależności. Nie pobierano danych klientów. Nie rozpoczynano następnego zadania.
