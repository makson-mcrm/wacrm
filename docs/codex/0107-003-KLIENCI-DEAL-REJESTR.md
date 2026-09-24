# 01.07-003 — KLIENCI + DEAL + lekki rejestr przed Dealem

STATUS: SPECYFIKACJA WYKONAWCZA — SOBOTA 26.09.2026

## CEL
Dostarczyć działające LIVE ekrany KLIENCI i DEAL oraz lekki rejestr kontaktu przed utworzeniem Deala. Bez redesignu. Źródłem UX jest finalny pakiet „UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026”, plansze KLIENCI i DEAL, audyt oraz checklista odbiorowa.

## WARUNEK STARTU
003 wolno wykonywać dopiero po rzeczywistym LIVE PASS paczki 002. Jeżeli 002 nie ma PASS — STOP i naprawa wyłącznie 002.

## KLIENCI — ZAKRES
- filtry: Wszystkie / Osoby / Firmy / Aktywne deale / Tagi,
- wyszukiwanie osoby/firmy oraz obsługa nowego/nieznanego numeru,
- lista pokazuje: Firma/Osoba, powiązania, aktywna sprawa + etap, ostatnia aktywność, tagi,
- primary action: Zadzwoń,
- secondary: Wiadomość,
- pozostałe akcje pod „…”; telefon / SMS / WhatsApp / e-mail mają działać lub mieć jawny, uzasadniony disabled,
- zamykany ContextDrawer osoby/firmy,
- ContextDrawer: dane, osoby, aktywne Deale, historia, Dodaj osobę, Dodaj sprawę,
- relacje Firma ↔ Osoba ↔ Deal klikalne w obie strony,
- account scope obowiązkowy.

## DEAL — ZAKRES
- Cofnij / Zmień deal / + Nowy deal,
- Zadzwoń / SMS / WhatsApp / E-mail / Więcej,
- jawnie wybrany Deal; przy wielu Dealach system nie zgaduje kontekstu,
- nad foldem: Następny krok + Termin + Blocker,
- etapy,
- zakładki: Podsumowanie / Aktywność / Banki / Dokumenty / Pliki / Historia etapów / Asystent,
- osoba i firma z działającymi przejściami,
- aktywności, dokumenty i historia przypisane do jawnego Deala,
- jedno źródło prawdy next action + termin + blocker,
- account scope obowiązkowy.

## LEKKI REJESTR PRZED DEALEM
Minimum: numer telefonu, źródło/kategoria, próba kontaktu, wynik, data kolejnej próby, prosty pomiar. Nie wymuszać tworzenia ciężkiego Deala przed potwierdzeniem realnego tematu.

Deduplikacja:
- Osoba: znormalizowany telefon,
- Firma: NIP.

## POZA ZAKRESEM
- pełne E2E WhatsApp — paczka 005,
- 004 Aktywność/pomiar,
- szerokie czyszczenie repo,
- redesign finalnych plansz,
- dodatkowe moduły i kosmetyka.

## KRYTERIA TECHNICZNE
- lint PASS,
- typecheck PASS,
- testy PASS,
- build PASS,
- check:migrations PASS,
- git diff --check PASS,
- brak konfliktu z aktualnym main,
- brak regresji P0 i fundamentu 002.

## LIVE PASS 003
003 ma PASS dopiero, gdy na rzeczywistym LIVE:
1. KLIENCI wizualnie i funkcjonalnie odpowiadają zatwierdzonej planszy,
2. można dodać minimalny nowy kontakt: co najmniej imię/nazwa robocza + telefon + źródło i po zapisie rekord istnieje po ponownym wejściu,
3. filtry i wyszukiwanie działają na realnych danych,
4. wejście Osoba/Firma → Deal oraz Deal → Osoba/Firma działa,
5. ContextDrawer otwiera i zamyka poprawny kontekst,
6. DEAL pokazuje next action + termin + blocker i właściwe zakładki,
7. widoczne akcje nie są atrapami,
8. dane pozostają po odświeżeniu/ponownym wejściu,
9. phone / tablet / desktop bez krytycznej regresji,
10. brak utraty działania 002/P0.

## ZASADA TRANSPORTU CODEX → GITHUB
Meldunek Codexa nie jest dowodem. Praca jest „dostarczona” dopiero, gdy nowy commit jest fizycznie widoczny jako head właściwego PR w `makson-mcrm/wacrm`. Jeżeli Codex wykona kod lokalnie, ale head PR się nie zmieni — status NIEGOTOWE.

## STOP
Po dwóch kolejnych próbach bez zmiany head PR lub bez postępu: STOP. Nie powtarzać zadań i nie palić limitu.
