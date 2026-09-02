'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatWarsawDateTime } from '@/lib/date-time';
import { toast } from 'sonner';
import {
  calculateWorkQueuePriority,
  compareWorkQueuePriority,
} from '@/lib/work-queue/priority';
type Status = 'NOWE' | 'W_TOKU' | 'ODLOZONE' | 'ZALATWIONE';
type Row = {
  id: string;
  source_type: 'STRONA' | 'SZYBKI_WPIS' | 'FOLLOW_UP' | 'ALERT_CRM';
  source_table: string;
  source_id: string;
  status: Status;
  snoozed_until: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  created_at: string;
  title: string;
  detail: string;
  contactName?: string;
  companyName?: string;
  dealName?: string;
  manual_priority: number;
  priorityScore: number;
  priorityReason: string;
  deadline?: string | null;
  blocker?: string | null;
  stagePosition?: number | null;
  nextActionAt?: string | null;
};
const NIL = '00000000-0000-0000-0000-000000000000';
export default function WorkQueuePage() {
  const db = useMemo(() => createClient(), []),
    { accountId, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [snooze, setSnooze] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [leads, forms, bookings, activities, deals] = await Promise.all([
      db
        .from('public_lead_submissions')
        .select(
          'id,contact_id,submitted_name,submitted_phone,message,created_at'
        )
        .eq('account_id', accountId)
        .limit(100),
      db
        .from('financial_questionnaire_submissions')
        .select(
          'id,contact_id,submitted_name,submitted_phone,preliminary_analysis,created_at'
        )
        .eq('account_id', accountId)
        .limit(100),
      db
        .from('public_booking_submissions')
        .select(
          'id,contact_id,submitted_name,submitted_phone,topic,starts_at,created_at'
        )
        .eq('account_id', accountId)
        .limit(100),
      db
        .from('sales_activities')
        .select(
          'id,title,description,activity_type,activity_status,scheduled_at,next_action_date,contact_id,company_id,deal_id,created_at'
        )
        .eq('account_id', accountId)
        .in('activity_status', ['PLANOWANE', 'PRZELOZONE'])
        .limit(100),
      db
        .from('deals')
        .select(
          'id,title,contact_id,company_id,next_action_at,blocker,questionnaire_due_at,questionnaire_received_at,value,stage:pipeline_stages(name,position),document_requirements:deal_document_requirements(status,required),created_at'
        )
        .eq('account_id', accountId)
        .eq('status', 'open')
        .limit(100),
    ]);
    const desired: Record<string, unknown>[] = [],
      content = new Map<string, Partial<Row>>();
    const add = (
      type: Row['source_type'],
      table: string,
      // Supabase returns heterogeneous source rows; this adapter reads their common keys.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r: Record<string, any>,
      title: string,
      detail: string,
      date?: string
    ) => {
      desired.push({
        account_id: accountId,
        source_type: type,
        source_table: table,
        source_id: r.id,
        contact_id: r.contact_id ?? null,
        company_id: r.company_id ?? null,
        deal_id: r.deal_id ?? null,
      });
      content.set(`${table}:${r.id}`, {
        title,
        detail,
        created_at: date ?? r.created_at,
        deadline: date ?? null,
      });
    };
    for (const r of leads.data ?? [])
      add(
        'STRONA',
        'public_lead_submissions',
        r,
        r.submitted_name,
        `${r.submitted_phone}${r.message ? ` · ${r.message}` : ''}`
      );
    for (const r of forms.data ?? [])
      add(
        'STRONA',
        'financial_questionnaire_submissions',
        r,
        r.submitted_name,
        `${r.submitted_phone}${r.preliminary_analysis ? ` · ${r.preliminary_analysis}` : ''}`
      );
    for (const r of bookings.data ?? [])
      add(
        'STRONA',
        'public_booking_submissions',
        r,
        r.submitted_name,
        `${r.topic} · ${formatWarsawDateTime(r.starts_at)}`
      );
    for (const r of activities.data ?? [])
      add(
        r.activity_type === 'follow_up' ? 'FOLLOW_UP' : 'SZYBKI_WPIS',
        'sales_activities',
        r,
        r.title,
        r.description ?? '',
        r.scheduled_at ?? r.next_action_date ?? r.created_at
      );
    const now = Date.now();
    for (const deal of deals.data ?? []) {
      const stage = Array.isArray(deal.stage) ? deal.stage[0] : deal.stage;
      const missingDocuments = (deal.document_requirements ?? []).filter(
        (item: { status: string; required: boolean }) =>
          item.required && !['zaakceptowany', 'wyslany'].includes(item.status)
      ).length;
      const questionnaireOverdue =
        deal.questionnaire_due_at &&
        !deal.questionnaire_received_at &&
        +new Date(deal.questionnaire_due_at) < now;
      if (
        deal.blocker ||
        (deal.next_action_at && +new Date(deal.next_action_at) < now) ||
        questionnaireOverdue ||
        missingDocuments ||
        !deal.next_action_at ||
        (stage?.position ?? -1) >= 4
      )
        add(
          'ALERT_CRM',
          'deals',
          { ...deal, deal_id: deal.id },
          deal.title,
          [
            deal.blocker,
            questionnaireOverdue ? 'Zaległa ankieta' : '',
            missingDocuments ? `Brak dokumentów: ${missingDocuments}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'Zaległe następne działanie',
          deal.next_action_at ?? undefined
        );
    }
    if (desired.length)
      await db.from('work_queue_items').upsert(desired, {
        onConflict: 'account_id,source_table,source_id',
        ignoreDuplicates: true,
      });
    const result = await db
      .from('work_queue_items')
      .select('*')
      .eq('account_id', accountId);
    const active = (result.data ?? [])
      .filter(
        (r) =>
          r.status !== 'ZALATWIONE' &&
          !(
            r.status === 'ODLOZONE' &&
            r.snoozed_until &&
            new Date(r.snoozed_until) > new Date()
          )
      )
      .map((r) => ({
        ...r,
        ...content.get(`${r.source_table}:${r.source_id}`),
      }))
      .filter((r) => r.title) as Row[];
    const ids = (k: 'contact_id' | 'company_id' | 'deal_id') =>
      active.map((r) => r[k]).filter(Boolean) as string[];
    const [cs, co, ds] = await Promise.all([
      db
        .from('contacts')
        .select('id,name')
        .in('id', ids('contact_id').length ? ids('contact_id') : [NIL]),
      db
        .from('companies')
        .select('id,name')
        .in('id', ids('company_id').length ? ids('company_id') : [NIL]),
      db
        .from('deals')
        .select('id,title')
        .in('id', ids('deal_id').length ? ids('deal_id') : [NIL]),
    ]);
    // The three compact lookup results have the same id + label shape at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = (d: any[] | null, k: string) =>
      new Map((d ?? []).map((r) => [r.id, r[k]]));
    const cm = map(cs.data, 'name'),
      om = map(co.data, 'name'),
      dm = map(ds.data, 'title');
    const dealMeta = new Map((deals.data ?? []).map((deal) => [deal.id, deal]));
    setRows(
      active
        .map((r) => {
          const deal = dealMeta.get(r.deal_id ?? r.source_id);
          const stage = Array.isArray(deal?.stage)
            ? deal.stage[0]
            : deal?.stage;
          const priority = calculateWorkQueuePriority({
            sourceType: r.source_type,
            blocker: deal?.blocker,
            stagePosition: stage?.position,
            nextActionAt: deal?.next_action_at,
            deadline: r.deadline,
          });
          return {
            ...r,
            contactName: cm.get(r.contact_id),
            companyName: om.get(r.company_id),
            dealName: dm.get(r.deal_id),
            blocker: deal?.blocker,
            stagePosition: stage?.position,
            nextActionAt: deal?.next_action_at,
            priorityScore: priority.score,
            priorityReason: priority.reason,
          };
        })
        .sort(compareWorkQueuePriority)
    );
    setLoading(false);
  }, [accountId, db]);
  useEffect(() => {
    void load();
  }, [load]);
  const change = async (row: Row, status: Status) => {
    if (!user || !accountId) return;
    const value = snooze[row.id];
    if (status === 'ODLOZONE' && !value) {
      toast.error('Wybierz termin ponownego pokazania.');
      return;
    }
    const { error } = await db
      .from('work_queue_items')
      .update({
        status,
        snoozed_until: value ? new Date(value).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await db.from('work_queue_events').insert({
      account_id: accountId,
      queue_item_id: row.id,
      user_id: user.id,
      event_type:
        status === 'W_TOKU'
          ? 'OTWARTO'
          : status === 'ODLOZONE'
            ? 'ODLOZONO'
            : 'ZALATWIONO',
      contact_id: row.contact_id,
      company_id: row.company_id,
      deal_id: row.deal_id,
    });
    await load();
  };
  const changePriority = async (row: Row, direction: 1 | -1) => {
    if (!user || !accountId) return;
    const manualPriority = Math.max(
      -5,
      Math.min(5, row.manual_priority + direction)
    );
    const { error } = await db
      .from('work_queue_items')
      .update({
        manual_priority: manualPriority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (error) return toast.error(error.message);
    await db.from('work_queue_events').insert({
      account_id: accountId,
      queue_item_id: row.id,
      user_id: user.id,
      event_type:
        direction > 0 ? 'PRIORYTET_PODNIESIONO' : 'PRIORYTET_OBNIZONO',
      contact_id: row.contact_id,
      company_id: row.company_id,
      deal_id: row.deal_id,
    });
    await load();
  };
  const renderLinks = (r: Row) => (
    <>
      {r.contactName && (
        <Link
          target="_blank"
          className="text-primary font-semibold"
          href={`/contacts?open=${r.contact_id}`}
        >
          {r.contactName}
        </Link>
      )}
      {r.companyName && (
        <Link
          target="_blank"
          className="text-primary font-semibold"
          href={`/companies?open=${r.company_id}`}
        >
          {r.companyName}
        </Link>
      )}
      {r.dealName && (
        <Link
          target="_blank"
          className="text-primary font-semibold"
          href={`/deals/${r.deal_id}`}
        >
          {r.dealName}
        </Link>
      )}
    </>
  );
  const firstItems = rows.slice(0, 5);
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">DO OBSŁUGI</h1>
        <p className="text-muted-foreground text-sm">
          Jedna kolejka spraw wymagających działania lub decyzji.
        </p>
      </header>
      {!loading && firstItems.length > 0 && (
        <section className="rounded-xl border border-emerald-800/20 bg-emerald-50/50 p-4">
          <h2 className="font-bold text-emerald-950">Najpierw zajmij się</h2>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {firstItems.map((r, index) => (
              <article
                key={r.id}
                className="bg-background rounded-lg border p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="font-bold text-emerald-800">
                    {index + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.title}</p>
                    <p className="text-xs font-medium text-emerald-800">
                      {r.priorityReason}
                    </p>
                    <div className="mt-1 space-x-2 text-xs">
                      {renderLinks(r)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {loading ? (
        <p>Wczytywanie…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase">
              <tr>
                <th className="p-3">Sprawa</th>
                <th>Źródło</th>
                <th>Termin</th>
                <th>Powiązania</th>
                <th>Status</th>
                <th>Utworzono</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="max-w-72 p-3">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs font-medium text-emerald-800">
                      {r.priorityReason}
                      {r.manual_priority !== 0
                        ? ` · ręcznie ${r.manual_priority > 0 ? 'podniesiono' : 'obniżono'}`
                        : ''}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {r.detail}
                    </p>
                  </td>
                  <td>
                    <Badge variant="outline">{r.source_type}</Badge>
                  </td>
                  <td>
                    {r.snoozed_until
                      ? formatWarsawDateTime(r.snoozed_until)
                      : '—'}
                  </td>
                  <td className="space-x-2">{renderLinks(r)}</td>
                  <td>
                    <Badge>{r.status.replaceAll('_', ' ')}</Badge>
                  </td>
                  <td>{formatWarsawDateTime(r.created_at)}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button
                        aria-label={`Podnieś priorytet ${r.title}`}
                        size="sm"
                        variant="outline"
                        onClick={() => void changePriority(r, 1)}
                      >
                        ↑
                      </Button>
                      <Button
                        aria-label={`Obniż priorytet ${r.title}`}
                        size="sm"
                        variant="outline"
                        onClick={() => void changePriority(r, -1)}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void (r.status === 'NOWE'
                            ? change(r, 'W_TOKU')
                            : Promise.resolve())
                        }
                      >
                        Otwórz
                      </Button>
                      <Input
                        aria-label="Termin odłożenia"
                        type="datetime-local"
                        className="w-40"
                        value={snooze[r.id] ?? ''}
                        onInput={(e) =>
                          setSnooze((v) => ({
                            ...v,
                            [r.id]: e.currentTarget.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void change(r, 'ODLOZONE')}
                      >
                        Odłóż
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void change(r, 'ZALATWIONE')}
                      >
                        Załatwione
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="text-muted-foreground p-8 text-center">
              Brak aktywnych spraw.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

