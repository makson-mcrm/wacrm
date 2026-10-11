import { describe, expect, it } from 'vitest'
import { GatewayError } from './dispatch'
import { assertCloudAllowed, resolveExplicitCloudRule } from './guard'

describe('assertCloudAllowed', () => {
  it.each(['UNKNOWN', 'CLIENT_PERSONAL', 'BANK_CONFIDENTIAL'] as const)(
    'denies %s',
    (dataClass) => {
      expect(() => assertCloudAllowed(dataClass)).toThrowError(
        expect.objectContaining<Partial<GatewayError>>({
          code: 'AI_ROUTE_DENIED',
        }),
      )
    },
  )

  it('denies PUBLIC without an explicit rule', () => {
    expect(() => assertCloudAllowed('PUBLIC')).toThrowError(
      expect.objectContaining<Partial<GatewayError>>({
        code: 'AI_ROUTE_DENIED',
      }),
    )
  })

  it('allows PUBLIC with an explicit rule', () => {
    expect(() =>
      assertCloudAllowed('PUBLIC', { explicitCloudRule: true }),
    ).not.toThrow()
  })

  it('allows VERIFIED_ANONYMIZED with an explicit rule', () => {
    expect(() =>
      assertCloudAllowed('VERIFIED_ANONYMIZED', { explicitCloudRule: true }),
    ).not.toThrow()
  })
})

describe('resolveExplicitCloudRule', () => {
  it('returns true only for the exact true value', () => {
    expect(
      resolveExplicitCloudRule({
        AI_CLOUD_EXPLICIT_ALLOW: 'true',
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true)
  })

  it('returns false when the variable is absent', () => {
    expect(
      resolveExplicitCloudRule({} as unknown as NodeJS.ProcessEnv),
    ).toBe(false)
  })
})
