# KM3.2.08 — typografia Lejka D4–D6

Data: 10.11.2026. Baza lokalna: `88b8015`. Build TEST wskazany w zleceniu: `01a1c59b`.
Źródło wartości: przekazane w zleceniu pomiary `delta.json` zalogowanego demo Bigin, 1536×1024.

## Zmiany

| Delta | Plik:linia | Zakres |
| --- | --- | --- |
| D4 | `src/app/globals.css:735` | Nagłówek etapu: `font-size: 15px`, `font-weight: 550`, `color: rgb(33, 33, 41)`. |
| D5 | `src/app/globals.css:716` | Kontrolki toolbara Lejka (`button`, `select`, `input`, `summary`): `font-size: 14px`. Istniejące deklaracje wysokości zachowane; desktop 32 px, wariant kompaktowy 29 px. |
| D6 | `src/app/globals.css:673` | Wiersze panelu „Potoki zespołu” (bezpośrednie przyciski nawigacji i ustawień): `font-size: 13px`, `font-weight: 400`. |
| D4 — asercje | `src/components/pipelines/pipeline-board.test.tsx:346` | Rozmiar 15 px, waga 550 i kolor nagłówka w kontrakcie CSS. |
| D5 — asercja | `src/components/pipelines/pipeline-board.test.tsx:374` | Rozmiar 14 px w istniejącej asercji kontrolek i ich wysokości. |
| D6 — asercje | `src/components/pipelines/pipeline-board.test.tsx:329` | Rozmiar 13 px i waga 400 wierszy panelu. |
| Raport | `docs/codex/CODEX-KM3208.md:1` | Wyniki, lokalizacje zmian i ograniczenia weryfikacji. |

Zmiana wykonawcza obejmuje wyłącznie deklaracje typografii D4–D6 w `globals.css`.
Nie zmieniono deklaracji geometrii, danych, API, `surfaceFlags`, fontu Inter, tekstów,
liczby kolumn ani kolejności etapów. Asercje rozszerzają istniejący test, więc liczba testów nie wzrosła.
Zastane zmiany w `.planning/2026-11-10-night-run/` pozostawiono nietknięte.

## Weryfikacja

| Polecenie | RC | Wynik |
| --- | --- | --- |
| `npm run typecheck` | **0** | 0 błędów TypeScript. |
| `npx vitest run` | **0** | **2358 PASS / 1 skipped / 0 FAIL**, 2359 testów ogółem; 145 plików PASS. |

Vitest: czas 26,10 s. Asercje D4–D6 oraz istniejące testy geometrii przeszły.
Vite wyświetlił ostrzeżenie dotyczące przyszłego `configLoader: 'native'` i formatu `vitest.config.ts`;
nie spowodowało ono błędów ani zmiany konfiguracji.

Zgodnie ze zleceniem nie uruchamiano bramki, audytu, skryptów spoza repo ani dodatkowych
poleceń testujących lub budujących aplikację. Nie wykonano commita, pushu ani publikacji.

## Ryzyka i granice dowodu

Testy sprawdzają deklaracje CSS; nie zastępują pomiaru `getComputedStyle` ani porównania pikselowego.
Nie wykonano pomiaru przeglądarkowego ani Visual Diff w ramach tego zlecenia, więc nie podaje się liczby diff
i nie stwierdza odbioru wizualnego. Większy tekst może zmienić szerokość kontrolek lub obcięcie długich nazw
wewnątrz zachowanej ramy. Nagłówek samego panelu oraz podsumowania etapów zachowują własne style.
PASS wizualny pozostaje po stronie Tomasza.
