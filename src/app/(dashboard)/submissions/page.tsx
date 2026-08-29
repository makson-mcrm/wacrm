'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Submission = {
  id: string;
  kind: 'kontakt' | 'ankieta' | 'rezerwacja';
  contact_id: string;
  name: string;
  phone: string;
  company?: string | null;
  created_at: string;
  status?: string;
  summary?: string | null;
  missing?: string[];
  contact_created?: boolean;
  handled_at?: string | null;
};

export default function SubmissionsPage() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [leads, questionnaires, bookings] = await Promise.all([
      db
        .from('public_lead_submissions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('financial_questionnaire_submissions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('public_booking_submissions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    const combined: Submission[] = [
      ...(leads.data ?? []).map((row) => ({
        id: row.id,
        kind: 'kontakt' as const,
        contact_id: row.contact_id,
        name: row.submitted_name,
        phone: row.submitted_phone,
        company: row.submitted_company,
        created_at: row.created_at,
        summary: row.message,
        contact_created: row.contact_created,
        handled_at: row.handled_at,
      })),
      ...(questionnaires.data ?? []).map((row) => ({
        id: row.id,
        kind: 'ankieta' as const,
        contact_id: row.contact_id,
        name: row.submitted_name,
        phone: row.submitted_phone,
        company: row.submitted_company,
        created_at: row.created_at,
        status: row.status,
        summary: row.preliminary_analysis,
        missing: row.missing_items ?? [],
        contact_created: row.contact_created,
        handled_at: row.handled_at,
      })),
      ...(bookings.data ?? []).map((row) => ({
        id: row.id,
        kind: 'rezerwacja' as const,
        contact_id: row.contact_id,
        name: row.submitted_name,
        phone: row.submitted_phone,
        company: row.submitted_company,
        created_at: row.created_at,
        status: row.status,
        summary: `${row.topic}\nTermin: ${new Date(row.starts_at).toLocaleString('pl-PL')}${row.note ? `\n${row.note}` : ''}`,
        contact_created: row.contact_created,
        handled_at: row.handled_at,
      })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(combined);
    setLoading(false);
  }, [accountId, db]);

  async function setHandled(row: Submission, handled: boolean) {
    const table =
      row.kind === 'kontakt'
        ? 'public_lead_submissions'
        : row.kind === 'ankieta'
          ? 'financial_questionnaire_submissions'
          : 'public_booking_submissions';
    const { error } = await db
      .from(table)
      .update({ handled_at: handled ? new Date().toISOString() : null })
      .eq('id', row.id);
    if (!error) {
      await load();
      window.dispatchEvent(new Event('wacrm:submissions-changed'));
    }
  }

  const unhandledCount = rows.filter((row) => !row.handled_at).length;

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Zgłoszenia ze strony</h1>
          {unhandledCount > 0 && (
            <Badge className="bg-[#B7D84B] text-[#173A52]">
              {unhandledCount} nowych
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Krótki formularz tworzy lub odnajduje Kontakt i zapisuje pełne
          zgłoszenie tutaj. Nie tworzy automatycznie Deala. Ankietę można
          świadomie dołączyć podczas tworzenia Deala.
        </p>
      </header>
      {loading ? (
        <p>Wczytywanie…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={`${row.kind}-${row.id}`}
              className={`bg-card rounded-xl border p-4 ${!row.handled_at ? 'border-[#B7D84B] shadow-sm' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-primary text-xs font-semibold uppercase">
                    {row.kind === 'kontakt'
                      ? 'Formularz kontaktowy'
                      : row.kind === 'ankieta'
                        ? 'Ankieta finansowa'
                        : 'Rezerwacja terminu'}
                  </p>
                  <h2 className="font-semibold">{row.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {row.phone}
                    {row.company ? ` · ${row.company}` : ''} ·{' '}
                    {new Date(row.created_at).toLocaleString('pl-PL')}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      row.contact_created
                        ? 'mt-2 border-[#245247]/30 bg-[#EAF1E5] text-[#245247]'
                        : 'mt-2 border-[#173A52]/20 text-[#173A52]'
                    }
                  >
                    {row.contact_created
                      ? 'Kontakt utworzony'
                      : 'Kontakt już istniał'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/contacts?open=${row.contact_id}`}>
                    <Button size="sm" variant="outline">
                      Otwórz Kontakt
                    </Button>
                  </Link>
                  <Link
                    href={`/pipelines?new=deal&contact=${row.contact_id}${row.kind === 'ankieta' ? `&questionnaire=${row.id}` : ''}`}
                  >
                    <Button size="sm">Utwórz Deal</Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setHandled(row, !row.handled_at)}
                  >
                    {row.handled_at ? 'Oznacz jako nowe' : 'Oznacz obsłużone'}
                  </Button>
                </div>
              </div>
              {row.status && (
                <p className="mt-3 text-sm">
                  Stan ankiety:{' '}
                  <strong>
                    {row.status === 'submitted' ? 'kompletna' : 'częściowa'}
                  </strong>
                </p>
              )}
              {!!row.missing?.length && (
                <p className="mt-1 text-sm text-amber-600">
                  Braki: {row.missing.join(', ')}
                </p>
              )}
              {row.summary && (
                <details className="mt-3 rounded-lg border p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Treść i wstępne podsumowanie
                  </summary>
                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {row.summary}
                  </p>
                </details>
              )}
            </article>
          ))}
          {!rows.length && (
            <p className="text-muted-foreground">Nie ma jeszcze zgłoszeń.</p>
          )}
        </div>
      )}
    </div>
  );
}
