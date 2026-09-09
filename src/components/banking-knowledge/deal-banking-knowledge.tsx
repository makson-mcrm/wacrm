'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Landmark, ListChecks, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  BankingKnowledgeAnswer,
  BankingKnowledgeQuality,
  BankingKnowledgeSourceType,
} from '@/lib/banking-knowledge/foundation';

type Mode = 'answer' | 'guide';

const SOURCE_LABELS: Record<BankingKnowledgeSourceType, string> = {
  deal_context: 'KONTEKST TEGO DEALA',
  internal_drive: 'MOJE ŹRÓDŁA — GOOGLE DRIVE',
  official_bank: 'OFICJALNE ŹRÓDŁA BANKU',
  ai_inference: 'WNIOSEK AI',
};

const QUALITY_STYLES: Record<BankingKnowledgeQuality, string> = {
  POTWIERDZONE: 'bg-emerald-100 text-emerald-800',
  CZĘŚCIOWE: 'bg-amber-100 text-amber-800',
  'WNIOSEK AI': 'bg-sky-100 text-sky-800',
  'WYMAGA WERYFIKACJI': 'bg-rose-100 text-rose-800',
};

export function DealBankingKnowledge({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState<BankingKnowledgeAnswer | null>(null);
  const [mode, setMode] = useState<Mode>('answer');
  const [question, setQuestion] = useState('Co mam zrobić dalej?');
  const [nextAction, setNextAction] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  function applyAnswer(value: BankingKnowledgeAnswer) {
    setAnswer(value);
    setNextAction(value.recommendedNextAction);
    setNextActionAt(toLocalDateTime(value.recommendedNextActionAt));
  }

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
        setNextAction(body.recommendedNextAction);
        setNextActionAt(toLocalDateTime(body.recommendedNextActionAt));
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

  async function ask() {
    const trimmed = question.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setSavedMessage('');
    try {
      const response = await fetch('/api/ai/banking-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId, question: trimmed }),
      });
      const body = (await response.json().catch(() => ({}))) as
        BankingKnowledgeAnswer | { error?: string };
      if (!response.ok || !('context' in body)) {
        throw new Error(
          'error' in body && body.error
            ? body.error
            : 'Nie udało się przygotować odpowiedzi.'
        );
      }
      applyAnswer(body);
      setMode('answer');
    } catch (askError) {
      setError(
        askError instanceof Error
          ? askError.message
          : 'Nie udało się przygotować odpowiedzi.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveNextAction() {
    if (!answer || !nextAction.trim()) return;
    setSaving(true);
    setError('');
    setSavedMessage('');
    try {
      const response = await fetch('/api/ai/banking-knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: dealId,
          next_action: nextAction.trim(),
          next_action_at: nextActionAt
            ? new Date(nextActionAt).toISOString()
            : null,
          expected_next_action: answer.context.nextAction,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        next_action?: string | null;
        next_action_at?: string | null;
      };
      if (!response.ok || !body.next_action) {
        throw new Error(body.error || 'Nie udało się zapisać next action.');
      }
      setAnswer({
        ...answer,
        context: {
          ...answer.context,
          nextAction: body.next_action,
          nextActionAt: body.next_action_at || null,
        },
        recommendedNextAction: body.next_action,
        recommendedNextActionAt: body.next_action_at || null,
      });
      setNextActionAt(toLocalDateTime(body.next_action_at));
      setSavedMessage('Next action i termin zapisane w tym Dealu.');
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Nie udało się zapisać next action.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">Dobieram wiedzę do Deala…</p>
    );
  }
  if (!answer) {
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

      <section className="space-y-2 rounded-xl border p-4">
        <label htmlFor="banking-question" className="text-sm font-semibold">
          Pytanie w kontekście tego Deala
        </label>
        <Textarea
          id="banking-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Np. co mam zrobić dalej?"
        />
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          size="lg"
          variant={mode === 'answer' ? 'default' : 'outline'}
          className="h-auto min-h-11 py-3 text-center whitespace-normal"
          onClick={() => void ask()}
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

      {error ? (
        <p className="border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border p-4">
        {mode === 'answer' ? (
          <dl className="grid gap-3 text-sm">
            <AnswerRow label="CO ZROBIĆ" value={answer.summary} />
            <AnswerRow
              label="ROZPOZNANY PROBLEM"
              value={problemLabel(answer.problem)}
            />
            <AnswerRow
              label="CZEGO BRAKUJE"
              value={
                answer.missing.length
                  ? answer.missing.join(', ')
                  : 'Brak krytycznych braków w kontekście Deala.'
              }
            />
            <AnswerRow
              label="ŹRÓDŁO"
              value={answer.sources
                .filter((source) => answer.primarySourceIds.includes(source.id))
                .map((source) => source.label)
                .join(' · ')}
            />
            <div>
              <dt className="text-muted-foreground text-[10px] font-semibold">
                POZIOM PEWNOŚCI
              </dt>
              <dd className="mt-1">
                <Quality value={answer.quality} />
              </dd>
            </div>
            {!answer.internalSourceAvailable ? (
              <p className="rounded-lg border border-dashed p-3 text-xs text-amber-800">
                Zatwierdzone źródło wewnętrzne Drive nie było dostępne.
                Odpowiedź korzysta wyłącznie z oficjalnych źródeł mBanku i
                wyraźnie oznaczonego wniosku operacyjnego.
              </p>
            ) : null}
          </dl>
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

      <section className="border-primary/20 space-y-3 rounded-xl border p-4">
        <div>
          <h3 className="font-semibold">Sugerowany następny krok</h3>
          <p className="text-muted-foreground text-xs">
            Zapis aktualizuje istniejące pola Deala — nie tworzy drugiej listy
            zadań.
          </p>
        </div>
        <Textarea
          value={nextAction}
          onChange={(event) => setNextAction(event.target.value)}
          maxLength={500}
          rows={2}
          aria-label="Sugerowany następny krok"
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            type="datetime-local"
            value={nextActionAt}
            onChange={(event) => setNextActionAt(event.target.value)}
            aria-label="Termin następnego kroku"
          />
          <Button
            onClick={() => void saveNextAction()}
            disabled={saving || !nextAction.trim()}
          >
            {saving ? 'Zapisuję…' : 'ZAPISZ NEXT ACTION'}
          </Button>
        </div>
        {savedMessage ? (
          <p className="text-sm font-medium text-emerald-700">{savedMessage}</p>
        ) : null}
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
        {answer.claims.length ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide">
              TWIERDZENIA I POCHODZENIE
            </p>
            {answer.claims.map((claim) => (
              <div key={claim.id} className="rounded-lg border p-3 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="max-w-2xl">{claim.text}</p>
                  <Quality value={claim.quality} />
                </div>
                <p className="text-muted-foreground mt-2">
                  Źródło:{' '}
                  {claim.sourceIds
                    .map(
                      (sourceId) =>
                        answer.sources.find((source) => source.id === sourceId)
                          ?.label
                    )
                    .filter(Boolean)
                    .join(' · ') || 'brak — wymaga weryfikacji'}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {(
          [
            'deal_context',
            'internal_drive',
            'official_bank',
            'ai_inference',
          ] as const
        ).map((type) => {
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
                      className={`rounded-lg border p-3 text-sm ${
                        answer.primarySourceIds.includes(source.id)
                          ? 'border-primary/40 bg-primary/5'
                          : ''
                      }`}
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
                              {source.label} <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <p className="font-semibold">{source.label}</p>
                          )}
                          <p className="text-muted-foreground mt-1 text-xs">
                            {source.bank} → {source.product} → {source.version}
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
        })}
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

function AnswerRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] font-semibold">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value || '—'}</dd>
    </div>
  );
}

function toLocalDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function problemLabel(value: BankingKnowledgeAnswer['problem']) {
  return {
    documents: 'Dokumenty',
    application: 'Wniosek',
    decision: 'Decyzja',
    activation: 'Uruchomienie',
  }[value];
}

