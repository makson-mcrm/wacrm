import { isMcpDataClass } from '../../../../mcp-server/src/tools/data-class'
import { GatewayError } from './dispatch'
import { decide } from './policy'
import type {
  CloudProviderOptions,
  DataClass,
  PolicyOptions,
} from './types'

function isTestEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'test'
}

export function getMcpPayloadDataClass(payload: unknown): DataClass {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return 'UNKNOWN'
  }

  const dataClass = Object.prototype.hasOwnProperty.call(payload, '_dataClass')
    ? (payload as Record<string, unknown>)._dataClass
    : undefined

  return isMcpDataClass(dataClass) ? dataClass : 'UNKNOWN'
}

export function resolveExplicitCloudRule(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AI_CLOUD_EXPLICIT_ALLOW === 'true'
}

export function isCloudAllowed(
  dataClass: DataClass,
  opts: PolicyOptions = {},
): boolean {
  return (
    decide(dataClass, {
      explicitCloudRule: opts.explicitCloudRule ?? resolveExplicitCloudRule(),
    }) === 'EXPLICIT_CLOUD_ALLOWED'
  )
}

export function assertCloudAllowed(
  dataClass: DataClass = 'UNKNOWN',
  opts: PolicyOptions = {},
): void {
  if (!isCloudAllowed(dataClass, opts)) {
    throw new GatewayError('AI_ROUTE_DENIED')
  }
}

/**
 * Consumer-side enforcement for MCP tool payloads before a cloud model call.
 * Missing, inherited, or invalid tags fail closed as UNKNOWN.
 */
export function assertMcpPayloadCloudAllowed(
  payload: unknown,
  opts: PolicyOptions = {},
): DataClass {
  const dataClass = getMcpPayloadDataClass(payload)

  if (dataClass === 'SYNTHETIC') {
    if (opts.allowSyntheticForTests !== true || !isTestEnvironment()) {
      throw new GatewayError('AI_ROUTE_DENIED')
    }
    return dataClass
  }

  assertCloudAllowed(dataClass, opts)
  return dataClass
}

/**
 * Provider-adapter enforcement. Missing classification is UNKNOWN so a direct
 * adapter call cannot bypass the consumer-side guard.
 */
export function assertProviderCloudAllowed(
  opts: CloudProviderOptions = {},
): DataClass {
  const dataClass = opts.dataClass ?? 'UNKNOWN'

  if (dataClass === 'SYNTHETIC') {
    if (
      opts.allowSyntheticForTests !== true ||
      !isTestEnvironment()
    ) {
      throw new GatewayError('AI_ROUTE_DENIED')
    }
    return dataClass
  }

  assertCloudAllowed(dataClass, opts)
  return dataClass
}

export async function executeMcpCloudRequest<T>(
  payload: unknown,
  invokeCloudModel: (guardedPayload: unknown) => Promise<T>,
  opts: PolicyOptions = {},
): Promise<T> {
  assertMcpPayloadCloudAllowed(payload, opts)
  return invokeCloudModel(payload)
}
