import type { DataClass, Decision, PolicyOptions } from './types'

export function decide(dataClass: DataClass, opts: PolicyOptions = {}): Decision {
  switch (dataClass) {
    case 'CLIENT_PERSONAL':
    case 'BANK_CONFIDENTIAL':
      return 'LOCAL_ONLY'
    case 'PUBLIC':
    case 'VERIFIED_ANONYMIZED':
      return opts.explicitCloudRule === true ? 'EXPLICIT_CLOUD_ALLOWED' : 'DENY'
    case 'SYNTHETIC':
      return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
        ? 'LOCAL_ONLY'
        : 'DENY'
    case 'UNKNOWN':
      return 'DENY'
  }
}
