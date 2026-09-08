export type BankingKnowledgeQuality =
  'POTWIERDZONE ZE ŹRÓDŁA' | 'CZĘŚCIOWE' | 'WNIOSEK AI' | 'WYMAGA WERYFIKACJI';

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
  facts?: string[];
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

type BankDefinition = {
  key: string;
  displayName: string;
  aliases: string[];
  publicSources: OfficialSource[];
};

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
    facts: [
      'mBank publikuje tu aktualny regulamin kredytu hipotecznego, formularze zmian oraz dokumenty do ubezpieczeń.',
      'Wskazany na stronie regulamin kredytów i pożyczek hipotecznych dla osób fizycznych obowiązuje od 28.05.2025 r.',
    ],
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
    facts: [
      'Oficjalny poradnik prowadzi do listy dokumentów dobieranej do sytuacji konkretnego klienta.',
      'Lista dokumentów jest przeznaczona do ustalenia materiałów potrzebnych do wydania decyzji kredytowej.',
    ],
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
    facts: [
      'Oficjalna strona rozdziela dokumenty według konkretnego produktu firmowego, m.in. kredytu obrotowego, inwestycyjnego i mPlanu hipotecznego dla firm.',
      'Przed użyciem dokumentu trzeba wybrać produkt zgodny z produktem zapisanym w Dealu.',
    ],
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
    facts: [
      'To oficjalny punkt wejścia do aktualnych regulaminów i dokumentów mBanku.',
      'Bez określonego produktu źródło nie potwierdza wymagań konkretnej sprawy.',
    ],
    route: 'generic',
  },
];

const BANK_REGISTRY: BankDefinition[] = [
  {
    key: 'mbank',
    displayName: 'mBank',
    aliases: ['mbank', 'mbank sa', 'mbank s a'],
    publicSources: MBANK_PUBLIC_SOURCES,
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

function findSupportedBank(value: string | null | undefined) {
  const key = normalize(value);
  return BANK_REGISTRY.find((bank) =>
    bank.aliases.some((alias) => normalize(alias) === key)
  );
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
  bank: BankDefinition,
  allowedDriveFolderIds: ReadonlySet<string>
) {
  return documents.flatMap<BankingKnowledgeSource>((document) => {
    if (
      findSupportedBank(document.bank)?.key !== bank.key ||
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
        bank: bank.displayName,
        product: document.product || dealProduct || 'Produkt do potwierdzenia',
        version,
        quality:
          document.source_version || document.effective_date
            ? 'POTWIERDZONE ZE ŹRÓDŁA'
            : 'CZĘŚCIOWE',
        note: 'Prywatne źródło z dozwolonego folderu; bez publicznego linku.',
      },
    ];
  });
}

function chooseSupportedBankProcess(
  deal: DealKnowledgeRow,
  bankProcesses: BankProcessRow[]
) {
  for (const process of bankProcesses) {
    const bank = findSupportedBank(process.bank_name);
    if (bank) return { process, bank };
  }
  const configured = findSupportedBank(
    deal.mandatory_bank || deal.preferred_bank
  );
  if (configured) {
    return {
      bank: configured,
      process: {
        bank_name: configured.displayName,
        status: null,
        product_variant: null,
      },
    };
  }
  return null;
}

export function buildBankingKnowledgeAnswer(args: {
  deal: DealKnowledgeRow;
  bankProcesses: BankProcessRow[];
  documents: KnowledgeDocumentMetadata[];
  allowedDriveFolderIds: ReadonlySet<string>;
}): BankingKnowledgeAnswer {
  const { deal, bankProcesses, documents, allowedDriveFolderIds } = args;
  const selected = chooseSupportedBankProcess(deal, bankProcesses);
  const process = selected?.process;
  const bank = selected?.bank;
  const product = process?.product_variant || deal.product_type || null;
  const route = productRoute(product);
  const context: DealKnowledgeContext = {
    id: deal.id,
    title: deal.title,
    product,
    bank: bank?.displayName || null,
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

  if (!process || !bank) {
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

  const officialSources = bank.publicSources
    .filter((source) => source.route === route)
    .map<BankingKnowledgeSource>((source) => ({
      id: source.id,
      type: source.type,
      label: source.label,
      bank: source.bank,
      product: source.product,
      version: source.version,
      publicUrl: source.publicUrl,
      note: source.note,
      quality: 'POTWIERDZONE ZE ŹRÓDŁA',
      facts: source.facts,
    }));
  const internalSources = internalDriveSources(
    documents,
    product,
    bank,
    allowedDriveFolderIds
  );
  const inference: BankingKnowledgeSource = {
    id: `ai-${deal.id}`,
    type: 'ai_inference',
    label: 'Wniosek z kontekstu Deala',
    bank: bank.displayName,
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
      ? 'POTWIERDZONE ZE ŹRÓDŁA'
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

export const supportedBankKeys = BANK_REGISTRY.map((bank) => bank.key);
