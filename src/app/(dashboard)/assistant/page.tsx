'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, BriefcaseBusiness, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { DealAssistantActions } from '@/components/assistant/deal-assistant-actions';
import { isOperationalTestRecord } from '@/lib/mcrm/test-record';

type DealOption = {
  id: string;
  title: string;
  product_type: string | null;
  mandatory_bank: string | null;
  preferred_bank: string | null;
  contact: Array<{ name: string | null }>;
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
      .select(
        'id,title,product_type,mandatory_bank,preferred_bank,contact:contacts(name)'
      )
      .eq('account_id', accountId)
      .eq('status', 'open')
      .order('updated_at', { ascending: false });
    const rows = ((result.data ?? []) as DealOption[]).filter(
      (deal) => !isOperationalTestRecord(deal.title)
    );
    setDeals(rows);
    setDealId((current) => {
      if (current) return current;
      const requested = new URLSearchParams(window.location.search).get('deal');
      return rows.some((deal) => deal.id === requested) ? requested || '' : '';
    });
  }, [accountId, db]);

  useEffect(() => void load(), [load]);
  const selectedDeal = deals.find((deal) => deal.id === dealId);
  return (
    <div className="w-full space-y-4 overflow-x-hidden">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--bigin-accent)]">
          <span className="flex size-9 items-center justify-center rounded-full bg-[var(--bigin-hover)]">
            <Bot className="size-4" />
          </span>
          <h1 className="text-2xl font-black">ASYSTENT</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--bigin-text)]">
          Zapytaj o klienta, Deal albo co zrobić teraz.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--bigin-border)] bg-[var(--bigin-surface)] p-4 shadow-sm">
        <label htmlFor="assistant-deal" className="text-sm font-black">
          Zmień kontekst
        </label>
        <div className="relative mt-2">
          <BriefcaseBusiness className="absolute top-3 left-3 size-4 text-[var(--bigin-accent)]" />
          <select
            id="assistant-deal"
            value={dealId}
            onChange={(event) => setDealId(event.target.value)}
            className="h-11 w-full rounded-xl border bg-[var(--bigin-surface)] pr-3 pl-10 text-sm"
          >
            <option value="">Wybierz jawnie klienta i Deal</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.contact?.[0]?.name || 'Klient nieustalony'} · {deal.title}{' '}
                · {deal.product_type || 'produkt nieustalony'} ·{' '}
                {deal.mandatory_bank ||
                  deal.preferred_bank ||
                  'bank nieustalony'}
              </option>
            ))}
          </select>
        </div>
      </section>

      {dealId ? (
        <section className="rounded-xl border border-[var(--bigin-border)] bg-[var(--bigin-surface)] p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0">
              <div className="flex items-center gap-3 border-b border-[var(--bigin-border)] pb-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--bigin-hover)] text-[var(--bigin-accent)]">
                  <Bot className="size-5" />
                </span>
                <div>
                  <h2 className="font-black text-[var(--bigin-text)]">
                    Co chcesz zrobić w tej sprawie?
                  </h2>
                  <p className="text-xs text-[var(--bigin-text)]">
                    {selectedDeal?.contact?.[0]?.name || 'Klient nieustalony'} ·{' '}
                    {selectedDeal?.title} ·{' '}
                    {selectedDeal?.product_type || 'produkt nieustalony'}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl bg-[var(--bigin-bg)] p-4">
                <p className="text-xs font-black tracking-wide text-[var(--bigin-text)] uppercase">
                  Kontekst rozmowy
                </p>
                <h3 className="mt-2 text-lg font-black text-[var(--bigin-text)]">
                  {selectedDeal?.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--bigin-text)]">
                  {selectedDeal?.product_type || 'Produkt nieustalony'} ·{' '}
                  {selectedDeal?.mandatory_bank ||
                    selectedDeal?.preferred_bank ||
                    'Bank nieustalony'}
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-[var(--bigin-border)] bg-[var(--bigin-hover)] p-4 text-sm text-[var(--bigin-text)]">
                <p className="font-bold text-[var(--bigin-text)]">
                  Asystent pracuje wyłącznie w kontekście tej sprawy.
                </p>
                <p className="mt-1">
                  Wybierz świadomie jedną akcję. Samo otwarcie widoku nie
                  uruchamia płatnego AI.
                </p>
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-[var(--bigin-border)] bg-[var(--bigin-hover)] p-3">
              <p className="flex items-center gap-2 text-xs font-black tracking-wide text-[var(--bigin-accent)] uppercase">
                <Sparkles className="size-4 text-[var(--bigin-accent)]" /> AI na żądanie
              </p>
              <div className="mt-3">
                <DealAssistantActions dealId={dealId} compact />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-[var(--bigin-text)]">
          Wybierz klienta i Deal. Asystent nie odpowiada ogólnie bez jawnego
          kontekstu.
        </p>
      )}
    </div>
  );
}
