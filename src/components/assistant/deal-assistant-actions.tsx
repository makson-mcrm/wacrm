'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bot, CheckCircle2, CircleAlert, FileCheck2, Gauge, GraduationCap, Landmark, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DealBankingKnowledge } from '@/components/banking-knowledge/deal-banking-knowledge'
import type { AiFeature } from '@/lib/ai/cost-control'
import type { DealAssistantResult, NegativeOutcomeType } from '@/lib/ai/deal-assistant'

type StateResponse = {
  state?: { results?: Partial<Record<AiFeature, DealAssistantResult>> }
  cost?: { spentPln: number; calls: number; state: 'normal' | 'warning' | 'saver'; warningPln: number; monthlyBudgetPln: number }
  paidApiConfigured?: boolean
}

const AI_BUTTON = 'border-lime-400 bg-lime-300 text-[#123d2b] hover:bg-lime-200 shadow-sm'

export function DealAssistantActions({ dealId }: { dealId: string }) {
  const db = useMemo(() => createClient(), [])
  const [results, setResults] = useState<Partial<Record<AiFeature, DealAssistantResult>>>({})
  const [cost, setCost] = useState<StateResponse['cost']>()
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState<AiFeature | 'negative_outcome' | null>(null)
  const [active, setActive] = useState<AiFeature | null>(null)
  const [knowledgeMode, setKnowledgeMode] = useState<'answer' | 'guide' | null>(null)
  const [nextAction, setNextAction] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')
  const [outcomeType, setOutcomeType] = useState<NegativeOutcomeType>('NIEZNANE')
  const [outcomeReason, setOutcomeReason] = useState('')

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/ai/deal-assistant?deal_id=${encodeURIComponent(dealId)}`, { cache: 'no-store' })
    if (!response.ok) return
    const body = await response.json() as StateResponse
    setResults(body.state?.results ?? {})
    setCost(body.cost)
    setConfigured(Boolean(body.paidApiConfigured))
  }, [dealId])
  useEffect(() => { void refresh() }, [refresh])

  async function run(action: Extract<AiFeature, 'prepare' | 'qualify' | 'completeness'>, confirmOverBudget = false) {
    setBusy(action)
    setKnowledgeMode(null)
    const response = await fetch('/api/ai/deal-assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: dealId, action, explicit_intent: true, confirm_over_budget: confirmOverBudget }),
    })
    const body = await response.json().catch(() => ({})) as { result?: DealAssistantResult; error?: string; code?: string }
    if (response.status === 409 && body.code === 'budget_confirmation_required' && window.confirm(`${body.error}\n\nUruchomić mimo to?`)) {
      setBusy(null); await run(action, true); return
    }
    setBusy(null)
    if (!response.ok || !body.result) { toast.error(body.error || 'Nie udało się wykonać analizy.'); return }
    setResults((current) => ({ ...current, [action]: body.result }))
    setActive(action); setNextAction(body.result.recommendedNextAction); setNextActionAt('')
    toast.success(body.result.paidAiUsed ? 'Analiza AI wykonana i zmierzona.' : 'Wynik regułowy gotowy — koszt AI 0 zł.')
    await refresh()
  }

  async function saveNextAction() {
    if (!nextAction.trim()) return
    const { error } = await db.from('deals').update({ next_action: nextAction.trim(), next_action_at: nextActionAt ? new Date(nextActionAt).toISOString() : null }).eq('id', dealId)
    if (error) toast.error(error.message); else toast.success('Next action zapisany w Dealu — bez wywołania AI.')
  }

  async function saveNegativeOutcome() {
    setBusy('negative_outcome')
    const response = await fetch('/api/ai/deal-assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: dealId, action: 'negative_outcome', explicit_intent: true, outcome_type: outcomeType, reason: outcomeReason, decision_by: outcomeType === 'ODRZUT_BANKU' ? 'BANK' : outcomeType === 'REZYGNACJA_KLIENTA' ? 'KLIENT' : 'NIEZNANE' }),
    })
    const body = await response.json().catch(() => ({})) as { error?: string }
    setBusy(null)
    if (!response.ok) toast.error(body.error || 'Nie zapisano wyniku.')
    else { setOutcomeReason(''); toast.success('Zapisano obserwację. Nie utworzono globalnej reguły.') }
  }

  const result = active ? results[active] : null
  return <div className="space-y-4">
    <section className="rounded-xl border border-lime-400/60 bg-lime-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-[#123d2b]"><Sparkles className="size-4" /> ASYSTENT DEALA</h3>
        <span className="rounded-full bg-lime-300 px-2 py-1 text-[10px] font-black text-[#123d2b]">AI — ŚWIADOME URUCHOMIENIE</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <AiButton icon={<Bot className="size-4" />} label="PRZYGOTUJ MNIE" busy={busy === 'prepare'} onClick={() => void run('prepare')} />
        <AiButton icon={<Gauge className="size-4" />} label="KWALIFIKUJ TEMAT" busy={busy === 'qualify'} onClick={() => void run('qualify')} />
        <AiButton icon={<FileCheck2 className="size-4" />} label="SPRAWDŹ KOMPLETACJĘ" busy={busy === 'completeness'} onClick={() => void run('completeness')} />
        <AiButton icon={<Landmark className="size-4" />} label="SPRAWDŹ WIEDZĘ BANKOWĄ" busy={false} onClick={() => { setActive(null); setKnowledgeMode('answer') }} />
        <AiButton icon={<GraduationCap className="size-4" />} label="PROWADŹ MNIE KROK PO KROKU" busy={false} onClick={() => { setActive(null); setKnowledgeMode('guide') }} />
      </div>
      <p className="mt-3 text-xs text-slate-600">Samo otwarcie Deala i zwykłe funkcje CRM nie uruchamiają modelu. {configured ? 'Płatna bramka jest skonfigurowana; koszt jest mierzony.' : 'API płatne nie jest zasilone — dostępny jest bezpieczny wynik regułowy za 0 zł.'}</p>
    </section>

    {cost ? <section className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>Koszt AI w tym miesiącu</b><span>{cost.spentPln.toFixed(4)} zł / {cost.monthlyBudgetPln} zł · {cost.calls} wywołań</span></div>{cost.state !== 'normal' ? <p className="mt-2 text-amber-700">{cost.state === 'saver' ? 'TRYB OSZCZĘDNY — płatna analiza wymaga potwierdzenia.' : `Przekroczono próg ostrzegawczy ${cost.warningPln} zł — krótsze odpowiedzi i oszczędny routing.`}</p> : null}</section> : null}
    {result ? <ResultCard result={result} nextAction={nextAction} nextActionAt={nextActionAt} onNextAction={setNextAction} onNextActionAt={setNextActionAt} onSave={() => void saveNextAction()} /> : null}
    {knowledgeMode ? <DealBankingKnowledge key={knowledgeMode} dealId={dealId} initialMode={knowledgeMode} /> : null}

    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-semibold">Zapisz negatywny wynik jako obserwację (0 zł AI)</summary>
      <div className="mt-3 grid gap-2">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={outcomeType} onChange={(event) => setOutcomeType(event.target.value as NegativeOutcomeType)}>
          <option value="ODRZUT_BANKU">Odrzut / negatywna decyzja banku</option><option value="REZYGNACJA_KLIENTA">Rezygnacja klienta</option><option value="BRAK_KWALIFIKACJI">Brak kwalifikacji przed wnioskiem</option><option value="BRAK_DOKUMENTOW_LUB_KONTAKTU">Brak dokumentów / kontaktu</option><option value="INNY_BANK_LUB_DORADCA">Wybrano inny bank / doradcę</option><option value="INNE">Inne</option><option value="NIEZNANE">Nieznane / brak danych</option>
        </select>
        <Textarea value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} placeholder="Krótki powód lub BRAK DANYCH" rows={2} />
        <Button variant="outline" disabled={busy === 'negative_outcome'} onClick={() => void saveNegativeOutcome()}><CircleAlert className="size-4" /> ZAPISZ OBSERWACJĘ</Button>
        <p className="text-xs text-slate-500">Pojedynczy przypadek nigdy nie tworzy automatycznie reguły bankowej.</p>
      </div>
    </details>
  </div>
}

function AiButton({ icon, label, busy, onClick }: { icon: ReactNode; label: string; busy: boolean; onClick: () => void }) {
  return <Button type="button" variant="outline" className={`h-auto min-h-12 whitespace-normal py-3 ${AI_BUTTON}`} disabled={busy} onClick={onClick}>{icon}{busy ? 'PRACUJĘ…' : label}</Button>
}

function ResultCard({ result, nextAction, nextActionAt, onNextAction, onNextActionAt, onSave }: { result: DealAssistantResult; nextAction: string; nextActionAt: string; onNextAction: (value: string) => void; onNextActionAt: (value: string) => void; onSave: () => void }) {
  return <section className="space-y-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{result.title}</h3><p className="mt-1 text-sm">{result.summary}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{result.sourceQuality} · {result.confidence}</span></div>
    {result.qualification?.map((row) => <div key={row.bank} className="rounded-lg border p-3 text-sm"><b>{row.bank} — {row.status}</b><p>{row.reason}</p><p className="mt-1 text-xs text-slate-500">Reguła: {row.rule} · Źródło: {row.source} · Pewność: {row.confidence}</p></div>)}
    {result.completeness ? <div className="grid gap-2 sm:grid-cols-2"><Completeness label="KOMPLET DO PEŁNEJ ANALIZY" value={result.completeness.fullAnalysis} /><Completeness label={`KOMPLET DO WNIOSKU · ${result.completeness.bankApplication.bank || 'BANK'}`} value={result.completeness.bankApplication} /></div> : null}
    {result.aiSynthesis ? <div className="rounded-lg border border-lime-300 bg-lime-50 p-3 text-sm"><b>WNIOSEK AI</b><p className="mt-1 whitespace-pre-wrap">{result.aiSynthesis}</p></div> : null}
    <div className="rounded-lg border p-3"><p className="text-xs font-semibold">REKOMENDOWANY NEXT ACTION</p><Textarea className="mt-2" rows={2} value={nextAction} onChange={(event) => onNextAction(event.target.value)} /><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><Input type="datetime-local" value={nextActionAt} onChange={(event) => onNextActionAt(event.target.value)} /><Button onClick={onSave}><CheckCircle2 className="size-4" /> ZAPISZ NEXT ACTION</Button></div></div>
    <p className="text-xs text-slate-500">{result.paidAiUsed ? 'Płatne AI: 1 kontrolowane wywołanie.' : 'Płatne AI: 0 wywołań. Wynik zapisany strukturalnie i może być używany deterministycznie.'}</p>
  </section>
}

function Completeness({ label, value }: { label: string; value: { complete: number; total: number; missing: string[] } }) {
  return <div className="rounded-lg border p-3 text-sm"><b>{label}</b><p className="mt-1 text-lg font-black">{value.complete}/{value.total}</p><p className="mt-1 text-xs text-slate-500">{value.missing.length ? `Brakuje: ${value.missing.join(', ')}` : 'Brak zapisanych braków.'}</p></div>
}

