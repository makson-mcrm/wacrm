export type QualificationLabel = 'FAKT' | 'WNIOSEK AI' | 'BRAK DANYCH';
export type QualificationField = 'product_type' | 'stage' | 'next_action';

export interface KnowledgeEntry {
  id: string;
  title: string;
  explanation: string;
  label: QualificationLabel;
  source: string;
  /** Date of reading the repository source, not a fresh bank-policy verification. */
  checkedAt: string;
  field?: QualificationField;
}

export interface BankKnowledge extends KnowledgeEntry {
  products: readonly KnowledgeEntry[];
  requirements: readonly KnowledgeEntry[];
}

const source = 'docs/banking-knowledge-mbank-foundation.md';
const checkedAt = '2026-11-07';

/** Offline transcription of the foundation. No inferred lending thresholds. */
export const bankKnowledge: readonly BankKnowledge[] = [
  {
    id: 'mbank',
    title: 'mBank',
    label: 'FAKT',
    source,
    checkedAt,
    explanation:
      'Fundament Wiedzy Bankowej dotyczy mBanku i kontekstu zapisanego deala.',
    products: [
      {
        id: 'unspecified',
        title: 'Katalog produktów',
        label: 'BRAK DANYCH',
        source,
        checkedAt,
        explanation:
          'Dokument nie wymienia konkretnych produktów ani ich kryteriów kwalifikacji.',
      },
    ],
    requirements: [
      {
        id: 'routing',
        title: 'Dobór źródła',
        label: 'FAKT',
        source,
        checkedAt,
        explanation:
          'Routing: BANK → PRODUKT → TYP ŹRÓDŁA → WERSJA/DATA. Jest to zasada fundamentu, nie decyzja kredytowa.',
      },
      {
        id: 'product',
        title: 'Produkt deala',
        field: 'product_type',
        label: 'FAKT',
        source,
        checkedAt,
        explanation:
          'Fundament wymaga produktu w kontekście deala. Samo wypełnienie pola nie potwierdza oferty banku.',
      },
      {
        id: 'stage',
        title: 'Etap deala',
        field: 'stage',
        label: 'FAKT',
        source,
        checkedAt,
        explanation: 'Odpowiedź fundamentu uwzględnia etap zapisanego deala.',
      },
      {
        id: 'next-action',
        title: 'Następny krok',
        field: 'next_action',
        label: 'FAKT',
        source,
        checkedAt,
        explanation:
          'Fundament wymaga jednego następnego kroku; jego brak wymaga weryfikacji.',
      },
      {
        id: 'process',
        title: 'Wymagania procesu bankowego',
        label: 'BRAK DANYCH',
        source,
        checkedAt,
        explanation:
          'Dokument wskazuje kontekst procesu mBanku, ale nie podaje szczegółowej procedury ani listy wymaganych dokumentów.',
      },
      {
        id: 'lending-criteria',
        title: 'Kryteria kredytowe',
        label: 'BRAK DANYCH',
        source,
        checkedAt,
        explanation:
          'Brak progów dochodu, stażu, BIK i innych warunków. Nie można potwierdzić kwalifikacji kredytowej.',
      },
      {
        id: 'corroboration',
        title: 'Potwierdzenie źródeł',
        label: 'BRAK DANYCH',
        source,
        checkedAt,
        explanation:
          'Fundament wymaga zgodnych źródeł oficjalnych i dopuszczonych wewnętrznych. W tym rejestrze nie zweryfikowano takiej pary źródeł.',
      },
    ],
  },
];
