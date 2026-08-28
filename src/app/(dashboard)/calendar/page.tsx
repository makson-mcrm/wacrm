'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
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

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at?: string;
  description?: string;
  location?: string;
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  derived?: boolean;
};

export default function CalendarPage() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]),
    [deals, setDeals] = useState<Deal[]>([]),
    [contacts, setContacts] = useState<Contact[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<CalendarEvent | null>(null),
    [syncingGoogle, setSyncingGoogle] = useState(false);
  const [title, setTitle] = useState(''),
    [type, setType] = useState('spotkanie'),
    [startsAt, setStartsAt] = useState(defaultDateTime()),
    [description, setDescription] = useState(''),
    [location, setLocation] = useState(''),
    [dealId, setDealId] = useState(''),
    [contactId, setContactId] = useState(''),
    [companyId, setCompanyId] = useState('');

  const load = useCallback(async () => {
    const [eventRows, dealRows, contactRows, companyRows] = await Promise.all([
      db.from('calendar_events').select('*').order('starts_at'),
      db
        .from('deals')
        .select(
          '*,contact:contacts(*),company:companies(*),stage:pipeline_stages(*)'
        )
        .eq('status', 'open')
        .order('title'),
      db.from('contacts').select('*').order('name'),
      db.from('companies').select('*').order('name'),
    ]);
    if (eventRows.error) toast.error('Nie udało się pobrać kalendarza.');
    const ds = (dealRows.data ?? []) as Deal[];
    const derived: CalendarEvent[] = [];
    for (const deal of ds) {
      if (deal.meeting_at)
        derived.push({
          id: `meeting-${deal.id}`,
          title: `Spotkanie: ${deal.title}`,
          event_type: 'spotkanie',
          starts_at: deal.meeting_at,
          location: deal.meeting_place,
          deal_id: deal.id,
          contact_id: deal.contact_id ?? undefined,
          derived: true,
        });
      if (deal.next_action_at)
        derived.push({
          id: `action-${deal.id}`,
          title: deal.next_action || `Działanie: ${deal.title}`,
          event_type: 'zadanie',
          starts_at: deal.next_action_at,
          deal_id: deal.id,
          contact_id: deal.contact_id ?? undefined,
          derived: true,
        });
      if (deal.follow_up_at)
        derived.push({
          id: `follow-${deal.id}`,
          title: `Ponowny kontakt: ${deal.title}`,
          event_type: 'telefon',
          starts_at: deal.follow_up_at,
          deal_id: deal.id,
          contact_id: deal.contact_id ?? undefined,
          derived: true,
        });
    }
    setDeals(ds);
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
    setEvents(
      [...((eventRows.data ?? []) as CalendarEvent[]), ...derived].sort(
        (a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)
      )
    );
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);
  const openNew = useCallback(
    (eventType = 'spotkanie', linkedDeal = '') => {
      setEditing(null);
      setTitle('');
      setType(eventType);
      setStartsAt(defaultDateTime());
      setDescription('');
      setLocation('');
      setDealId(linkedDeal);
      const deal = deals.find((row) => row.id === linkedDeal);
      setContactId(deal?.contact_id ?? '');
      setCompanyId(deal?.company_id ?? '');
      setOpen(true);
    },
    [deals]
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('new'))
      openNew(
        query.get('new') === 'task' ? 'zadanie' : 'spotkanie',
        query.get('deal') ?? ''
      );
  }, [openNew]);
  function openEdit(event: CalendarEvent) {
    if (event.derived) {
      toast.info(
        'Ten termin pochodzi z karty Deala. Edytuj go bezpośrednio na karcie Deala.'
      );
      return;
    }
    setEditing(event);
    setTitle(event.title);
    setType(event.event_type);
    setStartsAt(localDateTime(new Date(event.starts_at)));
    setDescription(event.description ?? '');
    setLocation(event.location ?? '');
    setDealId(event.deal_id ?? '');
    setContactId(event.contact_id ?? '');
    setCompanyId(event.company_id ?? '');
    setOpen(true);
  }

  async function save() {
    if (!title.trim() || !startsAt || !accountId) {
      toast.error('Uzupełnij nazwę oraz termin.');
      return;
    }
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    const payload = {
      title: title.trim(),
      event_type: type,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: null,
      description: description.trim() || null,
      location: location.trim() || null,
      deal_id: dealId || null,
      contact_id: contactId || null,
      company_id: companyId || null,
    };
    const result = editing
      ? await db.from('calendar_events').update(payload).eq('id', editing.id)
      : await db.from('calendar_events').insert({
          ...payload,
          account_id: accountId,
          user_id: session.user.id,
        });
    if (result.error)
      toast.error(`Nie udało się zapisać: ${result.error.message}`);
    else {
      toast.success(
        editing ? 'Termin został zmieniony.' : 'Termin został dodany.'
      );
      setOpen(false);
      await load();
    }
  }

  async function remove() {
    if (!editing) return;
    const { error } = await db
      .from('calendar_events')
      .delete()
      .eq('id', editing.id);
    if (error) toast.error('Nie udało się usunąć terminu.');
    else {
      setOpen(false);
      await load();
    }
  }

  async function syncGoogle() {
    setSyncingGoogle(true);
    const response = await fetch('/api/google-calendar/sync', {
      method: 'POST',
    });
    const result = (await response.json().catch(() => ({}))) as {
      pushed?: number;
      pulled?: number;
      error?: string;
    };
    setSyncingGoogle(false);
    if (!response.ok) {
      toast.error(result.error || 'Nie udało się zsynchronizować kalendarza.');
      return;
    }
    toast.success(
      `Kalendarz zsynchronizowany: wysłano ${result.pushed ?? 0}, pobrano ${result.pulled ?? 0}.`
    );
    await load();
  }

  const grouped = events.reduce<Record<string, CalendarEvent[]>>(
    (result, event) => {
      const key = new Date(event.starts_at).toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      (result[key] ??= []).push(event);
      return result;
    },
    {}
  );
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kalendarz</h1>
          <p className="text-muted-foreground text-sm">
            Spotkania, telefony, zadania i ponowne kontakty.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={syncingGoogle}
            onClick={() => void syncGoogle()}
          >
            <CalendarDays className="size-4" />
            {syncingGoogle ? 'Synchronizuję…' : 'Synchronizuj Google'}
          </Button>
          <Button variant="outline" onClick={() => openNew('zadanie')}>
            <Plus className="size-4" />
            Zadanie
          </Button>
          <Button onClick={() => openNew('spotkanie')}>
            <Plus className="size-4" />
            Spotkanie
          </Button>
        </div>
      </div>
      {!events.length ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center">
          <CalendarDays className="mx-auto mb-3 size-10" />
          Brak zaplanowanych terminów.
        </div>
      ) : (
        Object.entries(grouped).map(([day, rows]) => (
          <section key={day} className="bg-card rounded-xl border p-4">
            <h2 className="mb-3 font-semibold capitalize">{day}</h2>
            <div className="space-y-2">
              {rows.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEdit(event)}
                  className="hover:bg-muted/60 flex w-full items-start gap-3 rounded-lg border p-3 text-left"
                >
                  <div className="bg-primary/10 text-primary rounded-md p-2">
                    <Clock className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{event.title}</p>
                      <span className="bg-muted rounded-full px-2 py-0.5 text-xs">
                        {event.event_type}
                      </span>
                      {event.derived && (
                        <span className="text-muted-foreground text-xs">
                          z Deala
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {new Date(event.starts_at).toLocaleTimeString('pl-PL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {event.ends_at
                        ? `–${new Date(event.ends_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </p>
                    {event.description && (
                      <p className="mt-1 text-sm whitespace-pre-wrap">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                        <MapPin className="size-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                  {!event.derived && (
                    <Pencil className="text-muted-foreground size-4" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edytuj' : 'Nowe'}:{' '}
              {type === 'spotkanie'
                ? 'spotkanie'
                : type === 'telefon'
                  ? 'telefon'
                  : 'zadanie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nazwa *">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. Analiza hipoteczna — Jan Kowalski"
              />
            </Field>
            <Field label="Data i godzina *">
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </Field>
            <Field label="Rodzaj zdarzenia *">
              <select
                className="bg-muted h-10 rounded-md border px-3 text-sm"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="spotkanie">Spotkanie</option>
                <option value="telefon">Telefon</option>
                <option value="zadanie">Zadanie</option>
                <option value="follow_up">Ponowny kontakt</option>
              </select>
            </Field>
            <Field label="Opis">
              <VoiceTextarea
                value={description}
                onChange={setDescription}
                className="min-h-24"
                placeholder="Cel spotkania, ustalenia lub zadanie do wykonania"
              />
            </Field>
            {type === 'spotkanie' && (
              <Field label="Miejsce lub link">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mielec, Rzeszów, online…"
                />
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Powiązany Deal">
                <EntitySearchSelect
                  value={dealId}
                  onChange={(value) => {
                    setDealId(value);
                    const linked = deals.find((row) => row.id === value);
                    if (linked?.contact_id) setContactId(linked.contact_id);
                    if (linked?.company_id) setCompanyId(linked.company_id);
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
              <Field label="Powiązana osoba">
                <EntitySearchSelect
                  value={contactId}
                  onChange={setContactId}
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
              <Field label="Powiązana firma">
                <EntitySearchSelect
                  value={companyId}
                  onChange={setCompanyId}
                  placeholder="Wyszukaj firmę"
                  options={companies.map((row) => ({
                    value: row.id,
                    label: row.name,
                    keywords: `${row.nip ?? ''} ${row.phone ?? ''}`,
                  }))}
                  onAdd={() => window.open('/companies?new=company', '_blank')}
                  addLabel="Dodaj firmę"
                />
              </Field>
            </div>
            <div className="flex gap-2">
              {editing && (
                <Button variant="destructive" onClick={remove}>
                  <Trash2 className="size-4" />
                  Usuń
                </Button>
              )}
              <Button className="ml-auto" onClick={save}>
                Zapisz termin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
function defaultDateTime() {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return localDateTime(date);
}
function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
