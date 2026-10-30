# mCRM AI — uzasadnienia i scenariusze App Review

Wersja robocza 0.1 — 30.10.2026. Materiał do akceptacji i późniejszego zgłoszenia, bez publikacji i bez potwierdzenia działania LIVE. Kontakt: biuro@makson.space.

## Uzasadnienia uprawnień

**whatsapp_business_messaging:** mCRM AI umożliwia zalogowanym użytkownikom obsługę korespondencji z klientami w istniejącej skrzynce rozmów. Uprawnienie służy wysyłaniu wiadomości tekstowych, multimediów i zatwierdzonych szablonów przez WhatsApp Cloud API oraz odbiorowi wiadomości i statusów przez webhook. Integracja Coexistence zapisuje także echo wiadomości wysłanych w aplikacji WhatsApp Business oraz udostępnioną historię w tych samych rozmowach. Dostęp jest ograniczony do konta użytkownika i połączonego numeru; treści klientów nie są przekazywane do chmurowych modeli AI. Implementacja znajduje się w `src/app/api/whatsapp/send/route.ts` i `src/app/api/whatsapp/webhook/route.ts`; samo istnienie kodu nie potwierdza dostarczenia wiadomości na LIVE.

**whatsapp_business_management:** mCRM AI korzysta z tego uprawnienia do odczytu metadanych numerów należących do autoryzowanego WABA, subskrypcji aplikacji do WABA oraz zarządzania szablonami wiadomości. Administrator konta może w istniejących ustawieniach połączyć WhatsApp Business przez Embedded Signup, a w panelu szablonów utworzyć i przesłać szablon do zatwierdzenia przez Meta oraz sprawdzić jego status. Backend sprawdza uprawnienia administratora; token jest szyfrowany po stronie serwera. Coexistence wymaga potwierdzenia `is_on_biz_app=true` i `platform_type=CLOUD_API`, bez rejestracji lub wyrejestrowania numeru. Implementacja: `src/app/api/whatsapp/coexistence/onboard/route.ts`, `src/app/api/whatsapp/templates/submit/route.ts` i `src/components/settings/template-manager.tsx`.

## Pola i załączniki do przygotowania w panelu Meta

- Nazwa aplikacji: mCRM AI; App ID: `1116881471020279`; kontakt: `biuro@makson.space`.
- Portfolio: `1670356917366790`; ES configuration ID: `1861133288660318` (wartości z polecenia właściciela, bez ponownej weryfikacji panelu).
- Domena aplikacji: `test.makson.space`; adres działającej aplikacji i instrukcja dostępu dla recenzenta — potwierdzić po wdrożeniu.
- Publiczny URL polityki prywatności: `https://test.makson.space/polityka-prywatnosci`.
- Publiczny URL regulaminu: `https://test.makson.space/regulamin`.
- URL instrukcji usuwania danych: `https://test.makson.space/usuwanie-danych`.
- Ikona marki minimum 512 × 512 px — brak źródła w repo, patrz `../../public/app-icon-NOTICE.md`.
- Uzasadnienie każdego uprawnienia, opis funkcji, instrukcja krok po kroku i osobne nagranie pokazujące rzeczywisty wynik.
- Konto recenzenta w odseparowanym środowisku z odpowiednią rolą oraz kontrolowany numer odbiorcy; dane dostępowe przekazać wyłącznie właściwym polem w Meta, nie w repo ani nagraniu.
- Dane i dokumenty do weryfikacji firmy oraz odpowiedzi dotyczące przetwarzania i zabezpieczenia danych — zgodne z faktyczną konfiguracją.
- Potwierdzenie wymaganych w panelu poziomów dostępu, statusu Tech Provider i konfiguracji Facebook Login for Business/Embedded Signup; lokalne testy nie stanowią takiego potwierdzenia.

Lista jest materiałem przygotowawczym. Aktualnie wymagane pola należy porównać z formularzem konkretnej aplikacji w Meta; w tym zadaniu nie otwierano ani nie zmieniano panelu.

## Nagranie 1 — wysyłka wiadomości

1. Przygotuj osobne konto testowe i własny numer odbiorcy, z syntetyczną rozmową. Nie pokazuj danych klientów, haseł, tokenów ani App Secret.
2. Pokaż logowanie do mCRM oraz Ustawienia → WhatsApp i połączony numer. Jeśli demonstracja obejmuje Embedded Signup, pokaż zgodę oraz powrót do aplikacji ze statusem połączenia.
3. Otwórz istniejącą skrzynkę rozmów i syntetyczną rozmowę z kontrolowanym odbiorcą. Odbiorca rozpoczyna rozmowę, aby otworzyć okno obsługi; poza oknem użyj zatwierdzonego szablonu.
4. Wpisz jednoznaczną wiadomość demonstracyjną po polsku i wyślij ją z interfejsu mCRM.
5. Pokaż tę samą wiadomość odebraną na kontrolowanym telefonie oraz rzeczywisty status w mCRM. Można pokazać odpowiedź odbiorcy w tej samej rozmowie.
6. Zakończ nagranie dopiero po dowodzie odbioru. Błąd API lub brak dostarczenia oznacza nieukończony scenariusz; nie zastępuj wyniku atrapą ani statusem z testu jednostkowego.

## Nagranie 2 — utworzenie szablonu

1. Zaloguj się jako administrator odseparowanego konta połączonego z kontrolowanym WABA. Nie nagrywaj sekretów ani prawdziwych danych klientów.
2. Otwórz Ustawienia → Szablony WhatsApp i formularz dodania szablonu.
3. Podaj unikalną nazwę, np. `mcrm_review_potwierdzenie`, kategorię zgodną z treścią i język `pl`. Dodaj syntetyczną treść: „Potwierdzamy otrzymanie wiadomości. Odpowiemy w godzinach pracy biura.”
4. Pokaż podgląd. Jeśli stosujesz zmienne, wypełnij wymagane przykłady sztucznymi wartościami; opcjonalne nagłówki i przyciski pokaż tylko wtedy, gdy są używane.
5. Prześlij szablon do Meta z interfejsu mCRM; tryb `WHATSAPP_TEMPLATES_DRY_RUN` nie może zastępować rzeczywistego zgłoszenia.
6. Pokaż zapisany szablon na liście i rzeczywisty status zwrócony przez Meta po synchronizacji. Oczekiwanie na ocenę nie oznacza zatwierdzenia; odrzucenie pokaż zgodnie z wynikiem.

## Źródła do porównania przed zgłoszeniem

Kod i powyższe scenariusze opisują stan repo. Oficjalne punkty odniesienia: [Meta — App Review](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review/), [Meta — onboarding użytkowników Business app](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users). Próba odczytu obu dokumentów 30.10.2026 zwróciła HTTP 429; nie deklarujemy na tej podstawie aktualnej weryfikacji formularzy ani zatwierdzenia wymagań przez Meta.
