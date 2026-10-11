import { describe, expect, it } from 'vitest'
import { GatewayError, route } from './dispatch'
import { MockLocalExecutor } from './mock-local-executor'

describe('AI gateway dispatch', () => {
  it('routes client data to the local executor', async () => {
    const executor = new MockLocalExecutor()

    await expect(route('CLIENT_PERSONAL', executor, { syntheticClient: 'example' })).resolves.toEqual({
      decision: 'LOCAL_ONLY',
      route: 'local',
      output: { mock: true, route: 'local' },
    })
    expect(executor.totalCalls).toBe(1)
    expect(executor.localCalls).toBe(1)
    expect(executor.cloudCalls).toBe(0)
  })

  it('never falls back when the local executor is unavailable', async () => {
    const executor = new MockLocalExecutor(false)

    await expect(route('CLIENT_PERSONAL', executor, { syntheticClient: 'example' })).rejects.toMatchObject({
      code: 'LOCAL_AI_UNAVAILABLE',
      message: 'LOCAL_AI_UNAVAILABLE',
    })
    expect(executor.totalCalls).toBe(0)
    expect(executor.cloudCalls).toBe(0)
  })

  it('keeps bank-confidential data local even when a cloud rule is present', async () => {
    const executor = new MockLocalExecutor()

    await expect(
      route('BANK_CONFIDENTIAL', executor, { syntheticSecret: 'must-not-leak' }, { explicitCloudRule: true }),
    ).resolves.toMatchObject({ decision: 'LOCAL_ONLY', route: 'local' })
    expect(executor.totalCalls).toBe(1)
    expect(executor.localCalls).toBe(1)
    expect(executor.cloudCalls).toBe(0)
  })

  it('denies UNKNOWN with zero calls', async () => {
    const executor = new MockLocalExecutor()

    await expect(
      route('UNKNOWN', executor, { syntheticSecret: 'must-not-leak' }, { explicitCloudRule: true }),
    ).rejects.toBeInstanceOf(GatewayError)
    expect(executor.totalCalls).toBe(0)
    expect(executor.cloudCalls).toBe(0)
  })

  it.each(['PUBLIC', 'VERIFIED_ANONYMIZED'] as const)(
    'uses the counted offline cloud mock for explicitly allowed %s data',
    async (dataClass) => {
      const executor = new MockLocalExecutor()

      await expect(
        route(dataClass, executor, { syntheticText: 'public example' }, { explicitCloudRule: true }),
      ).resolves.toMatchObject({ decision: 'EXPLICIT_CLOUD_ALLOWED', route: 'cloud' })
      expect(executor.totalCalls).toBe(1)
      expect(executor.localCalls).toBe(0)
      expect(executor.cloudCalls).toBe(1)
    },
  )

  it('denies cloud-capable classes without the explicit rule and makes zero calls', async () => {
    const executor = new MockLocalExecutor()

    await expect(route('PUBLIC', executor, { syntheticText: 'public example' })).rejects.toMatchObject({
      code: 'AI_ROUTE_DENIED',
    })
    await expect(route('VERIFIED_ANONYMIZED', executor, {}, { explicitCloudRule: false })).rejects.toMatchObject({
      code: 'AI_ROUTE_DENIED',
    })
    expect(executor.totalCalls).toBe(0)
  })

  it('automatically permits synthetic input in the test environment', async () => {
    const executor = new MockLocalExecutor()

    await expect(route('SYNTHETIC', executor, { fixture: true })).resolves.toMatchObject({
      decision: 'LOCAL_ONLY',
      route: 'local',
    })
    expect(executor.totalCalls).toBe(1)
    expect(executor.cloudCalls).toBe(0)
  })

  it('does not expose payload contents or secrets in errors', async () => {
    const executor = new MockLocalExecutor(false)
    const sensitivePayload = { client: 'SYNTHETIC_CLIENT_NAME', token: 'SYNTHETIC_SECRET_TOKEN' }

    const error = await route('CLIENT_PERSONAL', executor, sensitivePayload).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(GatewayError)
    expect(String(error)).not.toContain(sensitivePayload.client)
    expect(String(error)).not.toContain(sensitivePayload.token)
  })

  it('sanitizes secrets from errors thrown by executor.available', async () => {
    const secret = 'AVAILABLE_THROW_SECRET'
    const executor = {
      available: () => {
        throw new Error(secret)
      },
      run: async () => ({ unreachable: true }),
    }

    const error = await route('CLIENT_PERSONAL', executor, {}).catch((reason: unknown) => reason)
    const exposedError = `${String(error)} ${JSON.stringify(error)} ${(error as Error).stack ?? ''}`

    expect(error).toBeInstanceOf(GatewayError)
    expect(error).toMatchObject({ code: 'LOCAL_AI_UNAVAILABLE', message: 'LOCAL_AI_UNAVAILABLE' })
    expect(exposedError).not.toContain(secret)
    expect(error).not.toHaveProperty('cause')
  })

  it.each([
    ['CLIENT_PERSONAL', undefined],
    ['PUBLIC', { explicitCloudRule: true }],
  ] as const)(
    'sanitizes secrets from errors thrown by executor.run for %s',
    async (dataClass, opts) => {
      const secret = 'EXECUTOR_RUN_SECRET'
      const executor = {
        available: () => true,
        run: async () => {
          throw new Error(secret)
        },
      }

      const error = await route(dataClass, executor, {}, opts).catch((reason: unknown) => reason)
      const exposedError = `${String(error)} ${JSON.stringify(error)} ${(error as Error).stack ?? ''}`

      expect(error).toBeInstanceOf(GatewayError)
      expect(error).toMatchObject({ code: 'AI_EXECUTION_FAILED', message: 'AI_EXECUTION_FAILED' })
      expect(exposedError).not.toContain(secret)
      expect(error).not.toHaveProperty('cause')
    },
  )
})
