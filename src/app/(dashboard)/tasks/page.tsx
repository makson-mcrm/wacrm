'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, Clock3, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { warsawDateTimeInputToIso } from '@/lib/date-time';
import { isOperationalTestRecord } from '@/lib/mcrm/test-record';

type Filter = 'today' | 'overdue' | 'upcoming' | 'undated' | 'all';
type Task = {
  key: string;
  source: 'deal' | 'contact' | 'activity';
  id: string;
  title: string;
  where: string;
  dueAt: string | null;
  contactId: string | null;
  dealId: string | null;
};

const filters: Array<[Filter, string]> = [
  ['today', 'DZIŚ'],
  ['overdue', 'ZALEGŁE'],
  ['upcoming', 'NADCHODZĄCE'],
  ['undated', 'BEZ DATY'],
  ['all', 'WSZYSTKIE'],
];

function localDay(value: Date) {
  return value.toLocaleDateString('sv-SE');
}

function tomorrowAtNine() {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  return warsawDateTimeInputToIso(`${localDay(day)}T09:00`);
}

export default function TasksPage() {
  const db = useMemo(() => createClient(), []);
  const { accountId, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState('');
  const [customDay, setCustomDay] = useState('');

  const load = useCallback(async () => {
    if (!accountId) return;
    const [dealRows, contactRows, activityRows] = await Promise.all([
      db
        .from('deals')
        .select('id,title,next_action,next_action_at,follow_up_at,contact_id')
        .eq('account_id', accountId)
        .eq('status', 'open'),
      db
        .from('contacts')
        .select('id,name,phone,next_step,follow_up_at')
        .eq('account_id', accountId),
      db
        .from('sales_activities')
        .select(
          'id,title,next_action,next_action_date,scheduled_at,next_contact_at,contact_id,deal_id'
        )
        .eq('account_id', accountId)
        .eq('completed', false),
    ]);
    const rows: Task[] = [];
    const dealIds = new Set<string>();
    const contactsCoveredByDeal = new Set<string>();
    const testDealIds = new Set(
      (dealRows.data ?? [])
        .filter((deal) => isOperationalTestRecord(deal.title))
        .map((deal) => deal.id)
    );
    const testContactIds = new Set(
      (contactRows.data ?? [])
        .filter((contact) => isOperationalTestRecord(contact.name))
        .map((contact) => contact.id)
    );
    for (const deal of dealRows.data ?? []) {
      if (
        testDealIds.has(deal.id) ||
        (deal.contact_id && testContactIds.has(deal.contact_id))
      )
        continue;
      if (!deal.next_action && !deal.next_action_at && !deal.follow_up_at)
        continue;
      dealIds.add(deal.id);
      if (deal.contact_id) contactsCoveredByDeal.add(deal.contact_id);
      rows.push({
        key: `deal-${deal.id}`,
        source: 'deal',
        id: deal.id,
        title: deal.next_action || 'Ustal następny krok',
        where: deal.title,
        dueAt: deal.next_action_at || deal.follow_up_at || null,
        contactId: deal.contact_id,
        dealId: deal.id,
      });
    }
    for (const contact of contactRows.data ?? []) {
      if (testContactIds.has(contact.id)) continue;
      if (
        (!contact.next_step && !contact.follow_up_at) ||
        contactsCoveredByDeal.has(contact.id)
      )
        continue;
      rows.push({
        key: `contact-${contact.id}`,
        source: 'contact',
        id: contact.id,
        title: contact.next_step || 'Skontaktuj się',
        where: contact.name || contact.phone || 'Kontakt',
        dueAt: contact.follow_up_at || null,
        contactId: contact.id,
        dealId: null,
      });
    }
    for (const activity of activityRows.data ?? []) {
      if (
        (activity.deal_id && testDealIds.has(activity.deal_id)) ||
        (activity.contact_id && testContactIds.has(activity.contact_id))
      )
        continue;
      if (
        (activity.deal_id && dealIds.has(activity.deal_id)) ||
        (activity.contact_id && contactsCoveredByDeal.has(activity.contact_id))
      )
        continue;
      rows.push({
        key: `activity-${activity.id}`,
        source: 'activity',
        id: activity.id,
        title: activity.next_action || activity.title,
        where: activity.deal_id ? 'Deal' : 'Aktywność',
        dueAt:
          activity.next_action_date ||
          activity.scheduled_at ||
          activity.next_contact_at ||
          null,
        contactId: activity.contact_id,
        dealId: activity.deal_id,
      });
    }
    setTasks(
      rows.sort((a, b) => {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return +new Date(a.dueAt) - +new Date(b.dueAt);
      })
    );
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  const visible = tasks.filter((task) => {
    const today = localDay(new Date());
    const taskDay = task.dueAt ? localDay(new Date(task.dueAt)) : null;
    if (filter === 'all') return true;
    if (filter === 'undated') return !taskDay;
    if (filter === 'today') return taskDay === today;
    if (filter === 'overdue') return Boolean(taskDay && taskDay < today);
    return Boolean(taskDay && taskDay > today);
  });

  const today = localDay(new Date());
  const taskGroups =
    filter === 'all'
      ? [
          {
            key: 'today',
            label: 'DZISIAJ',
            tone: 'border-red-200 bg-red-50 text-red-700',
            tasks: tasks.filter(
              (task) => task.dueAt && localDay(new Date(task.dueAt)) === today
            ),
          },
          {
            key: 'overdue',
            label: 'ZALEGŁE',
            tone: 'border-rose-200 bg-rose-50 text-rose-700',
            tasks: tasks.filter(
              (task) => task.dueAt && localDay(new Date(task.dueAt)) < today
            ),
          },
          {
            key: 'upcoming',
            label: 'NADCHODZĄCE',
            tone: 'border-blue-200 bg-blue-50 text-blue-700',
            tasks: tasks.filter(
              (task) => task.dueAt && localDay(new Date(task.dueAt)) > today
            ),
          },
          {
            key: 'undated',
            label: 'BEZ DATY',
            tone: 'border-slate-200 bg-slate-100 text-slate-700',
            tasks: tasks.filter((task) => !task.dueAt),
          },
        ].filter((group) => group.tasks.length)
      : [
          {
            key: filter,
            label:
              filters.find(([value]) => value === filter)?.[1] || 'ZADANIA',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
            tasks: visible,
          },
        ];

  async function setDate(task: Task, iso: string) {
    setBusy(task.key);
    const result =
      task.source === 'deal'
        ? await db
            .from('deals')
            .update({ next_action_at: iso })
            .eq('account_id', accountId)
            .eq('id', task.id)
        : task.source === 'contact'
          ? await db
              .from('contacts')
              .update({ follow_up_at: iso })
              .eq('account_id', accountId)
              .eq('id', task.id)
          : await db
              .from('sales_activities')
              .update({
                scheduled_at: iso,
                next_action_date: iso,
                next_contact_at: iso,
              })
              .eq('account_id', accountId)
              .eq('id', task.id);
    setBusy('');
    if (result.error) return toast.error(result.error.message);
    setEditing('');
    toast.success('Termin zaktualizowany.');
    await load();
  }

  async function complete(task: Task) {
    if (!accountId || !user) return;
    setBusy(task.key);
    let error: { message: string } | null = null;
    if (task.source === 'activity') {
      const result = await db
        .from('sales_activities')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          activity_status: 'WYKONANE',
        })
        .eq('account_id', accountId)
        .eq('id', task.id);
      error = result.error;
    } else {
      const history = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: user.id,
        activity_type: 'zadanie',
        activity_status: 'WYKONANE',
        objective_type: 'FOLLOW_UP',
        contact_id: task.contactId,
        deal_id: task.dealId,
        title: `ZROBIONE — ${task.title}`,
        description: task.title,
        occurred_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completed: true,
        next_action: task.title,
        next_action_date: task.dueAt,
      });
      error = history.error;
      if (!error) {
        const result =
          task.source === 'deal'
            ? await db
                .from('deals')
                .update({
                  next_action: null,
                  next_action_at: null,
                  follow_up_at: null,
                })
                .eq('account_id', accountId)
                .eq('id', task.id)
            : await db
                .from('contacts')
                .update({ next_step: null, follow_up_at: null })
                .eq('account_id', accountId)
                .eq('id', task.id);
        error = result.error;
      }
    }
    setBusy('');
    if (error) return toast.error(error.message);
    toast.success('Zadanie zapisane jako zrobione.');
    await load();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            ZADANIA
          </h1>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href="/tasks?new=task" />}>+ DODAJ</Button>
          <Button
            variant="outline"
            render={<Link href="/calendar?view=week" />}
          >
            <CalendarDays className="size-4" /> KALENDARZ
          </Button>
        </div>
      </header>
      <nav
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Filtry zadań"
      >
        {filters.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
            className="shrink-0"
          >
            {label}
          </Button>
        ))}
      </nav>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {taskGroups.map((group) => (
          <div key={group.key}>
            <div
              className={`flex items-center gap-2 border-y px-4 py-2 text-xs font-black ${group.tone}`}
            >
              <span>{group.label}</span>
              <span>({group.tasks.length})</span>
            </div>
            <div className="divide-y divide-slate-100">
              {group.tasks.map((task) => (
                <article
                  key={task.key}
                  className="group px-4 py-2.5 hover:bg-slate-50"
                >
                  <div className="flex min-h-10 items-center gap-3">
                    <button
                      type="button"
                      disabled={busy === task.key}
                      onClick={() => void complete(task)}
                      aria-label={`Oznacz jako zrobione: ${task.title}`}
                      className="flex size-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-emerald-700 hover:border-emerald-600"
                    >
                      <Check className="size-3 opacity-0 group-hover:opacity-100" />
                    </button>
                    <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {task.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {task.where}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs font-bold text-slate-500">
                      {task.dueAt
                        ? new Date(task.dueAt).toLocaleString('pl-PL', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Bez daty'}
                    </time>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden text-xs group-hover:inline-flex"
                      onClick={() => void setDate(task, tomorrowAtNine())}
                    >
                      JUTRO
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Zmień termin"
                      onClick={() => {
                        setEditing(editing === task.key ? '' : task.key);
                        setCustomDay(
                          task.dueAt ? localDay(new Date(task.dueAt)) : ''
                        );
                      }}
                    >
                      <Clock3 className="size-4" />
                    </Button>
                    <Link
                      href={
                        task.dealId
                          ? `/deals/${task.dealId}`
                          : task.contactId
                            ? `/contacts?open=${task.contactId}`
                            : '/quick-call'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Otwórz sprawę"
                      className="rounded-full p-2 text-emerald-900 hover:bg-emerald-50"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </div>
                  {editing === task.key && (
                    <div className="mt-2 ml-10 flex max-w-sm gap-2">
                      <input
                        type="date"
                        value={customDay}
                        onInput={(event) =>
                          setCustomDay(
                            (event.currentTarget as HTMLInputElement).value
                          )
                        }
                        className="h-9 min-w-0 flex-1 rounded-lg border px-3"
                      />
                      <Button
                        size="sm"
                        disabled={!customDay || busy === task.key}
                        onClick={() =>
                          void setDate(
                            task,
                            warsawDateTimeInputToIso(`${customDay}T09:00`)
                          )
                        }
                      >
                        Zapisz
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
        {!visible.length && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
            Brak zadań w tej grupie.
          </div>
        )}
      </section>
    </div>
  );
}
