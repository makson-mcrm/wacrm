export type BankingKnowledgeQuality =
  'POTWIERDZONE' | 'CZĘŚCIOWE' | 'WNIOSEK AI' | 'WYMAGA WERYFIKACJI';

export type BankingKnowledgeSourceType =
  'internal_drive' | 'official_bank' | 'ai_inference';

export type KnowledgeDocumentMetadata = {
  id: string;
  title: string;
  bank?: string | null;
  product?: string | null;
  document_type?: string | null;
  source_name?: string | null;
  source_version?: string | null;
  effective_date?: string | null;
  updated_at?: string | null;
};

export type DealKnowledgeContext = {
  id: string;
  title: string;
  product: string | null;
  bank: string | null;
  bankStatus: string | null;
  stage: string | null;
  nextAction: string | null;
  contact: string | null;
  company: string | null;
};

export type BankingKnowledgeSource = {
  id: string;
  type: BankingKnowledgeSourceType;
  label: string;
  bank: string;
  product: string;
  version: string;
  quality: BankingKnowledgeQuality;
  publicUrl?: string;
  note?: string;
};

export type BankingKnowledgeAnswer = {
  supported: boolean;
  context: DealKnowledgeContext;
  quality: BankingKnowledgeQuality;
  summary: string;
  why: string;
  steps: string[];
  sources: BankingKnowledgeSource[];
  missing: string[];
};

export type DealKnowledgeRow = {
  id: string;
  title: string;
  product_type?: string | null;
  next_action?: string | null;
  mandatory_bank?: string | null;
  preferred_bank?: string | null;
  contact?: { name?: string | null } | null;
  company?: { name?: string | null } | null;
  stage?: { name?: string | null } | null;
};

type BankProcessRow = {
  bank_name?: string | null;
  product_variant?: string | null;
  status?: string | null;
  position?: number | null;
};

type OfficialSource = Omit<BankingKnowledgeSource, 'quality'> & {
  route: ProductRoute;
};

type ProductRoute = 'mortgage' | 'business' | 'generic';

const MBANK_KEY = 'mbank';
const DRIVE_SOURCE_PATTERN = /^gdrive:\/\/([^/]+)\/([^/]+)$/i;

const MBANK_PUBLIC_SOURCES: OfficialSource[] = [
  {
    id: 'mbank-mortgage-documents',
    type: 'official_bank',
    label: 'mBank — kredyt hipoteczny: regulaminy i dokumenty',
    bank: 'mBank',
    product: 'Kredyt hipoteczny',
    version: 'obowiązuje od 28.05.2025; sprawdzono 08.09.2026',
    publicUrl:
      'https://www.mbank.pl/pomoc/dokumenty/oferta-indywidualna/kredyty/kredyt-hipoteczny/',
    route: 'mortgage',
  },
  {
    id: 'mbank-mortgage-guide',
    type: 'official_bank',
    label: 'mBank — poradnik kredytu hipotecznego',
    bank: 'mBank',
    product: 'Kredyt hipoteczny',
    version: 'strona bieżąca; sprawdzono 08.09.2026',
    publicUrl:
      'https://www.mbank.pl/indywidualny/kredyty/kredyty-hipoteczne/poradnik/',
    route: 'mortgage',
  },
  {
    id: 'mbank-business-documents',
    type: 'official_bank',
    label: 'mBank — kredyty firmowe: regulaminy i dokumenty',
    bank: 'mBank',
    product: 'Finansowanie firmy',
    version: 'strona bieżąca; sprawdzono 08.09.2026',
    publicUrl: 'https://www.mbank.pl/pomoc/dokumenty/firmy/kredyty/',
    route: 'business',
  },
  {
    id: 'mbank-public-entry',
    type: 'official_bank',
    label: 'mBank — oficjalne dokumenty banku',
    bank: 'mBank',
    product: 'Produkt do potwierdzenia',
    version: 'strona bieżąca; sprawdzono 08.09.2026',
    publicUrl: 'https://www.mbank.pl/pomoc/dokumenty/',
    route: 'generic',
  },
];

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isMbank(value: string | null | undefined) {
  return normalize(value).replaceAll(' ', '') === MBANK_KEY;
}

function productRoute(product: string | null | undefined): ProductRoute {
  const key = normalize(product);
  if (/hipotec|mieszkan|nieruchom/.test(key)) return 'mortgage';
  if (/firm|obrot|dzialal|biznes|rachunku biezac/.test(key)) return 'business';
  return 'generic';
}

function productMatches(
  documentProduct: string | null | undefined,
  dealProduct: string | null | undefined
) {
  if (!documentProduct) return true;
  const documentRoute = productRoute(documentProduct);
  const dealRoute = productRoute(dealProduct);
  if (documentRoute !== 'generic' || dealRoute !== 'generic') {
    return documentRoute === dealRoute;
  }
  const documentKey = normalize(documentProduct);
  const dealKey = normalize(dealProduct);
  return Boolean(
    documentKey &&
    dealKey &&
    (documentKey.includes(dealKey) || dealKey.includes(documentKey))
  );
}

export function parseAllowedDriveFolderIds(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function internalDriveSources(
  documents: KnowledgeDocumentMetadata[],
  dealProduct: string | null,
  allowedDriveFolderIds: ReadonlySet<string>
) {
  return documents.flatMap<BankingKnowledgeSource>((document) => {
    if (
      !isMbank(document.bank) ||
      !productMatches(document.product, dealProduct)
    ) {
      return [];
    }
    if (!/(drive|wewn|internal)/.test(normalize(document.document_type))) {
      return [];
    }
    const route = document.source_name?.match(DRIVE_SOURCE_PATTERN);
    if (!route || !allowedDriveFolderIds.has(route[1])) return [];
    const version =
      document.source_version ||
      document.effective_date ||
      document.updated_at?.slice(0, 10) ||
      'brak daty';
    return [
      {
        id: document.id,
        type: 'internal_drive',
        label: document.title || 'Wewnętrzny dokument Google Drive',
        bank: 'mBank',
        product: document.product || dealProduct || 'Produkt do potwierdzenia',
        version,
        quality:
          document.source_version || document.effective_date
            ? 'POTWIERDZONE'
            : 'CZĘŚCIOWE',
        note: 'Prywatne źródło z dozwolonego folderu; bez publicznego linku.',
      },
    ];
  });
}

function chooseMbankProcess(
  deal: DealKnowledgeRow,
  bankProcesses: BankProcessRow[]
) {
  const explicit = bankProcesses.find((process) => isMbank(process.bank_name));
  if (explicit) return explicit;
  if (isMbank(deal.mandatory_bank) || isMbank(deal.preferred_bank)) {
    return { bank_name: 'mBank', status: null, product_variant: null };
  }
  return null;
}

export function buildMbankKnowledgeAnswer(args: {
  deal: DealKnowledgeRow;
  bankProcesses: BankProcessRow[];
  documents: KnowledgeDocumentMetadata[];
  allowedDriveFolderIds: ReadonlySet<string>;
}): BankingKnowledgeAnswer {
  const { deal, bankProcesses, documents, allowedDriveFolderIds } = args;
  const process = chooseMbankProcess(deal, bankProcesses);
  const product = process?.product_variant || deal.product_type || null;
  const route = productRoute(product);
  const context: DealKnowledgeContext = {
    id: deal.id,
    title: deal.title,
    product,
    bank: process ? 'mBank' : null,
    bankStatus: process?.status || null,
    stage: deal.stage?.name || null,
    nextAction: deal.next_action || null,
    contact: deal.contact?.name || null,
    company: deal.company?.name || null,
  };
  const missing = [
    !context.bank && 'bank',
    !context.product && 'produkt',
    !context.nextAction && 'następny krok',
  ].filter((item): item is string => Boolean(item));

  if (!process) {
    return {
      supported: false,
      context,
      quality: 'WYMAGA WERYFIKACJI',
      summary: 'Najpierw wskaż mBank w procesie bankowym tego Deala.',
      why: 'Wiedza nie może zostać dobrana bez jednoznacznego banku w konkretnej sprawie.',
      steps: [
        'Otwórz zakładkę Proces bankowy.',
        'Wybierz mBank przy właściwej pozycji procesu.',
        'Uzupełnij produkt oraz następny krok i wróć do Wiedzy Bankowej.',
      ],
      sources: [],
      missing,
    };
  }

  const officialSources = MBANK_PUBLIC_SOURCES.filter(
    (source) => source.route === route
  ).map<BankingKnowledgeSource>((source) => ({
    id: source.id,
    type: source.type,
    label: source.label,
    bank: source.bank,
    product: source.product,
    version: source.version,
    publicUrl: source.publicUrl,
    note: source.note,
    quality: 'POTWIERDZONE',
  }));
  const internalSources = internalDriveSources(
    documents,
    product,
    allowedDriveFolderIds
  );
  const inference: BankingKnowledgeSource = {
    id: `ai-${deal.id}`,
    type: 'ai_inference',
    label: 'Wniosek z kontekstu Deala',
    bank: 'mBank',
    product: product || 'Produkt do potwierdzenia',
    version: 'bieżący stan Deala',
    quality: 'WNIOSEK AI',
    note: 'To wskazówka operacyjna, nie oficjalna reguła banku.',
  };
  const nextAction = context.nextAction || 'ustal i zapisz jeden następny krok';
  const steps = [
    `Potwierdź kontekst: ${context.stage || 'etap nieustalony'} → ${nextAction}.`,
    internalSources.length
      ? 'Sprawdź właściwą instrukcję wewnętrzną z dozwolonego folderu Drive.'
      : 'Brak podłączonej instrukcji wewnętrznej — oprzyj się wyłącznie na oficjalnym źródle i oznacz wątpliwości.',
    officialSources.length
      ? 'Zweryfikuj aktualne wymagania w oficjalnym źródle mBanku wskazanym poniżej.'
      : 'Produkt nie ma jeszcze przypisanego oficjalnego źródła — wymaga ręcznej weryfikacji.',
    `Wykonaj krok: ${nextAction}.`,
    'Zapisz wynik, jeden kolejny krok, termin oraz blocker w tym samym Dealu.',
  ];
  const quality: BankingKnowledgeQuality = missing.length
    ? 'WYMAGA WERYFIKACJI'
    : internalSources.length && officialSources.length
      ? 'POTWIERDZONE'
      : officialSources.length
        ? 'CZĘŚCIOWE'
        : 'WNIOSEK AI';

  return {
    supported: true,
    context,
    quality,
    summary: `Następny krok: ${nextAction}.`,
    why: `Wynika z aktualnego etapu „${context.stage || 'nieustalony'}” i następnego działania zapisanego w tym Dealu.`,
    steps,
    sources: [...internalSources, ...officialSources, inference],
    missing,
  };
}
