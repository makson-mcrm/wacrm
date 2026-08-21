'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Contact, Deal } from '@/types';

type CalendarEvent = { id: string; title: string; event_type: string; starts_at: string; ends_at?: string; description?: string; location?: string; deal_id?: string; contact_id?: string; derived?: boolean };

export default function CalendarPage() {
  const db = useMemo(() => createClient(), []); const { accountId } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]), [deals, setDeals] = useState<Deal[]>([]), [contacts, setContacts] = useState<Contact[]>([]), [open, setOpen] = useState(false), [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState(''), [type, setType] = useState('spotkanie'), [date, setDate] = useState(today()), [startTime, setStartTime] = useState('09:00'), [endTime, setEndTime] = useState('10:00'), [description, setDescription] = useState(''), [location, setLocation] = useState(''), [dealId, setDealId] = useState(''), [contactId, setContactId] = useState('');

  const load = useCallback(async () => {
    const [eventRows, dealRows, contactRows] = await Promise.all([
      db.from('calendar_events').select('*').order('starts_at'),
      db.from('deals').select('*,contact:contacts(*),company:companies(*),stage:pipeline_stages(*)').eq('status', 'open').order('title'),
      db.from('contacts').select('*').order('name'),
    ]);
    if (eventRows.error) toast.error('Nie udało się pobrać kalendarza.');
    const ds = (dealRows.data ?? []) as Deal[];
    const derived: CalendarEvent[] = [];
    for (const deal of ds) {
      if (deal.meeting_at) derived.push({ id: `meeting-${deal.id}`, title: `Spotkanie: ${deal.title}`, event_type: 'spotkanie', starts_at: deal.meeting_at, location: deal.meeting_place, deal_id: deal.id, contact_id: deal.contact_id ?? undefined, derived: true });
      if (deal.next_action_at) derived.push({ id: `action-${deal.id}`, title: deal.next_action || `Działanie: ${deal.title}`, event_type: 'zadanie', starts_at: deal.next_action_at, deal_id: deal.id, contact_id: deal.contact_id ?? undefined, derived: true });
      if (deal.follow_up_at) derived.push({ id: `follow-${deal.id}`, title: `Ponowny kontakt: ${deal.title}`, event_type: 'telefon', starts_at: deal.follow_up_at, deal_id: deal.id, contact_id: deal.contact_id ?? undefined, derived: true });
    }
    setDeals(ds); setContacts((contactRows.data ?? []) as Contact[]); setEvents([...(eventRows.data ?? []) as CalendarEvent[], ...derived].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)));
  }, [db]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const query = new URLSearchParams(window.location.search); if (query.get('new')) openNew(query.get('new') === 'task' ? 'zadanie' : 'spotkanie', query.get('deal') ?? ''); }, []);

  function openNew(eventType = 'spotkanie', linkedDeal = '') { setEditing(null); setTitle(''); setType(eventType); setDate(today()); setStartTime('09:00'); setEndTime('10:00'); setDescription(''); setLocation(''); setDealId(linkedDeal); const deal = deals.find((row) => row.id === linkedDeal); setContactId(deal?.contact_id ?? ''); setOpen(true); }
  function openEdit(event: CalendarEvent) { if (event.derived) { toast.info('Ten termin pochodzi z karty Deala. Edytuj go bezpośrednio na karcie Deala.'); return; } const start = new Date(event.starts_at), end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 60 * 60 * 1000); setEditing(event); setTitle(event.title); setType(event.event_type); setDate(localDate(start)); setStartTime(localTime(start)); setEndTime(localTime(end)); setDescription(event.description ?? ''); setLocation(event.location ?? ''); setDealId(event.deal_id ?? ''); setContactId(event.contact_id ?? ''); setOpen(true); }

  async function save() {
    if (!title.trim() || !date || !startTime || !accountId) { toast.error('Uzupełnij nazwę, datę i godzinę.'); return; }
    const { data: { session } } = await db.auth.getSession(); if (!session?.user) return;
    const startsAt = new Date(`${date}T${startTime}`).toISOString(), endsAt = new Date(`${date}T${endTime || startTime}`).toISOString();
    const payload = { title: title.trim(), event_type: type, starts_at: startsAt, ends_at: endsAt, description: description.trim() || null, location: location.trim() || null, deal_id: dealId || null, contact_id: contactId || null };
    const result = editing ? await db.from('calendar_events').update(payload).eq('id', editing.id) : await db.from('calendar_events').insert({ ...payload, account_id: accountId, user_id: session.user.id });
    if (result.error) toast.error(`Nie udało się zapisać: ${result.error.message}`); else { toast.success(editing ? 'Termin został zmieniony.' : 'Termin został dodany.'); setOpen(false); await load(); }
  }

  async function remove() { if (!editing) return; const { error } = await db.from('calendar_events').delete().eq('id', editing.id); if (error) toast.error('Nie udało się usunąć terminu.'); else { setOpen(false); await load(); } }

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((result, event) => { const key = new Date(event.starts_at).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); (result[key] ??= []).push(event); return result; }, {});
  return <div className="space-y-5 p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Kalendarz</h1><p className="text-sm text-muted-foreground">Spotkania, telefony, zadania i ponowne kontakty.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => openNew('zadanie')}><Plus className="size-4"/>Zadanie</Button><Button onClick={() => openNew('spotkanie')}><Plus className="size-4"/>Spotkanie</Button></div></div>
    {!events.length ? <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground"><CalendarDays className="mx-auto mb-3 size-10"/>Brak zaplanowanych terminów.</div> : Object.entries(grouped).map(([day, rows]) => <section key={day} className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold capitalize">{day}</h2><div className="space-y-2">{rows.map((event) => <button key={event.id} type="button" onClick={() => openEdit(event)} className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/60"><div className="rounded-md bg-primary/10 p-2 text-primary"><Clock className="size-4"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{event.title}</p><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{event.event_type}</span>{event.derived && <span className="text-xs text-muted-foreground">z Deala</span>}</div><p className="text-sm text-muted-foreground">{new Date(event.starts_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}{event.ends_at ? `–${new Date(event.ends_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>{event.description && <p className="mt-1 whitespace-pre-wrap text-sm">{event.description}</p>}{event.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3"/>{event.location}</p>}</div>{!event.derived && <Pencil className="size-4 text-muted-foreground"/>}</button>)}</div></section>)}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? 'Edytuj termin' : 'Nowy termin'}</DialogTitle></DialogHeader><div className="space-y-4"><Field label="Nazwa *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Np. Analiza hipoteczna — Jan Kowalski"/></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Rodzaj"><select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="spotkanie">Spotkanie</option><option value="telefon">Telefon</option><option value="zadanie">Zadanie</option></select></Field><Field label="Data *"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="Od"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}/></Field><Field label="Do"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}/></Field></div><Field label="Opis"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" placeholder="Cel spotkania, ustalenia lub zadanie do wykonania"/></Field><Field label="Miejsce lub link"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mielec, Rzeszów, online…"/></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Powiązany Deal"><select value={dealId} onChange={(e) => { setDealId(e.target.value); const linked = deals.find((row) => row.id === e.target.value); if (linked?.contact_id) setContactId(linked.contact_id); }} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Bez Deala</option>{deals.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Field><Field label="Powiązana osoba"><select value={contactId} onChange={(e) => setContactId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Bez osoby</option>{contacts.map((row) => <option key={row.id} value={row.id}>{row.name || row.phone}</option>)}</select></Field></div><div className="flex gap-2">{editing && <Button variant="destructive" onClick={remove}><Trash2 className="size-4"/>Usuń</Button>}<Button className="ml-auto" onClick={save}>Zapisz termin</Button></div></div></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>; }
function today() { return new Date().toLocaleDateString('sv-SE'); }
function localDate(date: Date) { return date.toLocaleDateString('sv-SE'); }
function localTime(date: Date) { return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }); }
