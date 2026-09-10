'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, BriefcaseBusiness } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { DealBankingKnowledge } from '@/components/banking-knowledge/deal-banking-knowledge';

type DealOption = {
  id: string;
  title: string;
  product_type: string | null;
  mandatory_bank: string | null;
  preferred_bank: string | null;
};

export default function AssistantPage() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [dealId, setDealId] = useState('');
  const [knowledgeReady, setKnowledgeReady] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    const result = await db
      .from('deals')
      .select('id,title,product_type,mandatory_bank,preferred_bank')
      .eq('account_id', accountId)
      .eq('status', 'open')
      .order('updated_at', { ascending: false });
    const rows = (result.data ?? []) as DealOption[];
    setDeals(rows);
    setDealId((current) => current || rows[0]?.id || '');
  }, [accountId, db]);

  useEffect(() => void load(), [load]);
  useEffect(() => {
    if (!accountId) return;
    const key = `mcrm-ai-drive-sync-${new Date().toLocaleDateString('sv-SE')}`;
    if (window.localStorage.getItem(key) === 'done') {
      setKnowledgeReady(true);
      return;
    }
    const controller = new AbortController();
    fetch('/api/ai/banking-knowledge/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: false }),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) window.localStorage.setItem(key, 'done');
      })
      .catch(() => null)
      .finally(() => {
        if (!controller.signal.aborted) setKnowledgeReady(true);
      });
    return () => controller.abort();
  }, [accountId]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="rounded-[1.75rem] bg-[#123d2b] p-5 text-white">
        <div className="flex items-center gap-2 text-lime-300">
          <Bot className="size-5" />
          <p className="text-xs font-black tracking-[0.18em] uppercase">
            mCRM AI
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-black">ASYSTENT</h1>
        <p className="mt-1 text-sm text-emerald-50/90">
          Zapytaj o klienta, Deal albo co zrobić teraz.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-4">
        <label htmlFor="assistant-deal" className="text-sm font-black">
          Aktywny Deal
        </label>
        <div className="relative mt-2">
          <BriefcaseBusiness className="absolute top-3 left-3 size-4 text-emerald-900" />
          <select
            id="assistant-deal"
            value={dealId}
            onChange={(event) => setDealId(event.target.value)}
            className="h-11 w-full rounded-xl border bg-white pr-3 pl-10 text-sm"
          >
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title} · {deal.product_type || 'produkt nieustalony'} ·{' '}
                {deal.mandatory_bank ||
                  deal.preferred_bank ||
                  'bank nieustalony'}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-emerald-900">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5">
            PRZYGOTUJ MNIE
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5">
            SPRAWDŹ WIEDZĘ BANKOWĄ
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5">
            CO TERAZ?
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5">
            KTO STOI?
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5">
            PODSUMUJ KLIENTA
          </span>
        </div>
      </section>

      {!knowledgeReady ? (
        <p className="rounded-2xl border p-4 text-sm text-slate-500">
          Sprawdzam aktualność zatwierdzonych źródeł…
        </p>
      ) : dealId ? (
        <DealBankingKnowledge dealId={dealId} />
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          Brak aktywnego Deala do pracy z Asystentem.
        </p>
      )}
    </div>
  );
}
