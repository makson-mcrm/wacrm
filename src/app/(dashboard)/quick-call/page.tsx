'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ActivityBoard08 } from '@/components/sales/activity-board-08';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatWarsawDateTime } from '@/lib/date-time';
import { geometryCssVars, listTableClassName, listToolbarClassName } from '@/lib/ui/layout-geometry';
import { surfaceFlags } from '@/lib/ui/surface-flags';

type Activity = {
  id: string;
  title: string;
  user_id: string;
  scheduled_at: string | null;
  next_action_date: string | null;
  occurred_at: string;
  contact: { id: string; name: string | null } | null;
  company: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
};

function ActivitiesList() {
  const db = useMemo(() => createClient(), []);
  const { accountId, user, profile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    setLoading(true);
    setError(false);
    setActivities([]);
    setSelected(new Set());
    void (async () => {
      try {
        const { data, error: loadError } = await db.from('sales_activities')
          .select('id,title,user_id,scheduled_at,next_action_date,occurred_at,contact:contacts(id,name),company:companies(id,name),deal:deals(id,title)')
          .eq('account_id', accountId).order('occurred_at', { ascending: false });
        if (!active) return;
        if (loadError) setError(true);
        else setActivities((data ?? []) as unknown as Activity[]);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [accountId, db, reload]);

  const rows = accountId ? activities : [];
  return (
    <section data-bigin-activities style={geometryCssVars('lists')} className="min-h-full bg-[var(--list-content-background)] text-[var(--list-text)]">
      <header data-slot="list-toolbar" className={listToolbarClassName}>
        <h1 className="text-sm font-semibold">Aktywności</h1>
      </header>
      <Table className={listTableClassName} aria-label="Lista aktywności" aria-busy={loading}>
        <TableHeader><TableRow>
          <TableHead className="w-12"><Checkbox aria-label="Zaznacz wszystkie aktywności" checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={(checked) => setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set())} /></TableHead>
          <TableHead>Temat</TableHead><TableHead>Termin</TableHead><TableHead>Powiązanie</TableHead><TableHead>Właściciel</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading || error || !rows.length ? <TableRow><TableCell colSpan={5} className="h-32 text-center">
            {loading ? <span role="status">Wczytywanie aktywności…</span> : error ? <div role="alert">Nie udało się wczytać aktywności. <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Spróbuj ponownie</Button></div> : 'Brak aktywności.'}
          </TableCell></TableRow> : rows.map((activity) => {
            const dueAt = activity.scheduled_at || activity.next_action_date;
            const links = [
              activity.contact && { href: `/contacts?open=${activity.contact.id}`, label: activity.contact.name || 'Kontakt' },
              activity.company && { href: `/companies?open=${activity.company.id}`, label: activity.company.name },
              activity.deal && { href: `/deals/${activity.deal.id}`, label: activity.deal.title },
            ].filter((link) => Boolean(link));
            return <TableRow key={activity.id}>
              <TableCell><Checkbox aria-label={`Zaznacz aktywność ${activity.title}`} checked={selected.has(activity.id)} onCheckedChange={() => setSelected((previous) => { const next = new Set(previous); if (next.has(activity.id)) next.delete(activity.id); else next.add(activity.id); return next; })} /></TableCell>
              <TableCell>{activity.title}</TableCell>
              <TableCell>{dueAt ? <time dateTime={dueAt}>{formatWarsawDateTime(dueAt)}</time> : '—'}</TableCell>
              <TableCell>{links.length ? links.map((link) => link && <Link key={link.href} href={link.href} className="mr-2 hover:underline">{link.label}</Link>) : '—'}</TableCell>
              <TableCell>{activity.user_id === user?.id ? profile?.full_name || profile?.email || '—' : '—'}</TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>
    </section>
  );
}

export default function QuickCallPage() {
  return (
    <Suspense fallback={null}>
      {surfaceFlags.activitiesExtensions ? <ActivityBoard08 /> : <ActivitiesList />}
    </Suspense>
  );
}
