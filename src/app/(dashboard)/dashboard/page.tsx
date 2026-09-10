'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Phone,
  PhoneMissed,
  Save,
  Sparkles,
  Target,
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
    setDeals((dealRows.data ?? []) as Deal[]);
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
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
  const workspaceItem =
    todayPlan.now.find((item) => item.main) ??
    todayPlan.nextBlock.find((item) => item.main) ??
    todayPlan.laterToday.find((item) => item.main);
  const workspaceDeal =
    deals.find((deal) => deal.id === workspaceItem?.dealId) ?? deals[0];
  const workspaceContact =
    contacts.find((contact) => contact.id === workspaceDeal?.contact_id) ??
    contacts.find((contact) => contact.id === workspaceItem?.contactId);
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
      <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
        <div>
          <h1 className="text-2xl font-bold">DZISIAJ</h1>
          <p className="text-muted-foreground text-sm">
            Co jest najlepsze do zrobienia teraz — i dlaczego.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/calendar?view=day" />}
            >
              <CalendarDays className="size-4" />
              Dzień
            </Button>
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/calendar?view=week" />}
            >
              Tydzień
            </Button>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/tasks" />}>
            <ClipboardList className="size-4" />
            Wszystkie zadania
          </Button>
          <Button render={<Link href="/quick-call" />}>
            <Phone className="size-4" />
            Szybka Aktywność
          </Button>
        </div>
      </div>
      <div className="grid items-start gap-3 lg:hidden">
        <TodaySectionPanel
          title="TERAZ"
          items={todayPlan.now}
          empty="Brak pilnej sprawy w tym bloku."
          emphasis
        />
        <TodaySectionPanel
          title="NASTĘPNY BLOK"
          items={todayPlan.nextBlock}
          empty="Następny blok jest wolny."
        />
        <TodaySectionPanel
          title="PÓŹNIEJ DZISIAJ"
          items={todayPlan.laterToday}
          empty="Brak dalszych spraw na dziś."
        />
      </div>
      <p className="text-muted-foreground text-xs lg:hidden">
        Ivy Lee: {todayPlan.mainCount}/6 głównych spraw · kontekst:{' '}
        {currentWorkContext(todayInputs.calendarBlocks, new Date(now)) ===
        'RZESZOW_BIURO'
          ? 'Rzeszów / biuro'
          : currentWorkContext(todayInputs.calendarBlocks, new Date(now)) ===
              'DOM_KOMPUTER'
            ? 'dom / komputer'
            : 'dowolny'}
      </p>
      <DesktopWorkspaces
        todayPlan={todayPlan}
        deals={deals}
        activeDeal={workspaceDeal}
        activeContact={workspaceContact}
      />
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
  const visibleDeals = deals.slice(0, 6);
  const relatedDeals = activeContact
    ? deals.filter((deal) => deal.contact_id === activeContact.id).slice(0, 3)
    : [];

  return (
    <section
      aria-label="Pięć paneli roboczych mCRM AI"
      className="hidden min-h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-emerald-950/15 bg-[#f8faf7] shadow-sm lg:grid lg:grid-cols-[1.05fr_1.15fr_1fr_1.05fr_1fr]"
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
                <p className="text-xs text-slate-400">Brak zaplanowanej sprawy</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1.5 border-t pt-3">
          <Link href="/calendar?view=day" className="rounded-lg border px-2 py-2 text-center text-[11px] font-semibold">Kalendarz</Link>
          <Link href="/tasks" className="rounded-lg border px-2 py-2 text-center text-[11px] font-semibold">Wszystkie zadania</Link>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Lejek sprzedaży" subtitle="Aktywne sprawy">
        <div className="grid grid-cols-3 gap-1 border-b pb-2 text-center text-[9px] font-black uppercase text-slate-500">
          <span className="rounded bg-emerald-50 py-1">Kontakt</span>
          <span className="rounded bg-lime-50 py-1">Spotkanie</span>
          <span className="rounded bg-amber-50 py-1">Analiza</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {visibleDeals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border bg-white p-2 hover:border-emerald-600"
            >
              <span className="block truncate text-xs font-bold">{deal.title}</span>
              <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                {deal.stage?.name || deal.product_type || 'Etap nieustalony'}
              </span>
            </Link>
          ))}
        </div>
        <Link href="/pipelines?new=deal" className="mt-auto rounded-lg bg-emerald-50 px-2 py-2 text-center text-[11px] font-black text-emerald-900">+ Nowy Deal</Link>
      </WorkspacePanel>

      <WorkspacePanel title="Klient" subtitle="Najważniejsze informacje">
        {activeContact ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-600">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0">
                <Link href={`/contacts?open=${activeContact.id}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-black hover:text-emerald-800">{activeContact.name || activeContact.phone}</Link>
                <p className="truncate text-[10px] text-slate-500">{activeContact.phone}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
              <a href={`tel:${activeContact.phone}`} className="rounded-lg border px-1 py-2">Zadzwoń</a>
              <Link href={`/quick-call?contact=${activeContact.id}&action=message`} className="rounded-lg border px-1 py-2">Wiadomość</Link>
              <Link href={`/quick-call?contact=${activeContact.id}&action=dictate`} className="rounded-lg border px-1 py-2">Dyktuj</Link>
            </div>
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[10px] font-black uppercase text-emerald-800">Deale ({relatedDeals.length})</p>
              <div className="space-y-1.5">
                {relatedDeals.map((deal) => (
                  <Link key={deal.id} href={`/deals/${deal.id}`} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-emerald-50 p-2">
                    <span className="block truncate text-xs font-bold">{deal.title}</span>
                    <span className="text-[10px] text-slate-500">{deal.stage?.name || 'Etap nieustalony'}</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link href={`/quick-call?contact=${activeContact.id}&newDeal=1`} className="mt-auto rounded-lg bg-[#123d2b] px-2 py-2 text-center text-[11px] font-black text-lime-300">+ Nowy Deal</Link>
          </>
        ) : (
          <p className="text-xs text-slate-500">Wybierz klienta lub sprawę z DZISIAJ.</p>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Deal" subtitle="Konkretna sprawa">
        {activeDeal ? (
          <>
            <Link href={`/deals/${activeDeal.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-black hover:text-emerald-800">{activeDeal.title}</Link>
            <dl className="mt-3 space-y-2 text-xs">
              <WorkspaceField label="Etap" value={activeDeal.stage?.name} />
              <WorkspaceField label="Produkt" value={activeDeal.product_type} />
              <WorkspaceField label="Następny krok" value={activeDeal.next_action} />
              <WorkspaceField label="Termin" value={activeDeal.next_action_at ? new Date(activeDeal.next_action_at).toLocaleDateString('pl-PL') : undefined} />
              <WorkspaceField label="Blocker" value={activeDeal.blocker} />
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-1 text-center text-[10px] font-bold">
              <Link href={`/quick-call?deal=${activeDeal.id}&action=call`} className="rounded-lg border px-1 py-2">Zadzwoń</Link>
              <Link href={`/quick-call?deal=${activeDeal.id}&action=message`} className="rounded-lg border px-1 py-2">Wiadomość</Link>
              <Link href={`/quick-call?deal=${activeDeal.id}&action=dictate`} className="rounded-lg border px-1 py-2">Dyktuj</Link>
              <Link href={`/quick-call?deal=${activeDeal.id}&action=document`} className="rounded-lg border px-1 py-2">Dodaj dokument</Link>
            </div>
            <Link href={`/assistant?deal=${activeDeal.id}`} className="mt-auto flex items-center justify-center gap-1 rounded-lg bg-[#123d2b] px-2 py-2.5 text-[11px] font-black text-lime-300"><Sparkles className="size-3" /> Asystent AI</Link>
          </>
        ) : (
          <p className="text-xs text-slate-500">Brak aktywnego Deala.</p>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Asystent AI" subtitle="Twoje wsparcie AI" last>
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-900"><Bot className="size-5" /></div>
        <h3 className="mt-3 text-sm font-black">Jak mogę Ci dziś pomóc?</h3>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">Jestem tu, aby przyspieszyć Twoją pracę.</p>
        <div className="mt-4 space-y-1.5 text-[11px]">
          {['Przygotuj mnie do rozmowy', 'Sprawdź wiedzę bankową', 'Kto dziś wymaga działania?', 'Co teraz?'].map((label) => (
            <Link key={label} href={activeDeal ? `/assistant?deal=${activeDeal.id}` : '/assistant'} className="flex items-center gap-2 rounded-lg border bg-white px-2 py-2 hover:border-lime-400">
              <Sparkles className="size-3 text-lime-600" /> {label}
            </Link>
          ))}
        </div>
        <Link href={activeDeal ? `/assistant?deal=${activeDeal.id}` : '/assistant'} className="mt-auto rounded-lg border border-lime-400 bg-lime-100 px-2 py-2 text-center text-[11px] font-black text-emerald-950">Napisz pytanie…</Link>
      </WorkspacePanel>
    </section>
  );
}

function WorkspacePanel({ title, subtitle, children, last = false }: { title: string; subtitle: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={`flex min-w-0 flex-col p-3 ${last ? '' : 'border-r border-emerald-950/10'}`}>
      <div className="mb-3 border-b pb-2">
        <h2 className="text-sm font-black">{title}</h2>
        <p className="truncate text-[10px] text-slate-500">{subtitle}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function MiniTodayRow({ item, primary }: { item: RankedTodayItem; primary?: boolean }) {
  const content = (
    <div className={`rounded-lg border-l-4 p-2 ${primary ? 'border-l-emerald-700 bg-emerald-50' : 'border-l-slate-300 bg-white'}`}>
      <p className="line-clamp-2 text-xs font-black">{item.action || item.title}</p>
      {item.action && item.action !== item.title ? <p className="mt-0.5 truncate text-[10px] text-slate-500">{item.title}</p> : null}
      {primary ? <span className="mt-2 inline-block rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-black text-white">Rozpocznij</span> : null}
    </div>
  );
  return item.href ? <Link href={item.href}>{content}</Link> : content;
}

function WorkspaceField({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-[9px] font-black uppercase text-slate-400">{label}</dt><dd className="line-clamp-2 font-semibold">{value || '—'}</dd></div>;
}

function blankPriorities(): Priority[] {
  return [1, 2, 3, 4, 5, 6].map((position) => ({
    position,
    title: '',
    completed: false,
    deal_id: null,
  }));
}
function TodaySectionPanel({
  title,
  items,
  empty,
  emphasis = false,
}: {
  title: string;
  items: RankedTodayItem[];
  empty: string;
  emphasis?: boolean;
}) {
  return (
    <section
      className={
        emphasis
          ? 'border-primary/50 bg-primary/5 rounded-2xl border-2 p-4'
          : 'bg-card rounded-2xl border p-4'
      }
    >
      <h2 className="mb-3 flex items-center gap-2 text-xs font-black tracking-wide">
        <Target className={emphasis ? 'text-primary size-4' : 'size-4'} />
        {title}
      </h2>
      {!items.length ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const content = (
              <div
                className={
                  item.main
                    ? 'bg-background rounded-xl border p-3'
                    : 'bg-muted/60 rounded-xl border border-dashed p-3'
                }
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {item.main && (
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold">
                      {item.lane === 'PRZYCHOD_TERAZ'
                        ? 'PRZYCHÓD TERAZ'
                        : item.lane === 'PRZYCHOD_POZNIEJ'
                          ? 'PRZYCHÓD PÓŹNIEJ'
                          : 'T12'}
                    </span>
                  )}
                  {!item.main && (
                    <span className="text-muted-foreground text-[10px] font-bold">
                      RYTM DNIA
                    </span>
                  )}
                  {index === 0 && emphasis && item.main && (
                    <span className="text-[10px] font-bold">
                      NAJLEPSZY KROK
                    </span>
                  )}
                </div>
                <p className="font-bold">{item.action || item.title}</p>
                {item.action && item.action !== item.title && (
                  <p className="text-muted-foreground truncate text-xs">
                    {item.title}
                  </p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  Dlaczego: {item.reason}
                  {item.dueAt
                    ? ` · ${new Date(item.dueAt).toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </p>
              </div>
            );
            return item.href ? (
              <Link key={item.id} href={item.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}
    </section>
  );
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

