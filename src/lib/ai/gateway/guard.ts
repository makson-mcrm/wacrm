import { GatewayError } from './dispatch'
import { decide } from './policy'
import type { DataClass, PolicyOptions } from './types'

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
