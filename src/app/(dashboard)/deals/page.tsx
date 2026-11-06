'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatWarsawDateTime } from '@/lib/date-time';
import { isOperationalTestRecord } from '@/lib/mcrm/test-record';
import { createClient } from '@/lib/supabase/client';
import { surfaceFlags } from '@/lib/ui/surface-flags';
import {
  geometryCssVars,
  listTableClassName,
  listToolbarClassName,
} from '@/lib/ui/layout-geometry';

type DealListRow = {
  id: string;
  title: string;
  value: number;
  currency: string | null;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string | null;
  contact: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
  stage: { name: string } | null;
};

const moneyFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDate(value: string | null) {
  return value ? formatWarsawDateTime(value) : '—';
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element && Boolean(target.closest('a, button, input'))
  );
}

export default function DealsPage() {
  if (!surfaceFlags.dealsListExtensions) redirect('/pipelines');
  return <DealsList />;
}

function DealsList() {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [deals, setDeals] = useState<DealListRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const extensions = surfaceFlags.dealsListExtensions;

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    const result = await db
      .from('deals')
      .select(
        '*, contact:contacts!deals_contact_id_fkey(id,name,phone), stage:pipeline_stages(name)'
      )
      .order('created_at', { ascending: false });

    if (result.error) {
      console.error('Failed to load deals:', result.error.message);
      setLoadError('Nie udało się wczytać spraw.');
      setDeals([]);
    } else {
      const rows = (result.data ?? []) as unknown as DealListRow[];
      setDeals(
        rows.filter(
          (deal) =>
            !isOperationalTestRecord(deal.title) &&
            !isOperationalTestRecord(deal.contact?.name)
        )
      );
    }

    setLoading(false);
  }, [db]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const filteredDeals = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pl-PL');
    if (!query) return deals;

    return deals.filter((deal) =>
      [deal.title, deal.contact?.name]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase('pl-PL').includes(query))
    );
  }, [deals, search]);

  return (
    <div className={extensions ? 'space-y-6 p-4 md:p-6' : 'bg-white'} style={extensions ? undefined : geometryCssVars('lists')}>
      {surfaceFlags.dealsListExtensions && (
        <header>
          <h1 className="text-2xl font-black text-slate-950">Sprawy</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pojedyncze sprawy klientów.
          </p>
        </header>
      )}

      <div data-slot="list-toolbar" className={extensions ? undefined : listToolbarClassName}>
      <label className="relative block w-full max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Szukaj po sprawie lub kliencie…"
          aria-label="Szukaj po tytule sprawy lub nazwie klienta"
          className="border-slate-200 bg-white pl-9"
        />
      </label>
      </div>

      <div className={extensions ? 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm' : 'overflow-hidden'}>
        <Table className={extensions ? undefined : listTableClassName}>
          <TableHeader>
            <TableRow className={extensions ? 'border-slate-200 bg-slate-50 hover:bg-slate-50' : ''}>
              <TableHead>Sprawa</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Etap</TableHead>
              <TableHead>Wartość</TableHead>
              <TableHead>Następny krok</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Ostatnia aktywność</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-48 text-center text-slate-500"
                >
                  <Loader2 className={extensions ? 'mx-auto mb-2 size-5 animate-spin' : 'mr-2 inline-block size-4 animate-spin align-middle'} />
                  Ładowanie spraw…
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-red-700"
                >
                  {loadError}
                </TableCell>
              </TableRow>
            ) : filteredDeals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-500"
                >
                  Brak spraw.
                </TableCell>
              </TableRow>
            ) : (
              filteredDeals.map((deal) => (
                <TableRow
                  key={deal.id}
                  tabIndex={0}
                  aria-label={`Otwórz sprawę ${deal.title}`}
                  className={extensions ? 'h-16 cursor-pointer border-slate-200 hover:bg-emerald-50/40' : 'cursor-pointer'}
                  onClick={(event) => {
                    if (!isInteractiveTarget(event.target)) {
                      router.push(`/deals/${deal.id}`);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      router.push(`/deals/${deal.id}`);
                    }
                  }}
                >
                  <TableCell className="max-w-72 whitespace-normal">
                    <Link
                      href={`/deals/${deal.id}`}
                      className={extensions ? 'font-bold text-emerald-900 hover:underline' : 'font-semibold text-[var(--list-text)] hover:underline'}
                    >
                      {deal.title}
                    </Link>
                  </TableCell>
                  <TableCell>{deal.contact?.name || '—'}</TableCell>
                  <TableCell>{deal.stage?.name || '—'}</TableCell>
                  <TableCell>
                    {moneyFormatter.format(Number(deal.value) || 0)}{' '}
                    {deal.currency || 'PLN'}
                  </TableCell>
                  <TableCell className="max-w-72 whitespace-normal">
                    {deal.next_action || '—'}
                  </TableCell>
                  <TableCell>{formatDate(deal.next_action_at)}</TableCell>
                  <TableCell>
                    {formatDate(deal.updated_at || deal.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
