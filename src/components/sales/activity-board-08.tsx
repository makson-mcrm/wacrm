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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { CallAction } from '@/components/sales/call-action';
import { SmsAction } from '@/components/sales/sms-action';
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

export function ActivityBoard08() {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [action, setAction] = useState<ActionKind>('TELEFON');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [blocker, setBlocker] = useState('');
  const [stageId, setStageId] = useState('');
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
  const phone = selectedContact?.phone || rawPhone;

  const load = useCallback(async () => {
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
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    if (!accountId || (!contactId && !dealId)) {
      setActivities([]);
      return;
    }
    let request = db
      .from('sales_activities')
      .select('id,title,occurred_at,activity_type')
      .eq('account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(5);
    request = dealId ? request.eq('deal_id', dealId) : request.eq('contact_id', contactId);
    void request.then(({ data }) => setActivities((data ?? []) as ActivityRow[]));
  }, [accountId, contactId, db, dealId]);

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
    const session = (await db.auth.getSession()).data.session;
    if (!session?.user) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const nextIso = nextAt ? warsawDateTimeInputToIso(nextAt) : null;
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

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                <div>
                  <p className="font-black text-[#0b1b55]">{contactName(selectedContact)}</p>
                  <p className="text-sm text-blue-700">{selectedContact.phone}</p>
                  <p className="text-xs text-slate-500">{selectedContact.company || selectedContact.email || ''}</p>
                </div>
                <button type="button" onClick={() => { setContactId(''); setDealId(''); }} className="p-2 text-slate-400"><X className="size-4" /></button>
              </div>
            </div>
          )}

          {selectedContact && contactDeals.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Deal</span>
                <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="max-w-[190px] rounded-md border bg-white px-2 py-1 text-sm font-bold">
                  <option value="">Wybierz Deal</option>
                  {contactDeals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}
                </select>
              </div>
              {selectedDeal && (
                <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-sm">
                  <dt className="text-slate-500">Produkt</dt><dd className="font-semibold">{selectedDeal.product_type || '—'}</dd>
                  <dt className="text-slate-500">Wartość</dt><dd className="font-semibold">{Number(selectedDeal.value || 0).toLocaleString('pl-PL')} {selectedDeal.currency || 'PLN'}</dd>
                  <dt className="text-slate-500">Etap</dt><dd className="font-semibold">{stages.find((s) => s.id === selectedDeal.stage_id)?.name || '—'}</dd>
                </dl>
              )}
            </div>
          )}

          {selectedContact && (
            <div>
              <div className="mb-2 flex items-center justify-between"><p className="text-xs font-black text-[#0b1b55]">Ostatnie aktywności</p></div>
              <div className="space-y-2">
                {activities.length === 0 ? <p className="text-xs text-slate-400">Brak zapisanych aktywności.</p> : activities.map((row) => (
                  <div key={row.id} className="flex gap-2 text-xs"><span className="shrink-0 text-slate-400">{new Date(row.occurred_at).toLocaleDateString('pl-PL')}</span><span className="truncate">{row.title}</span></div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
          <div>
            <h2 className="font-black text-[#0b1b55]">2. Zarejestruj rozmowę</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button type="button" onClick={() => setAction('TELEFON')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'TELEFON' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><Phone className="mx-auto mb-1 size-4" />Rozmowa</button>
              <button type="button" onClick={() => setAction('SPOTKANIE')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'SPOTKANIE' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><CalendarPlus className="mx-auto mb-1 size-4" />Spotkanie</button>
              <button type="button" onClick={() => setAction('EMAIL')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'EMAIL' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><Mail className="mx-auto mb-1 size-4" />E-mail</button>
              <button type="button" onClick={() => setAction('WIADOMOSC')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'WIADOMOSC' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><MessageSquare className="mx-auto mb-1 size-4" />Wiadomość</button>
              <button type="button" onClick={() => setAction('INNY_KONTAKT')} className={`min-h-12 rounded-lg border px-2 text-xs font-bold ${action === 'INNY_KONTAKT' ? 'bg-emerald-800 text-white' : 'bg-slate-50'}`}><MoreHorizontal className="mx-auto mb-1 size-4" />Inna</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {phone ? <CallAction phone={phone} contactId={selectedContact?.id} companyId={selectedDeal?.company_id} dealId={selectedDeal?.id} size="lg" className="h-11 bg-emerald-800 text-white" /> : <Button disabled className="h-11"><Phone className="size-4" /> Zadzwoń</Button>}
              {selectedContact ? <SmsAction phone={selectedContact.phone} contactName={contactName(selectedContact)} contactId={selectedContact.id} companyId={selectedDeal?.company_id} dealId={selectedDeal?.id} productCategory={selectedDeal?.product_type || selectedContact.product_category} customerSource={selectedDeal?.source || selectedContact.source} size="lg" label="WIADOMOŚĆ" /> : <Button disabled variant="outline" className="h-11">Wiadomość</Button>}
            </div>
          </div>

          <div>
            <h2 className="font-black text-[#0b1b55]">3. Wynik rozmowy</h2>
            {action === 'TELEFON' && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {OUTCOMES.map(([value, label]) => <button key={value} type="button" onClick={() => setResult(value)} className={`min-h-11 rounded-lg border px-2 text-xs font-bold ${result === value ? 'bg-emerald-100 ring-1 ring-emerald-700' : 'bg-slate-50'}`}>{label}</button>)}
              </div>
            )}
            <div className="mt-2 [&_textarea]:min-h-28 [&_textarea]:text-base">
              <VoiceTextarea value={note} onChange={setNote} placeholder="Wpisz notatkę z rozmowy lub użyj dyktowania..." />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold">
                <FilePlus2 className="size-4" /> {uploading ? 'Dodaję…' : 'Dodaj załącznik'}
                <input type="file" className="hidden" disabled={!selectedContact || uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadDocument(file); e.currentTarget.value = ''; }} />
              </label>
              <button type="button" onClick={() => { setNextAction((v) => v || 'Zadanie po rozmowie'); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold"><CheckSquare className="size-4" /> Dodaj zadanie</button>
              <button type="button" onClick={() => document.getElementById('activity-next-at')?.focus()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold"><CalendarPlus className="size-4" /> Dodaj datę</button>
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
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div><Label htmlFor="activity-next">Następny krok</Label><Input id="activity-next" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Co dalej?" className="mt-1 h-11" /></div>
              <div><Label htmlFor="activity-next-at">Termin</Label><Input id="activity-next-at" type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)} className="mt-1 h-11 text-base" /></div>
              <div><Label htmlFor="activity-blocker">Blocker</Label><Input id="activity-blocker" value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="Co blokuje?" className="mt-1 h-11" /></div>
            </div>
            <Button type="button" disabled={!selectedContact || saving} onClick={() => void saveActivity()} className="mt-3 h-12 w-full bg-emerald-800 text-base font-black sm:ml-auto sm:block sm:w-auto">{saving ? 'Zapisuję…' : 'Zapisz aktywność'}</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
