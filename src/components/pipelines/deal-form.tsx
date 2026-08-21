'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { CURRENCIES } from '@/lib/currency';
import type {
  Contact,
  Company,
  Conversation,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  X,
  Trash2,
  MessageSquare,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  onSaved: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId,
  onSaved,
}: DealFormProps) {
  const t = useTranslations('Pipelines.form');
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [stageId, setStageId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [goal, setGoal] = useState('');
  const [productType, setProductType] = useState('');
  const [applicantMode, setApplicantMode] = useState('');
  const [incomeType, setIncomeType] = useState('');
  const [companyNip, setCompanyNip] = useState('');
  const [accountingType, setAccountingType] = useState('');
  const [liabilities, setLiabilities] = useState('');
  const [bikStatus, setBikStatus] = useState('');
  const [questionnaireText, setQuestionnaireText] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [meetingAt, setMeetingAt] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [expectedCommission, setExpectedCommission] = useState('');
  const [missingDocuments, setMissingDocuments] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');
  const [needSummary, setNeedSummary] = useState('');
  const [qualificationStatus, setQualificationStatus] = useState('');
  const [qualificationReason, setQualificationReason] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyCosts, setMonthlyCosts] = useState('');
  const [monthlyInstallments, setMonthlyInstallments] = useState('');
  const [householdSize, setHouseholdSize] = useState('');
  const [employmentFrom, setEmploymentFrom] = useState('');
  const [contractUntil, setContractUntil] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [ownContribution, setOwnContribution] = useState('');
  const [loanTermMonths, setLoanTermMonths] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [loanPurposeDetails, setLoanPurposeDetails] = useState('');
  const [currentBank, setCurrentBank] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [currentInstallment, setCurrentInstallment] = useState('');
  const [estimatedSavings, setEstimatedSavings] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [launchedAmount, setLaunchedAmount] = useState('');
  const [launchedAt, setLaunchedAt] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [actualCommission, setActualCommission] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [settlementVerified, setSettlementVerified] = useState(false);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [linkedConversation, setLinkedConversation] =
    useState<Conversation | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset the form fields every time the sheet opens or its input
  // props change. This is a legitimate prop-driven sync; the rule is
  // over-cautious here, hence the block-level disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (deal) {
      setTitle(deal.title);
      setValue(String(deal.value ?? ''));
      setCurrency(deal.currency || defaultCurrency);
      // contact_id is nullable when the contact has been deleted
      // (migration 004: ON DELETE SET NULL). "" means "no selection".
      setContactId(deal.contact_id ?? '');
      setCompanyId(deal.company_id ?? '');
      setStageId(deal.stage_id);
      setAssignedTo(deal.assigned_to ?? '');
      setExpectedCloseDate(deal.expected_close_date ?? '');
      setNotes(deal.notes ?? '');
      setDescription(deal.description ?? '');
      setSource(deal.source ?? ''); setGoal(deal.goal ?? '');
      setProductType(deal.product_type ?? ''); setApplicantMode(deal.applicant_mode ?? '');
      setIncomeType(deal.income_type ?? ''); setCompanyNip(deal.company_nip ?? '');
      setAccountingType(deal.accounting_type ?? ''); setLiabilities(deal.liabilities ?? '');
      setBikStatus(deal.bik_status ?? ''); setQuestionnaireText(deal.questionnaire_text ?? '');
      setNextAction(deal.next_action ?? ''); setNextActionAt(deal.next_action_at?.slice(0, 16) ?? '');
      setMeetingAt(deal.meeting_at?.slice(0, 16) ?? ''); setMeetingPlace(deal.meeting_place ?? '');
      setExpectedCommission(String(deal.expected_commission ?? ''));
      setMissingDocuments(deal.missing_documents ?? ''); setDriveFolderUrl(deal.drive_folder_url ?? '');
      setSourceDetails(deal.source_details ?? ''); setNeedSummary(deal.need_summary ?? '');
      setQualificationStatus(deal.qualification_status ?? ''); setQualificationReason(deal.qualification_reason ?? '');
      setMaritalStatus(deal.marital_status ?? ''); setMonthlyIncome(String(deal.monthly_income ?? ''));
      setMonthlyCosts(String(deal.monthly_costs ?? '')); setMonthlyInstallments(String(deal.monthly_installments ?? ''));
      setHouseholdSize(String(deal.household_size ?? '')); setEmploymentFrom(deal.employment_from ?? ''); setContractUntil(deal.contract_until ?? '');
      setPropertyValue(String(deal.property_value ?? '')); setOwnContribution(String(deal.own_contribution ?? '')); setLoanTermMonths(String(deal.loan_term_months ?? ''));
      setPropertyLocation(deal.property_location ?? ''); setPropertyType(deal.property_type ?? ''); setLoanPurposeDetails(deal.loan_purpose_details ?? '');
      setCurrentBank(deal.current_bank ?? ''); setCurrentBalance(String(deal.current_balance ?? '')); setCurrentInstallment(String(deal.current_installment ?? '')); setEstimatedSavings(String(deal.estimated_savings ?? ''));
      setFollowUpAt(deal.follow_up_at?.slice(0, 16) ?? ''); setLaunchedAmount(String(deal.launched_amount ?? '')); setLaunchedAt(deal.launched_at ?? '');
      setCommissionRate(String(deal.commission_rate ?? '')); setActualCommission(String(deal.actual_commission ?? '')); setInvoiceNumber(deal.invoice_number ?? ''); setInvoiceDate(deal.invoice_date ?? ''); setInvoiceStatus(deal.invoice_status ?? '');
      setSettlementVerified(deal.settlement_verified ?? false); setSettlementNotes(deal.settlement_notes ?? ''); setTrackingNumber(deal.tracking_number ?? '');
    } else {
      setTitle('');
      setValue('');
      setCurrency(defaultCurrency);
      setContactId('');
      setCompanyId('');
      setStageId(defaultStageId || stages[0]?.id || '');
      setAssignedTo('');
      setExpectedCloseDate('');
      setNotes('');
      setDescription(''); setSource(''); setGoal(''); setProductType('');
      setApplicantMode(''); setIncomeType(''); setCompanyNip(''); setAccountingType('');
      setLiabilities(''); setBikStatus(''); setQuestionnaireText(''); setNextAction('');
      setNextActionAt(''); setMeetingAt(''); setMeetingPlace(''); setExpectedCommission('');
      setMissingDocuments(''); setDriveFolderUrl('');
      setSourceDetails(''); setNeedSummary(''); setQualificationStatus(''); setQualificationReason(''); setMaritalStatus('');
      setMonthlyIncome(''); setMonthlyCosts(''); setMonthlyInstallments(''); setHouseholdSize(''); setEmploymentFrom(''); setContractUntil('');
      setPropertyValue(''); setOwnContribution(''); setLoanTermMonths(''); setPropertyLocation(''); setPropertyType(''); setLoanPurposeDetails('');
      setCurrentBank(''); setCurrentBalance(''); setCurrentInstallment(''); setEstimatedSavings(''); setFollowUpAt('');
      setLaunchedAmount(''); setLaunchedAt(''); setCommissionRate(''); setActualCommission(''); setInvoiceNumber(''); setInvoiceDate(''); setInvoiceStatus(''); setSettlementVerified(false); setSettlementNotes(''); setTrackingNumber('');
    }
  }, [open, deal, defaultStageId, stages, defaultCurrency]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load supporting data once the sheet is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [c, p, co] = await Promise.all([
        supabase.from('contacts').select('*').order('name'),
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('companies').select('*').order('name'),
      ]);
      if (cancelled) return;
      setContacts((c.data ?? []) as Contact[]);
      setProfiles((p.data ?? []) as Profile[]);
      setCompanies((co.data ?? []) as Company[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  // Fetch linked conversation for the selected contact (newest open one).
  // Clearing on no-selection is sync with prop state; the populated
  // case runs setLinkedConversation inside the async fetch callback.
  useEffect(() => {
    if (!open || !contactId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkedConversation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contactId)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLinkedConversation((data as Conversation | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contactId, supabase]);

  async function handleSave() {
    if (!title.trim() || !contactId || !stageId) {
      toast.error(t('toastRequired'));
      return;
    }
    const selectedStage = stages.find((stage) => stage.id === stageId);
    if (selectedStage?.name.includes('POCZEKALNIA') && !followUpAt) {
      toast.error('W POCZEKALNI trzeba ustawić termin ponownego kontaktu.');
      return;
    }
    setSaving(true);

    const payload = {
      title: title.trim(),
      value: parseFloat(value) || 0,
      currency,
      contact_id: contactId,
      company_id: companyId || null,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
      description: description.trim() || null,
      source: source || null,
      goal: goal || null,
      product_type: productType || null,
      applicant_mode: applicantMode || null,
      income_type: incomeType || null,
      company_nip: companyNip.trim() || null,
      accounting_type: accountingType || null,
      liabilities: liabilities.trim() || null,
      bik_status: bikStatus || null,
      questionnaire_text: questionnaireText.trim() || null,
      next_action: nextAction.trim() || null,
      next_action_at: nextActionAt || null,
      meeting_at: meetingAt || null,
      meeting_place: meetingPlace.trim() || null,
      expected_commission: parseFloat(expectedCommission) || null,
      missing_documents: missingDocuments.trim() || null,
      drive_folder_url: driveFolderUrl.trim() || null,
      source_details: sourceDetails.trim() || null,
      need_summary: needSummary.trim() || null,
      qualification_status: qualificationStatus || null,
      qualification_reason: qualificationReason.trim() || null,
      marital_status: maritalStatus || null,
      monthly_income: numberOrNull(monthlyIncome), monthly_costs: numberOrNull(monthlyCosts), monthly_installments: numberOrNull(monthlyInstallments), household_size: numberOrNull(householdSize),
      employment_from: employmentFrom || null, contract_until: contractUntil || null,
      property_value: numberOrNull(propertyValue), own_contribution: numberOrNull(ownContribution), loan_term_months: numberOrNull(loanTermMonths),
      property_location: propertyLocation.trim() || null, property_type: propertyType || null, loan_purpose_details: loanPurposeDetails.trim() || null,
      current_bank: currentBank.trim() || null, current_balance: numberOrNull(currentBalance), current_installment: numberOrNull(currentInstallment), estimated_savings: numberOrNull(estimatedSavings),
      follow_up_at: followUpAt || null,
      launched_amount: numberOrNull(launchedAmount), launched_at: launchedAt || null, commission_rate: numberOrNull(commissionRate), actual_commission: numberOrNull(actualCommission),
      invoice_number: invoiceNumber.trim() || null, invoice_date: invoiceDate || null, invoice_status: invoiceStatus || null,
      settlement_verified: settlementVerified, settlement_notes: settlementNotes.trim() || null, tracking_number: trackingNumber.trim() || null,
      expected_close_date: expectedCloseDate || null,
    };

    if (deal) {
      const { error } = await supabase
        .from('deals')
        .update(payload)
        .eq('id', deal.id);
      if (error) {
        toast.error(t('toastFailedSave'));
        setSaving(false);
        return;
      }
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast.error(t('toastNotSignedIn'));
        setSaving(false);
        return;
      }
      if (!accountId) {
        toast.error(t('toastNotLinked'));
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('deals').insert({
        ...payload,
        user_id: user.id,
        account_id: accountId,
        status: 'open',
      });
      if (error) {
        toast.error(t('toastFailedCreate'));
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success(deal ? t('toastUpdated') : t('toastCreated'));
    onOpenChange(false);
    onSaved();
  }

  async function handleStatusChange(status: DealStatus) {
    if (!deal) return;
    setStatusAction(status);
    const { error } = await supabase
      .from('deals')
      .update({ status })
      .eq('id', deal.id);
    setStatusAction(null);
    if (error) {
      toast.error(t('toastFailedStatus'));
      return;
    }
    toast.success(
      status === 'won'
        ? t('toastMarkedWon')
        : status === 'lost'
          ? t('toastMarkedLost')
          : t('toastReopened')
    );
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleting(true);
    const { error } = await supabase.from('deals').delete().eq('id', deal.id);
    setDeleting(false);
    if (error) {
      toast.error(t('toastFailedDelete'));
      return;
    }
    toast.success(t('toastDeleted'));
    setConfirmDelete(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-popover border-border text-popover-foreground w-full p-0 sm:max-w-3xl"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-border/50 border-b p-4">
            <SheetTitle className="text-popover-foreground">
              {deal ? t('editDeal') : t('newDeal')}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t('title')}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Opis ogólny Deala</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krótki opis konkretnej sprawy sprzedażowej" className="border-border bg-muted min-h-20" />
            </div>

            <div className="border-border border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold">1. Dane sprawy i formularza</h3>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t('contact')}</Label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="border-border bg-muted text-foreground focus:border-primary focus:ring-primary h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus:ring-1"
              >
                <option value="">{t('selectContact')}</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.phone}
                  </option>
                ))}
              </select>

              {linkedConversation && (
                <Link
                  href="/inbox"
                  className="bg-primary/10 text-primary hover:bg-primary/20 mt-1 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs"
                >
                  <MessageSquare className="h-3 w-3" />
                  {t('linkToConversation')}
                </Link>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Firma</Label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="border-border bg-muted text-foreground focus:border-primary focus:ring-primary h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus:ring-1"
              >
                <option value="">Bez powiązanej firmy</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t('value')}</Label>
                <div className="relative">
                  <DollarSign className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className="border-border bg-muted text-foreground pl-7"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t('currency')}</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="border-border bg-muted text-foreground focus:border-primary h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldSelect label="Źródło pozyskania" value={source} onChange={setSource} options={['Podajnik mBank', 'Lead mFinanse', 'Własny kontakt', 'Polecenie', 'Strona makson.space']} />
              <FieldSelect label="Cel" value={goal} onChange={setGoal} options={['Zakup nieruchomości', 'Budowa domu', 'Refinansowanie', 'Konsolidacja', 'Finansowanie firmy', 'Inny']} />
              <FieldSelect label="Typ produktu" value={productType} onChange={setProductType} options={['HIPOTEKA', 'FIRMA — zabezpieczony', 'FIRMA — niezabezpieczony', 'GOTÓWKA', 'LEASING', 'INNY']} />
              <FieldSelect label="Wnioskodawcy" value={applicantMode} onChange={setApplicantMode} options={['Jedna osoba', 'Para / małżeństwo', 'Wspólnicy']} />
              <FieldSelect label="Forma dochodu" value={incomeType} onChange={setIncomeType} options={['Umowa o pracę', 'Działalność gospodarcza', 'Spółka', 'Mieszane', 'Inne']} />
              <FieldSelect label="Księgowość" value={accountingType} onChange={setAccountingType} options={['KPiR', 'Ryczałt', 'Pełna księgowość', 'Karta podatkowa', 'Nie dotyczy']} />
              <div className="grid gap-2"><Label className="text-muted-foreground">NIP</Label><Input value={companyNip} onChange={(e) => setCompanyNip(e.target.value)} className="border-border bg-muted" /></div>
              <FieldSelect label="Raport BIK" value={bikStatus} onChange={setBikStatus} options={['Posiada', 'Do pobrania', 'Otrzymany', 'Nie dotyczy']} />
              <Field label="Szczegóły źródła / osoba polecająca"><Input value={sourceDetails} onChange={(e) => setSourceDetails(e.target.value)} /></Field>
              <FieldSelect label="Wynik kwalifikacji" value={qualificationStatus} onChange={setQualificationStatus} options={['Do kwalifikacji', 'Zakwalifikowany', 'Braki do uzupełnienia', 'Niekwalifikowany']} />
            </div>

            <Field label="Potrzeba klienta i oczekiwany efekt"><Textarea value={needSummary} onChange={(e) => setNeedSummary(e.target.value)} placeholder="Co klient chce osiągnąć, w jakim czasie i dlaczego" /></Field>
            <Field label="Uzasadnienie kwalifikacji / ryzyka"><Textarea value={qualificationReason} onChange={(e) => setQualificationReason(e.target.value)} /></Field>

            <div className="border-border border-t pt-4"><h3 className="text-sm font-semibold">2. Dochód, gospodarstwo i zobowiązania</h3></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldSelect label="Stan cywilny" value={maritalStatus} onChange={setMaritalStatus} options={['Wolny/a', 'Małżeństwo', 'Rozdzielność majątkowa', 'Inny']} />
              <NumberField label="Liczba osób w gospodarstwie" value={householdSize} onChange={setHouseholdSize} />
              <NumberField label="Miesięczny dochód netto" value={monthlyIncome} onChange={setMonthlyIncome} />
              <NumberField label="Miesięczne koszty życia" value={monthlyCosts} onChange={setMonthlyCosts} />
              <NumberField label="Suma miesięcznych rat" value={monthlyInstallments} onChange={setMonthlyInstallments} />
              <Field label="Dochód od"><Input type="date" value={employmentFrom} onChange={(e) => setEmploymentFrom(e.target.value)} /></Field>
              <Field label="Umowa do"><Input type="date" value={contractUntil} onChange={(e) => setContractUntil(e.target.value)} /></Field>
            </div>

            <div className="grid gap-2"><Label className="text-muted-foreground">Obecne zobowiązania</Label><Textarea value={liabilities} onChange={(e) => setLiabilities(e.target.value)} className="border-border bg-muted min-h-16" /></div>

            <div className="border-border border-t pt-4"><h3 className="text-sm font-semibold">3. Finansowanie i nieruchomość</h3></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField label="Wartość nieruchomości" value={propertyValue} onChange={setPropertyValue} />
              <NumberField label="Wkład własny" value={ownContribution} onChange={setOwnContribution} />
              <NumberField label="Okres kredytu w miesiącach" value={loanTermMonths} onChange={setLoanTermMonths} />
              <FieldSelect label="Rodzaj nieruchomości" value={propertyType} onChange={setPropertyType} options={['Mieszkanie', 'Dom', 'Działka', 'Lokal komercyjny', 'Inna']} />
              <Field label="Lokalizacja nieruchomości"><Input value={propertyLocation} onChange={(e) => setPropertyLocation(e.target.value)} /></Field>
              <Field label="Obecny bank"><Input value={currentBank} onChange={(e) => setCurrentBank(e.target.value)} /></Field>
              <NumberField label="Obecne saldo kredytu" value={currentBalance} onChange={setCurrentBalance} />
              <NumberField label="Obecna rata" value={currentInstallment} onChange={setCurrentInstallment} />
              <NumberField label="Szacowana oszczędność" value={estimatedSavings} onChange={setEstimatedSavings} />
            </div>
            <Field label="Szczegóły celu finansowania"><Textarea value={loanPurposeDetails} onChange={(e) => setLoanPurposeDetails(e.target.value)} /></Field>
            <div className="grid gap-2"><Label className="text-muted-foreground">Pełne dane z ankiety</Label><Textarea value={questionnaireText} onChange={(e) => setQuestionnaireText(e.target.value)} placeholder="Tu trafi komplet odpowiedzi przesłanych przez klienta" className="border-border bg-muted min-h-24" /></div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2"><Label className="text-muted-foreground">Następne działanie</Label><Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="border-border bg-muted" /></div>
              <div className="grid gap-2"><Label className="text-muted-foreground">Termin działania</Label><Input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} className="border-border bg-muted" /></div>
              <div className="grid gap-2"><Label className="text-muted-foreground">Ponowny kontakt — obowiązkowy w POCZEKALNI</Label><Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} className="border-border bg-muted" /></div>
              <div className="grid gap-2"><Label className="text-muted-foreground">Termin spotkania</Label><Input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} className="border-border bg-muted" /></div>
              <div className="grid gap-2"><Label className="text-muted-foreground">Miejsce spotkania</Label><Input value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} placeholder="Online, Mielec, Rzeszów, Kraków" className="border-border bg-muted" /></div>
            </div>

            <div className="grid gap-2"><Label className="text-muted-foreground">Oczekiwana prowizja</Label><Input type="number" value={expectedCommission} onChange={(e) => setExpectedCommission(e.target.value)} className="border-border bg-muted" /></div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">
                {t('expectedCloseDate')}
              </Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t('stage')}</Label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="border-border bg-muted text-foreground focus:border-primary h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t('assignedTo')}</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="border-border bg-muted text-foreground focus:border-primary h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
              >
                <option value="">{t('unassigned')}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-border border-t pt-4"><h3 className="mb-3 text-sm font-semibold">4. Notatki i działania</h3></div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Notatka do historii sprawy</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="border-border bg-muted text-foreground min-h-[100px]"
              />
            </div>

            <div className="border-border border-t pt-4"><h3 className="mb-3 text-sm font-semibold">5. Proces bankowy i dokumenty</h3><p className="mb-3 text-xs text-muted-foreground">Trzy banki są obsługiwane jako osobne procesy powiązane z tym Dealem.</p></div>
            <div className="grid gap-2"><Label className="text-muted-foreground">Lista brakujących dokumentów</Label><Textarea value={missingDocuments} onChange={(e) => setMissingDocuments(e.target.value)} className="border-border bg-muted min-h-20" /></div>
            <div className="grid gap-2"><Label className="text-muted-foreground">Folder dokumentów klienta na Google Drive</Label><Input type="url" value={driveFolderUrl} onChange={(e) => setDriveFolderUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="border-border bg-muted" /><p className="text-xs text-muted-foreground">Jeden prywatny folder przypisany do Deala; automatyczne tworzenie i synchronizacja zostaną podłączone później.</p></div>

            <div className="border-border border-t pt-4"><h3 className="mb-3 text-sm font-semibold">6. Uruchomienie, prowizja i archiwum</h3></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField label="Kwota uruchomiona" value={launchedAmount} onChange={setLaunchedAmount} />
              <Field label="Data uruchomienia"><Input type="date" value={launchedAt} onChange={(e) => setLaunchedAt(e.target.value)} /></Field>
              <NumberField label="Stawka prowizji %" value={commissionRate} onChange={setCommissionRate} />
              <NumberField label="Prowizja rzeczywista" value={actualCommission} onChange={setActualCommission} />
              <Field label="Numer faktury"><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></Field>
              <Field label="Data faktury"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field>
              <FieldSelect label="Status faktury" value={invoiceStatus} onChange={setInvoiceStatus} options={['Do wystawienia', 'Wystawiona', 'Opłacona', 'Korekta / reklamacja']} />
              <Field label="Numer przesyłki archiwum"><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></Field>
            </div>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={settlementVerified} onChange={(e) => setSettlementVerified(e.target.checked)} /> Rozliczenie sprawdzone</label>
            <Field label="Uwagi do rozliczenia / reklamacji"><Textarea value={settlementNotes} onChange={(e) => setSettlementNotes(e.target.value)} /></Field>

            {deal && (
              <div className="border-border bg-muted/50 space-y-2 rounded-lg border p-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {t('status')}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleStatusChange('won')}
                    disabled={!!statusAction || deal.status === 'won'}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 disabled:opacity-50"
                  >
                    {statusAction === 'won' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        {t('markAsWon')}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStatusChange('lost')}
                    disabled={!!statusAction || deal.status === 'lost'}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {statusAction === 'lost' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1 h-4 w-4" />
                        {t('markAsLost')}
                      </>
                    )}
                  </Button>
                </div>
                {deal.status && deal.status !== 'open' && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleStatusChange('open')}
                    disabled={!!statusAction}
                    className="text-muted-foreground hover:text-foreground w-full"
                  >
                    {t('reopenDeal')}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-border/50 bg-popover/80 border-t p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:bg-muted flex-1 bg-transparent"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !title.trim() || !contactId || !stageId}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
              >
                {saving
                  ? t('saving')
                  : deal
                    ? t('saveChanges')
                    : t('createDeal')}
              </Button>
            </div>

            {deal &&
              (confirmDelete ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
                  <span className="text-red-300">{t('deletePrompt')}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="text-muted-foreground hover:bg-muted rounded px-2 py-1"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? t('deleting') : t('confirm')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  {t('deleteDeal')}
                </button>
              ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="grid gap-2"><Label className="text-muted-foreground">{label}</Label><select value={value} onChange={(e) => onChange(e.target.value)} className="border-border bg-muted text-foreground h-9 w-full rounded-lg border px-2.5 text-sm outline-none"><option value="">Wybierz</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label className="text-muted-foreground">{label}</Label>{children}</div>;
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><Input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="border-border bg-muted" /></Field>;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
