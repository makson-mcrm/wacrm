# mCRM AI — wykonanie

## Zasada nadrzędna
Tomasz nie jest operatorem technicznym. Nie angażować go w GitHub, deploy, logi, komendy ani testy techniczne.

## Tryb pracy
- Źródłem prawdy są obowiązujące dokumenty mCRM AI i zatwierdzone plansze UX.
- Kodować i wdrażać małymi, bezpiecznymi zmianami.
- Nie projektować nowego UX.
- Każda zmiana ma prowadzić do działającego LIVE i być możliwa do odbioru biznesowego.
- Agent API ma być jednym Asystentem mCRM w aplikacji, nie osobnym systemem.

## Priorytet
Najpierw stabilny rdzeń sprzedażowy:
rozmowa → wynik/notatka → następne działanie → termin → blocker → DZISIAJ → wykonanie → historia → prowizja.

## Agent API V1
Minimalny zakres:
- odczyt kontekstu Klienta i Deala,
- podsumowanie sprawy,
- wykrywanie braków i ryzyk,
- propozycja następnego kroku,
- przygotowanie roboczej wiadomości do klienta.

## Komunikacja z Tomaszem
Pokazywać tylko wynik biznesowy: GOTOWE / NIEGOTOWE / CO DZIAŁA LIVE / jedna decyzja biznesowa, jeśli naprawdę konieczna.
