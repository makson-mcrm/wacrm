import { afterEach, describe, expect, it, vi } from 'vitest'
import { tagToolPayload } from '../../../../mcp-server/src/tools/data-class'
import { GatewayError } from './dispatch'
import {
  assertCloudAllowed,
  assertMcpPayloadCloudAllowed,
  executeMcpCloudRequest,
  getMcpPayloadDataClass,
  resolveExplicitCloudRule,
} from './guard'

afterEach(() => {
  vi.unstubAllEnvs()
})

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

describe('MCP payload cloud guard', () => {
  it.each(['CLIENT_PERSONAL', 'BANK_CONFIDENTIAL', 'UNKNOWN'] as const)(
    'denies %s before a cloud model call',
    (dataClass) => {
      const payload = tagToolPayload({ fixture: true }, dataClass)

      expect(() =>
        assertMcpPayloadCloudAllowed(payload, { explicitCloudRule: true }),
      ).toThrowError(
        expect.objectContaining<Partial<GatewayError>>({
          code: 'AI_ROUTE_DENIED',
        }),
      )
    },
  )

  it.each(['PUBLIC', 'VERIFIED_ANONYMIZED'] as const)(
    'allows %s only with an explicit cloud rule',
    (dataClass) => {
      const payload = tagToolPayload({ fixture: true }, dataClass)

      expect(() => assertMcpPayloadCloudAllowed(payload)).toThrowError(
        expect.objectContaining<Partial<GatewayError>>({
          code: 'AI_ROUTE_DENIED',
        }),
      )
      expect(
        assertMcpPayloadCloudAllowed(payload, { explicitCloudRule: true }),
      ).toBe(dataClass)
    },
  )

  it('allows SYNTHETIC only with an explicit caller flag in a test environment', () => {
    const payload = tagToolPayload({ fixture: true }, 'SYNTHETIC')

    expect(() => assertMcpPayloadCloudAllowed(payload)).toThrowError(
      expect.objectContaining<Partial<GatewayError>>({
        code: 'AI_ROUTE_DENIED',
      }),
    )
    expect(
      assertMcpPayloadCloudAllowed(payload, {
        allowSyntheticForTests: true,
      }),
    ).toBe('SYNTHETIC')

    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VITEST', 'true')
    expect(() =>
      assertMcpPayloadCloudAllowed(payload, {
        allowSyntheticForTests: true,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<GatewayError>>({
        code: 'AI_ROUTE_DENIED',
      }),
    )
  })

  it.each([
    undefined,
    null,
    'text',
    [],
    {},
    { _dataClass: 'NOT_A_CLASS' },
    Object.create({ _dataClass: 'PUBLIC' }) as object,
  ])('treats a missing or invalid own tag as UNKNOWN', (payload) => {
    expect(getMcpPayloadDataClass(payload)).toBe('UNKNOWN')
    expect(() =>
      assertMcpPayloadCloudAllowed(payload, { explicitCloudRule: true }),
    ).toThrowError(
      expect.objectContaining<Partial<GatewayError>>({
        code: 'AI_ROUTE_DENIED',
      }),
    )
  })

  it('keeps the server-selected class authoritative when payload data has a tag', () => {
    const payload = tagToolPayload(
      { _dataClass: 'PUBLIC', fixture: true },
      'CLIENT_PERSONAL',
    )

    expect(getMcpPayloadDataClass(payload)).toBe('CLIENT_PERSONAL')
  })

  it('makes zero cloud calls for a denied payload', async () => {
    const invokeCloudModel = vi.fn(async () => ({ unreachable: true }))
    const payload = tagToolPayload({ syntheticClient: 'blocked' })

    await expect(
      executeMcpCloudRequest(payload, invokeCloudModel, {
        explicitCloudRule: true,
      }),
    ).rejects.toMatchObject({ code: 'AI_ROUTE_DENIED' })
    expect(invokeCloudModel).not.toHaveBeenCalled()
  })

  it('passes an explicitly allowed payload to the cloud callback once', async () => {
    const invokeCloudModel = vi.fn(async () => ({ mock: true }))
    const payload = tagToolPayload({ fixture: true }, 'PUBLIC')

    await expect(
      executeMcpCloudRequest(payload, invokeCloudModel, {
        explicitCloudRule: true,
      }),
    ).resolves.toEqual({ mock: true })
    expect(invokeCloudModel).toHaveBeenCalledOnce()
    expect(invokeCloudModel).toHaveBeenCalledWith(payload)
  })
})
