# 01.07-002 — FUNDAMENT + DZISIAJ + POTWIERDZENIE BRAKUJĄCEGO P0

## CEL BIZNESOWY
Dostarczyć pierwszy widoczny element finalnego pakietu UX 9 ekranów na bazie aktualnego kodu: wspólny fundament aplikacji + ekran DZISIAJ, bez redesignu, z zachowaniem i potwierdzeniem działającego przepływu P0.

## ŹRÓDŁO PRAWDY UX
Obowiązuje pakiet: **UX FINAL PO AUDYCIE — 9 EKRANÓW — 18.09.2026**.
PDF: https://drive.google.com/file/d/1pIhClOM8gC6N0BibItuwUw9isLj4RTJG/view
Audyt: https://docs.google.com/document/d/1mxdHJfGmdUUS6Vo_Q8L2eEv0tWmHpDK0cbhYXW6YftE/edit
Checklista: https://docs.google.com/document/d/1G4mjLY_ziK9wkMuTN8sxFViYkdtfMSuTH64_nd_OIN4/edit

Nie projektuj niczego od nowa. Jeśli dokładnego wyglądu z PDF nie da się odczytać w środowisku Codex, NIE wymyślaj zastępczego designu. W takim przypadku implementuj wyłącznie wspólny fundament i zachowanie opisane niżej oraz jawnie zgłoś brak możliwości wiernego odwzorowania planszy.

## ZAKRES PACZKI
1. Wspólny AppShell dla dotykanego zakresu: DesktopSidebar, MobileBottomNav, TopBar, GlobalSearch, GlobalAdd.
2. Mobile nav: Dzisiaj | Aktywność | centralny + | Klienci | Asystent. Centralny + = globalna akcja.
3. GlobalSearch jako wspólny komponent; wyniki grupowane: Klienci / Firmy / Deale / Dokumenty.
4. GlobalAdd: Kontakt / Deal / Zadanie / Spotkanie-Aktywność / Notatka-Dokument.
5. Wspólne design tokens i responsywność dla phone/tablet/desktop. Nie duplikuj stylów między ekranami.
6. Ekran DZISIAJ zgodny z finalną planszą 18.09. Nie dodawaj nowych KPI. Ma odpowiadać: „co robię teraz i co przybliża mnie do prowizji?”. Listy tylko najważniejsze pozycje + „Zobacz wszystkie”.
7. DZISIAJ ma prowadzić do właściwego Deala/sprawy i używać prawdziwego next action / terminu / blockera. Bez duplikatów i bez przywracania starego terminu.
8. Potwierdź istniejący przepływ P0 z aktualnego main: klient → Deal → aktywność/telefon → wynik → next action → termin → blocker → DZISIAJ → historia → ponowne otwarcie z zachowanymi danymi.
9. Jeśli P0 nadal ma realny blocker, napraw tylko blocker konieczny do odbioru tej paczki. Nie rozszerzaj zakresu.
10. Zachowaj fundament WhatsApp/WaCRM. Nie kasuj go i nie rób szerokiego czyszczenia.

## POZA ZAKRESEM
- KLIENCI/DEAL jako pełna kolejna paczka 003,
- WhatsApp/szablony,
- Finanse,
- Asystent funkcjonalny,
- Agents API,
- szeroki redesign,
- szerokie porządki repo.

## REGUŁY RESPONSYWNOŚCI
- phone <768 px, tablet 768–1023 px, desktop >=1024 px,
- minimalny target dotykowy 44x44 px,
- mobile uwzględnia klawiaturę: 100dvh, safe-area-inset-bottom, VisualViewport tam gdzie potrzebne,
- inputy mobile min. 16 px,
- nie kopiuj desktopowych tabel 1:1 na telefon.

## KRYTERIA ODBIORU
PASS dopiero gdy:
- odpowiednie testy PASS,
- pełny build PASS,
- git diff --check PASS,
- DZISIAJ działa na prawdziwym modelu danych i prowadzi do właściwego Deala,
- P0 nie ma regresji,
- dane po zapisie pozostają po ponownym wejściu,
- desktop/mobile nie mają krytycznej regresji,
- brak redesignu poza zatwierdzonym pakietem,
- GLOWNY_STAN_WDROZENIA.md zaktualizowany o: wynik, zmienione pliki, testy, commit, blocker, następny krok.

## RAPORT KOŃCOWY
Krótko po polsku:
1. Co zmieniono.
2. Co działa.
3. Co nadal nie jest potwierdzone.
4. Wyniki testów/build.
5. Commit.
6. Czy paczka jest gotowa do niezależnego odbioru 01.07.

Nie angażuj Tomasza w decyzje techniczne.