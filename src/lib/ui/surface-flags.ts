/**
 * KM3.2.08 / KM3.2.09-A: powierzchnia Lejka 02B i list pokazuje rdzeń Bigin.
 * Po decyzji Tomasza ustaw odpowiednią flagę na true, aby przywrócić
 * dodatki danego ekranu w ich dotychczasowych miejscach.
 * To przełącznik prezentacji; nie zmienia danych, zapytań ani uprawnień.
 */
export const surfaceFlags: Readonly<{
  pipelineExtensions: boolean;
  contactsExtensions: boolean;
  companiesExtensions: boolean;
  dealsListExtensions: boolean;
}> = {
  pipelineExtensions: false,
  contactsExtensions: false,
  companiesExtensions: false,
  dealsListExtensions: false,
};

// Historyczna nazwa: lista obejmuje również dodatki ekranów list KM3.2.09-A.
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
  'Kontakty: segmenty, tagi, pola własne, eksport/import i akcje masowe',
  'Kontakty: autorskie nagłówki, KPI, powiązania, aktywność i szybkie akcje',
  'Firmy: NIP, osoba kontaktowa, aktywne Deale i następne działanie na liście',
  'Firmy: historia aktywności, powiązania małżonka i edytor tagów',
  'Lista transakcji: autorski nagłówek i opis; filtry i AI obecnie nie występują',
] as const;
