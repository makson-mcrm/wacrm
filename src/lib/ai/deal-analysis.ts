export type KnowledgeState = 'ZWERYFIKOWANY' | 'NIEPEŁNA WIEDZA' | 'BRAK ŹRÓDEŁ'

export interface DealAnalysisRulesInput {
  source?: string | null
  mandatoryBank?: string | null
  preferredBank?: string | null
  excludedBanks?: string[] | null
  includedBanks?: string[] | null
  availableBanks: string[]
}

export interface AppliedDealRules {
  allowedBanks: string[]
  mandatoryBank: string | null
  preferredBank: string | null
  excludedBanks: string[]
  operationalRules: string[]
  conflicts: string[]
}

const key = (value: string) => value.trim().toLocaleLowerCase('pl-PL')
const unique = (values: (string | null | undefined)[]) => {
  const seen = new Set<string>()
  return values.flatMap((value) => {
    const clean = value?.trim()
    if (!clean || seen.has(key(clean))) return []
    seen.add(key(clean))
    return [clean]
  })
}

export function applyDealBankRules(input: DealAnalysisRulesInput): AppliedDealRules {
  const source = key(input.source || '')
  const operationalRules: string[] = []
  let mandatoryBank = input.mandatoryBank?.trim() || null
  let preferredBank = input.preferredBank?.trim() || null

  if (source.includes('lead mfinanse')) {
    mandatoryBank = 'mBank'
    operationalRules.push('Lead mFinanse: analiza ograniczona do mBanku.')
  } else if (source.includes('podajnik mbank')) {
    preferredBank ||= 'mBank'
    operationalRules.push('Podajnik mBank: mBank ma priorytet operacyjny.')
  }

  const excludedBanks = unique(input.excludedBanks ?? [])
  const excluded = new Set(excludedBanks.map(key))
  const candidates = unique([
    ...input.availableBanks,
    ...(input.includedBanks ?? []),
    mandatoryBank,
    preferredBank,
  ])
  const conflicts: string[] = []

  if (mandatoryBank && excluded.has(key(mandatoryBank))) {
    conflicts.push(`Bank obowiązkowy ${mandatoryBank} jest wykluczony przez klienta.`)
    return { allowedBanks: [], mandatoryBank, preferredBank, excludedBanks, operationalRules, conflicts }
  }

  const allowedBanks = candidates.filter((bank) => !excluded.has(key(bank)))
    .filter((bank) => !mandatoryBank || key(bank) === key(mandatoryBank))

  return { allowedBanks, mandatoryBank, preferredBank, excludedBanks, operationalRules, conflicts }
}

export interface KnowledgeMetadata {
  bank?: string | null
  product?: string | null
  documentType?: string | null
  sourceName?: string | null
  version?: string | null
  effectiveDate?: string | null
}

export function knowledgeState(chunks: KnowledgeMetadata[]): KnowledgeState {
  if (!chunks.length) return 'BRAK ŹRÓDEŁ'
  return chunks.every((chunk) =>
    Boolean(chunk.bank && chunk.product && chunk.documentType && chunk.sourceName && (chunk.version || chunk.effectiveDate)),
  ) ? 'ZWERYFIKOWANY' : 'NIEPEŁNA WIEDZA'
}

export function enforceAllowedRecommendations<T extends { bank?: string | null }>(
  recommendations: T[],
  allowedBanks: string[],
): T[] {
  const allowed = new Set(allowedBanks.map(key))
  return recommendations.filter((item) => item.bank && allowed.has(key(item.bank)))
}

export const MANUAL_VERIFICATION_MESSAGE =
  'Brak podstaw w dostępnych źródłach — wymagana ręczna weryfikacja.'

export function buildAnalysisInsert(input: {
  accountId: string
  dealId: string
  modelProvider: string
  modelName: string
  durationMs: number
  chunkCount: number
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null
  result: unknown
  sources: unknown[]
}) {
  return {
    account_id: input.accountId,
    deal_id: input.dealId,
    provider: input.modelProvider,
    model: input.modelName,
    duration_ms: input.durationMs,
    chunk_count: input.chunkCount,
    prompt_tokens: input.usage?.promptTokens ?? null,
    completion_tokens: input.usage?.completionTokens ?? null,
    total_tokens: input.usage?.totalTokens ?? null,
    cost_amount: null,
    result: input.result,
    sources: input.sources,
  }
}

