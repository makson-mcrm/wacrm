import { describe, expect, it } from 'vitest'
import { aiInputFingerprint, budgetState, calculateAiCost, readAiCostPolicy } from './cost-control'

describe('AI cost control', () => {
  it('has no implicit model or price when config is absent', () => {
    const policy = readAiCostPolicy({} as NodeJS.ProcessEnv)
    expect(policy.routes).toEqual({})
    expect(policy.prices).toEqual([])
    expect(policy.warningPln).toBe(15)
    expect(policy.monthlyBudgetPln).toBe(30)
  })

  it('routes models and prices only from configuration', () => {
    const policy = readAiCostPolicy({
      MCRM_AI_MODEL_ROUTING_JSON: JSON.stringify({ 2: { provider: 'openai', model: 'configured-model', maxOutputTokens: 500 } }),
      MCRM_AI_PRICING_JSON: JSON.stringify([{ provider: 'openai', model: 'configured-model', inputPerMillionPln: 1, cachedInputPerMillionPln: 0.1, outputPerMillionPln: 2, version: '2026-09-10' }]),
    } as unknown as NodeJS.ProcessEnv)
    expect(policy.routes[2]?.model).toBe('configured-model')
    expect(calculateAiCost({ promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }, policy.prices[0])).toBe(0.002)
  })

  it('warns at 15 PLN and requires confirmation at 30 PLN', () => {
    const policy = readAiCostPolicy({} as NodeJS.ProcessEnv)
    expect(budgetState(14.99, policy).state).toBe('normal')
    expect(budgetState(15, policy).state).toBe('warning')
    expect(budgetState(30, policy)).toMatchObject({ state: 'saver', requiresConfirmation: true })
  })

  it('creates the same fingerprint regardless of object key order', () => {
    expect(aiInputFingerprint({ b: 2, a: 1 })).toBe(aiInputFingerprint({ a: 1, b: 2 }))
  })
})

