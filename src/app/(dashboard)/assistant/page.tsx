'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, BriefcaseBusiness, MessageCircle, Sparkles } from 'lucide-react';
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
  const selectedDeal = deals.find((deal) => deal.id === dealId);
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <header className="border-b border-emerald-950/10 px-1 pb-3">
        <div className="flex items-center gap-2 text-emerald-900">
          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50">
            <Bot className="size-4" />
          </span>
          <h1 className="text-2xl font-black">ASYSTENT</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Zapytaj o klienta, Deal albo co zrobić teraz.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-900"><Bot className="size-5" /></span>
              <div><h2 className="font-black text-slate-950">Co chcesz zrobić w tej sprawie?</h2><p className="text-xs text-slate-500">{selectedDeal?.title} · {selectedDeal?.product_type || 'produkt nieustalony'}</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-lime-300 bg-lime-50 p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-950"><Sparkles className="size-4 text-lime-600" /> AI na żądanie</p>
              <p className="mt-2 text-sm text-slate-700">Każda analiza uruchamia się dopiero po świadomym wybraniu funkcji poniżej. Zwykła praca w CRM nie wywołuje płatnego AI.</p>
            </div>
            <div className="mt-5"><DealAssistantActions dealId={dealId} /></div>
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Kontekst Deala</p>
            <h3 className="mt-2 text-lg font-black text-slate-950">{selectedDeal?.title}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs font-bold text-slate-500">Produkt</dt><dd className="mt-1 font-semibold">{selectedDeal?.product_type || 'Nie ustalono'}</dd></div>
              <div><dt className="text-xs font-bold text-slate-500">Bank</dt><dd className="mt-1 font-semibold">{selectedDeal?.mandatory_bank || selectedDeal?.preferred_bank || 'Nie ustalono'}</dd></div>
            </dl>
            <div className="mt-6 rounded-xl bg-slate-50 p-4"><MessageCircle className="size-5 text-emerald-800" /><p className="mt-2 text-sm font-bold">Odpowiedź pozostaje w kontekście wybranego Deala.</p><p className="mt-1 text-xs text-slate-500">Źródła i poziom pewności są pokazywane przez istniejący silnik M4.</p></div>
          </aside>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          Brak aktywnego Deala do pracy z Asystentem.
        </p>
      )}
    </div>
  );
}

