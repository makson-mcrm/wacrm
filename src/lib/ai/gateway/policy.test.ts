import { afterEach, describe, expect, it, vi } from 'vitest'
import { decide } from './policy'
import type { DataClass } from './types'

describe('AI gateway policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each<DataClass>(['CLIENT_PERSONAL', 'BANK_CONFIDENTIAL'])(
    'keeps %s on the local route',
    (dataClass) => {
      expect(decide(dataClass)).toBe('LOCAL_ONLY')
      expect(decide(dataClass, { explicitCloudRule: true })).toBe('LOCAL_ONLY')
    },
  )

  it('denies UNKNOWN even when every opt-in is set', () => {
    expect(decide('UNKNOWN', { explicitCloudRule: true })).toBe('DENY')
  })

  it.each<DataClass>(['PUBLIC', 'VERIFIED_ANONYMIZED'])(
    'allows %s in cloud only with an explicit rule',
    (dataClass) => {
      expect(decide(dataClass)).toBe('DENY')
      expect(decide(dataClass, { explicitCloudRule: false })).toBe('DENY')
      expect(decide(dataClass, { explicitCloudRule: true })).toBe('EXPLICIT_CLOUD_ALLOWED')
    },
  )

  it('allows SYNTHETIC only with an explicit caller flag in the test environment', () => {
    expect(decide('SYNTHETIC')).toBe('DENY')
    expect(decide('SYNTHETIC', { allowSyntheticForTests: true })).toBe(
      'LOCAL_ONLY',
    )
  })

  it('does not let VITEST=true enable SYNTHETIC in production', () => {
    vi.stubEnv('VITEST', 'true')
    vi.stubEnv('NODE_ENV', 'production')

    expect(decide('SYNTHETIC')).toBe('DENY')
    expect(
      decide('SYNTHETIC', {
        explicitCloudRule: true,
        allowSyntheticForTests: true,
      }),
    ).toBe('DENY')
  })
})
