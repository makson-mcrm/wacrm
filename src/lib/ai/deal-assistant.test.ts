import { describe, expect, it } from 'vitest'
import { buildCaseObservation, buildDealAssistantResult } from './deal-assistant'

const deal = { id: 'deal-1', title: 'Hipoteka', product_type: 'HIPOTEKA', preferred_bank: 'mBank', income_type: 'działalność', monthly_income: 12000, liabilities: 'brak', bik_status: 'dobry', stage: { name: 'Analiza' } }
const source = { id: 'source-1', bank: 'mBank', product: 'HIPOTEKA', sourceName: 'Instrukcja mBank', version: '2026-09' }

describe('deal assistant deterministic core', () => {
  it('prepares a brief without a paid AI call', () => {
    expect(buildDealAssistantResult({ feature: 'prepare', deal, requirements: [], sources: [source], bankProcesses: [] }).paidAiUsed).toBe(false)
  })
  it('never marks a bank possible without a matching source', () => {
    const result = buildDealAssistantResult({ feature: 'qualify', deal, requirements: [], sources: [], bankProcesses: [] })
    expect(result.qualification?.[0].status).toBe('NIEPEWNY')
    expect(result.sourceQuality).toBe('WYMAGA WERYFIKACJI')
  })
  it('separates full-analysis and bank-application completeness', () => {
    const result = buildDealAssistantResult({ feature: 'completeness', deal, requirements: [{ name: 'Wniosek mBank', status: 'brak', required: true, notes: '[M4:BANK]' }], sources: [source], bankProcesses: [] })
    expect(result.completeness?.fullAnalysis).toBeDefined()
    expect(result.completeness?.bankApplication.missing).toEqual(['Wniosek mBank'])
  })
  it('stores one loss as an observation, never a global rule', () => {
    const observation = buildCaseObservation({ deal, type: 'ODRZUT_BANKU', reason: 'Testowy powód', decisionBy: 'BANK' })
    expect(observation.knowledgeStatus).toBe('OBSERWACJA')
    expect(observation.promotesGlobalRule).toBe(false)
  })
})

