'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Landmark, ListChecks, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  BankingKnowledgeAnswer,
  BankingKnowledgeQuality,
  BankingKnowledgeSourceType,
} from '@/lib/banking-knowledge/foundation';

type Mode = 'answer' | 'guide';

const SOURCE_LABELS: Record<BankingKnowledgeSourceType, string> = {
  internal_drive: 'MOJE ŹRÓDŁA — GOOGLE DRIVE',
  official_bank: 'OFICJALNE ŹRÓDŁA BANKU',
  ai_inference: 'WNIOSEK AI',
};

const QUALITY_STYLES: Record<BankingKnowledgeQuality, string> = {
  'POTWIERDZONE ZE ŹRÓDŁA': 'bg-emerald-100 text-emerald-800',
  CZĘŚCIOWE: 'bg-amber-100 text-amber-800',
  'WNIOSEK AI': 'bg-sky-100 text-sky-800',
  'WYMAGA WERYFIKACJI': 'bg-rose-100 text-rose-800',
};

export function DealBankingKnowledge({ dealId }: { dealId: string }) {
  const [answer, setAnswer] = useState<BankingKnowledgeAnswer | null>(null);
  const [mode, setMode] = useState<Mode>('answer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `/api/ai/banking-knowledge?deal_id=${encodeURIComponent(dealId)}`,
          { signal: controller.signal, cache: 'no-store' }
        );
        const body = (await response.json().catch(() => ({}))) as
          BankingKnowledgeAnswer | { error?: string };
        if (!response.ok || !('context' in body)) {
          throw new Error(
            'error' in body && body.error
              ? body.error
              : 'Nie udało się pobrać Wiedzy Bankowej.'
          );
        }
        setAnswer(body);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Nie udało się pobrać Wiedzy Bankowej.'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [dealId]);

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">Dobieram wiedzę do Deala…</p>
    );
  }
  if (error || !answer) {
    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-sm">
        {error || 'Brak odpowiedzi.'}
      </div>
    );
  }

  const { context } = answer;
  return (
    <div className="space-y-4">
      <section className="border-primary/20 bg-primary/5 rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-primary flex items-center gap-2 text-sm font-semibold">
              <Landmark className="size-4" /> Wiedza Bankowa ·{' '}
              {context.bank || 'bank do wskazania'}
            </div>
            <h2 className="mt-2 text-lg font-bold">{context.title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {[context.contact, context.company, context.product, context.bank]
                .filter(Boolean)
                .join(' · ') || 'Uzupełnij kontekst Deala'}
            </p>
          </div>
          <Quality value={answer.quality} />
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <Context label="ETAP" value={context.stage} />
          <Context label="STATUS BANKU" value={context.bankStatus} />
          <Context label="NASTĘPNY KROK" value={context.nextAction} />
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          size="lg"
          variant={mode === 'answer' ? 'default' : 'outline'}
          className="h-auto min-h-11 py-3 text-center whitespace-normal"
          onClick={() => setMode('answer')}
        >
          <ShieldCheck className="size-4" /> JAK WYKONAĆ NASTĘPNY KROK?
        </Button>
        <Button
          size="lg"
          variant={mode === 'guide' ? 'default' : 'outline'}
          className="h-auto min-h-11 py-3 text-center whitespace-normal"
          onClick={() => setMode('guide')}
        >
          <ListChecks className="size-4" /> PROWADŹ MNIE KROK PO KROKU
        </Button>
      </div>

      <section className="rounded-xl border p-4">
        {mode === 'answer' ? (
          <>
            <p className="font-semibold">{answer.summary}</p>
            <p className="text-muted-foreground mt-2 text-sm">{answer.why}</p>
            {answer.missing.length > 0 ? (
              <p className="mt-3 text-sm text-rose-700">
                Do uzupełnienia: {answer.missing.join(', ')}.
              </p>
            ) : null}
          </>
        ) : (
          <ol className="space-y-3">
            {answer.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h3 className="font-semibold">Źródła odpowiedzi</h3>
          <p className="text-muted-foreground text-xs">
            Routing: BANK → PRODUKT → TYP ŹRÓDŁA → WERSJA/DATA
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(QUALITY_STYLES) as BankingKnowledgeQuality[]).map(
              (quality) => (
                <Quality key={quality} value={quality} />
              )
            )}
          </div>
        </div>
        {(['internal_drive', 'official_bank', 'ai_inference'] as const).map(
          (type) => {
            const sources = answer.sources.filter(
              (source) => source.type === type
            );
            return (
              <div key={type}>
                <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide">
                  {SOURCE_LABELS[type]}
                </p>
                {sources.length > 0 ? (
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <article
                        key={source.id}
                        className="rounded-lg border p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            {source.publicUrl ? (
                              <a
                                href={source.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary inline-flex items-center gap-1 font-semibold"
                              >
                                {source.label}{' '}
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <p className="font-semibold">{source.label}</p>
                            )}
                            <p className="text-muted-foreground mt-1 text-xs">
                              {source.bank} → {source.product} →{' '}
                              {source.version}
                            </p>
                            {source.note ? (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {source.note}
                              </p>
                            ) : null}
                            {source.facts?.length ? (
                              <ul className="mt-2 space-y-1 text-xs">
                                {source.facts.map((fact) => (
                                  <li key={fact}>• {fact}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                          <Quality value={source.quality} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-amber-800">
                    Brak źródła dopuszczonego dla tego Deala.
                  </p>
                )}
              </div>
            );
          }
        )}
      </section>
    </div>
  );
}

function Quality({ value }: { value: BankingKnowledgeQuality }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${QUALITY_STYLES[value]}`}
    >
      {value}
    </span>
  );
}

function Context({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-background/80 rounded-lg border p-3">
      <p className="text-muted-foreground text-[10px] font-semibold">{label}</p>
      <p className="mt-1 font-medium">{value || '—'}</p>
    </div>
  );
}
