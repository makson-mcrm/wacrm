import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const freePaths = [
  'src/app/(dashboard)/contacts/page.tsx',
  'src/app/(dashboard)/deals/[id]/page.tsx',
  'src/app/(dashboard)/dashboard/page.tsx',
  'src/app/(dashboard)/calendar/page.tsx',
  'src/app/(dashboard)/pipelines/page.tsx',
]

describe('paid AI invocation boundary', () => {
  it.each(freePaths)('%s has no paid model call on render', (path) => {
    const source = readFileSync(path, 'utf8')
    expect(source).not.toMatch(/generateReply\s*\(/)
    expect(source).not.toMatch(/useEffect[\s\S]{0,1200}fetch\(['"]\/api\/ai\/(deal-analysis|draft|playground)/)
  })

  it('does not synchronize Drive when Assistant merely opens', () => {
    const source = readFileSync('src/app/(dashboard)/assistant/page.tsx', 'utf8')
    expect(source).not.toContain('/api/ai/banking-knowledge/drive')
    expect(source).not.toContain("method: 'POST'")
  })

  it('marks only conscious AI actions with the shared lime button token', () => {
    const source = readFileSync('src/components/assistant/deal-assistant-actions.tsx', 'utf8')
    expect(source).toContain("const AI_BUTTON = 'border-lime-400 bg-lime-300")
    expect(source).toContain('ZAPISZ OBSERWACJĘ')
    expect(source).not.toMatch(/ZAPISZ OBSERWACJĘ[\s\S]{0,80}AI_BUTTON/)
  })

  it('keeps the mCRM core primary and degrades the legacy tools', () => {
    const source = readFileSync('src/components/layout/sidebar.tsx', 'utf8')
    expect(source).toContain('mCRM AI')
    expect(source).toContain('NARZĘDZIA DODATKOWE')
    expect(source).toContain("href: '/quick-call'")
    expect(source.indexOf("href: '/assistant'")).toBeLessThan(source.indexOf("href: '/inbox'"))
  })

  it('requires explicit intent and account-scopes Deal reads/writes', () => {
    const source = readFileSync('src/app/api/ai/deal-assistant/route.ts', 'utf8')
    expect(source).toContain('explicit_intent_required')
    expect(source.match(/\.eq\('account_id', accountId\)/g)?.length).toBeGreaterThanOrEqual(5)
    expect(source).toContain("requireRole('agent')")
  })
})

