'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type {
  Company,
  Contact,
  Deal,
  DealStatus,
  PipelineStage,
  Profile,
} from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { EntitySearchSelect } from '@/components/ui/entity-search-select';
import { MobileDateTimeInput } from '@/components/ui/mobile-date-time-input';
import { Banknote, Check, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { isValidNip, normalizeNip } from '@/lib/companies/nip';

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultQuestionnaireId?: string;
  onSaved: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId,
  defaultCompanyId,
  defaultContactId,
  defaultQuestionnaireId,
  onSaved,
}: DealFormProps) {
  const db = useMemo(() => createClient(), []);
  const { accountId, profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [profiles, setProfiles] = useState<Profile[]>([]);
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [contactId, setContactId] = useState(''),
    [secondContactId, setSecondContactId] = useState(''),
    [companyId, setCompanyId] = useState('');
  const [value, setValue] = useState(''),
    [source, setSource] = useState(''),
    [goal, setGoal] = useState(''),
    [productType, setProductType] = useState(''),
    [stageId, setStageId] = useState(''),
    [assignedTo, setAssignedTo] = useState('');
  const [nextAction, setNextAction] = useState(''),
    [nextActionAt, setNextActionAt] = useState(''),
    [followUpAt, setFollowUpAt] = useState(''),
    [meetingAt, setMeetingAt] = useState(''),
    [meetingPlace, setMeetingPlace] = useState('');
  const [expectedCommission, setExpectedCommission] = useState(''),
    [expectedCloseDate, setExpectedCloseDate] = useState(''),
    [missingDocuments, setMissingDocuments] = useState(''),
    [questionnaireText, setQuestionnaireText] = useState(''),
    [driveFolderUrl, setDriveFolderUrl] = useState(''),
    [notes, setNotes] = useState('');
  const [mfinanseStatus, setMfinanseStatus] = useState('do_sprawdzenia'),
    [blocker, setBlocker] = useState(''),
    [questionnaireDueAt, setQuestionnaireDueAt] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState('');
  const [launchedAmount, setLaunchedAmount] = useState(''),
    [launchedAt, setLaunchedAt] = useState(''),
    [actualCommission, setActualCommission] = useState(''),
    [invoiceNumber, setInvoiceNumber] = useState(''),
    [invoiceDate, setInvoiceDate] = useState(''),
    [invoiceStatus, setInvoiceStatus] = useState(''),
    [settlementVerified, setSettlementVerified] = useState(false),
    [settlementNotes, setSettlementNotes] = useState('');
  const [questionnaireData, setQuestionnaireData] = useState<
    Record<string, unknown>
  >({});
  const [saving, setSaving] = useState(false),
    [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [commissionEdited, setCommissionEdited] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false),
    [newFirstName, setNewFirstName] = useState(''),
    [newLastName, setNewLastName] = useState(''),
    [newPhone, setNewPhone] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false),
    [newCompanyName, setNewCompanyName] = useState(''),
    [newCompanyNip, setNewCompanyNip] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [contactRows, companyRows, profileRows, dealLinks] =
        await Promise.all([
          db.from('contacts').select('*').order('name'),
          db.from('companies').select('*').order('name'),
          db.from('profiles').select('*').order('full_name'),
          deal
            ? db
                .from('deal_contacts')
                .select('contact_id,is_primary')
                .eq('deal_id', deal.id)
                .order('is_primary', { ascending: false })
            : Promise.resolve({ data: [] }),
        ]);
      if (cancelled) return;
      setContacts((contactRows.data ?? []) as Contact[]);
      setCompanies((companyRows.data ?? []) as Company[]);
      setProfiles((profileRows.data ?? []) as Profile[]);
      const links = (dealLinks.data ?? []) as {
        contact_id: string;
        is_primary: boolean;
      }[];
      setTitle(deal?.title ?? '');
      setDescription(deal?.description ?? '');
      setContactId(
        links.find((row) => row.is_primary)?.contact_id ??
          deal?.contact_id ??
          defaultContactId ??
          ''
      );
      setSecondContactId(
        deal?.product_type === 'ML — HIPOTEKA'
          ? (links.find((row) => !row.is_primary)?.contact_id ??
              deal?.co_applicant_contact_id ??
              '')
          : ''
      );
      setCompanyId(deal?.company_id ?? defaultCompanyId ?? '');
      setValue(deal?.value == null ? '' : String(deal.value));
      setSource(deal?.source ?? '');
      setGoal(deal?.goal ?? '');
      setProductType(deal?.product_type ?? '');
      setStageId(deal?.stage_id ?? defaultStageId ?? stages[0]?.id ?? '');
      setAssignedTo(deal?.assigned_to ?? profile?.id ?? '');
      setNextAction(deal?.next_action ?? '');
      setNextActionAt(localDateTime(deal?.next_action_at));
      setFollowUpAt(localDateTime(deal?.follow_up_at));
      setMeetingAt(localDateTime(deal?.meeting_at));
      setMeetingPlace(deal?.meeting_place ?? '');
      setExpectedCommission(
        deal?.expected_commission == null
          ? ''
          : String(deal.expected_commission)
      );
      setExpectedCloseDate(deal?.expected_close_date ?? '');
      setMissingDocuments(deal?.missing_documents ?? '');
      setQuestionnaireText(deal?.questionnaire_text ?? '');
      setDriveFolderUrl(deal?.drive_folder_url ?? '');
      setNotes(deal?.notes ?? '');
      setMfinanseStatus(deal?.mfinanse_status ?? 'do_sprawdzenia');
      setBlocker(deal?.blocker ?? '');
      setQuestionnaireDueAt(localDateTime(deal?.questionnaire_due_at));
      setQuestionnaireId(
        deal?.questionnaire_id ?? defaultQuestionnaireId ?? ''
      );
      setLaunchedAmount(
        deal?.launched_amount == null ? '' : String(deal.launched_amount)
      );
      setLaunchedAt(deal?.launched_at ?? '');
      setActualCommission(
        deal?.actual_commission == null ? '' : String(deal.actual_commission)
      );
      setInvoiceNumber(deal?.invoice_number ?? '');
      setInvoiceDate(deal?.invoice_date ?? '');
      setInvoiceStatus(deal?.invoice_status ?? '');
      setSettlementVerified(Boolean(deal?.settlement_verified));
      setSettlementNotes(deal?.settlement_notes ?? '');
      setQuestionnaireData(deal?.questionnaire_data ?? {});
      if (!deal && defaultQuestionnaireId) {
        const { data: questionnaire } = await db
          .from('financial_questionnaire_submissions')
          .select('responses,preliminary_analysis,created_at,status')
          .eq('id', defaultQuestionnaireId)
          .single();
        if (questionnaire) {
          setQuestionnaireData(questionnaire.responses ?? {});
          setQuestionnaireText(questionnaire.preliminary_analysis ?? '');
        }
      }
      setShowNewContact(false);
      setShowNewCompany(false);
      setCommissionEdited(Boolean(deal?.expected_commission));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    deal,
    db,
    defaultStageId,
    defaultCompanyId,
    defaultContactId,
    defaultQuestionnaireId,
    stages,
    profile?.id,
  ]);

  const contactOptions = contacts.map((row) => ({
    value: row.id,
    label:
      row.name ||
      [row.first_name, row.last_name].filter(Boolean).join(' ') ||
      row.phone,
    keywords: [row.phone, row.email, row.pesel].filter(Boolean).join(' '),
  }));

  function selectPrimaryContact(id: string) {
    setContactId(id);
    const inheritedSource = contacts.find((row) => row.id === id)?.source;
    if (!source && inheritedSource) setSource(inheritedSource);
  }
  const isMortgageDeal = productType === 'ML — HIPOTEKA';

  function changeProductType(nextProductType: string) {
    setProductType(nextProductType);
    if (nextProductType !== 'ML — HIPOTEKA') setSecondContactId('');
  }

  const companyOptions = companies.map((row) => ({
    value: row.id,
    label: row.name,
    keywords: [row.nip, row.phone, row.email].filter(Boolean).join(' '),
  }));

  function changeValue(nextValue: string) {
    setValue(nextValue);
    if (!commissionEdited) {
      const amount = Number(nextValue);
      setExpectedCommission(
        Number.isFinite(amount) && amount > 0
          ? String(Math.round(amount * 0.01 * 100) / 100)
          : ''
      );
    }
  }

  async function addContactInline() {
    if (!newPhone.trim() || !accountId) {
      toast.error('Numer telefonu jest wymagany.');
      return;
    }
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    const fullName = [newFirstName.trim(), newLastName.trim()]
      .filter(Boolean)
      .join(' ');
    const { data, error } = await db
      .from('contacts')
      .insert({
        account_id: accountId,
        user_id: session.user.id,
        first_name: newFirstName.trim() || null,
        last_name: newLastName.trim() || null,
        name: fullName || null,
        phone: newPhone.trim(),
      })
      .select('*')
      .single();
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Kontakt z tym telefonem już istnieje.'
          : 'Nie udało się dodać Kontaktu.'
      );
      return;
    }
    setContacts((rows) => [...rows, data as Contact]);
    if (!contactId) setContactId(data.id);
    else setSecondContactId(data.id);
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    setShowNewContact(false);
    toast.success('Kontakt został dodany i powiązany.');
  }

  async function addCompanyInline() {
    if (!newCompanyName.trim() || !accountId) return;
    if (!isValidNip(newCompanyNip)) {
      toast.error('NIP musi mieć 10 cyfr.');
      return;
    }
    const normalizedNip = normalizeNip(newCompanyNip);
    if (normalizedNip) {
      const { data: existing } = await db
        .from('companies')
        .select('*')
        .eq('account_id', accountId)
        .eq('nip_normalized', normalizedNip)
        .maybeSingle();
      if (existing) {
        setCompanies((rows) =>
          rows.some((row) => row.id === existing.id)
            ? rows
            : [...rows, existing as Company]
        );
        setCompanyId(existing.id);
        setShowNewCompany(false);
        toast.info(
          `Firma z tym NIP już istnieje: ${existing.name}. Wybrano ją.`
        );
        return;
      }
    }
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await db
      .from('companies')
      .insert({
        account_id: accountId,
        user_id: session.user.id,
        name: newCompanyName.trim(),
        nip: normalizedNip || null,
      })
      .select('*')
      .single();
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Taka firma już istnieje.'
          : 'Nie udało się dodać firmy.'
      );
      return;
    }
    setCompanies((rows) => [...rows, data as Company]);
    setCompanyId(data.id);
    setNewCompanyName('');
    setNewCompanyNip('');
    setShowNewCompany(false);
    toast.success('Firma została dodana i powiązana.');
  }

  async function saveRelations(dealId: string) {
    if (!accountId) return;
    await db.from('deal_contacts').delete().eq('deal_id', dealId);
    const rows: {
      deal_id: string;
      contact_id: string;
      account_id: string;
      role: string;
      is_primary: boolean;
    }[] = [];
    if (contactId)
      rows.push({
        deal_id: dealId,
        contact_id: contactId,
        account_id: accountId,
        role: 'Wnioskodawca 1',
        is_primary: true,
      });
    if (secondContactId && secondContactId !== contactId)
      rows.push({
        deal_id: dealId,
        contact_id: secondContactId,
        account_id: accountId,
        role: 'Wnioskodawca 2',
        is_primary: false,
      });
    if (rows.length) {
      const { error } = await db.from('deal_contacts').insert(rows);
      if (error) throw error;
    }
    if (companyId)
      for (const personId of [contactId, secondContactId].filter(Boolean))
        await db.from('contact_companies').upsert(
          {
            contact_id: personId,
            company_id: companyId,
            account_id: accountId,
            role: 'Osoba w sprawie',
            is_primary: true,
          },
          { onConflict: 'contact_id,company_id' }
        );
  }

  async function handleSave() {
    if (
      !title.trim() ||
      !description.trim() ||
      !value ||
      !contactId ||
      !source ||
      !productType ||
      !stageId ||
      !accountId
    ) {
      toast.error(
        'Uzupełnij pola oznaczone gwiazdką: nazwę, opis, kwotę, osobę, źródło, typ i etap.'
      );
      return;
    }
    if (secondContactId && !isMortgageDeal) {
      toast.error('Druga osoba jest dostępna tylko dla Deala hipotecznego.');
      return;
    }
    if (
      stages.find((row) => row.id === stageId)?.name.includes('POCZEKALNIA') &&
      !followUpAt
    ) {
      toast.error('W POCZEKALNI ustaw termin ponownego kontaktu.');
      return;
    }
    if (
      questionnaireDueAt &&
      meetingAt &&
      new Date(meetingAt).getTime() - new Date(questionnaireDueAt).getTime() <
        48 * 60 * 60 * 1000
    ) {
      toast.error(
        'Termin ankiety musi przypadać co najmniej 2 dni przed płatną konsultacją.'
      );
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      value: numberOrZero(value),
      currency: 'PLN',
      contact_id: contactId,
      co_applicant_contact_id: secondContactId || null,
      company_id: companyId || null,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      source: source || null,
      goal: goal || null,
      product_type: productType || null,
      applicant_mode: secondContactId ? 'Dwie osoby' : 'Jedna osoba',
      next_action: nextAction.trim() || null,
      next_action_at: nextActionAt || null,
      follow_up_at: followUpAt || null,
      meeting_at: meetingAt || null,
      meeting_place: meetingPlace.trim() || null,
      expected_commission: numberOrNull(expectedCommission),
      expected_close_date: expectedCloseDate || null,
      missing_documents: missingDocuments.trim() || null,
      questionnaire_text: questionnaireText.trim() || null,
      drive_folder_url: driveFolderUrl.trim() || null,
      notes: notes.trim() || null,
      mfinanse_status: mfinanseStatus,
      blocker: blocker.trim() || null,
      blocker_since: blocker.trim()
        ? deal?.blocker_since || new Date().toISOString()
        : null,
      questionnaire_due_at: questionnaireDueAt || null,
      questionnaire_id: questionnaireId || null,
      questionnaire_data: questionnaireData,
      questionnaire_status: questionnaireId ? 'submitted' : 'not_started',
      questionnaire_received_at: questionnaireId
        ? deal?.questionnaire_received_at || new Date().toISOString()
        : null,
      launched_amount: numberOrNull(launchedAmount),
      launched_at: launchedAt || null,
      actual_commission: numberOrNull(actualCommission),
      invoice_number: invoiceNumber.trim() || null,
      invoice_date: invoiceDate || null,
      invoice_status: invoiceStatus || null,
      settlement_verified: settlementVerified,
      settlement_notes: settlementNotes.trim() || null,
    };
    try {
      let dealId = deal?.id;
      if (dealId) {
        const { error } = await db
          .from('deals')
          .update(payload)
          .eq('id', dealId);
        if (error) throw error;
      } else {
        const {
          data: { session },
        } = await db.auth.getSession();
        if (!session?.user) throw new Error('Brak aktywnego logowania.');
        const { data, error } = await db
          .from('deals')
          .insert({
            ...payload,
            account_id: accountId,
            user_id: session.user.id,
            status: 'open',
          })
          .select('id')
          .single();
        if (error) throw error;
        dealId = data.id;
      }
      try {
        await saveRelations(dealId!);
      } catch (relationError) {
        console.error(
          'Deal zapisany, ale nie udało się zapisać relacji:',
          relationError
        );
        toast.warning(
          'Deal został zapisany. Dodatkowe powiązanie wymaga ponowienia.'
        );
      }
      toast.success(
        deal ? 'Deal został zaktualizowany.' : 'Deal został utworzony.'
      );
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      console.error('Nie udało się zapisać Deala:', error);
      toast.error(`Nie udało się zapisać Deala: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: DealStatus) {
    if (!deal) return;
    setStatusAction(status);
    const { error } = await db
      .from('deals')
      .update({ status })
      .eq('id', deal.id);
    setStatusAction(null);
    if (error) toast.error('Nie udało się zmienić statusu.');
    else {
      toast.success('Status został zmieniony.');
      onSaved();
    }
  }
  async function removeDeal() {
    if (!deal || !window.confirm('Usunąć ten Deal?')) return;
    const { error } = await db.from('deals').delete().eq('id', deal.id);
    if (error) toast.error('Nie udało się usunąć Deala.');
    else {
      onOpenChange(false);
      onSaved();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b p-4">
            <SheetTitle>{deal ? 'Edytuj Deal' : 'Nowy Deal'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <section className="space-y-3">
              <h3 className="font-semibold">Najważniejsze informacje</h3>
              <div className="grid gap-3">
                <Field label="Nazwa Deala *">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Np. Hipoteka — Jan Kowalski"
                  />
                </Field>
                <Field label="Kwota *">
                  <div className="relative">
                    <Banknote className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
                    <Input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => changeValue(e.target.value)}
                      className="pr-10 pl-8"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                      zł
                    </span>
                  </div>
                </Field>
              </div>
              <Field label="Opis sprawy *">
                <VoiceTextarea
                  value={description}
                  onChange={setDescription}
                  className="min-h-28"
                  placeholder="Sytuacja klienta, potrzeba i ustalenia po rozmowie"
                />
              </Field>
            </section>
            <section className="space-y-3 rounded-xl border p-4">
              <h3 className="font-semibold">Osoby i firma</h3>
              <div className="grid gap-3">
                <Field label="Główna osoba *">
                  <EntitySearchSelect
                    value={contactId}
                    onChange={selectPrimaryContact}
                    options={contactOptions}
                    placeholder="Wyszukaj osobę"
                    allowEmpty={false}
                    onAdd={() => setShowNewContact((v) => !v)}
                    addLabel="Dodaj nową osobę"
                  />
                </Field>
                {isMortgageDeal && (
                  <Field label="Druga osoba — tylko hipoteka">
                    <EntitySearchSelect
                      value={secondContactId}
                      onChange={setSecondContactId}
                      options={contactOptions.filter(
                        (row) => row.value !== contactId
                      )}
                      placeholder="Wyszukaj drugą osobę"
                      onAdd={() => setShowNewContact((v) => !v)}
                      addLabel="Dodaj drugą osobę"
                    />
                  </Field>
                )}
                <Field label="Firma">
                  <EntitySearchSelect
                    value={companyId}
                    onChange={setCompanyId}
                    options={companyOptions}
                    placeholder="Wyszukaj firmę"
                    onAdd={() => setShowNewCompany((v) => !v)}
                    addLabel="Dodaj nową firmę"
                  />
                </Field>
              </div>
              {showNewContact && (
                <div className="bg-muted/50 grid gap-2 rounded-lg p-3">
                  <Input
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Imię"
                  />
                  <Input
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Nazwisko"
                  />
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Telefon *"
                  />
                  <Button
                    type="button"
                    onClick={addContactInline}
                    className="w-full"
                  >
                    Dodaj i powiąż osobę
                  </Button>
                </div>
              )}
              {showNewCompany && (
                <div className="bg-muted/50 grid gap-2 rounded-lg p-3">
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nazwa firmy *"
                  />
                  <Input
                    value={newCompanyNip}
                    onChange={(e) => setNewCompanyNip(e.target.value)}
                    placeholder="NIP (opcjonalnie)"
                    inputMode="numeric"
                  />
                  <Button type="button" onClick={addCompanyInline}>
                    Dodaj i powiąż
                  </Button>
                </div>
              )}
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Sprawa sprzedażowa</h3>
              <div className="grid gap-3">
                <Select
                  label="Źródło *"
                  value={source}
                  set={setSource}
                  values={[
                    'Podajnik mBank',
                    'Lead mFinanse',
                    'Własny kontakt',
                    'Polecenie',
                    'Strona makson.space',
                    'Inne',
                  ]}
                />
                <Select
                  label="Typ Deala *"
                  value={productType}
                  set={changeProductType}
                  values={[
                    'ML — HIPOTEKA',
                    'ML — FIRMA',
                    'BC — FIRMA',
                    'NML — OFF',
                    'LEASING',
                    'INNY',
                  ]}
                />
                <Field label="Etap *">
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="bg-muted h-9 w-full rounded-md border px-3 text-sm"
                  >
                    {stages.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Select
                  label="Cel"
                  value={goal}
                  set={setGoal}
                  values={[
                    'Zakup nieruchomości',
                    'Budowa domu',
                    'Refinansowanie',
                    'Konsolidacja',
                    'Finansowanie firmy',
                    'Podwyższenie limitu',
                    'Inny',
                  ]}
                />
                <Select
                  label="Status mFinanse"
                  value={mfinanseStatus}
                  set={setMfinanseStatus}
                  values={[
                    'do_sprawdzenia',
                    'zarejestrowany',
                    'zajety',
                    'nie_dotyczy',
                  ]}
                  labels={{
                    do_sprawdzenia: 'Do sprawdzenia',
                    zarejestrowany: 'Zarejestrowany',
                    zajety: 'Zajęty',
                    nie_dotyczy: 'Nie dotyczy',
                  }}
                />
                <Field label="Właściciel">
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="bg-muted h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Nieprzypisany</option>
                    {profiles.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.full_name || row.email}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Prowizja oczekiwana">
                  <Input
                    type="number"
                    min="0"
                    value={expectedCommission}
                    onChange={(e) => {
                      setCommissionEdited(true);
                      setExpectedCommission(e.target.value);
                    }}
                  />
                  <p className="text-muted-foreground text-xs">
                    Domyślnie 1% kwoty, możesz zmienić.
                  </p>
                </Field>
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Co dalej</h3>
              <Field label="Następne działanie">
                <VoiceTextarea
                  value={nextAction}
                  onChange={setNextAction}
                  className="min-h-20"
                  placeholder="Co konkretnie trzeba zrobić jako następny krok?"
                />
              </Field>
              <Field label="Bloker sprawy">
                <VoiceTextarea
                  value={blocker}
                  onChange={setBlocker}
                  className="min-h-20"
                  placeholder="Co zatrzymuje sprawę? Zostaw puste, jeśli nie ma blokera."
                />
              </Field>
              <div className="grid gap-3">
                <Field label="Termin następnego działania">
                  <MobileDateTimeInput value={nextActionAt} onChange={setNextActionAt} />
                </Field>
                <Field label="Miejsce lub link">
                  <Input
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                    placeholder="Adres lub link do spotkania"
                  />
                </Field>
                {stages
                  .find((row) => row.id === stageId)
                  ?.name.includes('POCZEKALNIA') && (
                  <Field label="Termin ponownego kontaktu *">
                    <MobileDateTimeInput value={followUpAt} onChange={setFollowUpAt} required />
                  </Field>
                )}
              </div>
            </section>
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">
                Dodatkowe terminy
              </summary>
              <div className="mt-4 grid gap-3">
                <Field label="Spotkanie zapisane na Dealu">
                  <MobileDateTimeInput value={meetingAt} onChange={setMeetingAt} />
                </Field>
                <Field label="Planowane zamknięcie">
                  <Input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                  />
                </Field>
              </div>
            </details>
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">
                Dane z formularza i przygotowanie wniosku
              </summary>
              <div className="mt-4 space-y-3">
                <Field label="Pełne odpowiedzi z formularza / ankiety">
                  <VoiceTextarea
                    value={questionnaireText}
                    onChange={setQuestionnaireText}
                    className="min-h-36"
                  />
                </Field>
                <Field label="Ankieta wymagana do">
                  <MobileDateTimeInput value={questionnaireDueAt} onChange={setQuestionnaireDueAt} />
                  <p className="text-muted-foreground text-xs">
                    Dla płatnej konsultacji ustaw termin co najmniej 2 dni przed
                    spotkaniem.
                  </p>
                </Field>
                <p className="text-muted-foreground text-xs">
                  Dokumenty prowadź w checkliście na karcie Deala. Folder Dysku
                  Google twórz tylko na żądanie przyciskiem „Utwórz folder”.
                  Notatki dodawaj w zakładce „Komentarze i notatki”, gdzie
                  zapisują się z datą i autorem.
                </p>
              </div>
            </details>
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">
                Uruchomienie, prowizja i faktura
              </summary>
              <div className="mt-4 grid gap-3">
                <Field label="Kwota uruchomiona">
                  <Input
                    type="number"
                    min="0"
                    value={launchedAmount}
                    onChange={(e) => setLaunchedAmount(e.target.value)}
                  />
                </Field>
                <Field label="Data uruchomienia">
                  <Input
                    type="date"
                    value={launchedAt}
                    onChange={(e) => setLaunchedAt(e.target.value)}
                  />
                </Field>
                <Field label="Prowizja rzeczywista">
                  <Input
                    type="number"
                    min="0"
                    value={actualCommission}
                    onChange={(e) => setActualCommission(e.target.value)}
                  />
                </Field>
                <Field label="Numer faktury">
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </Field>
                <Field label="Data faktury">
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </Field>
                <Select
                  label="Status faktury"
                  value={invoiceStatus}
                  set={setInvoiceStatus}
                  values={[
                    'do_wystawienia',
                    'wystawiona',
                    'oplacona',
                    'nie_dotyczy',
                  ]}
                  labels={{
                    do_wystawienia: 'Do wystawienia',
                    wystawiona: 'Wystawiona',
                    oplacona: 'Opłacona',
                    nie_dotyczy: 'Nie dotyczy',
                  }}
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={settlementVerified}
                    onChange={(e) => setSettlementVerified(e.target.checked)}
                  />
                  Rozliczenie sprawdzone
                </label>
                <div className="sm:col-span-2">
                  <Field label="Uwagi do rozliczenia">
                    <VoiceTextarea
                      value={settlementNotes}
                      onChange={setSettlementNotes}
                    />
                  </Field>
                </div>
              </div>
            </details>
            {deal && (
              <section className="grid grid-cols-3 gap-2 rounded-xl border p-3">
                <Button
                  type="button"
                  onClick={() => changeStatus('won')}
                  disabled={!!statusAction}
                >
                  <Check className="size-4" />
                  Wygrany
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeStatus('lost')}
                  disabled={!!statusAction}
                >
                  <X className="size-4" />
                  Przegrany
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeDeal}
                >
                  <Trash2 className="size-4" />
                  Usuń
                </Button>
              </section>
            )}
          </div>
          <div className="flex gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {deal ? 'Zapisz zmiany' : 'Utwórz Deal'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
function Select({
  label,
  value,
  set,
  values,
  labels,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  values: string[];
  labels?: Record<string, string>;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="bg-muted h-9 w-full rounded-md border px-3 text-sm"
      >
        <option value="">Wybierz</option>
        {values.map((row) => (
          <option key={row} value={row}>
            {labels?.[row] ?? row}
          </option>
        ))}
      </select>
    </Field>
  );
}
function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function localDateTime(value?: string) {
  return value ? value.slice(0, 16) : '';
}

