'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Phone, Plus, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { MobileDateTimeInput } from '@/components/ui/mobile-date-time-input';
import { EntitySearchSelect } from '@/components/ui/entity-search-select';
import { CatalogSearchSelect } from '@/components/ui/catalog-search-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Company, Contact, Deal, PipelineStage } from '@/types';
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  OBJECTIVE_TYPES,
  activityTypeForDb,
  normalizeActivityPhone,
  phoneContains,
  phoneSearchStrength,
  suggestedRetryAt,
  toLocalDateTimeValue,
  type ActivityStatus,
  type ActivityType,
  type ObjectiveType,
} from '@/lib/sales/quick-activity';

const PRODUCT_GROUPS = ['1_HIPO_OF_ML','2_FIRMA_BC_ML','3_FIRMA_BC_NML','4_GOTÓWKA_OF_NML','5_LEASING_BC_ML'];
const RESULT_OPTIONS = [
  ['odebral', 'Odebrał / wykonano'],
  ['nie_odebral', 'Nie odebrał'],
  ['przelozone_dzis', 'Oddzwoń dzisiaj później'],
  ['niezainteresowany', 'Niezainteresowany'],
  ['serwis_zakonczony', 'Serwis zakończony'],
] as const;

type Stage = PipelineStage & { pipeline_id: string };

export function QuickActivityForm() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<ActivityType>('TELEFON');
  const [status, setStatus] = useState<ActivityStatus>('WYKONANE');
  const [objective, setObjective] = useState<ObjectiveType>('NOWE_POZYSKANIE');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [dealId, setDealId] = useState('');
  const [note, setNote] = useState('');
  const [when, setWhen] = useState('');
  const [result, setResult] = useState('odebral');
  const [source, setSource] = useState('');
  const [productGroup, setProductGroup] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contactDialog, setContactDialog] = useState(false);
  const [companyDialog, setCompanyDialog] = useState(false);
  const [dealDialog, setDealDialog] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [contactRows, companyRows, dealRows, stageRows] = await Promise.all([
      db.from('contacts').select('*').eq('account_id', accountId).order('name'),
      db.from('companies').select('*').eq('account_id', accountId).order('name'),
      db.from('deals').select('*').eq('account_id', accountId).eq('status', 'open').order('title'),
      db.from('pipeline_stages').select('*').order('position'),
    ]);
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
    setDeals((dealRows.data ?? []) as Deal[]);
    setStages((stageRows.data ?? []) as Stage[]);
    setLoading(false);
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  const phoneMatches = useMemo(() => {
    if (phoneSearchStrength(phone) === 'none') return [];
    return contacts.filter((row) => phoneContains(row.phone, phone)).slice(0, 8);
  }, [contacts, phone]);

  useEffect(() => {
    if (phoneSearchStrength(phone) !== 'strong' || contactId || phoneMatches.length !== 1) return;
    chooseContact(phoneMatches[0]);
    // chooseContact only mirrors the unique loaded record into the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, phoneMatches, contactId]);

  function chooseContact(contact: Contact) {
    setContactId(contact.id);
    setPhone(contact.phone ?? phone);
    setFirstName(contact.first_name ?? contact.name?.split(' ')[0] ?? '');
    setLastName(contact.last_name ?? contact.name?.split(' ').slice(1).join(' ') ?? '');
    const relatedDeal = deals.find((row) => row.contact_id === contact.id);
    if (relatedDeal) {
      setDealId(relatedDeal.id);
      setCompanyId(relatedDeal.company_id ?? '');
      setSource(relatedDeal.source ?? source);
      setProductGroup(relatedDeal.product_type ?? productGroup);
    }
  }

  const relatedDeals = deals.filter((row) =>
    contactId ? row.contact_id === contactId || row.company_id === companyId : companyId ? row.company_id === companyId : true
  );

  async function createContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) return;
    const form = new FormData(event.currentTarget);
    const submittedFirst = String(form.get('first_name') ?? '').trim();
    const submittedLast = String(form.get('last_name') ?? '').trim();
    const submittedPhone = String(form.get('phone') ?? '').trim();
    if (normalizeActivityPhone(submittedPhone).length < 7 || (!submittedFirst && !submittedLast)) {
      toast.error('Podaj numer telefonu oraz imię lub nazwisko.');
      return;
    }
    const existing = contacts.find((row) =>
      normalizeActivityPhone(row.phone ?? '') === normalizeActivityPhone(submittedPhone)
    );
    if (existing) {
      chooseContact(existing);
      setContactDialog(false);
      toast.info('Kontakt już istnieje — został wybrany.');
      return;
    }
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return;
    const fullName = [submittedFirst, submittedLast].filter(Boolean).join(' ');
    const { data, error } = await db.from('contacts').insert({
      account_id: accountId,
      user_id: session.user.id,
      first_name: submittedFirst || null,
      last_name: submittedLast || null,
      name: fullName,
      phone: submittedPhone,
    }).select('*').single();
    if (error) return toast.error(`Nie zapisano Kontaktu: ${error.message}`);
    const contact = data as Contact;
    setContacts((rows) => [...rows, contact]);
    chooseContact(contact);
    setContactDialog(false);
    toast.success('Kontakt został dodany i wybrany.');
  }

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const nip = String(form.get('nip') ?? '').replace(/\D/g, '');
    if (!name) return toast.error('Podaj nazwę Firmy.');
    const existing = nip.length === 10 ? companies.find((row) => row.nip_normalized === nip || row.nip?.replace(/\D/g, '') === nip) : undefined;
    if (existing) {
      setCompanyId(existing.id);
      setCompanyDialog(false);
      toast.info('Firma już istnieje — została wybrana.');
      return;
    }
    if (nip && nip.length !== 10) return toast.error('NIP musi mieć 10 cyfr.');
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await db.from('companies').insert({
      account_id: accountId, user_id: session.user.id, name, nip: nip || null,
    }).select('*').single();
    if (error) return toast.error(`Nie zapisano Firmy: ${error.message}`);
    setCompanies((rows) => [...rows, data as Company]);
    setCompanyId(data.id);
    setCompanyDialog(false);
    toast.success('Firma została dodana i wybrana.');
  }

  async function createDeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId || !stages[0]) return toast.error('Brak etapu lejka do utworzenia Deala.');
    const title = String(new FormData(event.currentTarget).get('title') ?? '').trim();
    if (!title) return toast.error('Podaj nazwę Deala.');
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return;
    const stage = stages[0];
    const { data, error } = await db.from('deals').insert({
      account_id: accountId, user_id: session.user.id, title, value: 0,
      pipeline_id: stage.pipeline_id, stage_id: stage.id, status: 'open',
      contact_id: contactId || null, company_id: companyId || null,
      source: source || null, product_type: productGroup || null,
    }).select('*').single();
    if (error) return toast.error(`Nie zapisano Deala: ${error.message}`);
    setDeals((rows) => [...rows, data as Deal]);
    setDealId(data.id);
    await saveRelations(data.id);
    setDealDialog(false);
    toast.success('Deal został dodany i wybrany.');
  }

  async function saveRelations(selectedDealId: string) {
    if (!accountId) return;
    if (contactId && companyId) await db.from('contact_companies').upsert({
      account_id: accountId, contact_id: contactId, company_id: companyId,
      role: 'Osoba w sprawie', is_primary: true,
    }, { onConflict: 'contact_id,company_id' });
    if (contactId && selectedDealId) await db.from('deal_contacts').upsert({
      account_id: accountId, deal_id: selectedDealId, contact_id: contactId,
      role: 'Osoba w sprawie', is_primary: true,
    }, { onConflict: 'deal_id,contact_id' });
  }

  async function saveActivity() {
    if (!accountId || saving) return;
    const number = phone.trim() || contacts.find((row) => row.id === contactId)?.phone || '';
    if (type === 'TELEFON' && normalizeActivityPhone(number).length < 7) return toast.error('Podaj prawidłowy numer telefonu.');
    if (!contactId) return toast.error('Wybierz istniejący Kontakt albo dodaj nowy.');
    if (status !== 'WYKONANE' && !when) return toast.error('Ustaw datę i godzinę planowanej aktywności.');
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return;
    setSaving(true);
    try {
      let attemptNumber = 0;
      if (type === 'TELEFON') {
        const { data } = await db.from('sales_activities').select('attempt_number')
          .eq('account_id', accountId).eq('activity_type', 'telefon').eq('phone_number', number)
          .order('occurred_at', { ascending: false }).limit(1);
        attemptNumber = Number(data?.[0]?.attempt_number || 0) + (result === 'nie_odebral' ? 1 : 0);
      }
      let effectiveWhen = when;
      if (type === 'TELEFON' && result === 'nie_odebral' && !effectiveWhen) {
        const suggested = suggestedRetryAt(attemptNumber);
        effectiveWhen = suggested ? toLocalDateTimeValue(suggested) : '';
      }
      if (type === 'TELEFON' && result === 'przelozone_dzis' && !effectiveWhen) {
        const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
        effectiveWhen = toLocalDateTimeValue(later);
      }
      const contact = contacts.find((row) => row.id === contactId);
      const scheduledIso = effectiveWhen ? new Date(effectiveWhen).toISOString() : null;
      const occurredIso = status === 'WYKONANE' ? new Date().toISOString() : scheduledIso ?? new Date().toISOString();
      const { error } = await db.from('sales_activities').insert({
        account_id: accountId, user_id: session.user.id,
        activity_type: activityTypeForDb(type), activity_status: status,
        objective_type: objective, contact_id: contactId, company_id: companyId || null,
        deal_id: dealId || null, phone_number: number || null,
        title: `${type.replace('_', ' ')} — ${contact?.name || number || 'aktywność'}`,
        description: note.trim() || nextAction.trim() || null,
        occurred_at: occurredIso, scheduled_at: status === 'WYKONANE' ? null : scheduledIso,
        completed_at: status === 'WYKONANE' ? occurredIso : null,
        completed: status === 'WYKONANE', call_result: type === 'TELEFON' ? result : null,
        call_type: objective === 'NOWE_POZYSKANIE' ? 'nowe_pozyskanie' : objective === 'OBSLUGA_SERWIS' ? 'obsluga_serwis' : 'follow_up',
        source: source || null, product_group: productGroup || null,
        next_action: nextAction.trim() || null, next_action_date: nextActionDate ? new Date(nextActionDate).toISOString() : null,
        next_contact_at: scheduledIso || (nextActionDate ? new Date(nextActionDate).toISOString() : null),
        next_contact_reason: nextAction.trim() || note.trim() || null,
        attempt_number: type === 'TELEFON' ? Math.min(attemptNumber, 3) : null,
        expires_at: type === 'TELEFON' && result === 'nie_odebral' && attemptNumber < 3 ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
      });
      if (error) throw error;
      await saveRelations(dealId);
      const actionDate = nextActionDate || (status !== 'WYKONANE' ? effectiveWhen : '');
      if (dealId && actionDate) {
        const reason = nextAction.trim() || note.trim() || type.replace('_', ' ');
        const { error: dealError } = await db.from('deals').update({
          next_action: reason, next_action_at: new Date(actionDate).toISOString(),
          follow_up_at: type === 'FOLLOW_UP' ? new Date(actionDate).toISOString() : undefined,
          contact_id: contactId, company_id: companyId || null,
        }).eq('id', dealId);
        if (dealError) throw dealError;
      }
      toast.success('Aktywność została zapisana.');
      setNote(''); setNextAction(''); setNextActionDate(''); setWhen('');
    } catch (error) {
      toast.error(`Nie zapisano aktywności: ${error instanceof Error ? error.message : 'nieznany błąd'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[#f5f8f4] p-3 text-slate-950 sm:p-5">
      <header className="mb-3 rounded-2xl bg-[#123d2b] p-4 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-lime-300">WaCRM mobile</p>
        <h1 className="text-2xl font-black">Szybka Aktywność</h1>
        <p className="mt-1 text-sm text-emerald-50">Zapisz lub zaplanuj kontakt bez opuszczania tego ekranu.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-emerald-950/15 bg-white p-3 shadow-sm">
        <div>
          <Label>Typ aktywności</Label>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {ACTIVITY_TYPES.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`min-h-10 rounded-lg px-2 text-[11px] font-bold ${type === item ? 'bg-[#123d2b] text-lime-300' : 'bg-emerald-50 text-emerald-950'}`}>{item.replace('_', ' ')}</button>)}
          </div>
        </div>
        <div>
          <Label htmlFor="quick-phone">Numer telefonu / wyszukaj</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-3 size-4 text-slate-500" />
            <Input id="quick-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setContactId(''); }} className="min-h-11 pl-9" placeholder="Wpisz co najmniej 3 cyfry" />
          </div>
          {phoneMatches.length > 0 && !contactId && <div className="mt-1 rounded-xl border bg-white p-1 shadow-lg">{phoneMatches.map((row) => <button type="button" key={row.id} onClick={() => chooseContact(row)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-emerald-50"><span className="font-bold">{row.name}</span><span className="text-xs text-slate-500">{row.phone}</span></button>)}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Imię</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><Label>Nazwisko</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        {contactId ? <div className="rounded-xl bg-emerald-50 px-3 py-2"><p className="text-xs text-emerald-800">Wybrany Kontakt</p><p className="text-lg font-black text-emerald-950">{contacts.find((row) => row.id === contactId)?.name}</p></div> : <Button type="button" variant="outline" className="w-full" onClick={() => setContactDialog(true)}><Plus className="size-4" /> Dodaj osobę bez wychodzenia</Button>}
        <div><Label>Krótka notatka</Label><VoiceTextarea value={note} onChange={setNote} placeholder="Podyktuj lub wpisz pełną notatkę" className="min-h-24" /></div>
        <div><Label>Status</Label><div className="mt-1 grid grid-cols-2 gap-1.5">{ACTIVITY_STATUSES.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`min-h-10 rounded-lg px-2 text-xs font-bold ${status === item ? 'bg-lime-300 text-emerald-950 ring-2 ring-emerald-900' : 'bg-slate-100 text-slate-700'}`}>{item.replaceAll('_', ' ')}</button>)}</div></div>
        {status !== 'WYKONANE' && <div><Label>Data i godzina</Label><MobileDateTimeInput value={when} onChange={setWhen} required /></div>}
        {type === 'TELEFON' && <div><Label>Wynik telefonu</Label><select value={result} onChange={(e) => setResult(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3">{RESULT_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
      </section>

      <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="my-3 flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 font-bold text-emerald-950"><span>Firma, Deal i szczegóły</span><ChevronDown className={`size-5 transition ${detailsOpen ? 'rotate-180' : ''}`} /></button>
      {detailsOpen && <section className="space-y-3 rounded-2xl border bg-white p-3 shadow-sm">
        <div><Label>Firma (opcjonalna)</Label><EntitySearchSelect value={companyId} onChange={setCompanyId} options={companies.map((row) => ({ value: row.id, label: row.name, keywords: `${row.nip ?? ''} ${row.phone ?? ''}` }))} placeholder="Wyszukaj Firmę" onAdd={() => setCompanyDialog(true)} addLabel="Dodaj Firmę" /></div>
        <div><Label>Deal (opcjonalny)</Label><EntitySearchSelect value={dealId} onChange={setDealId} options={relatedDeals.map((row) => ({ value: row.id, label: row.title }))} placeholder="Wybierz Deal" onAdd={() => setDealDialog(true)} addLabel="Dodaj Deal" /></div>
        <div><Label>Cel aktywności / KPI</Label><select value={objective} onChange={(e) => setObjective(e.target.value as ObjectiveType)} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3">{OBJECTIVE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><Label>Źródło</Label><CatalogSearchSelect catalogType="source" value={source} onChange={setSource} placeholder="Wyszukaj lub dodaj źródło" /></div>
        <div><Label>Grupa produktu</Label><CatalogSearchSelect catalogType="product_group" value={productGroup} onChange={setProductGroup} placeholder="Wybierz grupę" defaults={PRODUCT_GROUPS} /></div>
        <div><Label>Następne działanie</Label><Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Co dalej?" /></div>
        <div><Label>Termin następnego działania</Label><MobileDateTimeInput value={nextActionDate} onChange={setNextActionDate} /></div>
      </section>}

      <div className="sticky bottom-0 mt-3 flex gap-2 rounded-2xl border bg-white/95 p-2 shadow-lg backdrop-blur">
        {phone && <a href={`tel:${phone}`} className="flex min-h-12 items-center justify-center rounded-xl border border-emerald-900 px-4 font-bold text-emerald-950"><Phone className="mr-2 size-4" /> Zadzwoń</a>}
        <Button className="min-h-12 flex-1 bg-[#123d2b] text-lime-300 hover:bg-[#0b2d1f]" disabled={saving || loading} onClick={saveActivity}><Save className="size-4" />{saving ? 'Zapisywanie…' : 'Zapisz aktywność'}</Button>
      </div>
      <Link href="/dashboard" className="mt-3 block text-center text-xs text-slate-500">Wróć do Pulpitu</Link>

      <InlineDialog open={contactDialog} onOpenChange={setContactDialog} title="Nowa osoba"><form onSubmit={createContact} className="space-y-3"><Input name="first_name" defaultValue={firstName} autoComplete="given-name" placeholder="Imię" /><Input name="last_name" defaultValue={lastName} autoComplete="family-name" placeholder="Nazwisko" /><Input name="phone" defaultValue={phone} inputMode="tel" autoComplete="tel" placeholder="Telefon" /><Button type="submit" className="w-full">Zapisz i wybierz</Button></form></InlineDialog>
      <InlineDialog open={companyDialog} onOpenChange={setCompanyDialog} title="Nowa Firma"><form onSubmit={createCompany} className="space-y-3"><Input name="name" placeholder="Nazwa Firmy" /><Input name="nip" inputMode="numeric" placeholder="NIP (opcjonalnie)" /><Button type="submit" className="w-full">Zapisz i wybierz</Button></form></InlineDialog>
      <InlineDialog open={dealDialog} onOpenChange={setDealDialog} title="Nowy Deal"><form onSubmit={createDeal} className="space-y-3"><Input name="title" placeholder="Nazwa Deala" /><p className="text-xs text-slate-500">Deal zostanie powiązany z wybraną osobą i Firmą.</p><Button type="submit" className="w-full">Zapisz i wybierz</Button></form></InlineDialog>
    </div>
  );
}

function InlineDialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>{children}</DialogContent></Dialog>;
}

