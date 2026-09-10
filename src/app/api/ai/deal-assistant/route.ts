import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { loadAiConfig } from '@/lib/ai/config'
import { generateReply } from '@/lib/ai/generate'
import { AI_FEATURE_COST_CLASS, budgetState, calculateAiCost, priceForRoute, readAiCostPolicy, type AiFeature } from '@/lib/ai/cost-control'
import { buildCaseObservation, buildDealAssistantResult, type AssistantBankProcess, type AssistantDeal, type AssistantRequirement, type AssistantSource, type NegativeOutcomeType } from '@/lib/ai/deal-assistant'

const ACTIONS = new Set<AiFeature>(['prepare', 'qualify', 'completeness'])
const MAX_SOURCE_CHUNKS = 5

type StoredAssistant = {
  version: 1
  updatedAt: string
  results: Partial<Record<AiFeature, ReturnType<typeof buildDealAssistantResult>>>
  caseObservations: ReturnType<typeof buildCaseObservation>[]
}

function storedAssistant(value: unknown): StoredAssistant {
  if (!value || typeof value !== 'object') return { version: 1, updatedAt: '', results: {}, caseObservations: [] }
  const row = value as Partial<StoredAssistant>
  return { version: 1, updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '', results: row.results && typeof row.results === 'object' ? row.results : {}, caseObservations: Array.isArray(row.caseObservations) ? row.caseObservations.slice(-50) : [] }
}

async function monthlySpend(supabase: Awaited<ReturnType<typeof requireRole>>['supabase'], accountId: string) {
  const start = new Date()
  start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0)
  const { data, error } = await supabase.from('deal_ai_analyses').select('cost_amount,result').eq('account_id', accountId).gte('created_at', start.toISOString()).limit(10_000)
  if (error) throw error
  const rows = data ?? []
  return {
    spentPln: rows.reduce((sum, row) => sum + (Number(row.cost_amount) || 0), 0),
    calls: rows.filter((row) => row.cost_amount !== null && Number(row.cost_amount) >= 0).length,
    byFeature: rows.reduce<Record<string, number>>((totals, row) => {
      const feature = row.result && typeof row.result === 'object' && 'feature' in row.result ? String(row.result.feature) : 'inne'
      totals[feature] = (totals[feature] || 0) + (Number(row.cost_amount) || 0)
      return totals
    }, {}),
  }
}

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const dealId = new URL(request.url).searchParams.get('deal_id')
    if (!dealId) return NextResponse.json({ error: 'Brak identyfikatora Deala.' }, { status: 400 })
    const [{ data: deal, error }, spend] = await Promise.all([
      supabase.from('deals').select('id,questionnaire_data').eq('account_id', accountId).eq('id', dealId).single(),
      monthlySpend(supabase, accountId),
    ])
    if (error || !deal) return NextResponse.json({ error: 'Nie znaleziono Deala.' }, { status: 404 })
    const policy = readAiCostPolicy()
    return NextResponse.json({
      state: storedAssistant((deal.questionnaire_data as Record<string, unknown> | null)?.mcrm_assistant),
      cost: { ...budgetState(spend.spentPln, policy), calls: spend.calls, byFeature: spend.byFeature, warningPln: policy.warningPln, monthlyBudgetPln: policy.monthlyBudgetPln },
      paidApiConfigured: Boolean(policy.routes[1] || policy.routes[2] || policy.routes[3]) && policy.prices.length > 0,
    })
  } catch (error) { return toErrorResponse(error) }
}

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const { supabase, accountId } = await requireRole('agent')
    const body = await request.json().catch(() => null) as null | {
      deal_id?: string
      action?: AiFeature | 'negative_outcome'
      explicit_intent?: boolean
      confirm_over_budget?: boolean
      outcome_type?: NegativeOutcomeType
      reason?: string
      decision_by?: 'BANK' | 'KLIENT' | 'TOMASZ' | 'INNE' | 'NIEZNANE'
      detected_earlier?: boolean | null
    }
    if (!body?.deal_id) return NextResponse.json({ error: 'Brak identyfikatora Deala.' }, { status: 400 })
    if (!body.explicit_intent) return NextResponse.json({ error: 'AI można uruchomić wyłącznie świadomą akcją użytkownika.', code: 'explicit_intent_required' }, { status: 400 })
    if (body.action !== 'negative_outcome' && !ACTIONS.has(body.action as AiFeature)) return NextResponse.json({ error: 'Nieobsługiwana akcja Asystenta.' }, { status: 400 })

    const [{ data: deal, error: dealError }, { data: requirements }, { data: processes }, { data: documents }] = await Promise.all([
      supabase.from('deals').select('id,title,product_type,goal,description,source,next_action,next_action_at,blocker,income_type,monthly_income,liabilities,bik_status,property_value,own_contribution,mandatory_bank,preferred_bank,excluded_banks,analysis_include_banks,questionnaire_data,stage:pipeline_stages(name)').eq('account_id', accountId).eq('id', body.deal_id).single(),
      supabase.from('deal_document_requirements').select('name,status,required,notes').eq('account_id', accountId).eq('deal_id', body.deal_id),
      supabase.from('bank_processes').select('bank_name,status,product_variant').eq('deal_id', body.deal_id),
      supabase.from('ai_knowledge_documents').select('id,bank,product,source_name,source_version,effective_date').eq('account_id', accountId).limit(200),
    ])
    if (dealError || !deal) return NextResponse.json({ error: 'Nie znaleziono Deala.' }, { status: 404 })
    const typedDeal = deal as unknown as AssistantDeal & { questionnaire_data?: Record<string, unknown> }
    const existingData = typedDeal.questionnaire_data ?? {}
    const state = storedAssistant(existingData.mcrm_assistant)

    if (body.action === 'negative_outcome') {
      const observation = buildCaseObservation({ deal: typedDeal, type: body.outcome_type || 'NIEZNANE', reason: body.reason, decisionBy: body.decision_by, detectedEarlier: body.detected_earlier, priorQualification: state.results.qualify ?? null })
      const nextState = { ...state, updatedAt: observation.occurredAt, caseObservations: [...state.caseObservations, observation].slice(-50) }
      const { error } = await supabase.from('deals').update({ questionnaire_data: { ...existingData, mcrm_assistant: nextState } }).eq('account_id', accountId).eq('id', body.deal_id)
      if (error) throw error
      return NextResponse.json({ observation, paidAiUsed: false, ruleCreated: false })
    }

    const action = body.action as Extract<AiFeature, 'prepare' | 'qualify' | 'completeness'>
    const knowledgeSources: AssistantSource[] = (documents ?? []).map((source) => ({
      id: source.id,
      bank: source.bank,
      product: source.product,
      sourceName: source.source_name,
      version: source.source_version,
      effectiveDate: source.effective_date,
    }))
    const matchingDocuments = knowledgeSources.filter((source) => {
      const bank = (typedDeal.mandatory_bank || typedDeal.preferred_bank || '').toLocaleLowerCase('pl-PL')
      const product = (typedDeal.product_type || '').toLocaleLowerCase('pl-PL')
      return (!bank || source.bank?.toLocaleLowerCase('pl-PL') === bank) && (!product || !source.product || source.product.toLocaleLowerCase('pl-PL').includes(product) || product.includes(source.product.toLocaleLowerCase('pl-PL')))
    })
    let result = buildDealAssistantResult({ feature: action, deal: typedDeal, requirements: (requirements ?? []) as AssistantRequirement[], sources: matchingDocuments, bankProcesses: (processes ?? []) as AssistantBankProcess[] })
    const previous = state.results[action]
    if (previous?.inputFingerprint === result.inputFingerprint) return NextResponse.json({ result: { ...previous, paidAiUsed: false }, cached: true, paidAiUsed: false })

    const policy = readAiCostPolicy()
    const spend = await monthlySpend(supabase, accountId)
    const budget = budgetState(spend.spentPln, policy)
    const route = policy.routes[AI_FEATURE_COST_CLASS[action]]
    const price = route ? priceForRoute(policy, route) : null
    const config = route && price ? await loadAiConfig(supabase, accountId) : null
    if (budget.requiresConfirmation && route && config && !body.confirm_over_budget) {
      return NextResponse.json({ error: `Wykorzystano budżet ${policy.monthlyBudgetPln} zł. Potwierdź świadomie kolejną płatną analizę.`, code: 'budget_confirmation_required', deterministicResult: result, cost: budget }, { status: 409 })
    }

    if (route && price && config && config.provider === route.provider) {
      const ids = matchingDocuments.slice(0, MAX_SOURCE_CHUNKS).map((source) => source.id)
      const { data: chunks } = ids.length ? await supabase.from('ai_knowledge_chunks').select('document_id,content').eq('account_id', accountId).in('document_id', ids).limit(MAX_SOURCE_CHUNKS) : { data: [] }
      const safeContext = (chunks ?? []).slice(0, MAX_SOURCE_CHUNKS).map((chunk, index) => `[S${index + 1}] ${String(chunk.content).slice(0, 2400)}`).join('\n\n')
      const generation = await generateReply({
        config: { ...config, model: route.model },
        maxOutputTokens: budget.warning ? Math.min(route.maxOutputTokens, 400) : route.maxOutputTokens,
        systemPrompt: 'Jesteś Asystentem mCRM AI. Odpowiedz krótko po polsku. Źródła są nadrzędne. Cytuj [S1] itd. Nie przedstawiaj wniosku jako faktu. Gdy źródło nie potwierdza twierdzenia, napisz WYMAGA WERYFIKACJI. Nie ujawniaj treści poufnej w komunikacji klienta.',
        messages: [{ role: 'user', content: JSON.stringify({ action, deterministicResult: result, deal: { title: typedDeal.title, product: typedDeal.product_type, stage: typedDeal.stage?.name, nextAction: typedDeal.next_action, blocker: typedDeal.blocker }, sources: safeContext }) }],
      })
      const cost = calculateAiCost(generation.usage, price)
      result = { ...result, paidAiUsed: true, aiSynthesis: generation.text, generatedAt: new Date().toISOString() }
      const { error: telemetryError } = await supabase.from('deal_ai_analyses').insert({
        account_id: accountId, deal_id: body.deal_id, provider: route.provider, model: route.model, duration_ms: Date.now() - started,
        chunk_count: (chunks ?? []).length, prompt_tokens: generation.usage?.promptTokens ?? null, completion_tokens: generation.usage?.completionTokens ?? null,
        total_tokens: generation.usage?.totalTokens ?? null, cost_amount: cost, cost_currency: 'PLN', sources: matchingDocuments.slice(0, MAX_SOURCE_CHUNKS).map((source) => ({ id: source.id, version: source.version || source.effectiveDate })),
        result: { feature: action, inputFingerprint: result.inputFingerprint, paidAiUsed: true, cachedTokens: generation.usage?.cachedTokens ?? null, priceVersion: price.version },
      })
      if (telemetryError) throw telemetryError
    }

    const nextState: StoredAssistant = { ...state, updatedAt: result.generatedAt, results: { ...state.results, [action]: result } }
    const { error: saveError } = await supabase.from('deals').update({ questionnaire_data: { ...existingData, mcrm_assistant: nextState } }).eq('account_id', accountId).eq('id', body.deal_id)
    if (saveError) throw saveError

    if (action === 'completeness' && result.completeness) {
      const existingNames = new Set((requirements ?? []).map((row) => row.name.trim().toLocaleLowerCase('pl-PL')))
      const additions = result.completeness.fullAnalysis.missing.filter((name) => !existingNames.has(name.toLocaleLowerCase('pl-PL')))
      if (additions.length) {
        const { error } = await supabase.from('deal_document_requirements').insert(additions.map((name) => ({ account_id: accountId, deal_id: body.deal_id, name, status: 'brak', required: true, notes: '[M4:ANALYSIS] Brak ustalony strukturalnie; dalszy follow-up działa bez AI.' })))
        if (error) throw error
      }
    }
    return NextResponse.json({ result, cached: false, paidAiUsed: result.paidAiUsed, deterministicFallback: !result.paidAiUsed, cost: { ...budget, warningPln: policy.warningPln, monthlyBudgetPln: policy.monthlyBudgetPln } })
  } catch (error) { return toErrorResponse(error) }
}

