import { describe, expect, it } from 'vitest'

import { isBrowserSttAllowed } from './browser-stt-policy'

describe('isBrowserSttAllowed', () => {
  it("allows browser speech recognition only for exactly 'true'", () => {
    expect(isBrowserSttAllowed({ NEXT_PUBLIC_AI_BROWSER_STT_ALLOW: 'true' })).toBe(
      true,
    )
  })

  it('denies browser speech recognition when the flag is missing', () => {
    expect(isBrowserSttAllowed({})).toBe(false)
  })

  it.each(['false', 'TRUE', '1', ' true ', ''])(
    'denies browser speech recognition for %j',
    (value) => {
      expect(
        isBrowserSttAllowed({ NEXT_PUBLIC_AI_BROWSER_STT_ALLOW: value }),
      ).toBe(false)
    },
  )
})
