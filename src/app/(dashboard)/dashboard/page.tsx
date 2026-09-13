'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Phone,
  PhoneMissed,
  Save,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Company, Contact, Deal } from '@/types';
import { EntitySearchSelect } from '@/components/ui/entity-search-select';
import { MobileDateTimeInput } from '@/components/ui/mobile-date-time-input';
import { CatalogSearchSelect } from '@/components/ui/catalog-search-select';
import { phonesMatch } from '@/lib/whatsapp/phone-utils';
import {
  buildPrioritySuggestions,
  type PriorityDeal,
} from '@/lib/sales/priorities';
import { buildCallRetryQueue } from '@/lib/sales/call-queue';
import {
  suggestedRetryAt,
  toLocalDateTimeValue,
} from '@/lib/sales/quick-activity';
import {
  buildTodayPlan,
  type RankedTodayItem,
  type TodayPlan,
} from '@/lib/today/ranking';
import {
  buildTodayInputs,
  currentWorkContext,
  type ExistingCalendarRow,
} from '@/lib/today/existing-data';
import { isOperationalTestRecord } from '@/lib/mcrm/test-record';

type Priority = {
  position: number;
  title: string;
  completed: boolean;
  deal_id?: string | null;
};
type Activity = { activity_type: string; occurred_at: string };
type CallQueueActivity = Activity & {
  id: string;
  phone_number?: string | null;
  call_result?: string | null;
  attempt_number?: number | null;
  expires_at?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  title?: string | null;
  description?: string | null;
  call_type?: string | null;
  source?: string | null;
  product_group?: string | null;
  next_contact_at?: string | null;
  next_contact_reason?: string | null;
  completed?: boolean | null;
};
type PlannedActivity = {
  id: string;
  title: string;
  activity_type?: string | null;
  objective_type?: string | null;
  call_type?: string | null;
  call_result?: string | null;
  scheduled_at?: string | null;
  next_action_date?: string | null;
  next_contact_at?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  created_at?: string | null;
  completed?: boolean | null;
};
type WorkQueueRow = {
  id: string;
  source_type: 'STRONA' | 'SZYBKI_WPIS' | 'FOLLOW_UP' | 'ALERT_CRM';
  status: string;
  snoozed_until?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  manual_priority?: number | null;
  created_at?: string | null;
};

export default function DashboardPage() {
  const db = useMemo(() => createClient(), []),
    { accountId } = useAuth();
  const date = useMemo(() => new Date().toLocaleDateString('sv-SE'), []),
    [now] = useState(() => Date.now());
  const [deals, setDeals] = useState<Deal[]>([]),
    [contacts, setContacts] = useState<Contact[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [priorities, setPriorities] = useState<Priority[]>(blankPriorities()),
    [activities, setActivities] = useState<Activity[]>([]),
    [callHistory, setCallHistory] = useState<CallQueueActivity[]>([]),
    [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([]),
    [calendarEvents, setCalendarEvents] = useState<ExistingCalendarRow[]>([]),
    [workQueue, setWorkQueue] = useState<WorkQueueRow[]>([]),
    [saving, setSaving] = useState(false),
    [callOpen, setCallOpen] = useState(false),
    [queueSavingId, setQueueSavingId] = useState(''),
    [rescheduleId, setRescheduleId] = useState(''),
    [rescheduleValue, setRescheduleValue] = useState('');
  const [callContactId, setCallContactId] = useState(''),
    [callCompanyId, setCallCompanyId] = useState(''),
    [callDealId, setCallDealId] = useState(''),
    [callNumber, setCallNumber] = useState(''),
    [callDescription, setCallDescription] = useState(''),
    [callResult, setCallResult] = useState('nie_odebral'),
    [callCategory, setCallCategory] = useState('Podajnik mBank'),
    [callProduct, setCallProduct] = useState(''),
    [callChannel, setCallChannel] = useState('telefon'),
    [callType, setCallType] = useState('nowe_pozyskanie'),
    [nextContactAt, setNextContactAt] = useState(''),
    [nextContactReason, setNextContactReason] = useState('');

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    const start = new Date(`${date}T00:00:00`).toISOString(),
      end = new Date(`${date}T23:59:59`).toISOString();
    const queueStart = new Date(
      Date.now() - 31 * 24 * 60 * 60 * 1000
    ).toISOString();
    const [
      dealRows,
      contactRows,
      companyRows,
      priorityRows,
      activityRows,
      callRows,
      plannedRows,
      calendarRows,
      queueRows,
    ] = await Promise.all([
      db
        .from('deals')
        .select(
          '*,contact:contacts!deals_contact_id_fkey(*),company:companies!deals_company_id_fkey(*),stage:pipeline_stages(*),document_requirements:deal_document_requirements(status),bank_processes(progress,status)'
        )
        .eq('status', 'open')
        .order('next_action_at', { ascending: true, nullsFirst: false }),
      db.from('contacts').select('*').order('name'),
      db.from('companies').select('*').order('name'),
      db
        .from('daily_priorities')
        .select('*')
        .eq('priority_date', date)
        .eq('user_id', session.user.id)
        .order('position'),
      db
        .from('sales_activities')
        .select('activity_type,occurred_at')
        .gte('occurred_at', start)
        .lte('occurred_at', end),
      db
        .from('sales_activities')
        .select(
          'id,activity_type,occurred_at,phone_number,call_result,attempt_number,expires_at,contact_id,company_id,deal_id,title,description,call_type,source,product_group,next_contact_at,next_contact_reason,completed'
        )
        .eq('activity_type', 'telefon')
        .gte('occurred_at', queueStart)
        .order('occurred_at', { ascending: false }),
      db
        .from('sales_activities')
        .select(
          'id,title,activity_type,objective_type,call_type,call_result,scheduled_at,next_action_date,next_contact_at,contact_id,company_id,deal_id,created_at,completed'
        )
        .eq('account_id', accountId)
        .eq('completed', false)
        .or(
          `scheduled_at.lte.${end},next_action_date.lte.${end},next_contact_at.lte.${end}`
        )
        .limit(200),
      db
        .from('calendar_events')
        .select(
          'id,title,event_type,starts_at,ends_at,location,description,deal_id'
        )
        .eq('account_id', accountId)
        .is('deleted_at', null)
        .gte('starts_at', start)
        .lte('starts_at', end)
        .order('starts_at'),
      db
        .from('work_queue_items')
        .select(
          'id,source_type,status,snoozed_until,contact_id,company_id,deal_id,manual_priority,created_at'
        )
        .eq('account_id', accountId)
        .neq('status', 'ZALATWIONE')
        .or(`snoozed_until.is.null,snoozed_until.lte.${end}`)
        .limit(200),
    ]);
    setDeals(
      ((dealRows.data ?? []) as Deal[]).filter(
        (deal) =>
          !isOperationalTestRecord(deal.title) &&
          !isOperationalTestRecord(deal.contact?.name) &&
          !isOperationalTestRecord(deal.company?.name)
      )
    );
    setContacts(
      ((contactRows.data ?? []) as Contact[]).filter(
        (contact) => !isOperationalTestRecord(contact.name)
      )
    );
    setCompanies(
      ((companyRows.data ?? []) as Company[]).filter(
        (company) => !isOperationalTestRecord(company.name)
      )
    );
    setActivities((activityRows.data ?? []) as Activity[]);
    setCallHistory((callRows.data ?? []) as CallQueueActivity[]);
    setPlannedActivities((plannedRows.data ?? []) as PlannedActivity[]);
    setCalendarEvents((calendarRows.data ?? []) as ExistingCalendarRow[]);
    setWorkQueue((queueRows.data ?? []) as WorkQueueRow[]);
    const rows = (priorityRows.data ?? []) as Priority[];
    setPriorities(
      [1, 2, 3, 4, 5, 6].map(
        (position) =>
          rows.find((row) => row.position === position) ?? {
            position,
            title: '',
            completed: false,
            deal_id: null,
          }
      )
    );
  }, [accountId, db, date]);

  const matchNumber = useCallback(
    (number: string) => {
      if (!number.trim()) return;
      const contact = contacts.find((row) => phonesMatch(row.phone, number));
      const company = companies.find(
        (row) => row.phone && phonesMatch(row.phone, number)
      );
      const deal = deals.find(
        (row) =>
          row.contact_id === contact?.id || row.company_id === company?.id
      );
      if (contact) setCallContactId(contact.id);
      if (deal) {
        setCallDealId(deal.id);
        setCallCompanyId(deal.company_id ?? company?.id ?? '');
        if (deal.source) setCallCategory(deal.source);
        if (deal.product_type) setCallProduct(deal.product_type);
      } else if (company) setCallCompanyId(company.id);
    },
    [contacts, companies, deals]
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('quick-call') === '1') setCallOpen(true);
  }, []);

  async function savePriorities() {
    if (!accountId) return;
    setSaving(true);
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) {
      setSaving(false);
      return;
    }
    const rows = priorities.map((row) => ({
      ...row,
      account_id: accountId,
      user_id: session.user.id,
      priority_date: date,
    }));
    const { error } = await db.from('daily_priorities').upsert(rows, {
      onConflict: 'account_id,user_id,priority_date,position',
    });
    setSaving(false);
    if (error) toast.error(`Nie zapisano priorytetów: ${error.message}`);
    else toast.success('Sześć priorytetów zostało zapisanych.');
  }

  async function registerCall() {
    if (!accountId) return;
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    const contact = contacts.find((row) => row.id === callContactId),
      company = companies.find((row) => row.id === callCompanyId),
      deal = deals.find((row) => row.id === callDealId);
    const number = callNumber.trim() || contact?.phone || company?.phone;
    if (!number) {
      toast.error(
        'Wpisz numer telefonu lub wybierz osobę albo firmę z numerem.'
      );
      return;
    }
    const { data: previousAttempts } = await db
      .from('sales_activities')
      .select('attempt_number')
      .eq('activity_type', 'telefon')
      .eq('phone_number', number)
      .order('occurred_at', { ascending: false })
      .limit(1);
    const increasesAttempt = callResult === 'nie_odebral';
    const attemptNumber = Math.min(
      3,
      Number(previousAttempts?.[0]?.attempt_number || 0) +
        (increasesAttempt ? 1 : 0)
    );
    const resultLabel =
      (
        {
          odebral: 'odebrał',
          nie_odebral: 'nie odebrał',
          niezainteresowany: 'niezainteresowany',
          oddzwonic: 'oddzwonić później',
        } as Record<string, string>
      )[callResult] ?? callResult;
    const details = [
      `Wynik: ${resultLabel}`,
      `Kanał: ${callChannel}`,
      callCategory && `Kategoria: ${callCategory}`,
      callProduct && `Produkt: ${callProduct}`,
      callDescription.trim() && `Ustalenia: ${callDescription.trim()}`,
      nextContactReason.trim() && `Następny krok: ${nextContactReason.trim()}`,
    ]
      .filter(Boolean)
      .join('\n');
    const base = {
      account_id: accountId,
      user_id: session.user.id,
      contact_id: callContactId || null,
      company_id: callCompanyId || null,
      deal_id: callDealId || null,
      title: `Telefon ${number}: ${contact?.name || company?.name || deal?.title || 'numer bez kartoteki'}`,
      description: details,
      occurred_at: new Date().toISOString(),
      completed: true,
      activity_type: 'telefon',
      phone_number: number,
      call_result: callResult,
      call_category: callCategory || null,
      call_product: callProduct || null,
      call_channel: callChannel,
      call_type: callType,
      source: callCategory || null,
      product_group: callProduct || null,
      next_contact_at: nextContactAt || null,
      next_contact_reason: nextContactReason.trim() || null,
      attempt_number: attemptNumber,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const { data: saved, error } = await db
      .from('sales_activities')
      .insert(base)
      .select('id')
      .single();
    if (error) toast.error(`Nie zapisano telefonu: ${error.message}`);
    else {
      if (nextContactAt) {
        const reason =
          nextContactReason.trim() ||
          callDescription.trim() ||
          'Ponowny kontakt';
        const { error: followUpError } = await db
          .from('sales_activities')
          .insert({
            ...base,
            title: `Follow-up: ${contact?.name || company?.name || deal?.title || number}`,
            description: reason,
            occurred_at: new Date(nextContactAt).toISOString(),
            completed: false,
            call_result: 'follow_up',
            next_contact_at: nextContactAt,
            next_contact_reason: reason,
            parent_activity_id: saved.id,
          });
        if (followUpError) {
          toast.error(
            `Telefon zapisano, ale follow-up wymaga ponowienia: ${followUpError.message}`
          );
          return;
        }
        if (deal) {
          const { error: dealError } = await db
            .from('deals')
            .update({
              next_action: reason,
              next_action_at: nextContactAt,
              follow_up_at: nextContactAt,
            })
            .eq('id', deal.id);
          if (dealError) {
            toast.error(
              `Follow-up zapisano, ale nie zaktualizowano Deala: ${dealError.message}`
            );
            return;
          }
        }
      }
      toast.success('Telefon został zapisany i doliczony do celu dnia.');
      setCallOpen(false);
      setCallDescription('');
      setCallNumber('');
      setNextContactAt('');
      setNextContactReason('');
      await load();
    }
  }

  async function scheduleQueueCallback(row: CallQueueActivity, value: string) {
    if (!accountId || !value || queueSavingId) return;
    setQueueSavingId(row.id);
    const iso = new Date(value).toISOString();
    try {
      const {
        data: { session },
      } = await db.auth.getSession();
      if (!session?.user) return;
      const person =
        contacts.find((item) => item.id === row.contact_id)?.name ||
        companies.find((item) => item.id === row.company_id)?.name ||
        row.phone_number ||
        'numer bez kartoteki';
      const { error } = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: session.user.id,
        contact_id: row.contact_id || null,
        company_id: row.company_id || null,
        deal_id: row.deal_id || null,
        activity_type: 'telefon',
        title: `Oddzwonić: ${person}`,
        description: row.next_contact_reason || 'Oddzwonić',
        occurred_at: new Date().toISOString(),
        completed: false,
        phone_number: row.phone_number || null,
        call_result: 'oddzwonic',
        call_type: row.call_type || null,
        source: row.source || null,
        product_group: row.product_group || null,
        next_contact_at: iso,
        next_contact_reason: row.next_contact_reason || 'Oddzwonić',
        scheduled_at: iso,
        attempt_number: row.attempt_number || 0,
        expires_at:
          row.expires_at || new Date(Date.now() + 30 * 86400000).toISOString(),
        parent_activity_id: row.id,
      });
      if (error) throw error;
      setRescheduleId('');
      setRescheduleValue('');
      toast.success('Nowy termin oddzwonienia został zapisany.');
      await load();
    } catch (error) {
      toast.error(
        `Nie zapisano terminu: ${error instanceof Error ? error.message : 'nieznany błąd'}`
      );
    } finally {
      setQueueSavingId('');
    }
  }

  async function recordQueueResult(
    row: CallQueueActivity,
    result: 'odebral' | 'nie_odebral'
  ) {
    if (!accountId || queueSavingId) return;
    setQueueSavingId(row.id);
    try {
      const {
        data: { session },
      } = await db.auth.getSession();
      if (!session?.user) return;
      const attemptNumber =
        Number(row.attempt_number || 0) + (result === 'nie_odebral' ? 1 : 0);
      const retryAt =
        result === 'nie_odebral'
          ? suggestedRetryAt(attemptNumber, new Date())
          : null;
      const person =
        contacts.find((item) => item.id === row.contact_id)?.name ||
        companies.find((item) => item.id === row.company_id)?.name ||
        row.phone_number ||
        'numer bez kartoteki';
      const resultLabel =
        result === 'nie_odebral' ? 'Nie odebrał' : 'Zrealizowano';
      const { error } = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: session.user.id,
        contact_id: row.contact_id || null,
        company_id: row.company_id || null,
        deal_id: row.deal_id || null,
        activity_type: 'telefon',
        title: `Telefon: ${person} — ${resultLabel}`,
        description: `Wynik: ${resultLabel}`,
        occurred_at: new Date().toISOString(),
        completed: true,
        phone_number: row.phone_number || null,
        call_result: result,
        call_type: row.call_type || null,
        source: row.source || null,
        product_group: row.product_group || null,
        next_contact_at: retryAt?.toISOString() || null,
        next_contact_reason:
          result === 'nie_odebral'
            ? row.next_contact_reason || 'Ponowić kontakt'
            : null,
        scheduled_at: retryAt?.toISOString() || null,
        attempt_number: Math.min(attemptNumber, 3),
        expires_at:
          result === 'nie_odebral' && attemptNumber < 3
            ? row.expires_at ||
              new Date(Date.now() + 30 * 86400000).toISOString()
            : null,
        parent_activity_id: row.id,
      });
      if (error) throw error;
      toast.success(
        result === 'nie_odebral'
          ? 'Zapisano nieodebraną próbę i termin kolejnego kontaktu.'
          : 'Telefon oznaczono jako zrealizowany.'
      );
      await load();
    } catch (error) {
      toast.error(
        `Nie zapisano wyniku: ${error instanceof Error ? error.message : 'nieznany błąd'}`
      );
    } finally {
      setQueueSavingId('');
    }
  }

  const overdue = deals.filter(
      (deal) => deal.next_action_at && +new Date(deal.next_action_at) < now
    ),
    todayActions = deals.filter(
      (deal) => deal.next_action_at?.slice(0, 10) === date
    ),
    meetings = deals.filter((deal) => deal.meeting_at?.slice(0, 10) === date),
    withoutAction = deals.filter(
      (deal) => !deal.next_action_at || !deal.next_action
    );
  const calls = activities.filter(
    (row) => row.activity_type === 'telefon'
  ).length;
  const callQueue = buildCallRetryQueue(callHistory, now);
  const todayInputs = buildTodayInputs({
    deals: deals as unknown as Parameters<typeof buildTodayInputs>[0]['deals'],
    activities: plannedActivities,
    queue: workQueue,
    priorities,
    calendar: calendarEvents,
    now: new Date(now),
  });
  const todayPlan = buildTodayPlan({
    candidates: todayInputs.candidates,
    calendarBlocks: todayInputs.calendarBlocks,
    now: new Date(now),
    currentContext: currentWorkContext(
      todayInputs.calendarBlocks,
      new Date(now)
    ),
  });
  const newContactsToday = contacts.filter(
    (contact) => contact.created_at?.slice(0, 10) === date
  ).length;
  function proposePriorities() {
    const proposed = buildPrioritySuggestions(
      deals as unknown as PriorityDeal[],
      new Date(now),
      calls
    );
    setPriorities(
      [1, 2, 3, 4, 5, 6].map((position, index) => ({
        position,
        title: proposed[index]?.title ?? '',
        completed: false,
        deal_id: proposed[index]?.deal_id ?? null,
      }))
    );
    toast.success('Agent zaproponował priorytety. Sprawdź kolejność i zapisz.');
  }
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5 lg:space-y-6">
      <MobileTodayBoard
        todayPlan={todayPlan}
        overdueCount={overdue.length}
        newCount={newContactsToday}
      />
      <DesktopTodayBoard todayPlan={todayPlan} deals={deals} />
      <div className="hidden">
        <Metric
          label="Telefony"
          value={calls}
          note={`${calls}/10 celu dziennego`}
        />
        <Metric
          label="Do celu 10"
          value={Math.max(0, 10 - calls)}
          note="telefonów pozostało"
        />
        <Metric label="Spotkania dziś" value={meetings.length} />
        <Metric label="Działania dziś" value={todayActions.length} />
        <Metric label="Zaległe" value={overdue.length} />
        <Metric label="Bez następnego kroku" value={withoutAction.length} />
      </div>
      <section className="hidden">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Telefony do ponowienia</h2>
            <p className="text-muted-foreground text-xs">
              Numery po nieodebranych rozmowach pozostają przez 30 dni,
              maksymalnie do trzeciej próby.
            </p>
          </div>
          <span className="bg-muted rounded-full px-2 py-1 text-xs font-semibold">
            {callQueue.length}
          </span>
        </div>
        {!callQueue.length ? (
          <p className="text-muted-foreground text-sm">
            Brak telefonów oczekujących na kolejną próbę.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {callQueue.map((row) => {
              const contact = contacts.find(
                (item) => item.id === row.contact_id
              );
              const company = companies.find(
                (item) => item.id === row.company_id
              );
              const deal = deals.find((item) => item.id === row.deal_id);
              const reason =
                row.next_contact_reason || row.description || 'Ponowić kontakt';
              const isEditingDate = rescheduleId === row.id;
              const isSaving = queueSavingId === row.id;
              return (
                <div key={row.id} className="px-2.5 py-2 sm:px-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="min-w-[11rem] flex-1">
                      {contact ? (
                        <Link
                          href={`/contacts?open=${contact.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary block min-h-6 truncate text-sm font-bold hover:underline"
                        >
                          {contact.name}
                        </Link>
                      ) : company ? (
                        <Link
                          href={`/companies?open=${company.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary block min-h-6 truncate text-sm font-bold hover:underline"
                        >
                          {company.name}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-bold">
                          Numer bez kartoteki
                        </p>
                      )}
                      <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 text-xs">
                        <a
                          href={`tel:${row.phone_number}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {row.phone_number}
                        </a>
                        <span className="max-w-[28rem] truncate" title={reason}>
                          {reason}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground min-w-[8rem] text-xs sm:text-right">
                      <p className="font-medium">
                        {row.next_contact_at
                          ? new Date(row.next_contact_at).toLocaleString(
                              'pl-PL'
                            )
                          : `Próba ${row.attempt_number || 1} z 3`}
                      </p>
                      <div className="flex flex-wrap gap-x-2 sm:justify-end">
                        {company && contact && (
                          <Link
                            href={`/companies?open=${company.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary max-w-36 truncate hover:underline"
                          >
                            {company.name}
                          </Link>
                        )}
                        {deal && (
                          <Link
                            href={`/deals/${deal.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary max-w-44 truncate hover:underline"
                          >
                            {deal.title}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={`tel:${row.phone_number}`}
                        className="bg-primary text-primary-foreground inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold"
                      >
                        <Phone className="size-3.5" />
                        Zadzwoń
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        disabled={isSaving}
                        onClick={() => void recordQueueResult(row, 'odebral')}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Zrealizowano
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        disabled={isSaving}
                        onClick={() =>
                          void recordQueueResult(row, 'nie_odebral')
                        }
                      >
                        <PhoneMissed className="size-3.5" />
                        Nie odebrał
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => {
                          setRescheduleId(isEditingDate ? '' : row.id);
                          setRescheduleValue(
                            row.next_contact_at
                              ? toLocalDateTimeValue(
                                  new Date(row.next_contact_at)
                                )
                              : toLocalDateTimeValue(
                                  new Date(Date.now() + 2 * 60 * 60 * 1000)
                                )
                          );
                        }}
                      >
                        <Clock3 className="size-3.5" />
                        Oddzwonić
                      </Button>
                    </div>
                  </div>
                  {isEditingDate && (
                    <div className="mt-2 flex max-w-md items-end gap-2">
                      <div className="flex-1">
                        <MobileDateTimeInput
                          value={rescheduleValue}
                          onChange={setRescheduleValue}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!rescheduleValue}
                        onClick={() =>
                          void scheduleQueueCallback(row, rescheduleValue)
                        }
                      >
                        Zapisz termin
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <div className="hidden">
        <section className="bg-card rounded-xl border p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Sześć priorytetów Ivy Lee</h2>
              <p className="text-muted-foreground text-xs">
                Agent proponuje kolejność na podstawie terminów, blokerów,
                etapów i brakujących dokumentów. Ty ją zatwierdzasz lub
                zmieniasz.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={proposePriorities}>
                Zaproponuj 6
              </Button>
              <Button onClick={savePriorities} disabled={saving}>
                <Save className="size-4" />
                {saving ? 'Zapisywanie…' : 'Zapisz'}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {priorities.map((row, index) => (
              <div
                key={row.position}
                className="grid grid-cols-[32px_32px_1fr] items-center gap-2 rounded-lg border p-2"
              >
                <span className="text-primary text-center font-bold">
                  {row.position}
                </span>
                <input
                  type="checkbox"
                  checked={row.completed}
                  onChange={(e) =>
                    setPriorities((items) =>
                      items.map((item, i) =>
                        i === index
                          ? { ...item, completed: e.target.checked }
                          : item
                      )
                    )
                  }
                />
                <Input
                  value={row.title}
                  onChange={(e) =>
                    setPriorities((items) =>
                      items.map((item, i) =>
                        i === index ? { ...item, title: e.target.value } : item
                      )
                    )
                  }
                  placeholder="Najważniejsze zadanie"
                />
              </div>
            ))}
          </div>
        </section>
        <section className="bg-card rounded-xl border p-4">
          <h2 className="mb-3 font-semibold">Kontrola dnia</h2>
          <Status
            icon={AlertCircle}
            label="Zaległe działania"
            count={overdue.length}
            href="/pipelines"
          />
          <Status
            icon={CalendarDays}
            label="Spotkania dzisiaj"
            count={meetings.length}
            href="/calendar"
          />
          <Status
            icon={CheckCircle2}
            label="Deale bez następnego kroku"
            count={withoutAction.length}
            href="/pipelines"
          />
        </section>
      </div>
      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zarejestruj wykonany telefon</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Każdy zapis zwiększa licznik telefonu. Numer może być jeszcze bez
            kartoteki.
          </p>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Numer telefonu">
                <Input
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  onBlur={(e) => matchNumber(e.target.value)}
                  inputMode="tel"
                  placeholder="Wpisz lub podyktuj numer"
                />
              </Field>
              <Field label="Kanał">
                <select
                  value={callChannel}
                  onChange={(e) => setCallChannel(e.target.value)}
                  className="bg-muted h-9 rounded-md border px-3 text-sm"
                >
                  <option value="telefon">Telefon</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </Field>
              <Field label="Osoba">
                <EntitySearchSelect
                  value={callContactId}
                  onChange={(value) => {
                    setCallContactId(value);
                    const row = contacts.find(
                      (contact) => contact.id === value
                    );
                    if (row?.phone) setCallNumber(row.phone);
                    const linkedDeal = deals.find(
                      (deal) => deal.contact_id === value
                    );
                    if (linkedDeal) {
                      setCallDealId(linkedDeal.id);
                      setCallCompanyId(linkedDeal.company_id ?? '');
                      if (linkedDeal.source) setCallCategory(linkedDeal.source);
                      if (linkedDeal.product_type)
                        setCallProduct(linkedDeal.product_type);
                    }
                  }}
                  placeholder="Wyszukaj osobę"
                  options={contacts.map((row) => ({
                    value: row.id,
                    label: row.name || row.phone,
                    keywords: `${row.phone} ${row.email ?? ''}`,
                  }))}
                  onAdd={() => window.open('/contacts?new=contact', '_blank')}
                  addLabel="Dodaj osobę"
                />
              </Field>
              <Field label="Firma">
                <EntitySearchSelect
                  value={callCompanyId}
                  onChange={(value) => {
                    setCallCompanyId(value);
                    const row = companies.find(
                      (company) => company.id === value
                    );
                    if (row?.phone) setCallNumber(row.phone);
                  }}
                  placeholder="Wyszukaj firmę"
                  options={companies.map((row) => ({
                    value: row.id,
                    label: row.name,
                    keywords: `${row.phone ?? ''} ${row.nip ?? ''}`,
                  }))}
                  onAdd={() => window.open('/companies?new=company', '_blank')}
                  addLabel="Dodaj firmę"
                />
              </Field>
              <Field label="Deal">
                <EntitySearchSelect
                  value={callDealId}
                  onChange={(value) => {
                    setCallDealId(value);
                    const linked = deals.find((deal) => deal.id === value);
                    if (!linked) return;
                    setCallContactId(linked.contact_id ?? '');
                    setCallCompanyId(linked.company_id ?? '');
                    const linkedContact = contacts.find(
                      (contact) => contact.id === linked.contact_id
                    );
                    const linkedCompany = companies.find(
                      (company) => company.id === linked.company_id
                    );
                    if (linkedContact?.phone || linkedCompany?.phone)
                      setCallNumber(
                        linkedContact?.phone || linkedCompany?.phone || ''
                      );
                    if (linked.source) setCallCategory(linked.source);
                    if (linked.product_type)
                      setCallProduct(linked.product_type);
                  }}
                  placeholder="Wyszukaj Deal"
                  options={deals.map((row) => ({
                    value: row.id,
                    label: row.title,
                    keywords: `${row.contact?.name ?? ''} ${row.company?.name ?? ''}`,
                  }))}
                  onAdd={() => window.open('/pipelines?new=deal', '_blank')}
                  addLabel="Dodaj Deal"
                />
              </Field>
              <Field label="Wynik">
                <select
                  value={callResult}
                  onChange={(e) => setCallResult(e.target.value)}
                  className="bg-muted h-9 rounded-md border px-3 text-sm"
                >
                  <option value="nie_odebral">Nie odebrał</option>
                  <option value="odebral">Odebrał</option>
                  <option value="oddzwonic">Oddzwonić później</option>
                  <option value="przelozone_dzis">Przełożone na dziś</option>
                  <option value="serwis_zakonczony">Serwis zakończony</option>
                  <option value="niezainteresowany">
                    Niezainteresowany — zamknij
                  </option>
                </select>
              </Field>
              <Field label="Typ rozmowy">
                <select
                  value={callType}
                  onChange={(e) => setCallType(e.target.value)}
                  className="bg-muted h-9 rounded-md border px-3 text-sm"
                >
                  <option value="nowe_pozyskanie">Nowe pozyskanie</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="obsluga_serwis">Obsługa / serwis</option>
                  <option value="spotkanie_telefoniczne">
                    Spotkanie telefoniczne
                  </option>
                  <option value="przychodzacy">Kontakt przychodzący</option>
                  <option value="inne">Inne</option>
                </select>
              </Field>
              <Field label="Źródło">
                <CatalogSearchSelect
                  catalogType="call_source"
                  value={callCategory}
                  onChange={setCallCategory}
                  placeholder="Wyszukaj lub wpisz źródło"
                />
              </Field>
              <Field label="Grupa produktu">
                <CatalogSearchSelect
                  catalogType="product_group"
                  value={callProduct}
                  onChange={setCallProduct}
                  placeholder="Wybierz grupę"
                  defaults={[
                    '1_HIPO_OF_ML',
                    '2_FIRMA_BC_ML',
                    '3_FIRMA_BC_NML',
                    '4_GOTÓWKA_OF_NML',
                    '5_LEASING_BC_ML',
                  ]}
                />
              </Field>
            </div>
            <Field label="Krótki wynik i następny krok">
              <VoiceTextarea
                value={callDescription}
                onChange={setCallDescription}
                placeholder="Na telefonie możesz użyć dyktowania głosowego"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Następny kontakt — data i godzina">
                <MobileDateTimeInput
                  value={nextContactAt}
                  onChange={setNextContactAt}
                />
              </Field>
              <Field label="Powód / następny krok">
                <Input
                  value={nextContactReason}
                  onChange={(e) => setNextContactReason(e.target.value)}
                  placeholder="Np. sprawdzić dokument od klienta"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {callContactId && (
                <Button
                  type="button"
                  variant="outline"
                  render={
                    <a
                      href={`/pipelines?new=deal&contact=${callContactId}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  Utwórz Deal z tej rozmowy
                </Button>
              )}
              <Button onClick={registerCall} className="ml-auto">
                Zapisz telefon
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DesktopTodayBoard({
  todayPlan,
  deals,
}: {
  todayPlan: TodayPlan;
  deals: Deal[];
}) {
  const dayLabel = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const allItems = [
    ...todayPlan.now,
    ...todayPlan.nextBlock,
    ...todayPlan.laterToday,
  ].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.id === item.id) === index
  );
  const overdueDeals = deals.filter(
    (deal) => deal.next_action_at && +new Date(deal.next_action_at) < Date.now()
  );
  const dealsWithoutAction = deals.filter(
    (deal) => !deal.next_action?.trim() || !deal.next_action_at
  );
  const blockedDeals = deals.filter((deal) => deal.blocker?.trim());
  const nearCommissionDeals = deals.filter((deal) =>
    /uruchom|fakt|prowiz|decyz/i.test(deal.stage?.name || '')
  );
  const immediateDeals = deals.filter((deal) =>
    /wniosk|decyz|uruchom|fakt/i.test(deal.stage?.name || '')
  );
  const revenueNow = immediateDeals.reduce(
    (total, deal) =>
      total + (deal.actual_commission || deal.expected_commission || 0),
    0
  );
  const revenueLater = deals
    .filter((deal) => !immediateDeals.includes(deal))
    .reduce((total, deal) => total + (deal.expected_commission || 0), 0);
  const callsToday = allItems.filter((item) =>
    /telefon|zadzwo|oddzwo|rozmow/i.test(
      `${item.title} ${item.action || ''} ${item.reason || ''}`
    )
  );
  const rhythmPercent = Math.min(
    100,
    Math.round((Math.min(allItems.length, 4) / 6) * 100)
  );
  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0,
    }).format(value);
  const metrics = [
    {
      label: 'TOP 6',
      note: 'Najważniejsze na dziś',
      value: String(todayPlan.mainCount),
      detail: 'zadań i spotkań',
      icon: '🏆',
      tone: 'text-amber-600',
    },
    {
      label: 'Przychód teraz',
      note: 'Zaawansowane sprawy',
      value: formatMoney(revenueNow),
      detail: `z ${immediateDeals.length} transakcji`,
      icon: '▥',
      tone: 'text-emerald-700',
    },
    {
      label: 'Przychód później',
      note: 'Kolejne etapy',
      value: formatMoney(revenueLater),
      detail: `z ${Math.max(0, deals.length - immediateDeals.length)} transakcji`,
      icon: '◷',
      tone: 'text-blue-600',
    },
    {
      label: 'Blisko prowizji',
      note: 'Sprawy na finiszu',
      value: String(nearCommissionDeals.length),
      detail: 'sprawy na finiszu',
      icon: '♙',
      tone: 'text-emerald-700',
    },
    {
      label: 'Blockery',
      note: 'Wymagają uwagi',
      value: String(blockedDeals.length),
      detail: 'wymagają Twojej uwagi',
      icon: '△',
      tone: 'text-rose-600',
    },
    {
      label: 'Bez next action',
      note: 'Czekają na akcję',
      value: String(dealsWithoutAction.length),
      detail: 'spraw czeka na akcję',
      icon: '•••',
      tone: 'text-slate-600',
    },
  ];
  return (
    <section className="hidden lg:block" aria-label="DZISIAJ — widok roboczy">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-slate-950">
            Dzisiaj
          </h1>
          <p className="text-sm font-medium text-blue-900 capitalize">
            {dayLabel}
          </p>
        </div>
        <p className="max-w-[260px] text-right text-xs leading-5 font-medium text-blue-900">
          „Małe, konsekwentne działania dają wielkie rezultaty.”
        </p>
      </div>
      <div className="grid grid-cols-6 gap-2.5">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.label === 'TOP 6' ? '/tasks' : '/pipelines'}
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-200"
          >
            <div className="flex items-start gap-2">
              <span className={`text-lg font-black ${metric.tone}`}>
                {metric.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-950">
                  {metric.label}
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  {metric.note}
                </p>
              </div>
            </div>
            <p className="mt-2 truncate text-xl font-black text-blue-950">
              {metric.value}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-blue-800">
              {metric.detail}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[1.18fr_0.9fr_0.58fr] gap-3">
        <TodayPanel
          title="Kalendarz dnia"
          action="Zobacz cały dzień"
          href="/calendar?view=day"
        >
          <div className="divide-y divide-slate-100">
            {allItems.slice(0, 6).map((item, index) => (
              <DesktopTodayRow key={item.id} item={item} index={index} />
            ))}
            {!allItems.length ? <EmptyTodayState /> : null}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href="/calendar?new=event"
              className="rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-bold text-white"
            >
              + Dodaj spotkanie
            </Link>
            <Link
              href="/tasks?new=task"
              className="rounded-lg border border-blue-200 px-3 py-2 text-center text-xs font-bold text-blue-700"
            >
              + Utwórz zadanie
            </Link>
          </div>
        </TodayPanel>

        <TodayPanel
          title="Najbliższe rozmowy"
          action={`Zobacz wszystkie (${callsToday.length})`}
          href="/tasks"
        >
          <div className="divide-y divide-slate-100">
            {(callsToday.length ? callsToday : allItems)
              .slice(0, 5)
              .map((item, index) => (
                <DesktopTodayRow
                  key={item.id}
                  item={item}
                  index={index}
                  compact
                />
              ))}
            {!allItems.length ? <EmptyTodayState /> : null}
          </div>
        </TodayPanel>

        <TodayPanel title="Pasek rytmu dnia">
          <div className="flex items-center gap-3 py-2">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-[8px] border-emerald-500 border-r-emerald-100 text-xl font-black text-blue-950">
              {rhythmPercent}%
            </div>
            <div>
              <p className="font-black text-emerald-800">Dobry rytm!</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Masz zaplanowane {todayPlan.mainCount} kluczowych aktywności.
              </p>
            </div>
          </div>
          <div className="mt-2 space-y-2 text-[11px]">
            {[
              'Poranna analiza',
              'Pierwsze rozmowy',
              'Praca z dokumentami',
              'Follow-upy',
              'Podsumowanie dnia',
            ].map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`size-3 rounded-full border ${index < 3 ? 'border-emerald-600 bg-emerald-600' : 'border-blue-400'}`}
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="text-slate-500">
                  {['08:00', '10:00', '12:00', '14:00', '17:00'][index]}
                </span>
              </div>
            ))}
          </div>
        </TodayPanel>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <DealStatusPanel
          title="Zaległe follow-upy"
          href="/tasks?filter=overdue"
          deals={overdueDeals}
          empty="Brak zaległych follow-upów"
        />
        <DealStatusPanel
          title="Sprawy bez next action"
          href="/pipelines"
          deals={dealsWithoutAction}
          empty="Wszystkie sprawy mają next action"
        />
        <DealStatusPanel
          title="Blockery"
          href="/pipelines"
          deals={blockedDeals}
          empty="Brak aktywnych blockerów"
          blocker
        />
      </div>
    </section>
  );
}

function DesktopTodayRow({
  item,
  index,
  compact = false,
}: {
  item: RankedTodayItem;
  index: number;
  compact?: boolean;
}) {
  const time = item.dueAt
    ? new Date(item.dueAt).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
  const dots = ['bg-red-500', 'bg-emerald-500', 'bg-amber-400', 'bg-slate-400'];
  const content = (
    <div
      className={`grid grid-cols-[66px_minmax(0,1fr)_auto] items-center gap-2 ${compact ? 'py-2' : 'py-2.5'}`}
    >
      <span className="flex items-center gap-2 text-sm font-black text-slate-700">
        <span className={`size-2 rounded-full ${dots[index % dots.length]}`} />
        {time}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-slate-900">
          {item.title}
          {item.action && item.action !== item.title ? ` — ${item.action}` : ''}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500 uppercase">
          {[item.stageName, item.section].filter(Boolean).join(' · ') ||
            item.reason}
        </span>
      </span>
      <ArrowRight className="size-4 text-slate-400" />
    </div>
  );
  return item.href ? <Link href={item.href}>{content}</Link> : content;
}

function TodayPanel({
  title,
  action,
  href,
  children,
}: {
  title: string;
  action?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[310px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 className="text-sm font-black text-blue-950">{title}</h2>
        {action && href ? (
          <Link
            href={href}
            className="text-[10px] font-bold text-blue-600 hover:underline"
          >
            {action} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DealStatusPanel({
  title,
  href,
  deals,
  empty,
  blocker = false,
}: {
  title: string;
  href: string;
  deals: Deal[];
  empty: string;
  blocker?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 className="text-sm font-black text-blue-950">{title}</h2>
        <Link
          href={href}
          className="text-[10px] font-bold text-blue-600 hover:underline"
        >
          Zobacz wszystkie ({deals.length})
        </Link>
      </div>
      <div className="space-y-1.5">
        {deals.slice(0, 3).map((deal) => (
          <Link
            key={deal.id}
            href={`/deals/${deal.id}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-slate-900">
                {blocker ? deal.blocker : deal.title}
              </span>
              <span className="block truncate text-[10px] text-slate-500">
                {deal.contact?.name ||
                  deal.company?.name ||
                  deal.stage?.name ||
                  'Deal'}
              </span>
            </span>
            <span
              className={`rounded-md px-2 py-1 text-[9px] font-bold ${blocker ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}
            >
              {blocker ? 'W trakcie' : 'Brak akcji'}
            </span>
          </Link>
        ))}
        {!deals.length ? (
          <p className="py-5 text-center text-xs text-slate-400">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

function EmptyTodayState() {
  return (
    <p className="py-10 text-center text-xs text-slate-400">
      Brak działań zaplanowanych na dziś.
    </p>
  );
}

function DesktopWorkspaces({
  todayPlan,
  deals,
  activeDeal,
  activeContact,
}: {
  todayPlan: TodayPlan;
  deals: Deal[];
  activeDeal?: Deal;
  activeContact?: Contact;
}) {
  const dayLabel = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const sections = [
    ['TERAZ', todayPlan.now],
    ['NASTĘPNY BLOK', todayPlan.nextBlock],
    ['PÓŹNIEJ DZISIAJ', todayPlan.laterToday],
  ] as const;
  const pipelineStages = Array.from(
    new Map(
      deals.map((deal) => [
        deal.stage?.name || deal.product_type || 'Bez etapu',
        deal.stage?.name || deal.product_type || 'Bez etapu',
      ])
    ).values()
  )
    .slice(0, 3)
    .map((name) => ({
      name,
      deals: deals
        .filter(
          (deal) =>
            (deal.stage?.name || deal.product_type || 'Bez etapu') === name
        )
        .slice(0, 2),
    }));
  const relatedDeals = activeContact
    ? deals.filter((deal) => deal.contact_id === activeContact.id).slice(0, 3)
    : [];

  return (
    <section
      aria-label="Pięć paneli roboczych mCRM AI"
      className="hidden min-h-[540px] overflow-hidden rounded-2xl border border-emerald-950/15 bg-[#f8faf7] shadow-sm lg:grid lg:grid-cols-[1.05fr_1.2fr_1fr_1.05fr_1fr]"
    >
      <WorkspacePanel title="Dziś" subtitle={dayLabel}>
        <div className="space-y-4">
          {sections.map(([title, items]) => (
            <div key={title}>
              <p className="mb-1.5 text-[10px] font-black tracking-wide text-emerald-800 uppercase">
                {title}
              </p>
              {items[0] ? (
                <MiniTodayRow item={items[0]} primary={title === 'TERAZ'} />
              ) : (
                <p className="text-xs text-slate-400">
                  Brak zaplanowanej sprawy
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1.5 border-t pt-3">
          <Link
            href="/calendar?view=day"
            className="rounded-lg border px-2 py-2 text-center text-[11px] font-semibold"
          >
            Kalendarz
          </Link>
          <Link
            href="/tasks"
            className="rounded-lg border px-2 py-2 text-center text-[11px] font-semibold"
          >
            Wszystkie zadania
          </Link>
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="Lejek sprzedaży"
        subtitle="Widok · Kolumny · Lista"
      >
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          {pipelineStages.map((stage, index) => (
            <div
              key={stage.name}
              className={`flex min-w-0 flex-col rounded-lg p-1.5 ${index === 0 ? 'bg-emerald-50' : index === 1 ? 'bg-lime-50' : 'bg-amber-50'}`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1 border-b border-emerald-950/10 pb-1 text-[9px] font-black">
                <span className="truncate">{stage.name}</span>
                <span>{stage.deals.length}</span>
              </div>
              <div className="space-y-1.5">
                {stage.deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border bg-white p-1.5 hover:border-emerald-600"
                  >
                    <span className="line-clamp-2 text-[10px] leading-3.5 font-bold">
                      {deal.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                      {deal.value
                        ? `${Number(deal.value).toLocaleString('pl-PL')} ${deal.currency || 'PLN'}`
                        : deal.product_type || '—'}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href="/pipelines?new=deal"
                className="mt-auto pt-2 text-center text-[9px] font-black text-emerald-900"
              >
                + Nowy Deal
              </Link>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Klient" subtitle="Najważniejsze informacje">
        {activeContact ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-600">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0">
                <Link
                  href={`/contacts?open=${activeContact.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-black hover:text-emerald-800"
                >
                  {activeContact.name || activeContact.phone}
                </Link>
                <p className="truncate text-[10px] text-slate-500">
                  {activeContact.phone}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
              <a
                href={`tel:${activeContact.phone}`}
                className="rounded-lg border px-1 py-2"
              >
                Zadzwoń
              </a>
              <Link
                href={`/quick-call?contact=${activeContact.id}&action=message`}
                className="rounded-lg border px-1 py-2"
              >
                Wiadomość
              </Link>
              <Link
                href={`/quick-call?contact=${activeContact.id}&action=dictate`}
                className="rounded-lg border px-1 py-2"
              >
                Dyktuj
              </Link>
            </div>
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[10px] font-black text-emerald-800 uppercase">
                Deale ({relatedDeals.length})
              </p>
              <div className="space-y-1.5">
                {relatedDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg bg-emerald-50 p-2"
                  >
                    <span className="block truncate text-xs font-bold">
                      {deal.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {deal.stage?.name || 'Etap nieustalony'}
                    </span>
                    <span className="mt-1 block text-xs font-bold">
                      {Number(deal.value) > 0
                        ? `${Number(deal.value).toLocaleString('pl-PL')} ${deal.currency || 'PLN'}`
                        : ''}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      Następny krok: {deal.next_action || 'Nie ustalono'}
                    </span>
                    {deal.next_action_at && (
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {new Date(deal.next_action_at).toLocaleDateString(
                          'pl-PL'
                        )}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href={`/quick-call?contact=${activeContact.id}&newDeal=1`}
              className="mt-auto rounded-lg bg-[#123d2b] px-2 py-2 text-center text-[11px] font-black text-white"
            >
              + Nowy Deal
            </Link>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Wybierz klienta lub sprawę z DZISIAJ.
          </p>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Deal" subtitle="Konkretna sprawa">
        {activeDeal ? (
          <>
            <Link
              href={`/deals/${activeDeal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-black hover:text-emerald-800"
            >
              {activeDeal.title}
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              {activeDeal.product_type}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <WorkspaceField label="Etap" value={activeDeal.stage?.name} />
              <WorkspaceField
                label="Następny krok"
                value={activeDeal.next_action}
              />
              <WorkspaceField
                label="Termin"
                value={
                  activeDeal.next_action_at
                    ? new Date(activeDeal.next_action_at).toLocaleDateString(
                        'pl-PL'
                      )
                    : undefined
                }
              />
              <WorkspaceField label="Blocker" value={activeDeal.blocker} />
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-1 text-center text-[10px] font-bold">
              <Link
                href={`/quick-call?deal=${activeDeal.id}&action=call`}
                className="rounded-lg border px-1 py-2"
              >
                Zadzwoń
              </Link>
              <Link
                href={`/quick-call?deal=${activeDeal.id}&action=message`}
                className="rounded-lg border px-1 py-2"
              >
                Wiadomość
              </Link>
              <Link
                href={`/quick-call?deal=${activeDeal.id}&action=dictate`}
                className="rounded-lg border px-1 py-2"
              >
                Dyktuj
              </Link>
              <Link
                href={`/quick-call?deal=${activeDeal.id}&action=document`}
                className="rounded-lg border px-1 py-2"
              >
                Dodaj dokument
              </Link>
            </div>
            <Link
              href={`/assistant?deal=${activeDeal.id}`}
              className="mt-auto flex items-center justify-center gap-1 rounded-lg bg-[#123d2b] px-2 py-2.5 text-[11px] font-black text-lime-300"
            >
              <Sparkles className="size-3" /> Asystent AI
            </Link>
          </>
        ) : (
          <p className="text-xs text-slate-500">Brak aktywnego Deala.</p>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Asystent AI" subtitle="Twoje wsparcie AI" last>
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-900">
          <Bot className="size-5" />
        </div>
        <h3 className="mt-3 text-sm font-black">Jak mogę Ci dziś pomóc?</h3>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          Jestem tu, aby przyspieszyć Twoją pracę.
        </p>
        <div className="mt-4 space-y-1.5 text-[11px]">
          {[
            'Przygotuj mnie',
            'Kwalifikuj temat',
            'Sprawdź kompletację',
            'Sprawdź wiedzę bankową',
            'Prowadź mnie krok po kroku',
          ].map((label) => (
            <Link
              key={label}
              href={
                activeDeal ? `/assistant?deal=${activeDeal.id}` : '/assistant'
              }
              className="flex items-center gap-2 rounded-lg border border-lime-300 bg-lime-50 px-2 py-2 font-semibold text-emerald-950 hover:bg-lime-100"
            >
              <Sparkles className="size-3 text-lime-700" /> {label}
            </Link>
          ))}
        </div>
        <Link
          href={activeDeal ? `/assistant?deal=${activeDeal.id}` : '/assistant'}
          className="mt-auto rounded-lg border border-lime-400 bg-lime-100 px-2 py-2 text-center text-[11px] font-black text-emerald-950"
        >
          Napisz pytanie…
        </Link>
      </WorkspacePanel>
    </section>
  );
}

function MobileTodayBoard({
  todayPlan,
  overdueCount,
  newCount,
}: {
  todayPlan: TodayPlan;
  overdueCount: number;
  newCount: number;
}) {
  const dayLabel = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
  const allItems = [
    ...todayPlan.now,
    ...todayPlan.nextBlock,
    ...todayPlan.laterToday,
  ].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.id === item.id) === index
  );

  return (
    <section className="min-w-0 bg-[#f7f9f8] px-1 pb-4 lg:hidden">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h1 className="text-[23px] font-black tracking-tight text-blue-950">
          Dzisiaj
        </h1>
        <p className="text-xs font-semibold text-blue-900 capitalize">
          {dayLabel}
        </p>
      </div>
      <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-slate-200 bg-white text-[9px] font-bold text-blue-900">
        <span className="bg-emerald-700 px-1 py-2 text-center text-white">
          Moje zadania{' '}
          <b className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5">
            {todayPlan.mainCount}
          </b>
        </span>
        <span className="px-1 py-2 text-center">
          Po terminie{' '}
          <b className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-white">
            {overdueCount}
          </b>
        </span>
        <span className="px-1 py-2 text-center">Na dziś</span>
        <span className="px-1 py-2 text-center">Na później</span>
      </div>
      <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-2">
        {allItems.slice(0, 6).map((item, index) => (
          <MobileTodayTaskRow key={item.id} item={item} index={index} />
        ))}
        {!allItems.length ? (
          <p className="py-12 text-center text-xs text-slate-400">
            Brak działań zaplanowanych na dziś.
          </p>
        ) : null}
      </div>
      <Link
        href="/tasks?new=task"
        className="mt-3 flex min-h-12 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white shadow-sm"
      >
        + Dodaj zadanie
      </Link>
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-black text-amber-900">
          <Sparkles className="size-5 text-amber-600" /> Rekomendacja AI
          <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] text-white">
            AI
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-blue-950">
          {allItems[0]
            ? `Masz ${Math.max(1, todayPlan.mainCount)} ważnych spraw. Zacznij od: ${allItems[0].action || allItems[0].title}.`
            : newCount
              ? `Masz ${newCount} nowych kontaktów do sprawdzenia.`
              : 'Najważniejsze sprawy na dziś są pod kontrolą.'}
        </p>
      </div>
    </section>
  );
}

function MobileTodayTaskRow({
  item,
  index,
}: {
  item: RankedTodayItem;
  index: number;
}) {
  const time = item.dueAt
    ? new Date(item.dueAt).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
  const dots = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-400', 'bg-sky-600'];
  const content = (
    <div className="grid grid-cols-[18px_8px_minmax(0,1fr)_44px_12px] items-center gap-2 py-3">
      <span className="size-3.5 rounded border border-slate-300" />
      <span className={`size-2 rounded-full ${dots[index % dots.length]}`} />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-black text-blue-950">
          {item.action || item.title}
        </span>
        <span className="mt-0.5 block truncate text-[9px] font-semibold text-blue-800 uppercase">
          {item.stageName || item.reason || 'Zadanie'}
        </span>
      </span>
      <span className="text-right text-[10px] font-bold text-blue-900">
        {time}
      </span>
      <ArrowRight className="size-3 text-blue-900" />
    </div>
  );
  return item.href ? <Link href={item.href}>{content}</Link> : content;
}

function WorkspacePanel({
  title,
  subtitle,
  children,
  last = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col p-3 ${last ? '' : 'border-r border-emerald-950/10'}`}
    >
      <div className="mb-3 border-b pb-2">
        <h2 className="text-sm font-black">{title}</h2>
        <p className="truncate text-[10px] text-slate-500">{subtitle}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function MiniTodayRow({
  item,
  primary,
}: {
  item: RankedTodayItem;
  primary?: boolean;
}) {
  const content = (
    <div
      className={`rounded-lg border-l-4 p-2 ${primary ? 'border-l-emerald-700 bg-emerald-50' : 'border-l-slate-300 bg-white'}`}
    >
      <p className="line-clamp-2 text-xs font-black">
        {item.action || item.title}
      </p>
      {item.action && item.action !== item.title ? (
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {item.title}
        </p>
      ) : null}
      {primary ? (
        <span className="mt-2 inline-block rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-black text-white">
          Rozpocznij
        </span>
      ) : null}
    </div>
  );
  return item.href ? <Link href={item.href}>{content}</Link> : content;
}

function WorkspaceField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-[9px] font-black text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="mt-1 min-h-9 rounded border bg-white p-1.5 font-semibold">
        {value || '—'}
      </dd>
    </div>
  );
}

function blankPriorities(): Priority[] {
  return [1, 2, 3, 4, 5, 6].map((position) => ({
    position,
    title: '',
    completed: false,
    deal_id: null,
  }));
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {note && <p className="text-muted-foreground text-[10px]">{note}</p>}
    </div>
  );
}
function Status({
  icon: Icon,
  label,
  count,
  href,
}: {
  icon: typeof AlertCircle;
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted mb-2 flex items-center justify-between rounded-lg border p-3"
    >
      <span className="flex items-center gap-2 text-sm">
        <Icon className="size-4" />
        {label}
      </span>
      <strong>{count}</strong>
    </Link>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

