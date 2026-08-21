'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarDays, CheckCircle2, Phone, Save, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Contact, Deal } from '@/types';

type Priority = { position: number; title: string; completed: boolean; deal_id?: string | null };
type Activity = { activity_type: string; occurred_at: string };

export default function DashboardPage() {
  const db = useMemo(() => createClient(), []), { accountId } = useAuth();
  const date = useMemo(() => new Date().toLocaleDateString('sv-SE'), []), [now] = useState(() => Date.now());
  const [deals, setDeals] = useState<Deal[]>([]), [contacts, setContacts] = useState<Contact[]>([]), [priorities, setPriorities] = useState<Priority[]>(blankPriorities()), [activities, setActivities] = useState<Activity[]>([]), [saving, setSaving] = useState(false), [callOpen, setCallOpen] = useState(false);
  const [callContactId, setCallContactId] = useState(''), [callDealId, setCallDealId] = useState(''), [callDescription, setCallDescription] = useState(''), [meaningful, setMeaningful] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await db.auth.getSession(); if (!session?.user) return;
    const start = new Date(`${date}T00:00:00`).toISOString(), end = new Date(`${date}T23:59:59`).toISOString();
    const [dealRows, contactRows, priorityRows, activityRows] = await Promise.all([
      db.from('deals').select('*,contact:contacts(*),company:companies(*),stage:pipeline_stages(*)').eq('status', 'open').order('next_action_at', { ascending: true, nullsFirst: false }),
      db.from('contacts').select('*').order('name'),
      db.from('daily_priorities').select('*').eq('priority_date', date).eq('user_id', session.user.id).order('position'),
      db.from('sales_activities').select('activity_type,occurred_at').gte('occurred_at', start).lte('occurred_at', end),
    ]);
    setDeals((dealRows.data ?? []) as Deal[]); setContacts((contactRows.data ?? []) as Contact[]); setActivities((activityRows.data ?? []) as Activity[]);
    const rows = (priorityRows.data ?? []) as Priority[]; setPriorities([1,2,3,4,5,6].map((position) => rows.find((row) => row.position === position) ?? { position, title: '', completed: false, deal_id: null }));
  }, [db, date]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function savePriorities() {
    if (!accountId) return; setSaving(true);
    const { data: { session } } = await db.auth.getSession(); if (!session?.user) { setSaving(false); return; }
    const rows = priorities.map((row) => ({ ...row, account_id: accountId, user_id: session.user.id, priority_date: date }));
    const { error } = await db.from('daily_priorities').upsert(rows, { onConflict: 'account_id,user_id,priority_date,position' });
    setSaving(false); if (error) toast.error(`Nie zapisano priorytetów: ${error.message}`); else toast.success('Sześć priorytetów zostało zapisanych.');
  }

  async function registerCall() {
    if (!accountId) return; const { data: { session } } = await db.auth.getSession(); if (!session?.user) return;
    const contact = contacts.find((row) => row.id === callContactId), deal = deals.find((row) => row.id === callDealId);
    const base = { account_id: accountId, user_id: session.user.id, contact_id: callContactId || null, deal_id: callDealId || null, title: `Telefon: ${contact?.name || contact?.phone || deal?.title || 'bez powiązania'}`, description: callDescription.trim() || null, occurred_at: new Date().toISOString(), completed: true };
    const rows = [{ ...base, activity_type: 'telefon' }, ...(meaningful ? [{ ...base, activity_type: 'wartosciowa_rozmowa', title: `Wartościowa rozmowa: ${contact?.name || contact?.phone || deal?.title || 'bez powiązania'}` }] : [])];
    const { error } = await db.from('sales_activities').insert(rows); if (error) toast.error(`Nie zapisano telefonu: ${error.message}`); else { toast.success('Telefon został zapisany w wyniku dnia.'); setCallOpen(false); setCallDescription(''); setMeaningful(false); await load(); }
  }

  const overdue = deals.filter((deal) => deal.next_action_at && +new Date(deal.next_action_at) < now), todayActions = deals.filter((deal) => deal.next_action_at?.slice(0,10) === date), meetings = deals.filter((deal) => deal.meeting_at?.slice(0,10) === date), withoutAction = deals.filter((deal) => !deal.next_action_at || !deal.next_action), priorityDeal = overdue[0] ?? todayActions[0] ?? withoutAction[0] ?? deals[0];
  const calls = activities.filter((row) => row.activity_type === 'telefon').length, conversations = activities.filter((row) => row.activity_type === 'wartosciowa_rozmowa').length;
  return <div className="space-y-5 p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Pulpit — Mój dzień</h1><p className="text-sm text-muted-foreground">Najważniejsze działania sprzedażowe na dziś.</p></div><Button onClick={() => setCallOpen(true)}><Phone className="size-4"/>Zarejestruj telefon</Button></div>
    <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary"><Target className="size-4"/>Co masz zrobić teraz</div>{priorityDeal ? <><h2 className="text-xl font-bold">{priorityDeal.next_action || `Ustal następne działanie: ${priorityDeal.title}`}</h2><p className="text-sm text-muted-foreground">{priorityDeal.contact?.name || priorityDeal.company?.name || priorityDeal.title}{priorityDeal.next_action_at ? ` · ${new Date(priorityDeal.next_action_at).toLocaleString('pl-PL')}` : ' · brak terminu'}</p><Link href={`/deals/${priorityDeal.id}`} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Otwórz Deal</Link></> : <p>Brak otwartych Deali.</p>}</section>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Telefony" value={calls} note="rejestrowane przyciskiem"/><Metric label="Wartościowe rozmowy" value={conversations}/><Metric label="Spotkania dziś" value={meetings.length}/><Metric label="Działania dziś" value={todayActions.length}/><Metric label="Zaległe" value={overdue.length}/><Metric label="Bez następnego kroku" value={withoutAction.length}/></div>
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]"><section className="rounded-xl border bg-card p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Sześć priorytetów Ivy Lee</h2><p className="text-xs text-muted-foreground">Wpisujesz je sam. System zapisuje je dopiero po naciśnięciu „Zapisz sześć priorytetów”.</p></div><Button onClick={savePriorities} disabled={saving}><Save className="size-4"/>{saving ? 'Zapisywanie…' : 'Zapisz'}</Button></div><div className="space-y-2">{priorities.map((row, index) => <div key={row.position} className="grid grid-cols-[32px_32px_1fr] items-center gap-2 rounded-lg border p-2"><span className="text-center font-bold text-primary">{row.position}</span><input type="checkbox" checked={row.completed} onChange={(e) => setPriorities((items) => items.map((item, i) => i === index ? { ...item, completed: e.target.checked } : item))}/><Input value={row.title} onChange={(e) => setPriorities((items) => items.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} placeholder="Najważniejsze zadanie"/></div>)}</div></section>
      <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">Kontrola dnia</h2><Status icon={AlertCircle} label="Zaległe działania" count={overdue.length} href="/pipelines"/><Status icon={CalendarDays} label="Spotkania dzisiaj" count={meetings.length} href="/calendar"/><Status icon={CheckCircle2} label="Deale bez następnego kroku" count={withoutAction.length} href="/pipelines"/></section></div>
    <Dialog open={callOpen} onOpenChange={setCallOpen}><DialogContent><DialogHeader><DialogTitle>Zarejestruj wykonany telefon</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Dodanie nowego numeru do Kontaktów nie zwiększa licznika. Liczy się wykonany telefon zapisany tutaj.</p><div className="space-y-3"><Field label="Osoba"><select value={callContactId} onChange={(e) => setCallContactId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Bez osoby</option>{contacts.map((row) => <option key={row.id} value={row.id}>{row.name || row.phone}</option>)}</select></Field><Field label="Deal"><select value={callDealId} onChange={(e) => setCallDealId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Bez Deala</option>{deals.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Field><Field label="Krótki wynik rozmowy"><Textarea value={callDescription} onChange={(e) => setCallDescription(e.target.value)} /></Field><label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={meaningful} onChange={(e) => setMeaningful(e.target.checked)}/>To była wartościowa rozmowa sprzedażowa</label><Button onClick={registerCall} className="w-full">Zapisz telefon</Button></div></DialogContent></Dialog>
  </div>;
}

function blankPriorities(): Priority[] { return [1,2,3,4,5,6].map((position) => ({ position, title: '', completed: false, deal_id: null })); }
function Metric({ label, value, note }: { label: string; value: number; note?: string }) { return <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p>{note && <p className="text-[10px] text-muted-foreground">{note}</p>}</div>; }
function Status({ icon: Icon, label, count, href }: { icon: typeof AlertCircle; label: string; count: number; href: string }) { return <Link href={href} className="mb-2 flex items-center justify-between rounded-lg border p-3 hover:bg-muted"><span className="flex items-center gap-2 text-sm"><Icon className="size-4"/>{label}</span><strong>{count}</strong></Link>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>; }
