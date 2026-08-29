'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Phone,
  Save,
  Target,
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
import {
  buildPrioritySuggestions,
  type PriorityDeal,
} from '@/lib/sales/priorities';
import { buildCallRetryQueue } from '@/lib/sales/call-queue';

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
    [saving, setSaving] = useState(false),
    [callOpen, setCallOpen] = useState(false);
  const [callContactId, setCallContactId] = useState(''),
    [callCompanyId, setCallCompanyId] = useState(''),
    [callDealId, setCallDealId] = useState(''),
    [callNumber, setCallNumber] = useState(''),
    [callDescription, setCallDescription] = useState(''),
    [callResult, setCallResult] = useState('nie_odebral'),
    [callCategory, setCallCategory] = useState('Podajnik mBank'),
    [callProduct, setCallProduct] = useState(''),
    [callChannel, setCallChannel] = useState('telefon');

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
          'id,activity_type,occurred_at,phone_number,call_result,attempt_number,expires_at,contact_id,company_id,deal_id,title'
        )
        .eq('activity_type', 'telefon')
        .gte('occurred_at', queueStart)
        .order('occurred_at', { ascending: false }),
    ]);
    setDeals((dealRows.data ?? []) as Deal[]);
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
    setActivities((activityRows.data ?? []) as Activity[]);
    setCallHistory((callRows.data ?? []) as CallQueueActivity[]);
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
  }, [db, date]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
    const attemptNumber = Math.min(
      3,
      Number(previousAttempts?.[0]?.attempt_number || 0) + 1
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
      attempt_number: attemptNumber,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const { error } = await db.from('sales_activities').insert(base);
    if (error) toast.error(`Nie zapisano telefonu: ${error.message}`);
    else {
      toast.success('Telefon został zapisany i doliczony do celu dnia.');
      setCallOpen(false);
      setCallDescription('');
      setCallNumber('');
      await load();
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
    ),
    priorityDeal =
      overdue[0] ?? todayActions[0] ?? withoutAction[0] ?? deals[0];
  const calls = activities.filter(
    (row) => row.activity_type === 'telefon'
  ).length;
  const callQueue = buildCallRetryQueue(callHistory, now);
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
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pulpit — Mój dzień</h1>
          <p className="text-muted-foreground text-sm">
            Najważniejsze działania sprzedażowe na dziś.
          </p>
        </div>
        <Button onClick={() => setCallOpen(true)}>
          <Phone className="size-4" />
          Zarejestruj telefon
        </Button>
      </div>
      <section className="border-primary/40 bg-primary/5 rounded-2xl border-2 p-5">
        <div className="text-primary mb-2 flex items-center gap-2 text-xs font-bold uppercase">
          <Target className="size-4" />
          Co masz zrobić teraz
        </div>
        {priorityDeal ? (
          <>
            <h2 className="text-xl font-bold">
              {priorityDeal.next_action ||
                `Ustal następne działanie: ${priorityDeal.title}`}
            </h2>
            <p className="text-muted-foreground text-sm">
              {priorityDeal.contact?.name ||
                priorityDeal.company?.name ||
                priorityDeal.title}
              {priorityDeal.next_action_at
                ? ` · ${new Date(priorityDeal.next_action_at).toLocaleString('pl-PL')}`
                : ' · brak terminu'}
            </p>
            <Link
              href={`/deals/${priorityDeal.id}`}
              className="bg-primary text-primary-foreground mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Otwórz Deal
            </Link>
          </>
        ) : (
          <p>Brak otwartych Deali.</p>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
      <section className="bg-card rounded-xl border p-4">
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
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {callQueue.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{row.phone_number}</p>
                  <p className="text-muted-foreground text-xs">
                    Próba {row.attempt_number || 1} z 3
                  </p>
                </div>
                <a
                  href={`tel:${row.phone_number}`}
                  className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs font-semibold"
                >
                  Zadzwoń
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
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
                  onChange={setCallDealId}
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
                  <option value="niezainteresowany">
                    Niezainteresowany — zamknij
                  </option>
                </select>
              </Field>
              <Field label="Kategoria">
                <Input
                  value={callCategory}
                  onChange={(e) => setCallCategory(e.target.value)}
                />
              </Field>
              <Field label="Produkt">
                <Input
                  value={callProduct}
                  onChange={(e) => setCallProduct(e.target.value)}
                  placeholder="Np. limit firmowy, hipoteka"
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
