import { describe, expect, it } from 'vitest'
import {
  applyDealBankRules,
  buildAnalysisInsert,
  enforceAllowedRecommendations,
  knowledgeState,
} from './deal-analysis'

describe('Deal AI analysis MVP', () => {
  it('hard-filters an excluded bank before and after model output', () => {
    const rules = applyDealBankRules({
      source: 'Podajnik mBank',
      preferredBank: 'mBank',
      excludedBanks: ['TEST Bank B'],
      includedBanks: ['TEST Bank A', 'TEST Bank B'],
      availableBanks: ['TEST Bank A', 'TEST Bank B'],
    })
    expect(rules.allowedBanks).toEqual(['TEST Bank A', 'mBank'])
    expect(enforceAllowedRecommendations([
      { bank: 'TEST Bank A' },
      { bank: 'TEST Bank B' },
    ], rules.allowedBanks)).toEqual([{ bank: 'TEST Bank A' }])
  })

  it('reports BRAK ŹRÓDEŁ and checks source completeness', () => {
    expect(knowledgeState([])).toBe('BRAK ŹRÓDEŁ')
    expect(knowledgeState([{ bank: 'TEST Bank', sourceName: 'TEST instrukcja' }])).toBe('NIEPEŁNA WIEDZA')
    expect(knowledgeState([{
      bank: 'TEST Bank', product: 'TEST produkt', documentType: 'TEST instrukcja',
      sourceName: 'TEST plik', version: 'TEST v1',
    }])).toBe('ZWERYFIKOWANY')
  })

  it('builds the durable analysis record without test fixtures', () => {
    const row = buildAnalysisInsert({
      accountId: 'account-test', dealId: 'deal-test', modelProvider: 'openai',
      modelName: 'test-model', durationMs: 20, chunkCount: 2,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      result: { recommendations: [] }, sources: [{ sourceName: 'TEST source' }],
    })
    expect(row.deal_id).toBe('deal-test')
    expect(row.chunk_count).toBe(2)
    expect(row.total_tokens).toBe(15)
  })

  it('treats a client exclusion of the mandatory bank as a blocking conflict', () => {
    const rules = applyDealBankRules({
      source: 'Lead mFinanse', excludedBanks: ['mBank'], availableBanks: ['mBank'],
    })
    expect(rules.allowedBanks).toEqual([])
    expect(rules.conflicts).toHaveLength(1)
  })
})

