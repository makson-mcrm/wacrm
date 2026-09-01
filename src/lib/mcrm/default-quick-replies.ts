export const MCRM_DEFAULT_QUICK_REPLIES = [
  { title: 'SMS — Brak dokumentów', content_text: 'Dzień dobry [IMIĘ_KLIENTA], do dalszej analizy brakuje jeszcze dokumentów wskazanych w naszej rozmowie. Proszę o ich przesłanie lub informację, kiedy będą dostępne. Pozdrawiam, Tomasz Maksoń' },
  { title: 'SMS — Spotkanie', content_text: 'Dzień dobry [IMIĘ_KLIENTA], potwierdzam nasze spotkanie. Jeśli termin przestał być aktualny, proszę o krótką wiadomość. Pozdrawiam, Tomasz Maksoń' },
  { title: 'SMS — Prośba o kontakt', content_text: 'Dzień dobry [IMIĘ_KLIENTA], próbowałem się skontaktować. Proszę o telefon lub wiadomość, kiedy będzie dogodny moment na rozmowę. Pozdrawiam, Tomasz Maksoń' },
  { title: 'SMS — Status / decyzja', content_text: 'Dzień dobry [IMIĘ_KLIENTA], proszę o kontakt w sprawie aktualnego statusu i dalszej decyzji. Pozdrawiam, Tomasz Maksoń' },
  { title: 'SMS — Follow-up', content_text: 'Dzień dobry [IMIĘ_KLIENTA], wracam do naszej ostatniej rozmowy. Czy możemy przejść do kolejnego kroku? Pozdrawiam, Tomasz Maksoń' },
  { title: 'SMS — Prośba o opinię', content_text: 'Dzień dobry [IMIĘ_KLIENTA], dziękuję za współpracę. Będę wdzięczny za krótką opinię o naszej współpracy. Pozdrawiam, Tomasz Maksoń' },
  {
    title: 'Brak odbioru — pierwszy kontakt',
    content_text:
      'Panie/Pani [IMIĘ_KLIENTA], tu Tomasz Maksoń. Próbowałem się dodzwonić w sprawie finansowania. Proszę o krótką informację: zamykamy temat czy mam oddzwonić? Jeśli oddzwonić — kiedy będzie wygodnie?\n\n[STOPKA_TOMASZ_SMS]',
  },
  {
    title: 'Brakujące dokumenty — hipoteka',
    content_text:
      'Panie/Pani [IMIĘ_KLIENTA], do dalszej analizy potrzebuję dokumentów oznaczonych na liście braków. Proszę je przesłać przez [LINK_WGRYWANIE] albo na mój e-mail. Proszę też o potwierdzenie, kiedy realnie mogę spodziewać się kompletu.\n\n[STOPKA_TOMASZ_SMS]',
  },
  {
    title: 'Brakujące dokumenty — firma',
    content_text:
      'Panie/Pani [IMIĘ_KLIENTA], do analizy finansowania firmy potrzebuję dokumentów wskazanych na liście braków. Proszę je przesłać przez [LINK_WGRYWANIE] albo na mój e-mail i potwierdzić realny termin dosłania kompletu.\n\n[STOPKA_TOMASZ_SMS]',
  },
  {
    title: 'Przypomnienie o ankiecie',
    content_text:
      'Panie/Pani [IMIĘ_KLIENTA], przed spotkaniem [DATA_SPOTKANIA] potrzebuję wypełnionej ankiety. Dzięki niej przygotuję rozmowę na konkretnych liczbach. Proszę uzupełnić ją najpóźniej 2 dni przed terminem.\n\n[STOPKA_TOMASZ_SMS]',
  },
  {
    title: 'Potwierdzenie spotkania',
    content_text:
      'Panie/Pani [IMIĘ_KLIENTA], potwierdzam nasze spotkanie: [DATA_SPOTKANIA]. Jeśli termin przestał być aktualny, proszę o krótką wiadomość.\n\n[STOPKA_TOMASZ_SMS]',
  },
  {
    title: 'Follow-up po przedstawieniu propozycji',
    content_text:
      'Panie/Pani [IMIĘ_KLIENTA], wracam do przedstawionych propozycji. Czy podejmujemy kolejny krok, potrzebuje Pan/Pani dodatkowego wyjaśnienia, czy na ten moment zamykamy temat?\n\n[STOPKA_TOMASZ_SMS]',
  },
] as const;

