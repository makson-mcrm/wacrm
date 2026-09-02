'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
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
import { EntitySearchSelect } from '@/components/ui/entity-search-select';
import { toast } from 'sonner';
import type { Company, Contact, Deal } from '@/types';
import {
  BUSINESS_TIME_ZONE,
  toWarsawDateTimeInput,
  warsawDateTimeInputToIso,
} from '@/lib/date-time';
type View = 'day' | 'week' | 'month';
type Source = 'calendar' | 'activity' | 'deal' | 'queue';
type Item = {
  id: string;
  source: Source;
  sourceId: string;
  sourceField?: string;
  title: string;
  type: string;
  startsAt: string;
  description?: string | null;
  status?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  syncConflict?: boolean;
  syncConflictReason?: string | null;
};
export default function CalendarPage() {
  const db = useMemo(() => createClient(), []),
    { accountId, user } = useAuth();
  const [items, setItems] = useState<Item[]>([]),
    [contacts, setContacts] = useState<Contact[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [deals, setDeals] = useState<Deal[]>([]);
  const [view, setView] = useState<View>('week'),
    [cursor, setCursor] = useState(new Date()),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState(''),
    [type, setType] = useState('spotkanie'),
    [startsAt, setStartsAt] = useState(defaultInput()),
    [note, setNote] = useState(''),
    [contactId, setContactId] = useState(''),
    [companyId, setCompanyId] = useState(''),
    [dealId, setDealId] = useState('');
  const load = useCallback(async () => {
    if (!accountId) return;
    const [events, activities, dealRows, queue, contactRows, companyRows] =
      await Promise.all([
        db
          .from('calendar_events')
          .select('*')
          .eq('account_id', accountId)
          .is('deleted_at', null)
          .order('starts_at'),
        db
          .from('sales_activities')
          .select(
            'id,title,description,activity_type,activity_status,scheduled_at,next_action_date,next_contact_at,contact_id,company_id,deal_id'
          )
          .eq('account_id', accountId)
          .or(
            'scheduled_at.not.is.null,next_action_date.not.is.null,next_contact_at.not.is.null'
          ),
        db
          .from('deals')
          .select(
            '*,contact:contacts!deals_contact_id_fkey(*),company:companies!deals_company_id_fkey(*)'
          )
          .eq('account_id', accountId)
          .eq('status', 'open')
          .order('title'),
        db
          .from('work_queue_items')
          .select(
            'id,source_type,snoozed_until,status,contact_id,company_id,deal_id'
          )
          .eq('account_id', accountId)
          .not('snoozed_until', 'is', null)
          .neq('status', 'ZALATWIONE'),
        db
          .from('contacts')
          .select('*')
          .eq('account_id', accountId)
          .order('name'),
        db
          .from('companies')
          .select('*')
          .eq('account_id', accountId)
          .order('name'),
      ]);
    const result: Item[] = [];
    for (const r of events.data ?? [])
      result.push({
        id: `calendar-${r.id}`,
        source: 'calendar',
        sourceId: r.id,
        title: r.title,
        type: r.event_type,
        startsAt: r.starts_at,
        description: r.description,
        status: 'PLANOWANE',
        contactId: r.contact_id,
        companyId: r.company_id,
        dealId: r.deal_id,
        syncConflict: r.sync_conflict,
        syncConflictReason: r.sync_conflict_reason,
      });
    for (const r of activities.data ?? []) {
      const date = r.scheduled_at || r.next_action_date || r.next_contact_at;
      if (date)
        result.push({
          id: `activity-${r.id}`,
          source: 'activity',
          sourceId: r.id,
          title: r.title,
          type: r.activity_type,
          startsAt: date,
          description: r.description,
          status: r.activity_status,
          contactId: r.contact_id,
          companyId: r.company_id,
          dealId: r.deal_id,
        });
    }
    for (const d of dealRows.data ?? [])
      for (const [field, label, eventType] of [
        ['meeting_at', 'Spotkanie', 'spotkanie'],
        ['next_action_at', d.next_action || 'Następne działanie', 'zadanie'],
        ['follow_up_at', 'Follow-up', 'follow_up'],
      ] as const) {
        const date = d[field];
        if (date)
          result.push({
            id: `deal-${field}-${d.id}`,
            source: 'deal',
            sourceId: d.id,
            sourceField: field,
            title: `${label}: ${d.title}`,
            type: eventType,
            startsAt: date,
            status: 'PLANOWANE',
            contactId: d.contact_id,
            companyId: d.company_id,
            dealId: d.id,
          });
      }
    for (const r of queue.data ?? [])
      if (r.snoozed_until)
        result.push({
          id: `queue-${r.id}`,
          source: 'queue',
          sourceId: r.id,
          title: `DO OBSŁUGI: ${r.source_type}`,
          type: 'do_obslugi',
          startsAt: r.snoozed_until,
          status: r.status,
          contactId: r.contact_id,
          companyId: r.company_id,
          dealId: r.deal_id,
        });
    setItems(
      result.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    );
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
    setDeals((dealRows.data ?? []) as Deal[]);
  }, [accountId, db]);
  const syncAndLoad = useCallback(async () => {
    if (!accountId) return;
    await fetch('/api/google-calendar/sync', { method: 'POST' }).catch(() => null);
    await load();
  }, [accountId, load]);
  useEffect(() => {
    void syncAndLoad();
    const timer = window.setInterval(() => void syncAndLoad(), 2 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [syncAndLoad]);
  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) setView('day');
  }, []);
  const range = useMemo(() => visibleRange(cursor, view), [cursor, view]),
    days = useMemo(() => daysBetween(range.start, range.end), [range]);
  const visible = items.filter((x) => {
    const d = new Date(x.startsAt);
    return d >= range.start && d < range.end;
  });
  const names = {
    contacts: new Map(contacts.map((x) => [x.id, x.name || x.phone])),
    companies: new Map(companies.map((x) => [x.id, x.name])),
    deals: new Map(deals.map((x) => [x.id, x.title])),
  };
  function reset(item?: Item, date?: Date) {
    setEditing(item ?? null);
    setTitle(item?.title ?? '');
    setType(item?.type ?? 'spotkanie');
    setStartsAt(toWarsawDateTimeInput(item?.startsAt ?? date ?? new Date()));
    setNote(item?.description ?? '');
    setContactId(item?.contactId ?? '');
    setCompanyId(item?.companyId ?? '');
    setDealId(item?.dealId ?? '');
    setOpen(true);
  }
  async function save() {
    if (!accountId || !user || !title.trim() || !startsAt)
      return toast.error('Uzupełnij tytuł oraz termin.');
    const iso = warsawDateTimeInputToIso(startsAt);
    let error = null;
    if (editing) {
      if (editing.source === 'calendar')
        ({ error } = await db
          .from('calendar_events')
          .update({
            title: title.trim(),
            event_type: type,
            starts_at: iso,
            description: note.trim() || null,
            contact_id: contactId || null,
            company_id: companyId || null,
            deal_id: dealId || null,
            local_updated_at: new Date().toISOString(),
            sync_conflict: false,
            sync_conflict_reason: null,
          })
          .eq('id', editing.sourceId));
      else if (editing.source === 'activity')
        ({ error } = await db
          .from('sales_activities')
          .update({
            title: title.trim(),
            description: note.trim() || null,
            activity_type: type,
            scheduled_at: iso,
            contact_id: contactId || null,
            company_id: companyId || null,
            deal_id: dealId || null,
          })
          .eq('id', editing.sourceId));
      else if (editing.source === 'deal' && editing.sourceField)
        ({ error } = await db
          .from('deals')
          .update({ [editing.sourceField]: iso })
          .eq('id', editing.sourceId));
      else
        ({ error } = await db
          .from('work_queue_items')
          .update({ snoozed_until: iso })
          .eq('id', editing.sourceId));
    } else if (type === 'zadanie' || type === 'follow_up')
      ({ error } = await db
        .from('sales_activities')
        .insert({
          account_id: accountId,
          user_id: user.id,
          activity_type: type,
          title: title.trim(),
          description: note.trim() || null,
          activity_status: 'PLANOWANE',
          scheduled_at: iso,
          occurred_at: new Date().toISOString(),
          completed: false,
          contact_id: contactId || null,
          company_id: companyId || null,
          deal_id: dealId || null,
        }));
    else
      ({ error } = await db
        .from('calendar_events')
        .insert({
          account_id: accountId,
          user_id: user.id,
          title: title.trim(),
          event_type: type,
          starts_at: iso,
          description: note.trim() || null,
          contact_id: contactId || null,
          company_id: companyId || null,
          deal_id: dealId || null,
        }));
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Termin zmieniony.' : 'Zdarzenie dodane.');
    setOpen(false);
    await syncAndLoad();
  }
  async function complete() {
    if (!editing || editing.source !== 'activity') return;
    const { error } = await db
      .from('sales_activities')
      .update({
        activity_status: 'WYKONANE',
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', editing.sourceId);
    if (error) return toast.error(error.message);
    toast.success('Aktywność oznaczona jako wykonana.');
    setOpen(false);
    await load();
  }
  async function cancelEvent() {
    if (!editing || editing.source !== 'calendar') return;
    const now = new Date().toISOString();
    const { error } = await db
      .from('calendar_events')
      .update({
        status: 'anulowane',
        deleted_at: now,
        local_updated_at: now,
        sync_conflict: false,
        sync_conflict_reason: null,
      })
      .eq('id', editing.sourceId);
    if (error) return toast.error(error.message);
    setOpen(false);
    toast.success('Zdarzenie anulowane.');
    await syncAndLoad();
  }
  const shift = (n: number) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + n);
    else d.setDate(d.getDate() + n * (view === 'week' ? 7 : 1));
    setCursor(d);
  };
  return (
    <div className="space-y-4 p-3 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kalendarz</h1>
          <p className="text-muted-foreground text-sm">
            Spotkania, follow-upy, zadania i terminy sprzedażowe.
          </p>
        </div>
        <Button onClick={() => reset()}>
          <Plus className="size-4" />
          Dodaj
        </Button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2">
        <div className="flex">
          <Button size="sm" variant="ghost" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(new Date())}
          >
            Dziś
          </Button>
          <Button size="sm" variant="ghost" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>
        <p className="font-semibold capitalize">{rangeLabel(cursor, view)}</p>
        <div className="flex">
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? 'default' : 'ghost'}
              onClick={() => setView(v)}
            >
              {v === 'day' ? 'Dzień' : v === 'week' ? 'Tydzień' : 'Miesiąc'}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={
          view === 'month'
            ? 'bg-border grid grid-cols-7 gap-px overflow-hidden rounded-xl border'
            : view === 'week'
              ? 'grid gap-2 md:grid-cols-7'
              : 'space-y-2'
        }
      >
        {days.map((day) => (
          <Day
            key={dateKey(day)}
            day={day}
            items={visible.filter(
              (x) => dateKey(new Date(x.startsAt)) === dateKey(day)
            )}
            month={view === 'month'}
            names={names}
            onAdd={() => {
              const d = new Date(day);
              d.setHours(9, 0, 0, 0);
              reset(undefined, d);
            }}
            onOpen={reset}
          />
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Szczegóły i edycja' : 'Nowe zdarzenie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Tytuł *">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data i godzina *">
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onInput={(e) => setStartsAt(e.currentTarget.value)}
                />
              </Field>
              <Field label="Typ">
                <select
                  className="bg-background h-10 rounded-md border px-3"
                  value={type}
                  disabled={
                    editing?.source === 'deal' || editing?.source === 'queue'
                  }
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="spotkanie">Spotkanie</option>
                  <option value="telefon">Telefon</option>
                  <option value="zadanie">Zadanie</option>
                  <option value="follow_up">Follow-up</option>
                </select>
              </Field>
            </div>
            <Field label="Krótka notatka">
              <VoiceTextarea value={note} onChange={setNote} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Kontakt">
                <EntitySearchSelect
                  value={contactId}
                  onChange={setContactId}
                  placeholder="Wybierz Kontakt"
                  options={contacts.map((x) => ({
                    value: x.id,
                    label: x.name || x.phone,
                    keywords: x.phone,
                  }))}
                />
              </Field>
              <Field label="Firma">
                <EntitySearchSelect
                  value={companyId}
                  onChange={setCompanyId}
                  placeholder="Wybierz Firmę"
                  options={companies.map((x) => ({
                    value: x.id,
                    label: x.name,
                    keywords: x.nip ?? '',
                  }))}
                />
              </Field>
              <Field label="Deal">
                <EntitySearchSelect
                  value={dealId}
                  onChange={(v) => {
                    setDealId(v);
                    const d = deals.find((x) => x.id === v);
                    if (d?.contact_id) setContactId(d.contact_id);
                    if (d?.company_id) setCompanyId(d.company_id);
                  }}
                  placeholder="Wybierz Deal"
                  options={deals.map((x) => ({
                    value: x.id,
                    label: x.title,
                    keywords: `${x.contact?.name ?? ''} ${x.company?.name ?? ''}`,
                  }))}
                />
              </Field>
            </div>
            {editing && (
              <div className="flex flex-wrap gap-2 text-sm">
                {contactId && (
                  <Link
                    target="_blank"
                    className="text-primary font-semibold"
                    href={`/contacts?open=${contactId}`}
                  >
                    Otwórz Kontakt
                  </Link>
                )}
                {companyId && (
                  <Link
                    target="_blank"
                    className="text-primary font-semibold"
                    href={`/companies?open=${companyId}`}
                  >
                    Otwórz Firmę
                  </Link>
                )}
                {dealId && (
                  <Link
                    target="_blank"
                    className="text-primary font-semibold"
                    href={`/deals/${dealId}`}
                  >
                    Otwórz Deal
                  </Link>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {editing?.syncConflict && (
                <p className="mr-auto rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {editing.syncConflictReason || 'Zdarzenie zmieniono po obu stronach.'}{' '}
                  Sprawdź dane i kliknij Zapisz, aby wybrać wersję WaCRM.
                </p>
              )}
              {editing?.source === 'activity' &&
                editing.status !== 'WYKONANE' && (
                  <Button variant="outline" onClick={() => void complete()}>
                    Oznacz wykonane
                  </Button>
                )}
              {editing?.source === 'calendar' && (
                <Button variant="outline" onClick={() => void cancelEvent()}>
                  Anuluj zdarzenie
                </Button>
              )}
              <Button className="ml-auto" onClick={() => void save()}>
                Zapisz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Day({
  day,
  items,
  month,
  names,
  onAdd,
  onOpen,
}: {
  day: Date;
  items: Item[];
  month: boolean;
  names: {
    contacts: Map<string, string>;
    companies: Map<string, string>;
    deals: Map<string, string>;
  };
  onAdd: () => void;
  onOpen: (item: Item) => void;
}) {
  return (
    <section
      className={
        month ? 'bg-background min-h-28 p-1.5' : 'bg-card rounded-xl border p-2'
      }
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-bold capitalize">
          {day.toLocaleDateString('pl-PL', {
            timeZone: BUSINESS_TIME_ZONE,
            weekday: month ? undefined : 'short',
            day: 'numeric',
            month: month ? 'numeric' : 'short',
          })}
        </h2>
        <button
          aria-label={`Dodaj ${dateKey(day)}`}
          className="hover:bg-muted rounded p-1"
          onClick={onAdd}
        >
          <Plus className="size-3" />
        </button>
      </div>
      <div className="space-y-1">
        {items.map((x) => (
          <button
            key={x.id}
            onClick={() => onOpen(x)}
            className="w-full rounded border-l-2 border-emerald-700 bg-emerald-50 px-2 py-1 text-left"
          >
            <p className="truncate text-xs font-semibold">
              <Clock className="mr-1 inline size-3" />
              {new Date(x.startsAt).toLocaleTimeString('pl-PL', {
                timeZone: BUSINESS_TIME_ZONE,
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              {x.title}
            </p>
            {!month && (
              <p className="text-muted-foreground truncate text-[11px]">
                {x.dealId
                  ? names.deals.get(x.dealId)
                  : x.contactId
                    ? names.contacts.get(x.contactId)
                    : x.companyId
                      ? names.companies.get(x.companyId)
                      : ''}{' '}
                · {x.status ?? x.type}
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
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
    <div className="grid gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function dateKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function visibleRange(c: Date, v: View) {
  if (v === 'day') {
    const start = new Date(c);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (v === 'week') {
    const start = startOfWeek(c),
      end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = startOfWeek(new Date(c.getFullYear(), c.getMonth(), 1)),
    end = new Date(start);
  end.setDate(end.getDate() + 42);
  return { start, end };
}
function daysBetween(start: Date, end: Date) {
  const rows: Date[] = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1))
    rows.push(new Date(d));
  return rows;
}
function rangeLabel(d: Date, v: View) {
  if (v === 'day')
    return d.toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  if (v === 'month')
    return d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const s = startOfWeek(d),
    e = new Date(s);
  e.setDate(e.getDate() + 6);
  return `${s.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
function defaultInput() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toWarsawDateTimeInput(d);
}

