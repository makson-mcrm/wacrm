/**
 * KM3.4.1 — dodatki wszystkich ekranów są domyślnie ukryte.
 * Ustaw odpowiednią flagę na true, aby przywrócić dodatki danego ekranu
 * z zachowaniem ich kodu i dotychczasowych miejsc.
 * To przełącznik prezentacji; nie zmienia danych, zapytań ani uprawnień.
 */
export const surfaceFlags: Readonly<{
  headerExtensions: boolean;
  pipelineExtensions: boolean;
  contactsExtensions: boolean;
  companiesExtensions: boolean;
  dealsListExtensions: boolean;
  cardExtensions: boolean;
  dashboardExtensions: boolean;
  activitiesExtensions: boolean;
  tasksExtensions: boolean;
  inboxExtensions: boolean;
  bankQualification: boolean;
}> = {
  headerExtensions: false,
  pipelineExtensions: false,
  contactsExtensions: false,
  companiesExtensions: false,
  dealsListExtensions: false,
  cardExtensions: false,
  dashboardExtensions: false,
  activitiesExtensions: false,
  tasksExtensions: false,
  inboxExtensions: false,
  bankQualification: false,
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
  'Aktywności: panel rozmowy, notatki, next action, AI, KPI i szybkie akcje',
  'Karta kontaktu: autorski widok szczegółów, powiązania i panele dodatkowe',
] as const;
