'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CircleDollarSign, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

type FinanceDeal = {
  id: string;
  title: string;
  value: number | null;
  expected_commission: number | null;
  actual_commission: number | null;
  invoice_status: string | null;
  status: string | null;
  updated_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(value);

export default function FinancesPage() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [deals, setDeals] = useState<FinanceDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const result = await db
      .from('deals')
      .select('id,title,value,expected_commission,actual_commission,invoice_status,status,updated_at')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false })
      .limit(100);
    setDeals((result.data ?? []) as FinanceDeal[]);
    setLoading(false);
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  const launched = deals.filter((deal) => deal.status === 'won');
  const expected = deals.reduce((sum, deal) => sum + Number(deal.expected_commission || 0), 0);
  const paid = deals.reduce((sum, deal) => sum + Number(deal.actual_commission || 0), 0);
  const invoicing = deals.filter((deal) => deal.invoice_status && !/paid|opłac/i.test(deal.invoice_status)).length;
  const cards = [
    ['Wartość uruchomionych spraw', launched.reduce((sum, deal) => sum + Number(deal.value || 0), 0)],
    ['Prowizja oczekiwana', expected],
    ['Prowizja rozliczona', paid],
    ['Pozostało do rozliczenia', Math.max(0, expected - paid)],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">FINANSE</h1>
        <p className="mt-1 text-sm text-slate-500">Lekki obraz prowizji i rozliczeń wynikający z istniejących Deali.</p>
      </header>

      <nav className="flex gap-2" aria-label="Zakres finansów">
        {['FIRMA', 'PRYWATNE', 'CAŁOŚĆ'].map((label, index) => (
          <span key={label} className={`rounded-lg border px-4 py-2 text-xs font-bold ${index === 2 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>{label}</span>
        ))}
      </nav>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{money(value)} zł</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr]">
        <section className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">PRZEPŁYW 30 / 60 DNI</h2>
          <div className="mt-8 flex h-56 items-end gap-3 border-b border-l border-slate-200 px-4 pb-3">
            {[34, 58, 46, 78, 62, 88].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <span className="w-full rounded-t-lg bg-emerald-700/80" style={{ height: `${height}%` }} />
                <span className="text-[10px] text-slate-500">{index + 1} tyg.</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-base font-black text-slate-950">DO ROZLICZENIA</h2><CircleDollarSign className="size-5 text-emerald-700" /></div>
          {loading ? <Loader2 className="mx-auto mt-16 size-5 animate-spin text-slate-400" /> : (
            <div className="mt-3 divide-y divide-slate-100">
              {deals.filter((deal) => Number(deal.expected_commission || 0) > Number(deal.actual_commission || 0)).slice(0, 6).map((deal) => (
                <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-emerald-800">
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{deal.title}</span><span className="block text-xs text-slate-500">{deal.invoice_status || 'Bez statusu faktury'}</span></span>
                  <span className="flex items-center gap-1 whitespace-nowrap text-sm font-black">{money(Number(deal.expected_commission || 0) - Number(deal.actual_commission || 0))} zł <ArrowUpRight className="size-3" /></span>
                </Link>
              ))}
              {!invoicing && !deals.length ? <p className="py-12 text-center text-sm text-slate-500">Brak danych finansowych w Dealach.</p> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

