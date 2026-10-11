import { afterEach, describe, expect, it, vi } from 'vitest'
import { tagToolPayload } from '../../../../mcp-server/src/tools/data-class'
import { generateAnthropic } from '../providers/anthropic'
import { generateOpenAi } from '../providers/openai'
import type { ProviderArgs } from '../providers/shared'
import { executeMcpCloudRequest, getMcpPayloadDataClass } from './guard'
import type { CloudProviderOptions, DataClass } from './types'

const providerArgs: ProviderArgs = {
  apiKey: 'synthetic-test-key',
  model: 'synthetic-test-model',
  systemPrompt: 'Synthetic test prompt',
  messages: [{ role: 'user', content: 'Synthetic test message' }],
  timeoutMs: 1_000,
}

const providers = [
  ['OpenAI', generateOpenAi],
  ['Anthropic', generateAnthropic],
] as const

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each(providers)('%s provider adapter guard', (_name, provider) => {
  it.each<DataClass>([
    'CLIENT_PERSONAL',
    'BANK_CONFIDENTIAL',
    'UNKNOWN',
  ])('denies direct %s calls before fetch', async (dataClass) => {
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)

    await expect(
      provider(providerArgs, { dataClass, explicitCloudRule: true }),
    ).rejects.toMatchObject({ code: 'AI_ROUTE_DENIED' })
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('treats a cold call without policy metadata as UNKNOWN', async () => {
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)

    await expect(provider(providerArgs)).rejects.toMatchObject({
      code: 'AI_ROUTE_DENIED',
    })
    expect(fetchStub).not.toHaveBeenCalled()
  })
})

describe.each(providers)(
  '%s consumer guard to provider boundary',
  (_name, provider) => {
    it.each<DataClass>([
      'CLIENT_PERSONAL',
      'BANK_CONFIDENTIAL',
      'UNKNOWN',
    ])('makes zero fetch calls for a %s payload', async (dataClass) => {
      const fetchStub = vi.fn()
      vi.stubGlobal('fetch', fetchStub)
      const payload = tagToolPayload({ fixture: true }, dataClass)
      const cloudPolicy: CloudProviderOptions = {
        dataClass: getMcpPayloadDataClass(payload),
        explicitCloudRule: true,
      }

      await expect(
        executeMcpCloudRequest(
          payload,
          () => provider(providerArgs, cloudPolicy),
          cloudPolicy,
        ),
      ).rejects.toMatchObject({ code: 'AI_ROUTE_DENIED' })
      expect(fetchStub).not.toHaveBeenCalled()
    })
  },
)
