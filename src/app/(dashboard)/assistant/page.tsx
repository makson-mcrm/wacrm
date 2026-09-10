'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, BriefcaseBusiness } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { DealAssistantActions } from '@/components/assistant/deal-assistant-actions';

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
    setDealId((current) => {
      if (current) return current;
      const requested = new URLSearchParams(window.location.search).get('deal');
      return rows.some((deal) => deal.id === requested)
        ? requested || ''
        : rows[0]?.id || '';
    });
  }, [accountId, db]);

  useEffect(() => void load(), [load]);
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
      </section>

      {dealId ? (
        <DealAssistantActions dealId={dealId} />
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          Brak aktywnego Deala do pracy z Asystentem.
        </p>
      )}
    </div>
  );
}

