import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { loadAiConfig } from '@/lib/ai/config'
import { generateReply } from '@/lib/ai/generate'
import { applyDealBankRules, buildAnalysisInsert, enforceAllowedRecommendations, knowledgeState, MANUAL_VERIFICATION_MESSAGE, type KnowledgeMetadata } from '@/lib/ai/deal-analysis'

const MAX_CHUNKS = 12
const MODEL_ALLOWLIST: Record<string, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
}
type KnowledgeDocument = KnowledgeMetadata & { id: string }
type Chunk = { id: string; content: string; document_id: string; score?: number }
type Recommendation = { bank?: string; solution?: string; client_fit?: string; justification?: string; limitations?: string[]; risks?: string[]; missing_data?: string[]; required_documents?: string[] }
const cleanJson = (text: string) => text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
const terms = (value: string) => new Set(value.toLocaleLowerCase('pl-PL').split(/[^\p{L}\p{N}]+/u).filter((part) => part.length > 2))

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const dealId = new URL(request.url).searchParams.get('deal_id')
    if (!dealId) return NextResponse.json({ error: 'Brak identyfikatora Deala.' }, { status: 400 })
    const { data, error } = await supabase.from('deal_ai_analyses').select('*').eq('account_id', accountId).eq('deal_id', dealId).order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return NextResponse.json({ analyses: data ?? [] })
  } catch (error) { return toErrorResponse(error) }
}

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const { supabase, accountId } = await requireRole('agent')
    const body = await request.json().catch(() => null) as { deal_id?: string; model?: string } | null
    if (!body?.deal_id) return NextResponse.json({ error: 'Brak identyfikatora Deala.' }, { status: 400 })
    const [{ data: deal }, { data: bankProcesses }, { data: documents }, { data: requirements }] = await Promise.all([
      supabase.from('deals').select('id,title,description,product_type,goal,value,source,questionnaire_text,questionnaire_data,missing_documents,liabilities,income_type,accounting_type,company_nip,mandatory_bank,preferred_bank,excluded_banks,analysis_include_banks').eq('account_id', accountId).eq('id', body.deal_id).single(),
      supabase.from('bank_processes').select('bank_name,product_variant').eq('deal_id', body.deal_id),
      supabase.from('ai_knowledge_documents').select('id,bank,product,document_type,source_name,source_version,effective_date').eq('account_id', accountId),
      supabase.from('deal_document_requirements').select('name,status,required,notes').eq('deal_id', body.deal_id),
    ])
    if (!deal) return NextResponse.json({ error: 'Nie znaleziono Deala.' }, { status: 404 })
    const knowledgeDocuments = (documents ?? []).map((row) => ({ id: row.id, bank: row.bank, product: row.product, documentType: row.document_type, sourceName: row.source_name, version: row.source_version, effectiveDate: row.effective_date })) as KnowledgeDocument[]
    const rules = applyDealBankRules({
      source: deal.source, mandatoryBank: deal.mandatory_bank, preferredBank: deal.preferred_bank,
      excludedBanks: deal.excluded_banks, includedBanks: deal.analysis_include_banks,
      availableBanks: [...(bankProcesses ?? []).map((row) => row.bank_name), ...knowledgeDocuments.map((row) => row.bank)].filter((bank): bank is string => Boolean(bank)),
    })
    if (rules.conflicts.length) return NextResponse.json({ error: rules.conflicts.join(' ') }, { status: 409 })
    if (!rules.allowedBanks.length) return NextResponse.json({ error: 'Brak banków dopuszczonych przez reguły analizy.' }, { status: 409 })
    const allowedKeys = new Set(rules.allowedBanks.map((bank) => bank.toLocaleLowerCase('pl-PL')))
    const selectedDocuments = knowledgeDocuments.filter((doc) => doc.bank && allowedKeys.has(doc.bank.toLocaleLowerCase('pl-PL')))
    let chunks: Chunk[] = []
    if (selectedDocuments.length) {
      const { data, error } = await supabase.from('ai_knowledge_chunks').select('id,content,document_id').eq('account_id', accountId).in('document_id', selectedDocuments.map((doc) => doc.id)).limit(100)
      if (error) throw error
      chunks = (data ?? []) as Chunk[]
    }
    const queryTerms = terms([deal.product_type, deal.goal, deal.description, deal.questionnaire_text].filter(Boolean).join(' '))
    chunks = chunks.map((chunk) => ({ ...chunk, score: [...terms(chunk.content)].filter((term) => queryTerms.has(term)).length })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, MAX_CHUNKS)
    const sources = chunks.map((chunk) => {
      const doc = selectedDocuments.find((item) => item.id === chunk.document_id)!
      return { chunkId: chunk.id, bank: doc.bank, product: doc.product, documentType: doc.documentType, sourceName: doc.sourceName, version: doc.version, effectiveDate: doc.effectiveDate }
    })
    const completeness = rules.allowedBanks.map((bank) => {
      const docs = sources.filter((source) => source.bank?.toLocaleLowerCase('pl-PL') === bank.toLocaleLowerCase('pl-PL'))
      return { bank, state: knowledgeState(docs), message: docs.length ? null : MANUAL_VERIFICATION_MESSAGE }
    })
    const config = await loadAiConfig(supabase, accountId)
    if (!config) return NextResponse.json({ error: 'model nieskonfigurowany', code: 'ai_not_configured' }, { status: 400 })
    const chosenModel = body.model?.trim() || config.model
    if (!new Set([config.model, ...(MODEL_ALLOWLIST[config.provider] ?? [])]).has(chosenModel)) return NextResponse.json({ error: 'Wybrany model nie jest dozwolony dla skonfigurowanego dostawcy.' }, { status: 400 })
    const today = new Date().toISOString().slice(0, 10)
    const { data: commissions } = await supabase.from('ai_commission_rates').select('bank,product,rate,valid_from,valid_to,source_name,source_version').eq('account_id', accountId).in('bank', rules.allowedBanks).lte('valid_from', today).or(`valid_to.is.null,valid_to.gte.${today}`)
    const context = chunks.map((chunk, index) => { const source = sources[index]; return `[${index + 1}] BANK=${source.bank}; PRODUKT=${source.product}; TYP=${source.documentType}; ŹRÓDŁO=${source.sourceName}; WERSJA=${source.version || source.effectiveDate || 'brak'}\n${chunk.content}` }).join('\n\n')
    const generation = await generateReply({
      config: { ...config, model: chosenModel },
      systemPrompt: [
        'Jesteś analitykiem wspierającym eksperta kredytowego. Twarde reguły banków wykonał już CRM.',
        `Wolno analizować wyłącznie banki: ${rules.allowedBanks.join(', ')}. Nie dodawaj żadnego innego banku.`,
        `Nie zgaduj. Bez podstaw użyj dokładnie: ${MANUAL_VERIFICATION_MESSAGE}`,
        'Prowizja jest oddzielną informacją biznesową i nigdy nie uzasadnia dopasowania klienta.',
        'Zwróć wyłącznie JSON: {"recommendations":[{"bank":"...","solution":"...","client_fit":"...","justification":"...","limitations":[],"risks":[],"missing_data":[],"required_documents":[]}],"overall_risks":[],"missing_client_data":[]}.',
        `FRAGMENTY ŹRÓDEŁ:\n${context || MANUAL_VERIFICATION_MESSAGE}`,
      ].join('\n\n'),
      messages: [{ role: 'user', content: JSON.stringify({ deal, rules, existingRequirements: requirements ?? [] }) }],
    })
    let parsed: { recommendations?: Recommendation[]; overall_risks?: string[]; missing_client_data?: string[] }
    try { parsed = JSON.parse(cleanJson(generation.text)) as typeof parsed } catch { return NextResponse.json({ error: 'Model zwrócił nieprawidłowy format. Spróbuj ponownie.' }, { status: 502 }) }
    const recommendations = enforceAllowedRecommendations(Array.isArray(parsed.recommendations) ? parsed.recommendations : [], rules.allowedBanks)
    const result = { recommendations, operationalPriority: { preferredBank: rules.preferredBank, mandatoryBank: rules.mandatoryBank, rules: rules.operationalRules }, knowledgeCompleteness: completeness, overallRisks: parsed.overall_risks ?? [], missingClientData: parsed.missing_client_data ?? [], commissions: commissions ?? [] }
    const insert = buildAnalysisInsert({ accountId, dealId: deal.id, modelProvider: config.provider, modelName: chosenModel, durationMs: Date.now() - started, chunkCount: chunks.length, usage: generation.usage, result, sources })
    const { data: saved, error: saveError } = await supabase.from('deal_ai_analyses').insert(insert).select('id,created_at').single()
    if (saveError) throw saveError
    const requiredNames = [...new Set(recommendations.flatMap((item) => item.required_documents ?? []).map((name) => name.trim()).filter(Boolean))]
    const existing = new Set((requirements ?? []).map((item) => item.name.toLocaleLowerCase('pl-PL')))
    const additions = requiredNames.filter((name) => !existing.has(name.toLocaleLowerCase('pl-PL')))
    if (additions.length) await supabase.from('deal_document_requirements').insert(additions.map((name) => ({ account_id: accountId, deal_id: deal.id, name, status: 'brak', required: true, notes: `Dodano z Analizy AI ${saved.id}` })))
    await supabase.from('deals').update({ analysis_status: 'zakonczona', analysis_summary: recommendations.map((item) => `${item.bank}: ${item.client_fit || item.justification || ''}`).join('\n'), analysis_recommendation: recommendations.map((item) => `${item.bank}: ${item.solution || ''}`).join('\n') }).eq('account_id', accountId).eq('id', deal.id)
    return NextResponse.json({ id: saved.id, created_at: saved.created_at, provider: config.provider, model: chosenModel, duration_ms: insert.duration_ms, chunk_count: chunks.length, usage: generation.usage, sources, result })
  } catch (error) { return toErrorResponse(error) }
}

