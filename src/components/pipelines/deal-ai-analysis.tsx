'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Analysis = {
  id: string; created_at: string; provider: string; model: string; duration_ms: number; chunk_count: number
  total_tokens?: number | null; sources: Source[]; result: Result
}
type Source = { bank?: string; product?: string; documentType?: string; sourceName?: string; version?: string; effectiveDate?: string }
type Result = {
  recommendations?: Array<{ bank?: string; solution?: string; client_fit?: string; justification?: string; limitations?: string[]; risks?: string[]; missing_data?: string[]; required_documents?: string[] }>
  knowledgeCompleteness?: Array<{ bank: string; state: string; message?: string | null }>
  operationalPriority?: { preferredBank?: string | null; mandatoryBank?: string | null; rules?: string[] }
  commissions?: Array<{ bank: string; product: string; rate: number; valid_from: string; valid_to?: string | null; source_name: string; source_version?: string | null }>
  overallRisks?: string[]; missingClientData?: string[]
}

export function DealAiAnalysis({ deal }: { deal: { id: string; mandatory_bank?: string | null; preferred_bank?: string | null; excluded_banks?: string[]; analysis_include_banks?: string[] } }) {
  const db = useMemo(() => createClient(), [])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [busy, setBusy] = useState(false)
  const [model, setModel] = useState('')
  const [mandatory, setMandatory] = useState(deal.mandatory_bank || '')
  const [preferred, setPreferred] = useState(deal.preferred_bank || '')
  const [excluded, setExcluded] = useState((deal.excluded_banks || []).join(', '))
  const [included, setIncluded] = useState((deal.analysis_include_banks || []).join(', '))
  const split = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
  const load = useCallback(async () => {
    const response = await fetch(`/api/ai/deal-analysis?deal_id=${encodeURIComponent(deal.id)}`)
    const data = await response.json().catch(() => ({})) as { analyses?: Analysis[] }
    if (response.ok) setAnalyses(data.analyses ?? [])
  }, [deal.id])
  useEffect(() => { void load() }, [load])
  async function saveRules() {
    const { error } = await db.from('deals').update({ mandatory_bank: mandatory.trim() || null, preferred_bank: preferred.trim() || null, excluded_banks: split(excluded), analysis_include_banks: split(included) }).eq('id', deal.id)
    if (error) toast.error(error.message); else toast.success('Reguły analizy zapisane')
  }
  async function analyze() {
    setBusy(true)
    const response = await fetch('/api/ai/deal-analysis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deal_id: deal.id, model: model.trim() || undefined }) })
    const data = await response.json().catch(() => ({})) as { error?: string }
    setBusy(false)
    if (!response.ok) { toast.error(data.error || 'Analiza nie powiodła się.'); return }
    toast.success('Analiza została zapisana przy Dealu')
    await load()
  }
  return <div className="space-y-4">
    <section className="rounded-lg border p-4">
      <h3 className="font-semibold">Reguły przed modelem</h3>
      <p className="text-muted-foreground mt-1 text-xs">Wykluczenia i bank obowiązkowy są egzekwowane przez CRM przed wywołaniem AI.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Input value={mandatory} onChange={(e) => setMandatory(e.target.value)} placeholder="Bank obowiązkowy" />
        <Input value={preferred} onChange={(e) => setPreferred(e.target.value)} placeholder="Bank preferowany" />
        <Input value={excluded} onChange={(e) => setExcluded(e.target.value)} placeholder="Banki wykluczone, po przecinku" />
        <Input value={included} onChange={(e) => setIncluded(e.target.value)} placeholder="Uwzględnij w analizie, po przecinku" />
      </div>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => void saveRules()}>Zapisz reguły</Button>
    </section>
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid flex-1 gap-1 text-xs">Model (puste = domyślny)<Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model domyślny dostawcy" /></label>
        <Button disabled={busy} onClick={() => void analyze()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}Analizuj Deal</Button>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">Analiza uruchamia się wyłącznie po kliknięciu. Brak klucza zostanie pokazany jako „model nieskonfigurowany”.</p>
    </section>
    {analyses.map((analysis) => <article key={analysis.id} className="space-y-4 rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{new Date(analysis.created_at).toLocaleString('pl-PL')} · {analysis.provider}/{analysis.model} · {analysis.duration_ms} ms · {analysis.chunk_count} fragmentów · {analysis.total_tokens ?? 'brak danych'} tokenów</p>
      <div className="grid gap-3 xl:grid-cols-2">
        {(analysis.result.recommendations ?? []).map((item, index) => <div key={`${item.bank}-${index}`} className="rounded-md border p-3 text-sm">
          <h4 className="font-semibold">{item.bank || 'Rozwiązanie'}</h4><p>{item.solution}</p><p className="mt-2"><b>Dopasowanie:</b> {item.client_fit || item.justification}</p>
          <List label="Ograniczenia" items={item.limitations} /><List label="Ryzyka" items={item.risks} /><List label="Brakujące dane" items={item.missing_data} /><List label="Wymagane dokumenty" items={item.required_documents} />
        </div>)}
      </div>
      <div><h4 className="text-sm font-semibold">Kompletność wiedzy</h4>{(analysis.result.knowledgeCompleteness ?? []).map((item) => <p key={item.bank} className="text-sm">{item.bank}: <b>{item.state}</b>{item.message ? ` — ${item.message}` : ''}</p>)}</div>
      <List label="Ryzyka ogólne" items={analysis.result.overallRisks} /><List label="Brakujące dane klienta" items={analysis.result.missingClientData} />
      <div><h4 className="text-sm font-semibold">Prowizje (informacja oddzielna od rekomendacji)</h4>{(analysis.result.commissions ?? []).map((item, index) => <p key={`${item.bank}-${index}`} className="text-sm">{item.bank} · {item.product}: {item.rate}% · {item.valid_from}–{item.valid_to || 'bezterminowo'} · {item.source_name} {item.source_version || ''}</p>)}{!(analysis.result.commissions ?? []).length && <p className="text-muted-foreground text-sm">Brak stawki w bazie.</p>}</div>
      <details><summary className="cursor-pointer text-sm font-semibold">Użyte źródła i wersje</summary><ul className="mt-2 list-disc pl-5 text-sm">{analysis.sources.map((source, index) => <li key={index}>{source.bank} · {source.product || 'produkt nieoznaczony'} · {source.sourceName || 'źródło nieoznaczone'} · {source.version || source.effectiveDate || 'wersja nieoznaczona'}</li>)}</ul></details>
    </article>)}
    {!analyses.length && <p className="text-muted-foreground text-sm">Brak zapisanych analiz.</p>}
  </div>
}
function List({ label, items }: { label: string; items?: string[] }) { if (!items?.length) return null; return <div className="mt-2"><b>{label}:</b><ul className="list-disc pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul></div> }

