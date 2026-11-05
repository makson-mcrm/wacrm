/**
 * KM3.2.08: powierzchnia Lejka 02B pokazuje domyślnie wyłącznie rdzeń Bigin.
 * Po decyzji Tomasza ustaw pipelineExtensions na true, aby przywrócić
 * wszystkie poniższe dodatki w ich dotychczasowych miejscach.
 * To przełącznik prezentacji; nie zmienia danych, zapytań ani uprawnień.
 */
export const surfaceFlags: Readonly<{ pipelineExtensions: boolean }> = {
  pipelineExtensions: false,
};

export const pipelineSurfaceExtensions = [
  'Nagłówek Lejek sprzedaży i opis Wszystkie aktywne sprawy (Tomasz)',
  'Archiwum nad tablicą',
  'Filtry Produkt, Tag, Bank, Priorytet',
  'Tylko przeterminowane, Bez next action, Więcej filtrów i Wyczyść filtry',
  'Wybór i zarządzanie lejkami w rozwijanych filtrach',
  'KPI: Aktywne sprawy, Przychód TERAZ/PÓŹNIEJ, Z blockerem, Z next action',
  'Panel i akcja Asystenta AI: Przeanalizuj lejek',
  'Ostatnia aktywność na karcie',
  'ZADZWOŃ i WIADOMOŚĆ na karcie',
  'Dodaj deal pod etapami na desktop i mobile',
] as const;
