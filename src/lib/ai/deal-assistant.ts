import { aiInputFingerprint, type AiFeature } from './cost-control'

export type Confidence = 'WYSOKA' | 'ŚREDNIA' | 'NISKA'
export type SourceQuality = 'POTWIERDZONE ŹRÓDŁEM' | 'CZĘŚCIOWE ŹRÓDŁA' | 'WYMAGA WERYFIKACJI'

export interface AssistantDeal {
  id: string
  title: string
  product_type?: string | null
  goal?: string | null
  description?: string | null
  source?: string | null
  next_action?: string | null
  next_action_at?: string | null
  blocker?: string | null
  income_type?: string | null
  monthly_income?: number | null
  liabilities?: string | null
  bik_status?: string | null
  property_value?: number | null
  own_contribution?: number | null
  mandatory_bank?: string | null
  preferred_bank?: string | null
  excluded_banks?: string[] | null
  analysis_include_banks?: string[] | null
  stage?: { name?: string | null } | null
}

export interface AssistantRequirement { name: string; status: string; required: boolean; notes?: string | null }
export interface AssistantSource { id: string; bank?: string | null; product?: string | null; sourceName?: string | null; version?: string | null; effectiveDate?: string | null }
export interface AssistantBankProcess { bank_name?: string | null; status?: string | null; product_variant?: string | null }

export interface DealAssistantResult {
  feature: AiFeature
  title: string
  summary: string
  recommendedNextAction: string
  confidence: Confidence
  sourceQuality: SourceQuality
  sources: Array<{ id: string; label: string; version: string | null }>
  qualification?: Array<{ bank: string; status: 'MOŻLIWY' | 'NIEPEWNY' | 'ODPADA'; reason: string; rule: string; source: string; confidence: Confidence }>
  completeness?: {
    fullAnalysis: { complete: number; total: number; missing: string[] }
    bankApplication: { bank: string | null; complete: number; total: number; missing: string[] }
  }
  paidAiUsed: boolean
  inputFingerprint: string
  generatedAt: string
  aiSynthesis?: string
}

const present = (value: unknown) => value !== null && value !== undefined && value !== ''
const unique = (values: Array<string | null | undefined>) => [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]

export function contextFingerprint(deal: AssistantDeal, requirements: AssistantRequirement[], sources: AssistantSource[]) {
  return aiInputFingerprint({
    deal: { ...deal, description: deal.description?.slice(0, 1200) },
    requirements: requirements.map(({ name, status, required }) => ({ name, status, required })),
    sources: sources.map(({ id, bank, product, version, effectiveDate }) => ({ id, bank, product, version, effectiveDate })),
  })
}

export function buildDealAssistantResult(args: {
  feature: Extract<AiFeature, 'prepare' | 'qualify' | 'completeness'>
  deal: AssistantDeal
  requirements: AssistantRequirement[]
  sources: AssistantSource[]
  bankProcesses: AssistantBankProcess[]
  now?: string
}): DealAssistantResult {
  const { feature, deal, requirements, sources, bankProcesses } = args
  const fingerprint = contextFingerprint(deal, requirements, sources)
  const generatedAt = args.now ?? new Date().toISOString()
  const sourceRefs = sources.slice(0, 5).map((source) => ({ id: source.id, label: source.sourceName || `${source.bank || 'Bank'} — źródło`, version: source.version || source.effectiveDate || null }))
  const bank = deal.mandatory_bank || deal.preferred_bank || bankProcesses.find((row) => row.bank_name)?.bank_name || null

  if (feature === 'prepare') {
    const missing = [!deal.next_action && 'next action', !deal.product_type && 'produkt', !bank && 'bank'].filter(Boolean)
    return {
      feature, title: 'PRZYGOTUJ MNIE',
      summary: [`Deal: ${deal.title}.`, deal.stage?.name && `Etap: ${deal.stage.name}.`, deal.blocker && `Blocker: ${deal.blocker}.`, deal.next_action && `Next action: ${deal.next_action}.`, missing.length && `Do uzupełnienia: ${missing.join(', ')}.`].filter(Boolean).join(' '),
      recommendedNextAction: deal.next_action || (missing.length ? `Uzupełnij: ${missing.join(', ')}.` : 'Potwierdź cel najbliższej rozmowy.'),
      confidence: missing.length ? 'ŚREDNIA' : 'WYSOKA', sourceQuality: sourceRefs.length ? 'CZĘŚCIOWE ŹRÓDŁA' : 'WYMAGA WERYFIKACJI', sources: sourceRefs,
      paidAiUsed: false, inputFingerprint: fingerprint, generatedAt,
    }
  }

  if (feature === 'qualify') {
    const banks = unique([deal.mandatory_bank, deal.preferred_bank, ...(deal.analysis_include_banks ?? []), ...bankProcesses.map((row) => row.bank_name), ...(deal.excluded_banks ?? [])])
    const excluded = new Set((deal.excluded_banks ?? []).map((item) => item.toLocaleLowerCase('pl-PL')))
    const missingData = [!deal.product_type && 'kategoria produktu', !deal.income_type && 'forma dochodu', !present(deal.monthly_income) && 'dochód', !deal.liabilities && 'zobowiązania'].filter(Boolean) as string[]
    const qualification = banks.map((item) => {
      const isExcluded = excluded.has(item.toLocaleLowerCase('pl-PL'))
      const source = sources.find((candidate) => candidate.bank?.toLocaleLowerCase('pl-PL') === item.toLocaleLowerCase('pl-PL'))
      if (isExcluded) return { bank: item, status: 'ODPADA' as const, reason: 'Bank wykluczony świadomie w tym Dealu.', rule: 'Wykluczenie zapisane w kontekście Deala.', source: 'Kontekst Deala', confidence: 'WYSOKA' as const }
      if (!source || missingData.length) return { bank: item, status: 'NIEPEWNY' as const, reason: source ? `Brakuje danych: ${missingData.join(', ')}.` : 'Brak pasującego, aktualnego źródła.', rule: 'Nie wolno potwierdzić kwalifikacji bez danych i źródła.', source: source?.sourceName || 'Brak źródła', confidence: 'NISKA' as const }
      return { bank: item, status: 'MOŻLIWY' as const, reason: 'Brak znanej reguły wykluczającej w dostępnych danych.', rule: 'Wstępna kwalifikacja — wymaga potwierdzenia szczegółowych warunków.', source: source.sourceName || 'Źródło M4', confidence: 'ŚREDNIA' as const }
    })
    const next = missingData.length ? `Uzupełnij dane: ${missingData.join(', ')}.` : 'Zweryfikuj warunki w najlepiej dopasowanym banku.'
    return { feature, title: 'KWALIFIKUJ TEMAT', summary: qualification.length ? qualification.map((row) => `${row.bank}: ${row.status}`).join(' · ') : 'Brak banków do bezpiecznej kwalifikacji.', recommendedNextAction: next, confidence: qualification.some((row) => row.confidence === 'NISKA') ? 'NISKA' : 'ŚREDNIA', sourceQuality: sources.length ? 'CZĘŚCIOWE ŹRÓDŁA' : 'WYMAGA WERYFIKACJI', sources: sourceRefs, qualification, paidAiUsed: false, inputFingerprint: fingerprint, generatedAt }
  }

  const analysisNames = unique([
    ...(!deal.income_type ? ['Forma i źródło dochodu'] : []),
    ...(!present(deal.monthly_income) ? ['Dochód miesięczny'] : []),
    ...(!deal.liabilities ? ['Zobowiązania'] : []),
    ...(!deal.bik_status ? ['Status BIK'] : []),
    ...(requirements.filter((row) => row.required && !row.notes?.includes('[M4:BANK]')).map((row) => row.name)),
  ])
  const bankRows = requirements.filter((row) => row.required && row.notes?.includes('[M4:BANK]'))
  const done = (status: string) => ['otrzymany', 'zaakceptowany', 'wyslany'].includes(status)
  const missingAnalysis = analysisNames.filter((name) => {
    const row = requirements.find((item) => item.name.toLocaleLowerCase('pl-PL') === name.toLocaleLowerCase('pl-PL'))
    if (row) return !done(row.status)
    return ['Forma i źródło dochodu', 'Dochód miesięczny', 'Zobowiązania', 'Status BIK'].includes(name)
  })
  const missingBank = bankRows.filter((row) => !done(row.status)).map((row) => row.name)
  const fullTotal = analysisNames.length
  const result = {
    fullAnalysis: { complete: Math.max(0, fullTotal - missingAnalysis.length), total: fullTotal, missing: missingAnalysis },
    bankApplication: { bank, complete: Math.max(0, bankRows.length - missingBank.length), total: bankRows.length, missing: missingBank },
  }
  const next = missingAnalysis[0] ? `Pozyskaj: ${missingAnalysis[0]}.` : missingBank[0] ? `Pozyskaj do ${bank}: ${missingBank[0]}.` : bankRows.length ? 'Pakiet jest kompletny — wykonaj kontrolę przed złożeniem.' : 'Brak zatwierdzonej checklisty bankowej — zweryfikuj ją w źródle M4.'
  return { feature, title: 'SPRAWDŹ KOMPLETACJĘ', summary: `Do pełnej analizy: ${result.fullAnalysis.complete}/${result.fullAnalysis.total}. Do ${bank || 'wybranego banku'}: ${result.bankApplication.complete}/${result.bankApplication.total}.`, recommendedNextAction: next, confidence: sourceRefs.length ? 'ŚREDNIA' : 'NISKA', sourceQuality: sourceRefs.length ? 'CZĘŚCIOWE ŹRÓDŁA' : 'WYMAGA WERYFIKACJI', sources: sourceRefs, completeness: result, paidAiUsed: false, inputFingerprint: fingerprint, generatedAt }
}

export type NegativeOutcomeType = 'ODRZUT_BANKU' | 'REZYGNACJA_KLIENTA' | 'BRAK_KWALIFIKACJI' | 'BRAK_DOKUMENTOW_LUB_KONTAKTU' | 'INNY_BANK_LUB_DORADCA' | 'INNE' | 'NIEZNANE'

export function buildCaseObservation(input: { deal: AssistantDeal; type: NegativeOutcomeType; reason?: string | null; decisionBy?: 'BANK' | 'KLIENT' | 'TOMASZ' | 'INNE' | 'NIEZNANE'; detectedEarlier?: boolean | null; priorQualification?: unknown; now?: string }) {
  return {
    id: aiInputFingerprint({ dealId: input.deal.id, type: input.type, reason: input.reason || '', at: input.now ?? new Date().toISOString() }).slice(0, 24),
    knowledgeStatus: 'OBSERWACJA' as const,
    promotesGlobalRule: false,
    dealId: input.deal.id,
    bank: input.deal.mandatory_bank || input.deal.preferred_bank || null,
    product: input.deal.product_type || null,
    stage: input.deal.stage?.name || null,
    outcomeType: input.type,
    decisionBy: input.decisionBy || 'NIEZNANE',
    reason: input.reason?.trim() || 'BRAK DANYCH',
    occurredAt: input.now ?? new Date().toISOString(),
    detectedEarlier: input.detectedEarlier ?? null,
    priorQualification: input.priorQualification ?? null,
    learningSignal: input.type === 'ODRZUT_BANKU' || input.type === 'BRAK_KWALIFIKACJI' ? 'KANDYDAT_DO_WERYFIKACJI' : 'PRAKTYKA_SPRZEDAZOWA',
  }
}

