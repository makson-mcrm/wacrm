'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { CURRENCIES } from '@/lib/currency';
import type { Company, Contact, Deal, DealStatus, PipelineStage, Profile } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, DollarSign, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface DealFormProps {
  open: boolean; onOpenChange: (open: boolean) => void; deal?: Deal | null;
  pipelineId: string; stages: PipelineStage[]; defaultStageId?: string; defaultCompanyId?: string; defaultContactId?: string; onSaved: () => void;
}

export function DealForm({ open, onOpenChange, deal, pipelineId, stages, defaultStageId, defaultCompanyId, defaultContactId, onSaved }: DealFormProps) {
  const db = useMemo(() => createClient(), []);
  const { accountId, defaultCurrency } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]), [companies, setCompanies] = useState<Company[]>([]), [profiles, setProfiles] = useState<Profile[]>([]);
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [contactId, setContactId] = useState(''), [secondContactId, setSecondContactId] = useState(''), [companyId, setCompanyId] = useState('');
  const [value, setValue] = useState(''), [currency, setCurrency] = useState(defaultCurrency), [source, setSource] = useState(''), [goal, setGoal] = useState(''), [productType, setProductType] = useState(''), [stageId, setStageId] = useState(''), [assignedTo, setAssignedTo] = useState('');
  const [nextAction, setNextAction] = useState(''), [nextActionAt, setNextActionAt] = useState(''), [followUpAt, setFollowUpAt] = useState(''), [meetingAt, setMeetingAt] = useState(''), [meetingPlace, setMeetingPlace] = useState('');
  const [expectedCommission, setExpectedCommission] = useState(''), [expectedCloseDate, setExpectedCloseDate] = useState(''), [missingDocuments, setMissingDocuments] = useState(''), [questionnaireText, setQuestionnaireText] = useState(''), [driveFolderUrl, setDriveFolderUrl] = useState(''), [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false), [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [showNewContact, setShowNewContact] = useState(false), [newFirstName, setNewFirstName] = useState(''), [newLastName, setNewLastName] = useState(''), [newPhone, setNewPhone] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false), [newCompanyName, setNewCompanyName] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [contactRows, companyRows, profileRows, dealLinks] = await Promise.all([
        db.from('contacts').select('*').order('name'), db.from('companies').select('*').order('name'), db.from('profiles').select('*').order('full_name'),
        deal ? db.from('deal_contacts').select('contact_id,is_primary').eq('deal_id', deal.id).order('is_primary', { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      setContacts((contactRows.data ?? []) as Contact[]); setCompanies((companyRows.data ?? []) as Company[]); setProfiles((profileRows.data ?? []) as Profile[]);
      const links = (dealLinks.data ?? []) as { contact_id: string; is_primary: boolean }[];
      setTitle(deal?.title ?? ''); setDescription(deal?.description ?? '');
      setContactId(links.find((row) => row.is_primary)?.contact_id ?? deal?.contact_id ?? defaultContactId ?? '');
      setSecondContactId(links.find((row) => !row.is_primary)?.contact_id ?? deal?.co_applicant_contact_id ?? '');
      setCompanyId(deal?.company_id ?? defaultCompanyId ?? ''); setValue(deal?.value == null ? '' : String(deal.value)); setCurrency(deal?.currency ?? defaultCurrency);
      setSource(deal?.source ?? ''); setGoal(deal?.goal ?? ''); setProductType(deal?.product_type ?? ''); setStageId(deal?.stage_id ?? defaultStageId ?? stages[0]?.id ?? ''); setAssignedTo(deal?.assigned_to ?? '');
      setNextAction(deal?.next_action ?? ''); setNextActionAt(localDateTime(deal?.next_action_at)); setFollowUpAt(localDateTime(deal?.follow_up_at)); setMeetingAt(localDateTime(deal?.meeting_at)); setMeetingPlace(deal?.meeting_place ?? '');
      setExpectedCommission(deal?.expected_commission == null ? '' : String(deal.expected_commission)); setExpectedCloseDate(deal?.expected_close_date ?? '');
      setMissingDocuments(deal?.missing_documents ?? ''); setQuestionnaireText(deal?.questionnaire_text ?? ''); setDriveFolderUrl(deal?.drive_folder_url ?? ''); setNotes(deal?.notes ?? '');
      setShowNewContact(false); setShowNewCompany(false);
    })();
    return () => { cancelled = true; };
  }, [open, deal, db, defaultCurrency, defaultStageId, defaultCompanyId, defaultContactId, stages]);

  async function addContactInline() {
    if (!newPhone.trim() || !accountId) { toast.error('Numer telefonu jest wymagany.'); return; }
    const { data: { session } } = await db.auth.getSession(); if (!session?.user) return;
    const fullName = [newFirstName.trim(), newLastName.trim()].filter(Boolean).join(' ');
    const { data, error } = await db.from('contacts').insert({ account_id: accountId, user_id: session.user.id, first_name: newFirstName.trim() || null, last_name: newLastName.trim() || null, name: fullName || null, phone: newPhone.trim() }).select('*').single();
    if (error) { toast.error(error.code === '23505' ? 'Kontakt z tym telefonem już istnieje.' : 'Nie udało się dodać Kontaktu.'); return; }
    setContacts((rows) => [...rows, data as Contact]); if (!contactId) setContactId(data.id); else setSecondContactId(data.id);
    setNewFirstName(''); setNewLastName(''); setNewPhone(''); setShowNewContact(false); toast.success('Kontakt został dodany i powiązany.');
  }

  async function addCompanyInline() {
    if (!newCompanyName.trim() || !accountId) return;
    const { data: { session } } = await db.auth.getSession(); if (!session?.user) return;
    const { data, error } = await db.from('companies').insert({ account_id: accountId, user_id: session.user.id, name: newCompanyName.trim() }).select('*').single();
    if (error) { toast.error(error.code === '23505' ? 'Taka firma już istnieje.' : 'Nie udało się dodać firmy.'); return; }
    setCompanies((rows) => [...rows, data as Company]); setCompanyId(data.id); setNewCompanyName(''); setShowNewCompany(false); toast.success('Firma została dodana i powiązana.');
  }

  async function saveRelations(dealId: string) {
    if (!accountId) return;
    await db.from('deal_contacts').delete().eq('deal_id', dealId);
    const rows: { deal_id: string; contact_id: string; account_id: string; role: string; is_primary: boolean }[] = [];
    if (contactId) rows.push({ deal_id: dealId, contact_id: contactId, account_id: accountId, role: 'Wnioskodawca 1', is_primary: true });
    if (secondContactId && secondContactId !== contactId) rows.push({ deal_id: dealId, contact_id: secondContactId, account_id: accountId, role: 'Wnioskodawca 2', is_primary: false });
    if (rows.length) { const { error } = await db.from('deal_contacts').insert(rows); if (error) throw error; }
    if (companyId) for (const personId of [contactId, secondContactId].filter(Boolean)) await db.from('contact_companies').upsert({ contact_id: personId, company_id: companyId, account_id: accountId, role: 'Osoba w sprawie', is_primary: true }, { onConflict: 'contact_id,company_id' });
  }

  async function handleSave() {
    if (!title.trim() || !contactId || !stageId || !accountId) { toast.error('Uzupełnij nazwę, główną osobę i etap.'); return; }
    if (stages.find((row) => row.id === stageId)?.name.includes('POCZEKALNIA') && !followUpAt) { toast.error('W POCZEKALNI ustaw termin ponownego kontaktu.'); return; }
    setSaving(true);
    const payload = { title: title.trim(), description: description.trim() || null, value: numberOrZero(value), currency, contact_id: contactId, co_applicant_contact_id: secondContactId || null, company_id: companyId || null, pipeline_id: pipelineId, stage_id: stageId, assigned_to: assignedTo || null, source: source || null, goal: goal || null, product_type: productType || null, applicant_mode: secondContactId ? 'Dwie osoby' : 'Jedna osoba', next_action: nextAction.trim() || null, next_action_at: nextActionAt || null, follow_up_at: followUpAt || null, meeting_at: meetingAt || null, meeting_place: meetingPlace.trim() || null, expected_commission: numberOrNull(expectedCommission), expected_close_date: expectedCloseDate || null, missing_documents: missingDocuments.trim() || null, questionnaire_text: questionnaireText.trim() || null, drive_folder_url: driveFolderUrl.trim() || null, notes: notes.trim() || null };
    try {
      let dealId = deal?.id;
      if (dealId) { const { error } = await db.from('deals').update(payload).eq('id', dealId); if (error) throw error; }
      else { const { data: { session } } = await db.auth.getSession(); if (!session?.user) throw new Error('Brak aktywnego logowania.'); const { data, error } = await db.from('deals').insert({ ...payload, account_id: accountId, user_id: session.user.id, status: 'open' }).select('id').single(); if (error) throw error; dealId = data.id; }
      await saveRelations(dealId!); toast.success(deal ? 'Deal został zaktualizowany.' : 'Deal został utworzony.'); onOpenChange(false); onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać Deala.'); } finally { setSaving(false); }
  }

  async function changeStatus(status: DealStatus) { if (!deal) return; setStatusAction(status); const { error } = await db.from('deals').update({ status }).eq('id', deal.id); setStatusAction(null); if (error) toast.error('Nie udało się zmienić statusu.'); else { toast.success('Status został zmieniony.'); onSaved(); } }
  async function removeDeal() { if (!deal || !window.confirm('Usunąć ten Deal?')) return; const { error } = await db.from('deals').delete().eq('id', deal.id); if (error) toast.error('Nie udało się usunąć Deala.'); else { onOpenChange(false); onSaved(); } }

  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full p-0 sm:max-w-3xl"><div className="flex h-full flex-col"><SheetHeader className="border-b p-4"><SheetTitle>{deal ? 'Edytuj Deal' : 'Nowy Deal'}</SheetTitle></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-4">
    <section className="space-y-3"><h3 className="font-semibold">Podstawowe informacje</h3><Field label="Nazwa Deala *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Np. Refinansowanie — Jan Kowalski" /></Field><Field label="Opis ogólny"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28" placeholder="Najważniejszy opis sprawy" /></Field><div className="grid gap-3 sm:grid-cols-[1fr_110px]"><Field label="Kwota"><div className="relative"><DollarSign className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="pl-8" /></div></Field><Field label="Waluta"><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm">{CURRENCIES.map((row) => <option key={row.code}>{row.code}</option>)}</select></Field></div></section>
    <section className="space-y-3 rounded-xl border p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Powiązane osoby</h3><Button type="button" variant="outline" size="sm" onClick={() => setShowNewContact((v) => !v)}><Plus className="size-4"/>Nowa osoba</Button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Wnioskodawca 1 *"><select value={contactId} onChange={(e) => setContactId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Wybierz osobę</option>{contacts.map((row) => <option key={row.id} value={row.id}>{row.name || row.phone}</option>)}</select></Field><Field label="Wnioskodawca 2"><select value={secondContactId} onChange={(e) => setSecondContactId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Bez drugiej osoby</option>{contacts.filter((row) => row.id !== contactId).map((row) => <option key={row.id} value={row.id}>{row.name || row.phone}</option>)}</select></Field></div>{showNewContact && <div className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-3"><Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Imię"/><Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Nazwisko"/><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Telefon *"/><Button type="button" onClick={addContactInline} className="sm:col-span-3">Dodaj i powiąż osobę</Button></div>}</section>
    <section className="space-y-3 rounded-xl border p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Powiązana firma</h3><Button type="button" variant="outline" size="sm" onClick={() => setShowNewCompany((v) => !v)}><Plus className="size-4"/>Nowa firma</Button></div><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Bez firmy</option>{companies.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>{showNewCompany && <div className="flex gap-2"><Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nazwa firmy"/><Button type="button" onClick={addCompanyInline}>Dodaj i powiąż</Button></div>}</section>
    <section className="space-y-3"><h3 className="font-semibold">Sprawa sprzedażowa</h3><div className="grid gap-3 sm:grid-cols-2"><Select label="Źródło" value={source} set={setSource} values={['Podajnik mBank','Lead mFinanse','Własny kontakt','Polecenie','Strona makson.space']}/><Select label="Cel" value={goal} set={setGoal} values={['Zakup nieruchomości','Budowa domu','Refinansowanie','Konsolidacja','Finansowanie firmy','Inny']}/><Select label="Typ" value={productType} set={setProductType} values={['HIPOTEKA','FIRMA — zabezpieczony','FIRMA — niezabezpieczony','GOTÓWKA','LEASING','INNY']}/><Field label="Etap"><select value={stageId} onChange={(e) => setStageId(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm">{stages.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Właściciel"><select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Nieprzypisany</option>{profiles.map((row) => <option key={row.id} value={row.id}>{row.full_name || row.email}</option>)}</select></Field><Field label="Prowizja oczekiwana"><Input type="number" value={expectedCommission} onChange={(e) => setExpectedCommission(e.target.value)} /></Field></div></section>
    <section className="space-y-3"><h3 className="font-semibold">Następne działania</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Następne działanie"><Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field><Field label="Termin działania"><Input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} /></Field><Field label="Ponowny kontakt"><Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} /></Field><Field label="Spotkanie"><Input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} /></Field><Field label="Miejsce / link"><Input value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} /></Field><Field label="Planowane zamknięcie"><Input type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} /></Field></div></section>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Dane z formularza i przygotowanie wniosku</summary><div className="mt-4 space-y-3"><Field label="Pełne odpowiedzi z formularza / ankiety"><Textarea value={questionnaireText} onChange={(e) => setQuestionnaireText(e.target.value)} className="min-h-36" /></Field><Field label="Brakujące dokumenty"><Textarea value={missingDocuments} onChange={(e) => setMissingDocuments(e.target.value)} /></Field><Field label="Folder dokumentów na Dysku Google"><Input type="url" value={driveFolderUrl} onChange={(e) => setDriveFolderUrl(e.target.value)} /></Field><Field label="Notatka wewnętrzna"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div></details>
    {deal && <section className="grid grid-cols-3 gap-2 rounded-xl border p-3"><Button type="button" onClick={() => changeStatus('won')} disabled={!!statusAction}><Check className="size-4"/>Wygrany</Button><Button type="button" variant="outline" onClick={() => changeStatus('lost')} disabled={!!statusAction}><X className="size-4"/>Przegrany</Button><Button type="button" variant="destructive" onClick={removeDeal}><Trash2 className="size-4"/>Usuń</Button></section>}
  </div><div className="flex gap-2 border-t p-4"><Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Anuluj</Button><Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin"/>}{deal ? 'Zapisz zmiany' : 'Utwórz Deal'}</Button></div></div></SheetContent></Sheet>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>; }
function Select({ label, value, set, values }: { label: string; value: string; set: (value: string) => void; values: string[] }) { return <Field label={label}><select value={value} onChange={(e) => set(e.target.value)} className="h-9 w-full rounded-md border bg-muted px-3 text-sm"><option value="">Wybierz</option>{values.map((row) => <option key={row}>{row}</option>)}</select></Field>; }
function numberOrZero(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function numberOrNull(value: string) { if (!value.trim()) return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function localDateTime(value?: string) { return value ? value.slice(0, 16) : ''; }
