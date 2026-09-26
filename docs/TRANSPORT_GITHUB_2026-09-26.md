# Transport kodu — zasada obowiązująca od 26.09.2026

## Powód zmiany

Przez kilka dni Codex wykonywał zmiany i testy w odizolowanym workspace, ale nie miał poświadczeń pozwalających wykonać `git push` do `makson-mcrm/wacrm`. Lokalne SHA raportowane przez Codex nie były commitami dostępnymi w GitHubie. Wielokrotne próby odzyskiwania tych lokalnych commitów tworzyły błędne koło.

Dodatkowo wykryto uszkodzony `package-lock.json`, który nie był poprawnym plikiem JSON i powodował problemy z instalacją zależności.

## Zasada źródła prawdy

Kod jest uznany za dostarczony wyłącznie wtedy, gdy commit jest fizycznie widoczny w repozytorium `makson-mcrm/wacrm`.

Raport Codexa, lokalny SHA, opis wykonanych zmian ani wynik lokalnych testów nie są dowodem dostarczenia.

## Obowiązujący przebieg

1. Kod/zmiana jest przygotowywana.
2. Zapis do repo wykonuje uwierzytelniony konektor GitHub mający prawo zapisu.
3. Sprawdzamy fizyczny head SHA gałęzi/PR.
4. GitHub Actions wykonuje CI.
5. Dopiero po PASS CI zmiana trafia do `main`.
6. Dopiero commit na `main` może uruchamiać wdrożenie Hostinger.
7. LIVE PASS jest osobnym krokiem i wymaga sprawdzenia działającej aplikacji.

## Zakaz

Do czasu potwierdzonej zmiany uprawnień środowiska Codexa nie wolno budować procesu wdrożenia na założeniu, że Codex sam wykona `git push`.

Nie wolno ponownie próbować odzyskiwać nietrwałych lokalnych commitów Codexa jako podstawowej metody transportu.

## Zamknięty martwy tor

PR #11 został zamknięty jako martwy tor transportowy. Nie jest źródłem kodu gotowego do wdrożenia.

## Kryterium PASS transportu

PASS = nowy commit widoczny w GitHubie + CI PASS.

Wszystko poniżej tego poziomu = NIEGOTOWE.
