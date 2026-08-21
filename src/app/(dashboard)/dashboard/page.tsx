'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarDays, CheckCircle2, Phone, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Deal } from '@/types';

export default function DashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clock] = useState(() => ({ now: Date.now(), today: new Date().toISOString().slice(0, 10) }));
  useEffect(() => {
    const db = createClient();
    void db.from('deals').select('*, contact:contacts(*), company:companies(*), stage:pipeline_stages(*)').eq('status', 'open').order('next_action_at', { ascending: true, nullsFirst: false }).then(({ data }) => setDeals((data ?? []) as Deal[]));
  }, []);
  const overdue = useMemo(() => deals.filter((d) => d.next_action_at && new Date(d.next_action_at).getTime() < clock.now), [deals, clock.now]);
  const withoutAction = useMemo(() => deals.filter((d) => !d.next_action_at || !d.next_action), [deals]);
  const priority = overdue[0] ?? withoutAction[0] ?? deals[0];
  const todayActions = deals.filter((d) => d.next_action_at?.slice(0, 10) === clock.today);
  const meetings = deals.filter((d) => d.meeting_at?.slice(0, 10) === clock.today);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Pulpit — Mój dzień</h1><p className="mt-1 text-sm text-muted-foreground">Agent Sprzedaży porządkuje pracę według wpływu na sprzedaż i prowizję.</p></div>
      <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Target className="h-4 w-4" /> Co masz zrobić teraz</div>
        {priority ? <><h2 className="text-xl font-bold">{priority.next_action || `Ustal następne działanie: ${priority.title}`}</h2><p className="mt-1 text-sm text-muted-foreground">{priority.contact?.name || priority.company?.name || priority.title}{priority.next_action_at ? ` · termin ${new Date(priority.next_action_at).toLocaleString('pl-PL')}` : ' · brak terminu'}</p><Link href="/pipelines" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Otwórz Deal</Link></> : <p className="text-muted-foreground">Brak otwartych Deali. Zacznij od pozyskania nowego kontaktu.</p>}
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary icon={AlertCircle} label="Zaległe działania" value={overdue.length} tone="text-red-400" /><Summary icon={Phone} label="Działania na dziś" value={todayActions.length} /><Summary icon={CalendarDays} label="Spotkania dzisiaj" value={meetings.length} /><Summary icon={CheckCircle2} label="Bez następnego kroku" value={withoutAction.length} tone="text-amber-400" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><WorkList title="Pilne i zaległe" deals={overdue.slice(0, 6)} /><WorkList title="Dzisiejsze działania" deals={todayActions.slice(0, 6)} /></div>
      <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Cel dzienny</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><Goal label="Nowe telefony" current={0} target={10} /><Goal label="Wartościowe rozmowy" current={0} target={10} /><Goal label="Sprawy przesunięte o etap" current={0} target={1} /></div></section>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone = 'text-primary' }: { icon: typeof Phone; label: string; value: number; tone?: string }) { return <div className="rounded-xl border bg-card p-4"><Icon className={`mb-3 h-5 w-5 ${tone}`} /><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>; }
function WorkList({ title, deals }: { title: string; deals: Deal[] }) { return <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">{title}</h2>{deals.length === 0 ? <p className="text-sm text-muted-foreground">Brak spraw.</p> : <div className="space-y-2">{deals.map((deal) => <Link key={deal.id} href="/pipelines" className="block rounded-lg bg-muted/60 p-3 hover:bg-muted"><p className="text-sm font-medium">{deal.next_action || deal.title}</p><p className="text-xs text-muted-foreground">{deal.title} · {deal.contact?.name || deal.company?.name || 'bez kontaktu'}</p></Link>)}</div>}</section>; }
function Goal({ label, current, target }: { label: string; current: number; target: number }) { const width = Math.min(100, Math.round((current / target) * 100)); return <div><div className="flex justify-between text-sm"><span>{label}</span><span>{current}/{target}</span></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div>; }
