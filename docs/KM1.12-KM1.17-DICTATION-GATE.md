# KM1.12–KM1.17 — paczka 1: bramka dyktowania

## Różnica: stan obecny → wymagany

- Było: `VoiceTextarea` mógł uruchomić przeglądarkowe `SpeechRecognition` po fladze albo nagrać audio i wysłać je do `/api/ai/transcribe`; endpoint zawierał integrację OpenAI Whisper, chociaż obecna bramka blokowała wywołanie dla `CLIENT_PERSONAL`.
- Jest: interfejs nie uruchamia mikrofonu, przeglądarkowego STT ani wysyłki audio. Endpoint odmawia kodem `LOCAL_AI_UNAVAILABLE` przed odczytaniem treści żądania i nie posiada ścieżki do dostawcy chmurowego.
- Bez zmian: zwykłe pole tekstowe i ręczny zapis Kontakt/Deal/Aktywność do CRM.

## Klasyfikacja i granice

- Nagranie z CRM jest traktowane jako potencjalne `CLIENT_PERSONAL`.
- Brak klasyfikacji nie otwiera żadnej ścieżki: żądanie jest odrzucane przed odczytem treści.
- Flaga środowiskowa nie jest dowodem lokalności przeglądarkowego STT.
- Ponowne włączenie dyktowania wymaga zweryfikowanego lokalnego adaptera STT i osobnej paczki.

## Mały ticket i kryteria

1. Zablokować oba dotychczasowe wejścia głosowe bez dostępu do mikrofonu i sieci modelowej.
2. Zachować edycję ręczną bez zmian.
3. Sprawdzić syntetycznie: bramka przeglądarki, endpoint zero-body-read/zero-fetch, polityka `UNKNOWN = DENY` oraz istniejące testy zapisu aktywności.
4. Niezależny przegląd bezpieczeństwa przed commitem i PR.

KM1.12–KM1.17 nie otrzymują biznesowego PASS przed odbiorem rzeczywistego zapisu i ponownego odczytu na LIVE.

## Wynik techniczny paczki

- Baza: `652016b36258e88bad7c1bc694ed99af6eb217e1` (`local-first/L0-L1`).
- Testy zmienionego zakresu: 8 plików, 68/68 PASS; pełnego zestawu 1093 testów nie uruchamiano.
- TypeScript: PASS. ESLint zmienionych plików: PASS.
- Niezależny security review po poprawce testu regresyjnego: PASS, brak findingów P0/P1/P2; niezależne 24/24 testy PASS.
- Supabase/LIVE: 0 odczytów danych klientów, 0 zapisów, 0 migracji i 0 wdrożeń.
- Koszt: Nous/API 0; wykorzystano wyłącznie abonament Codex Plus.
- Status KM1.12–KM1.17: `TECHNICZNIE GOTOWE DO ODBIORU`, nie biznesowy PASS.
