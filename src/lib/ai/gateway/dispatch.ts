import { decide } from './policy'
import type { DataClass, DispatchResult, LocalExecutor, PolicyOptions } from './types'

export type GatewayErrorCode = 'AI_ROUTE_DENIED' | 'LOCAL_AI_UNAVAILABLE' | 'AI_EXECUTION_FAILED'

export class GatewayError extends Error {
  readonly code: GatewayErrorCode

  constructor(code: GatewayErrorCode) {
    super(code)
    this.name = 'GatewayError'
    this.code = code
  }
}

export async function route(
  dataClass: DataClass,
  executor: LocalExecutor,
  payload: unknown,
  opts: PolicyOptions = {},
): Promise<DispatchResult> {
  const decision = decide(dataClass, opts)

  if (decision === 'DENY') {
    throw new GatewayError('AI_ROUTE_DENIED')
  }

  if (decision === 'LOCAL_ONLY') {
    let available: boolean

    try {
      available = executor.available()
    } catch {
      throw new GatewayError('LOCAL_AI_UNAVAILABLE')
    }

    if (!available) {
      throw new GatewayError('LOCAL_AI_UNAVAILABLE')
    }

    let output: unknown

    try {
      output = await executor.run({ dataClass, route: 'local', payload })
    } catch {
      throw new GatewayError('AI_EXECUTION_FAILED')
    }

    return {
      decision,
      route: 'local',
      output,
    }
  }

  // L0 has no cloud client. The injected test executor only records this
  // explicitly allowed route and produces a deterministic, offline result.
  let output: unknown

  try {
    output = await executor.run({ dataClass, route: 'cloud', payload })
  } catch {
    throw new GatewayError('AI_EXECUTION_FAILED')
  }

  return {
    decision,
    route: 'cloud',
    output,
  }
}
