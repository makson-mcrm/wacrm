# Naprawa publikacji Hostinger — jedna czynność właścicielska

Data: 2026-09-27  
Zakres: istniejąca witryna `mediumseagreen-pelican-353577.hostingersite.com`

## Cel

Przywrócić automatyczną publikację istniejącego repozytorium `makson-mcrm/wacrm` na istniejącej witrynie Hostinger, bez nowego hostingu, nowej aplikacji, migracji danych ani zmiany Supabase.

## Stan potwierdzony

- źródło kodu: gałąź `main`,
- aplikacja: ta sama istniejąca witryna Hostinger,
- baza i logowanie: istniejący Supabase, bez zmian,
- wymagany runtime: Node.js 20 lub nowszy,
- budowanie: `npm run build`,
- uruchamianie: `npm start`,
- CI aktualnego `main`: PASS,
- automatyczne wdrożenia Hostinger obecnie nie reagują na push,
- w repo brak aktywnego webhooka, tokenu Hostinger oraz kompletu FTP/SFTP/SSH.

## Jedyna czynność właścicielska

W panelu **istniejącej witryny** Hostinger użyć funkcji **Połącz ponownie z GitHub**, autoryzować istniejącą aplikację Hostinger dla repozytorium `makson-mcrm/wacrm`, wskazać gałąź `main` i zatwierdzić ponowne połączenie.

To jest jedna czynność: przywrócenie istniejącej integracji. Nie tworzyć nowej witryny, projektu, bazy ani konta. Nie zmieniać zmiennych środowiskowych i nie odłączać Supabase.

Oficjalna procedura Hostinger przewiduje ponowne połączenie GitHub bez usuwania i ponownego dodawania witryny; po autoryzacji automatyczne i ręczne wdrożenia mają zostać wznowione.

## Co wykonawca robi automatycznie po tej czynności

1. Potwierdza, że Hostinger rozpoczął build z `main`.
2. Sprawdza publiczny znacznik `/deployment-ready-activity08.json`.
3. Otwiera LIVE `/quick-call`.
4. Pokazuje wzorzec 08 obok LIVE.
5. Wykonuje pełny przepływ AKTYWNOŚCI 08.
6. Zapisuje rekord testowy.
7. Wychodzi i wchodzi ponownie.
8. Potwierdza trwałość danych.
9. Nadaje PASS 08 dopiero po pełnym wyniku LIVE.
10. Przechodzi do następnego ekranu.

## Kryterium naprawy infrastruktury

PASS infrastruktury = push do `main` sam uruchamia kolejne wdrożenie bez udziału Tomasza.
