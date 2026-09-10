import { createHash } from 'node:crypto'
import type { AiProvider, AiUsage } from './types'

export type AiCostClass = 0 | 1 | 2 | 3
export type AiFeature =
  | 'prepare'
  | 'qualify'
  | 'completeness'
  | 'banking_knowledge'
  | 'guide'
  | 'note_structuring'
  | 'document_analysis'
  | 'message_draft'
  | 'deal_summary'
  | 'compare_options'

export const AI_FEATURE_COST_CLASS: Record<AiFeature, AiCostClass> = {
  prepare: 1,
  qualify: 2,
  completeness: 2,
  banking_knowledge: 2,
  guide: 2,
  note_structuring: 1,
  document_analysis: 2,
  message_draft: 1,
  deal_summary: 1,
  compare_options: 3,
}

export interface AiModelRoute {
  provider: AiProvider
  model: string
  maxOutputTokens: number
}

export interface AiPrice {
  provider: AiProvider
  model: string
  inputPerMillionPln: number
  cachedInputPerMillionPln: number
  outputPerMillionPln: number
  version: string
}

export interface AiCostPolicy {
  warningPln: number
  monthlyBudgetPln: number
  routes: Partial<Record<AiCostClass, AiModelRoute>>
  prices: AiPrice[]
}

const positive = (value: unknown, fallback: number) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

export function readAiCostPolicy(env: NodeJS.ProcessEnv = process.env): AiCostPolicy {
  let routes: AiCostPolicy['routes'] = {}
  let prices: AiPrice[] = []
  try {
    const parsed = JSON.parse(env.MCRM_AI_MODEL_ROUTING_JSON || '{}') as Record<string, AiModelRoute>
    routes = Object.fromEntries(Object.entries(parsed).flatMap(([key, route]) => {
      const costClass = Number(key)
      if (![1, 2, 3].includes(costClass) || !route?.model?.trim() || !['openai', 'anthropic'].includes(route.provider)) return []
      return [[costClass, { ...route, model: route.model.trim(), maxOutputTokens: Math.max(64, Math.floor(positive(route.maxOutputTokens, 600))) }]]
    }))
  } catch { routes = {} }
  try {
    const parsed = JSON.parse(env.MCRM_AI_PRICING_JSON || '[]') as AiPrice[]
    prices = parsed.filter((price) =>
      ['openai', 'anthropic'].includes(price?.provider) && Boolean(price?.model?.trim()) &&
      [price.inputPerMillionPln, price.cachedInputPerMillionPln, price.outputPerMillionPln].every((value) => Number.isFinite(value) && value >= 0) &&
      Boolean(price.version?.trim()),
    )
  } catch { prices = [] }
  return {
    warningPln: positive(env.MCRM_AI_WARNING_PLN, 15),
    monthlyBudgetPln: positive(env.MCRM_AI_MONTHLY_BUDGET_PLN, 30),
    routes,
    prices,
  }
}

export function budgetState(spentPln: number, policy: AiCostPolicy) {
  const spent = Math.max(0, spentPln)
  const state = spent >= policy.monthlyBudgetPln ? 'saver' : spent >= policy.warningPln ? 'warning' : 'normal'
  return { spentPln: spent, state, warning: spent >= policy.warningPln, requiresConfirmation: spent >= policy.monthlyBudgetPln }
}

export function priceForRoute(policy: AiCostPolicy, route: AiModelRoute) {
  return policy.prices.find((price) => price.provider === route.provider && price.model === route.model) ?? null
}

export function calculateAiCost(usage: AiUsage | null, price: AiPrice | null, cachedTokens = usage?.cachedTokens ?? 0) {
  if (!usage || !price) return null
  const cached = Math.max(0, Math.min(usage.promptTokens, Math.floor(cachedTokens)))
  const regularInput = usage.promptTokens - cached
  return (
    regularInput * price.inputPerMillionPln +
    cached * price.cachedInputPerMillionPln +
    usage.completionTokens * price.outputPerMillionPln
  ) / 1_000_000
}

export function aiInputFingerprint(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

