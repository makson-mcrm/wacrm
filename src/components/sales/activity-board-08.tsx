'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  CheckSquare,
  FilePlus2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { CallAction } from '@/components/sales/call-action';
import type { Contact, Deal, PipelineStage } from '@/types';
import { warsawDateTimeInputToIso } from '@/lib/date-time';
import {
  activityContextReturnPath,
  buildContactActivityUpdate,
  buildDealActivityUpdate,
  normalizeActivityPhone,
} from '@/lib/sales/quick-activity';

type ActionKind = 'TELEFON' | 'SPOTKANIE' | 'EMAIL' | 'WIADOMOSC' | 'INNY_KONTAKT';
type ActivityRow = {
  id: string;
  title: string;
  occurred_at: string;
  activity_type: string;
  description?: string | null;
  call_result?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  blocker?: string | null;
};

const ACTIVITY_08_DEMO_ACCOUNT_ID = '00000000-0000-4000-8000-000000000008';
const ACTIVITY_08_DEMO_CONTACT: Contact = {
  id: '00000000-0000-4000-8000-000000000108',
  user_id: '00000000-0000-4000-8000-000000000208',
  account_id: ACTIVITY_08_DEMO_ACCOUNT_ID,
  name: 'Tomasz Skowroński',
  phone: '+48 537 357 757',
  company: 'KOLOR-MET TOMASZ Sp. z o.o.',
  email: 'test-aktywnosc08@example.invalid',
  source: 'Test roboczy 08',
  product_category: 'NML — OFF',
  created_at: '2026-09-01T08:00:00.000Z',
  updated_at: '2026-09-26T20:00:00.000Z',
};
const ACTIVITY_08_DEMO_DEAL: Deal = {
  id: '00000000-0000-4000-8000-000000000308',
  user_id: ACTIVITY_08_DEMO_CONTACT.user_id,
  pipeline_id: '00000000-0000-4000-8000-000000000408',
  stage_id: '00000000-0000-4000-8000-000000000508',
  contact_id: ACTIVITY_08_DEMO_CONTACT.id,
  title: 'KONSOLA prywatna',
  value: 460000,
  currency: 'PLN',
  product_type: 'NML — OFF',
  source: 'Test roboczy 08',
  tracking_number: 'DEAL-2026-017',
  status: 'open',
  created_at: '2026-09-01T08:00:00.000Z',
  updated_at: '2026-09-26T20:00:00.000Z',
};
const ACTIVITY_08_DEMO_HISTORY: ActivityRow[] = [
  { id: 'demo-history-1', title: 'Spotkanie online — wnioski', occurred_at: '2026-09-10T08:00:00.000Z', activity_type: 'spotkanie' },
  { id: 'demo-history-2', title: 'Wysłano ofertę', occurred_at: '2026-09-08T08:00:00.000Z', activity_type: 'wiadomosc' },
  { id: 'demo-history-3', title: 'Rozmowa telefoniczna', occurred_at: '2026-09-05T08:00:00.000Z', activity_type: 'telefon' },
  { id: 'demo-history-4', title: 'Notatka — analiza zgodności', occurred_at: '2026-09-02T08:00:00.000Z', activity_type: 'notatka' },
  { id: 'demo-history-5', title: 'Dodano dokument wyciąg.pdf', occurred_at: '2026-08-28T08:00:00.000Z', activity_type: 'dokument' },
];
const ACTIVITY_08_DEMO_STAGE: PipelineStage = {
  id: ACTIVITY_08_DEMO_DEAL.stage_id,
  pipeline_id: ACTIVITY_08_DEMO_DEAL.pipeline_id,
  name: '5. WNIOSKI / DECYZJA',
  position: 5,
  color: '#047857',
  created_at: '2026-09-01T08:00:00.000Z',
};

const OUTCOMES = [
  ['odebral', 'Odebrał'],
  ['nie_odebral', 'Nie odebrał'],
  ['oddzwonic', 'Oddzwonić'],
] as const;

function contactName(contact?: Contact | null) {
  if (!contact) return '';
  return contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.phone || 'Kontakt';
}

function actionDbType(action: ActionKind) {
  if (action === 'EMAIL') return 'wiadomosc';
  return action.toLocaleLowerCase('pl');
}

export function ActivityBoard08({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const { accountId: authenticatedAccountId } = useAuth();
  const accountId = demo ? ACTIVITY_08_DEMO_ACCOUNT_ID : authenticatedAccountId;
  const [contacts, setContacts] = useState<Contact[]>(demo ? [ACTIVITY_08_DEMO_CONTACT] : []);
  const [deals, setDeals] = useState<Deal[]>(demo ? [ACTIVITY_08_DEMO_DEAL] : []);
  const [stages, setStages] = useState<PipelineStage[]>(demo ? [ACTIVITY_08_DEMO_STAGE] : []);
  const [activities, setActivities] = useState<ActivityRow[]>(demo ? ACTIVITY_08_DEMO_HISTORY : []);
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState(demo ? ACTIVITY_08_DEMO_CONTACT.id : '');
  const [dealId, setDealId] = useState(demo ? ACTIVITY_08_DEMO_DEAL.id : '');
  const [action, setAction] = useState<ActionKind>('TELEFON');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [blocker, setBlocker] = useState('');
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [stageId, setStageId] = useState(demo ? ACTIVITY_08_DEMO_STAGE.id : '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creatingContact, setCreatingContact] = useState(false);

  const selectedContact = contacts.find((row) => row.id === contactId) ?? null;
  const selectedDeal = deals.find((row) => row.id === dealId) ?? null;
  const contactDeals = selectedContact
    ? deals.filter((deal) => deal.contact_id === selectedContact.id && deal.status === 'open')
    : [];
  const rawPhone = /^\+?[\d\s()-]{6,}$/.test(query.trim()) ? query.trim() : '';

  const load = useCallback(async () => {
    if (demo) return;
    if (!accountId) return;
    const [contactRows, dealRows, stageRows] = await Promise.all([
      db.from('contacts').select('*').eq('account_id', accountId).order('name'),
      db.from('deals').select('*').eq('account_id', accountId).order('updated_at', { ascending: false }),
      db.from('pipeline_stages').select('*').order('position'),
    ]);
    const error = contactRows.error || dealRows.error || stageRows.error;
    if (error) return toast.error(`Nie udało się wczytać AKTYWNOŚCI: ${error.message}`);
    setContacts((contactRows.data ?? []) as Contact[]);
    setDeals((dealRows.data ?? []) as Deal[]);
    setStages((stageRows.data ?? []) as PipelineStage[]);
  }, [accountId, db, demo]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    if (demo) {
      void fetch('/api/activity08-demo')
        .then((response) => response.ok ? response.json() : null)
        .then((saved: ActivityRow[] | null) => setActivities(saved ?? ACTIVITY_08_DEMO_HISTORY))
        .catch(() => setActivities(ACTIVITY_08_DEMO_HISTORY));
      return;
    }
    if (!accountId || (!contactId && !dealId)) {
      setActivities([]);
      return;
    }
    let request = db
      .from('sales_activities')
      .select('id,title,occurred_at,activity_type,description,call_result,next_action,next_action_date')
      .eq('account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(5);
    request = dealId ? request.eq('deal_id', dealId) : request.eq('contact_id', contactId);
    void request.then(({ data }) => setActivities((data ?? []) as ActivityRow[]));
  }, [accountId, contactId, db, dealId, demo]);

  useEffect(() => {
    if (!selectedDeal) {
      setStageId('');
      setBlocker('');
      return;
    }
    setStageId(selectedDeal.stage_id);
    setBlocker(selectedDeal.blocker || '');
    setNextAction(selectedDeal.next_action || '');
    setNextAt(selectedDeal.next_action_at ? selectedDeal.next_action_at.slice(0, 16) : '');
  }, [selectedDeal]);

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pl');
    const digits = normalizeActivityPhone(query);
    if (q.length < 3 && digits.length < 3) return [];
    const contactMatches = contacts
      .filter((contact) => {
        const hay = `${contactName(contact)} ${contact.phone || ''} ${contact.email || ''}`.toLocaleLowerCase('pl');
        return hay.includes(q) || (digits.length >= 3 && normalizeActivityPhone(contact.phone || '').includes(digits));
      })
      .slice(0, 5)
      .map((contact) => ({ kind: 'contact' as const, id: contact.id, label: contactName(contact), sub: contact.phone || contact.email || 'Kontakt' }));
    const dealMatches = deals
      .filter((deal) => deal.title.toLocaleLowerCase('pl').includes(q))
      .slice(0, 4)
      .map((deal) => ({ kind: 'deal' as const, id: deal.id, label: deal.title, sub: [deal.product_type, deal.source].filter(Boolean).join(' · ') || 'Deal' }));
    return [...contactMatches, ...dealMatches].slice(0, 8);
  }, [contacts, deals, query]);

  function chooseContact(id: string) {
    const contact = contacts.find((row) => row.id === id);
    if (!contact) return;
    const active = deals.filter((deal) => deal.contact_id === id && deal.status === 'open');
    setContactId(id);
    setDealId(active.length === 1 ? active[0].id : '');
    setQuery('');
  }

  function chooseDeal(id: string) {
    const deal = deals.find((row) => row.id === id);
    if (!deal) return;
    setDealId(id);
    if (deal.contact_id) setContactId(deal.contact_id);
    setQuery('');
  }

  async function createContactFromPhone() {
    const phoneToCreate = newPhone.trim() || rawPhone;
    if (!accountId || !newName.trim() || !phoneToCreate || creatingContact) return;
    const session = (await db.auth.getSession()).data.session;
    if (!session?.user) return;
    setCreatingContact(true);
    try {
      const { data, error } = await db
        .from('contacts')
        .insert({ account_id: accountId, user_id: session.user.id, name: newName.trim(), phone: phoneToCreate })
        .select('*')
        .single();
      if (error) throw error;
      const contact = data as Contact;
      setContacts((rows) => [...rows, contact]);
      setContactId(contact.id);
      setDealId('');
      setQuery('');
      setNewName('');
      setNewPhone('');
      toast.success('Kontakt utworzony. Możesz zapisać rozmowę.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie utworzono Kontaktu.');
    } finally {
      setCreatingContact(false);
    }
  }

  async function uploadDocument(file: File) {
    if (!accountId || !selectedContact || uploading) return;
    const session = (await db.auth.getSession()).data.session;
    if (!session?.user) return;
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const ownerPath = dealId || `contacts/${selectedContact.id}`;
      const storagePath = `${accountId}/${ownerPath}/${crypto.randomUUID()}-${safe}`;
      const uploaded = await db.storage.from('deal-documents').upload(storagePath, file);
      if (uploaded.error) throw uploaded.error;
      if (dealId) {
        const row = await db.from('deal_documents').insert({
          account_id: accountId,
          deal_id: dealId,
          user_id: session.user.id,
          name: file.name,
          storage_path: storagePath,
          status: 'otrzymany',
          document_type: file.type || 'plik',
          received_at: new Date().toISOString(),
          source_channel: 'activity',
        });
        if (row.error) throw row.error;
      }
      toast.success('Dokument dodany.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie dodano dokumentu.');
    } finally {
      setUploading(false);
    }
  }

  async function saveActivity() {
    if (!accountId || !selectedContact || saving) return toast.error('Wybierz klienta.');
    if (contactDeals.length > 1 && !selectedDeal) return toast.error('Wybierz konkretny Deal.');
    if (action === 'TELEFON' && !result) return toast.error('Wybierz wynik rozmowy.');
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const nextIso = nextAt ? warsawDateTimeInputToIso(nextAt) : null;
      if (demo) {
        const row: ActivityRow = {
          id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `demo-${Date.now()}`,
          title: `${action.replaceAll('_', ' ')} — ${contactName(selectedContact)}`,
          occurred_at: now,
          activity_type: actionDbType(action),
          description: note.trim() || null,
          call_result: action === 'TELEFON' ? result : null,
          next_action: nextAction.trim() || null,
          next_action_date: nextIso,
          blocker: blocker.trim() || null,
        };
        const persistedRows = [row, ...activities].slice(0, 5);
        const response = await fetch('/api/activity08-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(persistedRows),
        });
        if (!response.ok) throw new Error('Nie zapisano testu roboczego.');
        setActivities(persistedRows);
        toast.success('Aktywność testowa zapisana trwale w środowisku roboczym.');
        return;
      }

      const session = (await db.auth.getSession()).data.session;
      if (!session?.user) return;
      const { error } = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: session.user.id,
        activity_type: actionDbType(action),
        activity_status: 'WYKONANE',
        objective_type: 'NOWE_POZYSKANIE',
        contact_id: selectedContact.id,
        company_id: selectedDeal?.company_id || null,
        deal_id: selectedDeal?.id || null,
        phone_number: selectedContact.phone || null,
        title: `${action.replaceAll('_', ' ')} — ${contactName(selectedContact)}`,
        description: note.trim() || null,
        occurred_at: now,
        completed_at: now,
        completed: true,
        call_result: action === 'TELEFON' ? result : null,
        call_channel: action === 'TELEFON' ? 'telefon' : action === 'SPOTKANIE' ? 'spotkanie' : action === 'EMAIL' ? 'email' : action === 'WIADOMOSC' ? 'wiadomosc' : 'inny',
        source: selectedDeal?.source || selectedContact.source || null,
        product_group: selectedDeal?.product_type || selectedContact.product_category || null,
        next_action: nextAction.trim() || null,
        next_action_date: nextIso,
        next_contact_at: nextIso,
        next_contact_reason: nextAction.trim() || note.trim() || null,
      });
      if (error) throw error;

      const contactUpdate = buildContactActivityUpdate({
        contactResult: action === 'TELEFON' ? result : 'WYKONANE',
        nextAction: nextAction.trim(),
        nextActionAt: nextIso,
      });
      await db.from('contacts').update(contactUpdate).eq('account_id', accountId).eq('id', selectedContact.id);

      if (selectedDeal) {
        const dealUpdate: Record<string, string | null> = buildDealActivityUpdate({
          nextAction: nextAction.trim(),
          nextActionAt: nextIso,
          blocker: blocker.trim(),
          blockerSince: selectedDeal.blocker_since || now,
        });
        if (stageId && stageId !== selectedDeal.stage_id) dealUpdate.stage_id = stageId;
        await db.from('deals').update(dealUpdate).eq('account_id', accountId).eq('id', selectedDeal.id);
      }

      toast.success('Aktywność zapisana.');
      router.replace(activityContextReturnPath({ contactId: selectedContact.id, dealId: selectedDeal?.id }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie zapisano aktywności.');
    } finally {
      setSaving(false);
    }
  }

  async function closeDeal(status: 'won' | 'lost') {
    if (!accountId || !selectedDeal) return;
    if (demo) {
      setDeals((rows) => rows.map((row) => row.id === selectedDeal.id ? { ...row, status } : row));
      toast.success(status === 'won' ? 'Deal testowy zamknięty jako wygrany.' : 'Deal testowy zamknięty jako przegrany.');
      return;
    }
    const { error } = await db.from('deals').update({ status }).eq('account_id', accountId).eq('id', selectedDeal.id);
    if (error) return toast.error(error.message);
    toast.success(status === 'won' ? 'Deal zamknięty jako wygrany.' : 'Deal zamknięty jako przegrany.');
    await load();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-24 text-slate-950 lg:pb-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#0b1b55]">Aktywność</h1>
        <p className="text-sm text-slate-500">Rozmawiaj, notuj i działaj szybciej</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 text-sm font-semibold">
        <span className="whitespace-nowrap rounded-lg bg-emerald-50 px-4 py-2 text-emerald-900">Nowa aktywność</span>
        <span className="whitespace-nowrap rounded-lg bg-slate-100 px-4 py-2 text-slate-600">Historia aktywności</span>
        <span className="whitespace-nowrap rounded-lg bg-slate-100 px-4 py-2 text-slate-600">Notatki i pliki</span>
        <span className="whitespace-nowrap rounded-lg bg-slate-100 px-4 py-2 text-slate-600">Zadania po rozmowie</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="font-black text-[#0b1b55]">1. Wybierz klienta i deal</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 size-5 text-blue-600" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj klienta, wpisz numer telefonu..." className="h-12 pl-10 text-base" />
          </div>
          {matches.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              {matches.map((match) => (
                <button key={`${match.kind}-${match.id}`} type="button" onClick={() => match.kind === 'contact' ? chooseContact(match.id) : chooseDeal(match.id)} className="block min-h-12 w-full border-b px-3 py-2 text-left last:border-0 hover:bg-emerald-50">
                  <span className="block font-bold">{match.label}</span>
                  <span className="block text-xs text-slate-500">{match.sub}</span>
                </button>
              ))}
            </div>
          )}

          {!selectedContact && rawPhone && matches.length === 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-900">Nowy numer — możesz zadzwonić przed utworzeniem Kontaktu.</p>
              <CallAction phone={rawPhone} size="lg" className="h-11 w-full bg-emerald-800 text-white" />
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Imię i nazwisko po rozmowie" />
              <Input value={newPhone || rawPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Telefon" />
              <Button type="button" variant="outline" onClick={() => void createContactFromPhone()} className="w-full">Utwórz Kontakt</Button>
            </div>
          )}

          {selectedContact && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-12 border-2 border-white shadow-sm">
                    {selectedContact.avatar_url ? <AvatarImage src={selectedContact.avatar_url} alt={contactName(selectedContact)} /> : null}
                    <AvatarFallback className="bg-emerald-100 font-black text-emerald-900">{contactName(selectedContact).split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#0b1b55]">{contactName(selectedContact)}</p>
                    <a href={`tel:${selectedContact.phone}`} className="text-sm text-blue-700 hover:underline">{selectedContact.phone}</a>
                    <p className="truncate text-xs text-slate-500">{selectedContact.company || selectedContact.email || ''}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setContactId(''); setDealId(''); }} className="p-2 text-slate-400"><X className="size-4" /></button>
              </div>
            </div>
          )}

          {selectedContact && contactDeals.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Deal</span>
                  {selectedDeal && <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-[#0b1b55]">{selectedDeal.tracking_number || `DEAL-${selectedDeal.id.slice(0, 7).toUpperCase()}`}</span>}
                </div>
                <select value="" onChange={(e) => { if (e.target.value) setDealId(e.target.value); }} aria-label="Zmień Deal" className="max-w-[110px] rounded-md border bg-white px-2 py-1 text-xs font-bold text-blue-700">
                  <option value="">Zmień ›</option>
                  {contactDeals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}
                </select>
              </div>
              {selectedDeal && (
                <>
                  <p className="mt-2 font-black text-[#0b1b55]">{selectedDeal.title}</p>
                  <dl className="mt-2 grid grid-cols-[90px_1fr] gap-y-1 text-sm">
                  <dt className="text-slate-500">Produkt</dt><dd className="font-semibold">{selectedDeal.product_type || '—'}</dd>
                  <dt className="text-slate-500">Wartość</dt><dd className="font-semibold">{Number(selectedDeal.value || 0).toLocaleString('pl-PL')} {selectedDeal.currency || 'PLN'}</dd>
                  <dt className="text-slate-500">Etap</dt><dd className="font-semibold">{stages.find((s) => s.id === selectedDeal.stage_id)?.name || '—'}</dd>
                  </dl>
                </>
              )}
            </div>
          )}

          {selectedContact && (
            <div>
              <div className="mb-2 flex items-center justify-between"><p className="text-xs font-black text-[#0b1b55]">Ostatnie aktywności w tym dealu</p><span className="text-[11px] font-semibold text-blue-600">Zobacz wszystkie →</span></div>
              <div className="space-y-2">
                {activities.length === 0 ? <p className="text-xs text-slate-400">Brak zapisanych aktywności.</p> : activities.map((row) => (
                  <div key={row.id} className="text-xs">
                    <div className="flex gap-2"><span className="shrink-0 text-slate-400">{new Date(row.occurred_at).toLocaleDateString('pl-PL')}</span><span className="truncate">{row.title}</span></div>
                    {(row.description || row.next_action || row.blocker) && (
                      <p className="mt-0.5 line-clamp-2 pl-[76px] text-[11px] text-slate-500">
                        {[row.description, row.next_action ? `Dalej: ${row.next_action}` : '', row.blocker ? `Bloker: ${row.blocker}` : ''].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
          <div>
            <h2 className="font-black text-[#0b1b55]">2. Zarejestruj rozmowę</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button type="button" onClick={() => setAction('TELEFON')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'TELEFON' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><Phone className="mx-auto mb-1 size-4" />Rozmowa telefoniczna</button>
              <button type="button" onClick={() => setAction('SPOTKANIE')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'SPOTKANIE' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><CalendarPlus className="mx-auto mb-1 size-4" />Spotkanie</button>
              <button type="button" onClick={() => setAction('EMAIL')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'EMAIL' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><Mail className="mx-auto mb-1 size-4" />E-mail</button>
              <button type="button" onClick={() => setAction('WIADOMOSC')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'WIADOMOSC' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><MessageSquare className="mx-auto mb-1 size-4" />Wiadomość</button>
              <button type="button" onClick={() => setAction('INNY_KONTAKT')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'INNY_KONTAKT' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><MoreHorizontal className="mx-auto mb-1 size-4" />Inna aktywność</button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-[#0b1b55]">3. Wynik rozmowy</h2>
              {action === 'TELEFON' && (
                <select
                  aria-label="Wynik rozmowy"
                  value={result}
                  onChange={(event) => setResult(event.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600"
                >
                  <option value="">Wybierz wynik</option>
                  {OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              )}
            </div>
            <div className="mt-2 [&_textarea]:min-h-28 [&_textarea]:text-base">
              <VoiceTextarea value={note} onChange={setNote} placeholder="Wpisz notatkę z rozmowy lub użyj dyktowania..." layout="side" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold">
                <FilePlus2 className="size-4" /> {uploading ? 'Dodaję…' : 'Dodaj załącznik'}
                <input type="file" className="hidden" disabled={!selectedContact || uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadDocument(file); e.currentTarget.value = ''; }} />
              </label>
              <button type="button" onClick={() => { setNextAction((v) => v || 'Zadanie po rozmowie'); setFollowUpOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold"><CheckSquare className="size-4" /> Dodaj zadanie</button>
              <button type="button" onClick={() => { setFollowUpOpen(true); requestAnimationFrame(() => document.getElementById('activity-next-at')?.focus()); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold"><CalendarPlus className="size-4" /> Dodaj datę</button>
            </div>
          </div>

          <div className="rounded-xl border border-lime-300 bg-lime-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2"><Sparkles className="mt-0.5 size-5 text-lime-700" /><div><p className="font-black text-[#0b1b55]">Asystent AI <span className="rounded bg-lime-200 px-1 text-xs">AI+</span></p><p className="text-xs text-slate-600">Podsumuje rozmowę, wyodrębni kolejne kroki i rozpozna kontekst.</p></div></div>
              <Button type="button" variant="outline" disabled={!selectedDeal} onClick={() => selectedDeal && router.push(`/assistant?deal=${selectedDeal.id}&feature=prepare`)} className="border-lime-500 bg-white">Przygotuj podsumowanie</Button>
            </div>
          </div>

          <div>
            <h2 className="font-black text-[#0b1b55]">4. Zmień etap lub zamknij deal <span className="font-normal text-slate-500">(opcjonalnie)</span></h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select value={stageId} disabled={!selectedDeal} onChange={(e) => setStageId(e.target.value)} className="min-h-11 rounded-lg border bg-white px-3 text-sm font-bold">
                <option value="">Etap Deala</option>
                {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
              <Button type="button" disabled={!selectedDeal} onClick={() => void closeDeal('won')} className="bg-emerald-800"><Trophy className="size-4" /> Wygrana</Button>
              <Button type="button" disabled={!selectedDeal} variant="outline" onClick={() => void closeDeal('lost')} className="border-red-400 text-red-700">Przegrana</Button>
            </div>
          </div>

          <div>
            <h2 className="font-black text-[#0b1b55]">5. Zapisz aktywność</h2>
            {followUpOpen && (
              <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
                <div><Label htmlFor="activity-next">Następny krok</Label><Input id="activity-next" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Co dalej?" className="mt-1 h-10 bg-white" /></div>
                <div><Label htmlFor="activity-next-at">Termin</Label><Input id="activity-next-at" type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)} className="mt-1 h-10 bg-white text-base" /></div>
                <div><Label htmlFor="activity-blocker">Bloker</Label><Input id="activity-blocker" value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="Co blokuje?" className="mt-1 h-10 bg-white" /></div>
              </div>
            )}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setFollowUpOpen(true)} className="inline-flex min-h-10 items-center gap-2 text-left text-xs font-semibold text-slate-700">
                <span className={`grid size-5 place-items-center rounded border ${nextAction ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-300 bg-white'}`}>{nextAction ? '✓' : ''}</span>
                Utwórz zadanie z kolejnych kroków
              </button>
              <span className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-400 sm:ml-3">
                <span className="size-5 rounded border border-slate-300 bg-white" /> Wyślij kopię e-maila do klienta
              </span>
              <Button type="button" disabled={!selectedContact || saving} onClick={() => void saveActivity()} className="h-11 w-full bg-emerald-800 font-black sm:ml-auto sm:w-auto">{saving ? 'Zapisuję…' : 'Zapisz aktywność'}</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
