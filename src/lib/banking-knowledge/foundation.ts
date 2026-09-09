import {
  MBANK_SOURCE_CATALOG,
  sourceFreshness,
  type BankingKnowledgeProblem,
  type BankSourceDefinition,
  type KnowledgeSourceConfidentiality,
  type KnowledgeSourceFreshness,
} from './source-catalog';

export type BankingKnowledgeQuality =
  'POTWIERDZONE' | 'CZĘŚCIOWE' | 'WNIOSEK AI' | 'WYMAGA WERYFIKACJI';

export type BankingKnowledgeSourceType =
  'deal_context' | 'internal_drive' | 'official_bank' | 'ai_inference';

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

export type IndexedKnowledgeChunk = {
  document_id: string;
  content: string;
  chunk_index?: number | null;
};

export type DealKnowledgeContext = {
  id: string;
  title: string;
  product: string | null;
  bank: string | null;
  bankStatus: string | null;
  stage: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  contact: string | null;
  company: string | null;
};

export type BankingKnowledgeSource = {
  id: string;
  type: BankingKnowledgeSourceType;
  label: string;
  bank: string;
  product: string;
  domains: BankingKnowledgeProblem[];
  version: string;
  effectiveDate: string | null;
  verifiedAt: string | null;
  confidentiality: KnowledgeSourceConfidentiality;
  freshness: KnowledgeSourceFreshness;
  quality: BankingKnowledgeQuality;
  publicUrl?: string;
  note?: string;
  facts?: string[];
};

export type BankingKnowledgeClaim = {
  id: string;
  text: string;
  quality: BankingKnowledgeQuality;
  sourceIds: string[];
};

export type BankingKnowledgeAnswer = {
  supported: boolean;
  question: string;
  problem: BankingKnowledgeProblem;
  context: DealKnowledgeContext;
  quality: BankingKnowledgeQuality;
  summary: string;
  why: string;
  steps: string[];
  claims: BankingKnowledgeClaim[];
  sources: BankingKnowledgeSource[];
  primarySourceIds: string[];
  internalSourceAvailable: boolean;
  recommendedNextAction: string;
  recommendedNextActionAt: string | null;
  missing: string[];
};

export type DealKnowledgeRow = {
  id: string;
  title: string;
  product_type?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
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

type ProductRoute = 'mortgage' | 'business' | 'generic';

type BankDefinition = {
  key: string;
  displayName: string;
  aliases: string[];
};

const DRIVE_SOURCE_PATTERN = /^gdrive:\/\/([^/]+)\/([^/]+)$/i;
const DRIVE_DOCUMENT_TYPE_PATTERN =
  /^google_drive_internal:(mortgage|business):([a-z+]+)$/i;

const BANK_REGISTRY: BankDefinition[] = [
  {
    key: 'mbank',
    displayName: 'mBank',
    aliases: ['mbank', 'mbank sa', 'mbank s a', 'mbank hipoteczny'],
  },
];

const PROBLEM_PATTERNS: Record<BankingKnowledgeProblem, RegExp> = {
  documents: /dokument|wyciag|zaswiadc|komplet|brakuj|pit|kpir/,
  application: /wnios|formularz|zloz|aplikac/,
  decision: /decyz|analiz|ocen|scoring|akcept/,
  activation: /uruchom|wyplat|transz|podpis|umow/,
};

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
  if (/hipote|mieszkan|nieruchom|^ml\b/.test(key)) return 'mortgage';
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

function routedDriveDomains(documentType: string | null | undefined) {
  const match = documentType?.match(DRIVE_DOCUMENT_TYPE_PATTERN);
  if (!match) return null;
  const domains = match[2]
    .split('+')
    .filter(
      (domain): domain is BankingKnowledgeProblem =>
        domain === 'documents' ||
        domain === 'application' ||
        domain === 'decision' ||
        domain === 'activation'
    );
  return {
    product: match[1] as Exclude<ProductRoute, 'generic'>,
    domains,
  };
}

export function routeBankingKnowledgeProblem(args: {
  question?: string | null;
  nextAction?: string | null;
  stage?: string | null;
}): BankingKnowledgeProblem {
  for (const value of [args.question, args.nextAction, args.stage]) {
    const normalized = normalize(value);
    if (!normalized) continue;
    for (const problem of [
      'documents',
      'application',
      'decision',
      'activation',
    ] as const) {
      if (PROBLEM_PATTERNS[problem].test(normalized)) return problem;
    }
  }
  return 'documents';
}

export function parseAllowedDriveFolderIds(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function buildInternalDriveSources(args: {
  documents: KnowledgeDocumentMetadata[];
  indexedChunks: IndexedKnowledgeChunk[];
  dealProduct: string | null;
  bank: BankDefinition;
  problem: BankingKnowledgeProblem;
  allowedDriveFolderIds: ReadonlySet<string>;
  now: Date;
}) {
  const chunksByDocument = new Map<string, IndexedKnowledgeChunk[]>();
  for (const chunk of args.indexedChunks) {
    if (!chunk.content?.trim()) continue;
    const current = chunksByDocument.get(chunk.document_id) ?? [];
    current.push(chunk);
    chunksByDocument.set(chunk.document_id, current);
  }

  return args.documents.flatMap<BankingKnowledgeSource>((document) => {
    const routedMetadata = routedDriveDomains(document.document_type);
    if (
      findSupportedBank(document.bank)?.key !== args.bank.key ||
      !productMatches(document.product, args.dealProduct) ||
      !/(drive|wewn|internal)/.test(normalize(document.document_type)) ||
      (routedMetadata &&
        (!routedMetadata.domains.includes(args.problem) ||
          routedMetadata.product !== productRoute(args.dealProduct)))
    ) {
      return [];
    }

    const driveRoute = document.source_name?.match(DRIVE_SOURCE_PATTERN);
    if (!driveRoute || !args.allowedDriveFolderIds.has(driveRoute[1]))
      return [];

    const chunks = chunksByDocument.get(document.id) ?? [];
    const relevantChunk = chunks.find((chunk) =>
      PROBLEM_PATTERNS[args.problem].test(
        normalize(
          `${document.title} ${document.document_type} ${chunk.content}`
        )
      )
    );
    if (!relevantChunk) return [];

    const version =
      document.source_version ||
      document.effective_date ||
      document.updated_at?.slice(0, 10) ||
      'brak wersji';
    const excerpt = relevantChunk.content.trim().slice(0, 320);
    const effectiveTime = document.effective_date
      ? new Date(`${document.effective_date}T00:00:00Z`).getTime()
      : Number.NaN;
    const ageMs = args.now.getTime() - effectiveTime;
    const isCurrent =
      Number.isFinite(effectiveTime) &&
      ageMs >= -24 * 60 * 60 * 1000 &&
      ageMs <= 90 * 24 * 60 * 60 * 1000;

    return [
      {
        id: document.id,
        type: 'internal_drive',
        label: document.title || 'Wewnętrzny dokument Google Drive',
        bank: args.bank.displayName,
        product:
          document.product || args.dealProduct || 'Produkt do potwierdzenia',
        domains: [args.problem],
        version,
        effectiveDate: document.effective_date || null,
        verifiedAt: document.updated_at?.slice(0, 10) || null,
        confidentiality: 'internal',
        freshness: isCurrent ? 'current' : 'requires_review',
        quality: 'CZĘŚCIOWE',
        note: 'Prywatne źródło z zatwierdzonego korzenia, faktycznie obecne w izolowanym indeksie; fragment wymaga oceny doradcy.',
        facts: [excerpt],
      },
    ];
  });
}

function chooseSupportedBankProcess(
  deal: DealKnowledgeRow,
  bankProcesses: BankProcessRow[]
) {
  const supported = bankProcesses
    .filter((process) => findSupportedBank(process.bank_name))
    .filter(
      (process) => !/odrzu|zamkn|anul|rezygn/.test(normalize(process.status))
    )
    .sort((left, right) => {
      const leftProduct = productMatches(
        left.product_variant,
        deal.product_type
      )
        ? 1
        : 0;
      const rightProduct = productMatches(
        right.product_variant,
        deal.product_type
      )
        ? 1
        : 0;
      return (
        rightProduct - leftProduct ||
        (left.position ?? Number.MAX_SAFE_INTEGER) -
          (right.position ?? Number.MAX_SAFE_INTEGER)
      );
    });

  if (supported[0]) {
    return {
      process: supported[0],
      bank: findSupportedBank(supported[0].bank_name)!,
    };
  }

  const configured = findSupportedBank(
    deal.mandatory_bank || deal.preferred_bank
  );
  if (!configured) return null;
  return {
    bank: configured,
    process: {
      bank_name: configured.displayName,
      status: null,
      product_variant: deal.product_type || null,
    },
  };
}

function officialSource(
  definition: BankSourceDefinition,
  problem: BankingKnowledgeProblem,
  now: Date
): BankingKnowledgeSource {
  const freshness = sourceFreshness(definition, now);
  const claims = definition.claims.filter((claim) =>
    claim.problems.includes(problem)
  );
  return {
    id: definition.id,
    type: definition.type,
    label: definition.label,
    bank: definition.bank,
    product: definition.product,
    domains: [...definition.domains],
    version: definition.version,
    effectiveDate: definition.effectiveDate,
    verifiedAt: definition.verifiedAt,
    confidentiality: definition.confidentiality,
    freshness,
    quality:
      freshness === 'requires_review' || claims.length === 0
        ? 'WYMAGA WERYFIKACJI'
        : claims.every((claim) => claim.quality === 'POTWIERDZONE')
          ? 'POTWIERDZONE'
          : 'CZĘŚCIOWE',
    publicUrl: definition.url,
    facts: claims.map((claim) => claim.text),
  };
}

function failClosedAnswer(args: {
  question: string;
  problem: BankingKnowledgeProblem;
  context: DealKnowledgeContext;
  missing: string[];
  summary: string;
  why: string;
}): BankingKnowledgeAnswer {
  return {
    supported: false,
    question: args.question,
    problem: args.problem,
    context: args.context,
    quality: 'WYMAGA WERYFIKACJI',
    summary: args.summary,
    why: args.why,
    steps: ['Uzupełnij wskazany kontekst i ponów pytanie.'],
    claims: [],
    sources: [],
    primarySourceIds: [],
    internalSourceAvailable: false,
    recommendedNextAction:
      args.context.nextAction || 'Ustal i zapisz jeden następny krok.',
    recommendedNextActionAt: args.context.nextActionAt,
    missing: args.missing,
  };
}

function fallbackNextAction(
  problem: BankingKnowledgeProblem,
  route: Exclude<ProductRoute, 'generic'>
) {
  switch (problem) {
    case 'application':
      return 'Zweryfikuj komplet dokumentów i status przygotowania wniosku w systemie bankowym.';
    case 'decision':
      return 'Sprawdź status decyzji i brakujące warunki bezpośrednio w systemie bankowym.';
    case 'activation':
      return 'Zweryfikuj warunki uruchomienia bezpośrednio w systemie bankowym przed wykonaniem kroku.';
    default:
      return route === 'business'
        ? 'Otwórz oficjalną listę dokumentów kredytów firmowych mBanku, ustal braki i zapisz je w Dealu.'
        : 'Otwórz oficjalną listę dokumentów mBanku, ustal braki dla klienta i zapisz je w Dealu.';
  }
}

export function buildBankingKnowledgeAnswer(args: {
  deal: DealKnowledgeRow;
  bankProcesses: BankProcessRow[];
  documents: KnowledgeDocumentMetadata[];
  indexedChunks?: IndexedKnowledgeChunk[];
  allowedDriveFolderIds: ReadonlySet<string>;
  question?: string | null;
  now?: Date;
}): BankingKnowledgeAnswer {
  const question =
    args.question?.trim().slice(0, 500) || 'Co mam zrobić dalej?';
  const selected = chooseSupportedBankProcess(args.deal, args.bankProcesses);
  const process = selected?.process;
  const bank = selected?.bank;
  const product = process?.product_variant || args.deal.product_type || null;
  const problem = routeBankingKnowledgeProblem({
    question,
    nextAction: args.deal.next_action,
    stage: args.deal.stage?.name,
  });
  const context: DealKnowledgeContext = {
    id: args.deal.id,
    title: args.deal.title,
    product,
    bank: bank?.displayName || null,
    bankStatus: process?.status || null,
    stage: args.deal.stage?.name || null,
    nextAction: args.deal.next_action || null,
    nextActionAt: args.deal.next_action_at || null,
    contact: args.deal.contact?.name || null,
    company: args.deal.company?.name || null,
  };
  const missing = [
    !context.bank && 'bank',
    !context.product && 'produkt',
    !context.nextAction && 'następny krok',
  ].filter((item): item is string => Boolean(item));

  if (!process || !bank) {
    return failClosedAnswer({
      question,
      problem,
      context,
      missing,
      summary: 'Brak obsługiwanego banku w aktywnym procesie tego Deala.',
      why: 'Silnik nie dobiera źródeł bez jednoznacznego, obsługiwanego banku.',
    });
  }

  const selectedProductRoute = productRoute(product);
  if (selectedProductRoute === 'generic') {
    return failClosedAnswer({
      question,
      problem,
      context,
      missing,
      summary: 'Ten produkt nie ma jeszcze zatwierdzonego katalog źródeł M4.',
      why: 'Silnik działa tylko dla jawnie obsługiwanych produktów.',
    });
  }

  const now = args.now ?? new Date();
  const officialSources = MBANK_SOURCE_CATALOG.filter(
    (source) =>
      source.productRoute === selectedProductRoute &&
      (source.domains as readonly BankingKnowledgeProblem[]).includes(problem)
  ).map((source) => officialSource(source, problem, now));
  const internalSources = buildInternalDriveSources({
    documents: args.documents,
    indexedChunks: args.indexedChunks ?? [],
    dealProduct: product,
    bank,
    problem,
    allowedDriveFolderIds: args.allowedDriveFolderIds,
    now,
  });

  const contextSource: BankingKnowledgeSource = {
    id: `deal-${args.deal.id}`,
    type: 'deal_context',
    label: 'Bieżący kontekst Deala',
    bank: bank.displayName,
    product: product || 'Produkt do potwierdzenia',
    domains: [problem],
    version: 'bieżący rekord',
    effectiveDate: null,
    verifiedAt: now.toISOString().slice(0, 10),
    confidentiality: 'internal',
    freshness: 'current',
    quality: 'POTWIERDZONE',
    note: 'Potwierdza wyłącznie dane zapisane w tym Dealu, nie reguły banku.',
  };

  const recommendedNextAction =
    context.nextAction || fallbackNextAction(problem, selectedProductRoute);
  const inferenceSource: BankingKnowledgeSource | null = context.nextAction
    ? null
    : {
        id: `ai-${args.deal.id}-${problem}`,
        type: 'ai_inference',
        label: 'Wniosek operacyjny z kontekstu Deala',
        bank: bank.displayName,
        product: product || 'Produkt do potwierdzenia',
        domains: [problem],
        version: 'bieżący kontekst',
        effectiveDate: null,
        verifiedAt: null,
        confidentiality: 'internal',
        freshness: 'current',
        quality: 'WNIOSEK AI',
        note: 'Rekomendacja operacyjna; nie jest faktem ani regułą banku.',
      };

  const sourceClaims: BankingKnowledgeClaim[] = [
    ...internalSources.flatMap((source) =>
      (source.facts ?? []).map((fact, index) => ({
        id: `${source.id}-${index}`,
        text: fact,
        quality: source.quality,
        sourceIds: [source.id],
      }))
    ),
    ...officialSources.flatMap((source) =>
      (source.facts ?? []).map((fact, index) => ({
        id: `${source.id}-${index}`,
        text: fact,
        quality: source.quality,
        sourceIds: [source.id],
      }))
    ),
  ];
  const actionClaim: BankingKnowledgeClaim = {
    id: `recommended-action-${args.deal.id}`,
    text: recommendedNextAction,
    quality: context.nextAction ? 'POTWIERDZONE' : 'WNIOSEK AI',
    sourceIds: context.nextAction ? [contextSource.id] : [inferenceSource!.id],
  };
  const usableSourceClaims = sourceClaims.filter(
    (claim) => claim.quality !== 'WYMAGA WERYFIKACJI'
  );
  const primarySources = internalSources.length
    ? internalSources
    : officialSources.filter((source) => (source.facts?.length ?? 0) > 0);
  const quality: BankingKnowledgeQuality = !usableSourceClaims.length
    ? 'WYMAGA WERYFIKACJI'
    : internalSources.length &&
        context.nextAction &&
        usableSourceClaims.every((claim) => claim.quality === 'POTWIERDZONE')
      ? 'POTWIERDZONE'
      : 'CZĘŚCIOWE';

  const steps = [
    `Potwierdź kontekst: ${context.stage || 'etap nieustalony'} → ${recommendedNextAction}.`,
    internalSources.length
      ? 'Najpierw sprawdź zatwierdzone źródło wewnętrzne z dozwolonego folderu.'
      : 'Źródło wewnętrzne nie jest dostępne — korzystaj tylko z oficjalnych źródeł wskazanych poniżej.',
    usableSourceClaims.length
      ? 'Zweryfikuj szczegół w źródle przed działaniem na realnej sprawie.'
      : 'Brak źródła potwierdzającego ten problem — zatrzymaj wykonanie i zweryfikuj ręcznie.',
    `Rekomendowany następny krok: ${recommendedNextAction}`,
  ];

  return {
    supported: true,
    question,
    problem,
    context,
    quality,
    summary:
      quality === 'WYMAGA WERYFIKACJI'
        ? 'Brak źródła potwierdzającego odpowiedź. Nie wykonuj kroku bez ręcznej weryfikacji.'
        : `Następny krok: ${recommendedNextAction}`,
    why: context.nextAction
      ? 'Następny krok pochodzi bezpośrednio z bieżącego Deala.'
      : 'Następny krok jest wyraźnie oznaczoną rekomendacją operacyjną, a nie faktem ze źródła.',
    steps,
    claims: [...sourceClaims, actionClaim],
    sources: [
      contextSource,
      ...internalSources,
      ...officialSources,
      ...(inferenceSource ? [inferenceSource] : []),
    ],
    primarySourceIds: primarySources.map((source) => source.id),
    internalSourceAvailable: internalSources.length > 0,
    recommendedNextAction,
    recommendedNextActionAt: context.nextActionAt,
    missing,
  };
}

export const supportedBankKeys = BANK_REGISTRY.map((bank) => bank.key);
export type { BankingKnowledgeProblem };

