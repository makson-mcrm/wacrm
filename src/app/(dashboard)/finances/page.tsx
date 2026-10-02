'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

type Scope = 'company' | 'private' | 'all';
type FinanceDeal = {
  id: string;
  title: string;
  company_id: string | null;
  actual_commission: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_status: string | null;
  updated_at: string;
};
type FinanceDocument = {
  id: string;
  name: string;
  status: string | null;
  created_at: string;
  deal_id: string;
  deal: Array<{ title: string; company_id: string | null }>;
};
type MonthClose = {
  id: string;
  title: string;
  occurred_at: string;
  description: string | null;
};

const money = (value: number) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 2,
  }).format(value);
const monthKey = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);

export default function FinancesPage() {
  const db = useMemo(() => createClient(), []);
  const { accountId, user } = useAuth();
  const [scope, setScope] = useState<Scope>('all');
  const [deals, setDeals] = useState<FinanceDeal[]>([]);
  const [documents, setDocuments] = useState<FinanceDocument[]>([]);
  const [history, setHistory] = useState<MonthClose[]>([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [dealRows, documentRows, historyRows] = await Promise.all([
      db
        .from('deals')
        .select(
          'id,title,company_id,actual_commission,invoice_number,invoice_date,invoice_status,updated_at'
        )
        .eq('account_id', accountId)
        .order('updated_at', { ascending: false })
        .limit(200),
      db
        .from('deal_documents')
        .select(
          'id,name,status,created_at,deal_id,deal:deals(title,company_id)'
        )
        .eq('account_id', accountId)
        .eq('source_channel', 'finance')
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('sales_activities')
        .select('id,title,occurred_at,description')
        .eq('account_id', accountId)
        .ilike('title', 'ZAMKNIĘCIE MIESIĄCA%')
        .order('occurred_at', { ascending: false })
        .limit(24),
    ]);
    const error = dealRows.error || documentRows.error || historyRows.error;
    if (error) toast.error(`Nie udało się wczytać Finansów: ${error.message}`);
    setDeals((dealRows.data ?? []) as FinanceDeal[]);
    setDocuments((documentRows.data ?? []) as FinanceDocument[]);
    setHistory((historyRows.data ?? []) as MonthClose[]);
    setSelectedDealId((current) => current || dealRows.data?.[0]?.id || '');
    setLoading(false);
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  const inScope = useCallback(
    (companyId: string | null | undefined) =>
      scope === 'all' ||
      (scope === 'company' ? Boolean(companyId) : !companyId),
    [scope]
  );
  const visibleDeals = deals.filter((deal) => inScope(deal.company_id));
  const visibleDocuments = documents.filter((document) =>
    inScope(document.deal?.[0]?.company_id)
  );
  const revenue = visibleDeals.reduce(
    (sum, deal) => sum + Math.max(0, Number(deal.actual_commission || 0)),
    0
  );
  const costs = visibleDeals.reduce(
    (sum, deal) =>
      sum + Math.abs(Math.min(0, Number(deal.actual_commission || 0))),
    0
  );
  const grossResult = revenue - costs;
  const vat = revenue - revenue / 1.23;
  const currentMonth = monthKey();
  const monthClosed = history.some((row) => row.title.endsWith(currentMonth));

  async function importFile(file: File) {
    if (!accountId || !user || !selectedDealId || uploading) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const storagePath = `${accountId}/${selectedDealId}/${crypto.randomUUID()}-${safeName}`;
      const stored = await db.storage
        .from('deal-documents')
        .upload(storagePath, file);
      if (stored.error) throw stored.error;
      const inserted = await db
        .from('deal_documents')
        .insert({
          account_id: accountId,
          user_id: user.id,
          deal_id: selectedDealId,
          name: file.name,
          storage_path: storagePath,
          status: 'otrzymany',
          document_type: /csv|spreadsheet|excel/i.test(file.type)
            ? 'wyciąg'
            : 'dokument_finansowy',
          received_at: new Date().toISOString(),
          source_channel: 'finance',
        });
      if (inserted.error) throw inserted.error;
      toast.success('Plik został zaimportowany do dokumentów finansowych.');
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Nie zaimportowano pliku.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function closeMonth() {
    if (!accountId || !user || closing || monthClosed) return;
    setClosing(true);
    const now = new Date().toISOString();
    const result = await db
      .from('sales_activities')
      .insert({
        account_id: accountId,
        user_id: user.id,
        activity_type: 'zadanie',
        activity_status: 'WYKONANE',
        objective_type: 'OBSLUGA_SERWIS',
        title: `ZAMKNIĘCIE MIESIĄCA ${currentMonth}`,
        description: `Przychody ${money(revenue)} · koszty ${money(costs)} · wynik ${money(grossResult)} · VAT ${money(vat)}`,
        occurred_at: now,
        completed_at: now,
        completed: true,
      });
    setClosing(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(
      `Miesiąc ${currentMonth} został zamknięty i zapisany w historii.`
    );
    await load();
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            FINANSE
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Przychody, koszty, VAT, dokumenty i miesięczne zamknięcia — nie
            kalkulator prowizji.
          </p>
        </div>
        <Button
          onClick={() => void closeMonth()}
          disabled={closing || monthClosed}
        >
          <CheckCircle2 className="size-4" />
          {monthClosed
            ? 'Miesiąc zamknięty'
            : closing
              ? 'Zamykam…'
              : 'Zamknij miesiąc'}
        </Button>
      </header>

      <nav className="flex gap-2 overflow-x-auto" aria-label="Zakres finansów">
        {(
          [
            ['company', 'Firma'],
            ['private', 'Prywatne'],
            ['all', 'Razem'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={scope === value ? 'default' : 'outline'}
            onClick={() => setScope(value)}
          >
            {label}
          </Button>
        ))}
      </nav>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['Przychody', revenue],
            ['Koszty', costs],
            ['Wynik', grossResult],
            ['VAT w przychodach', vat],
          ] as const
        ).map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-600">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {money(value)}
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Dokumenty i wyciągi</h2>
              <p className="text-xs text-slate-600">
                Import zapisuje plik w dokumentach wybranego Deala.
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <select
                value={selectedDealId}
                onChange={(event) => setSelectedDealId(event.target.value)}
                aria-label="Deal dla dokumentu finansowego"
                className="min-h-11 max-w-64 rounded-lg border bg-white px-3 text-base md:min-h-8 md:text-sm"
              >
                <option value="">Wybierz Deal</option>
                {visibleDeals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-emerald-800 px-3 text-sm font-bold text-white">
                <Upload className="size-4" />
                {uploading ? 'Importuję…' : 'Import pliku'}
                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,image/*"
                  disabled={!selectedDealId || uploading}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void importFile(file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </div>
          {loading ? (
            <Loader2 className="mx-auto my-12 size-5 animate-spin text-slate-600" />
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {visibleDocuments.map((document) => (
                <Link
                  key={document.id}
                  href={`/deals/${document.deal_id}`}
                  className="flex min-h-14 items-center gap-3 py-2 hover:text-emerald-800"
                >
                  {/csv|xlsx|xls|wyciąg/i.test(document.name) ? (
                    <Landmark className="size-5" />
                  ) : (
                    <FileText className="size-5" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {document.name}
                    </span>
                    <span className="block truncate text-xs text-slate-600">
                      {document.deal?.[0]?.title || 'Deal'} ·{' '}
                      {new Date(document.created_at).toLocaleDateString(
                        'pl-PL'
                      )}
                    </span>
                  </span>
                  <ArrowUpRight className="size-4" />
                </Link>
              ))}
              {!visibleDocuments.length ? (
                <p className="py-10 text-center text-sm text-slate-600">
                  Brak zaimportowanych dokumentów w tym zakresie.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">
              Status miesiąca {currentMonth}
            </h2>
            <p
              className={`mt-2 rounded-lg px-3 py-2 text-sm font-bold ${monthClosed ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}
            >
              {monthClosed
                ? 'Zamknięty'
                : 'Otwarty — wymaga weryfikacji dokumentów i terminów'}
            </p>
            <dl className="mt-3 space-y-2">
              {(
                [
                  ['ZUS', '20. dzień miesiąca'],
                  ['VAT', '25. dzień miesiąca'],
                  ['PIT', '20. dzień miesiąca'],
                ] as const
              ).map(([name, deadline]) => (
                <div key={name} className="flex justify-between gap-3 text-sm">
                  <dt className="font-bold">{name}</dt>
                  <dd className="text-slate-600">{deadline}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">Historia zamknięć</h2>
            <div className="mt-3 space-y-2">
              {history.map((row) => (
                <article key={row.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-bold">{row.title}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {row.description}
                  </p>
                </article>
              ))}
              {!history.length ? (
                <p className="text-sm text-slate-600">
                  Brak zamkniętych miesięcy.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
