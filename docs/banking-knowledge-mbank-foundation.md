# M4 Wiedza Bankowa — fundament mBank

Pierwsza wersja działa wyłącznie w kontekście zapisanego Deala. Odpowiedź jest budowana z: klienta, firmy, produktu, procesu mBanku, etapu i jednego następnego kroku.

## Routing i jakość

Każde źródło ma trasę `BANK → PRODUKT → TYP ŹRÓDŁA → WERSJA/DATA` oraz jedną z ocen: `POTWIERDZONE ZE ŹRÓDŁA`, `CZĘŚCIOWE`, `WNIOSEK AI`, `WYMAGA WERYFIKACJI`.

- Oficjalne źródła są ograniczone do publicznych stron w domenie `mbank.pl`.
- Wniosek AI jest zawsze pokazany osobno i nie udaje reguły bankowej.
- Odpowiedź jest `POTWIERDZONE ZE ŹRÓDŁA` dopiero wtedy, gdy ma zgodne źródło oficjalne i wewnętrzne z dozwolonego folderu Drive.
- Oficjalne źródła mBanku zawierają krótkie fakty operacyjne, zawsze pokazane razem z adresem źródła i datą sprawdzenia.
- Brak produktu, banku lub następnego kroku obniża wynik do `WYMAGA WERYFIKACJI`.

## Zero Trust dla Google Drive

Fundament nie przeszukuje Dysku i nie udostępnia prywatnych linków. Źródło Drive jest dopuszczone tylko wtedy, gdy:

1. identyfikator folderu jest na serwerowej allowliście `BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS` (wartości rozdzielone przecinkami),
2. metadane dokumentu mają `source_name` w formacie `gdrive://<folder-id>/<file-id>`,
3. dokument ma przypisany bank `mBank` i pasujący produkt.

Do przeglądarki trafiają tylko metadane potrzebne do wskazania źródła. Treść dokumentu, identyfikator pliku i prywatny URL nie są zwracane. Późniejsze pobieranie i indeksowanie Drive wymaga wskazania konkretnych folderów oraz połączenia z minimalnym zakresem uprawnień; brak tych identyfikatorów nie blokuje źródeł publicznych mBanku.

## Brak migracji

Wersja używa istniejących tabel `deals`, `bank_processes` i `ai_knowledge_documents`. Nie zmienia schematu ani danych klientów.

## Kolejne banki

Rejestr banków przechowuje aliasy, produkty i źródła publiczne. Dodanie ING lub kolejnego banku polega na dodaniu nowej definicji do rejestru; endpoint, routing, UI i zabezpieczenia Drive pozostają wspólne.
