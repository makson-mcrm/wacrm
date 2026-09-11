'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CalendarPlus,
  Check,
  FilePlus2,
  Image as ImageIcon,
  Loader2,
  Mic,
  Phone,
  Plus,
  Save,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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
import type { Company, Contact, Deal, PipelineStage } from '@/types';
import { warsawDateTimeInputToIso } from '@/lib/date-time';
import {
  activityTypeForDb,
  buildContactActivityUpdate,
  formatFollowUpAction,
  normalizeActivityPhone,
  suggestedRetryAt,
  toLocalDateTimeValue,
  type ActivityStatus,
  type ActivityType,
  type FollowUpKind,
  type ObjectiveType,
  followUpPreset,
  requiresExplicitDealChoice,
  shouldAutoSelectDeal,
} from '@/lib/sales/quick-activity';
import { parseCrmPhone } from '@/lib/contacts/phone';
import { CallAction } from '@/components/sales/call-action';
import { SmsAction } from '@/components/sales/sms-action';
import {
  buildActivityAnalytics,
  findMigrationTag,
  serializeActivityAnalytics,
} from '@/lib/sales/activity-analytics';
import {
  LEAD_SOURCE_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
} from '@/lib/deals/financial-fields';

const MINIMUM_SEARCH_LENGTH = 3;
const PHONE_QUERY = /^\+?[\d\s()-]+$/;
const DEFAULT_OBJECTIVE: ObjectiveType = 'NOWE_POZYSKANIE';
const OUTCOMES = [
  { value: 'odebral', label: 'ODEBRAŁ' },
  { value: 'nie_odebral', label: 'NIE ODEBRAŁ' },
  { value: 'oddzwonic', label: 'ODDZWONIĆ' },
] as const;

type ContactCompanyLink = {
  contact_id: string;
  company_id: string;
  is_primary: boolean;
};
type DealContactLink = {
  deal_id: string;
  contact_id: string;
  is_primary: boolean;
};
type SearchMatch =
  | {
      kind: 'contact';
      id: string;
      title: string;
      subtitle: string;
      contact: Contact;
    }
  | {
      kind: 'company';
      id: string;
      title: string;
      subtitle: string;
      company: Company;
    }
  | { kind: 'deal'; id: string; title: string; subtitle: string; deal: Deal };
type FlowStep =
  'selection' | 'action' | 'follow-up' | 'result' | 'confirmation';

function contactName(contact: Contact | undefined) {
  if (!contact) return '';
  return (
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.phone ||
    'Kontakt'
  );
}

export function QuickActivityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restoredCall = useRef(false);
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contactCompanyLinks, setContactCompanyLinks] = useState<
    ContactCompanyLink[]
  >([]);
  const [dealContactLinks, setDealContactLinks] = useState<DealContactLink[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [dealId, setDealId] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<ActivityType>('TELEFON');
  const [status, setStatus] = useState<ActivityStatus>('WYKONANE');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDay, setNextActionDay] = useState('');
  const [nextActionTime, setNextActionTime] = useState('');
  const [plannedFollowUpKind, setPlannedFollowUpKind] =
    useState<FollowUpKind | null>(null);
  const [nextStepKind, setNextStepKind] = useState<FollowUpKind | null>(null);
  const [blocker, setBlocker] = useState('');
  const [dealProductDraft, setDealProductDraft] = useState('');
  const [dealSourceDraft, setDealSourceDraft] = useState('');
  const [flowStep, setFlowStep] = useState<FlowStep>('selection');
  const [contactDialog, setContactDialog] = useState(false);
  const [dealDialog, setDealDialog] = useState(false);
  const [dealCreating, setDealCreating] = useState(false);
  const [newContactCreateDeal, setNewContactCreateDeal] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<File | null>(null);
  const [documentSource, setDocumentSource] = useState('iphone_file');
  const [documentUploading, setDocumentUploading] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [
      contactRows,
      companyRows,
      dealRows,
      stageRows,
      companyLinkRows,
      dealLinkRows,
    ] = await Promise.all([
      db.from('contacts').select('*').eq('account_id', accountId).order('name'),
      db
        .from('companies')
        .select('*')
        .eq('account_id', accountId)
        .order('name'),
      db
        .from('deals')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'open')
        .order('title'),
      db.from('pipeline_stages').select('*').order('position'),
      db
        .from('contact_companies')
        .select('contact_id,company_id,is_primary')
        .eq('account_id', accountId),
      db
        .from('deal_contacts')
        .select('deal_id,contact_id,is_primary')
        .eq('account_id', accountId),
    ]);
    const firstError = [
      contactRows,
      companyRows,
      dealRows,
      stageRows,
      companyLinkRows,
      dealLinkRows,
    ].find((response) => response.error)?.error;
    if (firstError)
      toast.error(`Nie udało się wczytać klientów: ${firstError.message}`);
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
    setDeals((dealRows.data ?? []) as Deal[]);
    setStages((stageRows.data ?? []) as PipelineStage[]);
    setContactCompanyLinks(
      (companyLinkRows.data ?? []) as ContactCompanyLink[]
    );
    setDealContactLinks((dealLinkRows.data ?? []) as DealContactLink[]);
    setLoading(false);
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  function dealsForContact(contact: Contact) {
    const linkedDealIds = new Set(
      dealContactLinks
        .filter((row) => row.contact_id === contact.id)
        .map((row) => row.deal_id)
    );
    return deals.filter(
      (deal) => deal.contact_id === contact.id || linkedDealIds.has(deal.id)
    );
  }

  function applyDealContext(deal: Deal, contact?: Contact) {
    const dealLink =
      dealContactLinks.find(
        (row) => row.deal_id === deal.id && row.is_primary
      ) ?? dealContactLinks.find((row) => row.deal_id === deal.id);
    const resolvedContact =
      contact ??
      contacts.find(
        (row) => row.id === (deal.contact_id || dealLink?.contact_id)
      );
    setDealId(deal.id);
    setCompanyId(deal.company_id ?? '');
    setBlocker(deal.blocker ?? '');
    setDealProductDraft('');
    setDealSourceDraft('');
    setContactId(resolvedContact?.id ?? '');
    setPhone(resolvedContact?.phone ?? '');
    setQuery('');
    setFlowStep(resolvedContact ? 'action' : 'selection');
  }

  function chooseContact(contact: Contact) {
    setContactId(contact.id);
    setPhone(contact.phone ?? '');
    setQuery('');
    const companyLink =
      contactCompanyLinks.find(
        (row) => row.contact_id === contact.id && row.is_primary
      ) ?? contactCompanyLinks.find((row) => row.contact_id === contact.id);
    const linkedDeals = dealsForContact(contact);
    if (shouldAutoSelectDeal(linkedDeals.length)) {
      applyDealContext(linkedDeals[0], contact);
      return;
    }
    setCompanyId(companyLink?.company_id ?? '');
    setDealId('');
    setBlocker('');
    setDealProductDraft('');
    setDealSourceDraft('');
    setPlannedFollowUpKind(null);
    setNextStepKind(null);
    setFlowStep(
      requiresExplicitDealChoice(linkedDeals.length) ? 'selection' : 'action'
    );
  }

  function chooseCompany(company: Company) {
    const companyLinks = contactCompanyLinks.filter(
      (row) => row.company_id === company.id
    );
    const preferredLink =
      companyLinks.find((row) => row.is_primary) ?? companyLinks[0];
    const contact = contacts.find(
      (row) => row.id === preferredLink?.contact_id
    );
    const linkedDeals = deals.filter(
      (row) =>
        row.company_id === company.id &&
        (!contact || row.contact_id === contact.id)
    );
    if (contact && shouldAutoSelectDeal(linkedDeals.length)) {
      applyDealContext(linkedDeals[0], contact);
      return;
    }
    setCompanyId(company.id);
    setContactId(contact?.id ?? '');
    setPhone(contact?.phone ?? company.phone ?? '');
    setQuery('');
    setDealId('');
    setBlocker('');
    setDealProductDraft('');
    setDealSourceDraft('');
    setFlowStep(
      (contact && requiresExplicitDealChoice(linkedDeals.length)) || !contact
        ? 'selection'
        : 'action'
    );
  }

  function chooseDeal(deal: Deal) {
    applyDealContext(deal);
  }

  useEffect(() => {
    if (loading || restoredCall.current) return;
    const afterCall = searchParams.get('afterCall') === '1';
    const restoredDeal = searchParams.get('deal');
    const restoredContact = searchParams.get('contact');
    const restoredCompany = searchParams.get('company');
    const createDealRequested = searchParams.get('newDeal') === '1';
    const requestedAction = searchParams.get('action');
    if (
      !afterCall &&
      !restoredDeal &&
      !restoredContact &&
      !restoredCompany &&
      !createDealRequested
    )
      return;
    const contact = contacts.find((row) => row.id === restoredContact);
    if (contact) chooseContact(contact);
    if (restoredCompany) setCompanyId(restoredCompany);
    if (restoredDeal) {
      const deal = deals.find((row) => row.id === restoredDeal);
      if (deal) applyDealContext(deal, contact);
    }
    if (afterCall) {
      setType('TELEFON');
      setStatus('WYKONANE');
      setFlowStep('result');
    }
    if (createDealRequested && contact) setDealDialog(true);
    if (requestedAction === 'dictate' && contact) {
      setType('INNY_KONTAKT');
      setStatus('WYKONANE');
      setFlowStep('result');
    }
    if (requestedAction === 'document' && contact) {
      setFlowStep('action');
      setDocumentDialog(true);
    }
    restoredCall.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, contacts, deals, searchParams]);

  const selectedContact = contacts.find((row) => row.id === contactId);
  const selectedCompany = companies.find((row) => row.id === companyId);
  const selectedDeal = deals.find((row) => row.id === dealId);
  const selectedStage = stages.find((row) => row.id === selectedDeal?.stage_id);
  const selectedContactDeals = selectedContact
    ? dealsForContact(selectedContact)
    : [];
  const activityProductCategory = selectedDeal
    ? selectedDeal.product_type || dealProductDraft.trim() || null
    : selectedContact?.product_category || null;
  const activityCustomerSource = selectedDeal
    ? selectedDeal.source || dealSourceDraft.trim() || null
    : selectedContact?.source || null;

  const searchMatches = useMemo<SearchMatch[]>(() => {
    const trimmed = query.trim();
    const normalized = trimmed.toLocaleLowerCase('pl');
    const digits = normalizeActivityPhone(trimmed);
    if (
      trimmed.length < MINIMUM_SEARCH_LENGTH &&
      digits.length < MINIMUM_SEARCH_LENGTH
    )
      return [];
    const contactMatches: SearchMatch[] = contacts
      .filter((contact) => {
        const haystack =
          `${contactName(contact)} ${contact.phone ?? ''} ${contact.email ?? ''}`.toLocaleLowerCase(
            'pl'
          );
        return (
          haystack.includes(normalized) ||
          (digits.length >= MINIMUM_SEARCH_LENGTH &&
            normalizeActivityPhone(contact.phone ?? '').includes(digits))
        );
      })
      .slice(0, 5)
      .map((contact) => ({
        kind: 'contact' as const,
        id: contact.id,
        title: contactName(contact),
        subtitle: contact.phone || contact.email || 'Kontakt',
        contact,
      }));
    const companyMatches: SearchMatch[] = companies
      .filter((company) =>
        `${company.name} ${company.nip ?? ''} ${company.phone ?? ''}`
          .toLocaleLowerCase('pl')
          .includes(normalized)
      )
      .slice(0, 3)
      .map((company) => ({
        kind: 'company' as const,
        id: company.id,
        title: company.name,
        subtitle: company.nip ? `Firma · NIP ${company.nip}` : 'Firma',
        company,
      }));
    const dealMatches: SearchMatch[] = deals
      .filter((deal) => deal.title.toLocaleLowerCase('pl').includes(normalized))
      .slice(0, 3)
      .map((deal) => ({
        kind: 'deal' as const,
        id: deal.id,
        title: deal.title,
        subtitle:
          [deal.product_type, deal.source].filter(Boolean).join(' · ') ||
          'Deal',
        deal,
      }));
    return [...contactMatches, ...companyMatches, ...dealMatches].slice(0, 8);
  }, [companies, contacts, deals, query]);

  function chooseMatch(match: SearchMatch) {
    if (match.kind === 'contact') chooseContact(match.contact);
    if (match.kind === 'company') chooseCompany(match.company);
    if (match.kind === 'deal') chooseDeal(match.deal);
  }

  function clearSelection() {
    setContactId('');
    setCompanyId('');
    setDealId('');
    setPhone('');
    setBlocker('');
    setDealProductDraft('');
    setDealSourceDraft('');
    setQuery('');
    setFlowStep('selection');
  }

  function selectOutcome(value: (typeof OUTCOMES)[number]['value']) {
    setType('TELEFON');
    setStatus('WYKONANE');
    setResult(value);
    if (value === 'nie_odebral') {
      setNextStepKind('TELEFON');
      setNextAction((current) => current || 'Ponowić telefon');
      if (!nextActionDay) setFollowUpDate(suggestedRetryAt(1) ?? new Date());
    }
    if (value === 'oddzwonic') {
      setNextStepKind('TELEFON');
      setNextAction((current) => current || 'Oddzwonić');
      if (!nextActionDay)
        setFollowUpDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
    }
  }

  function setFollowUpDate(date: Date) {
    const [day, time] = toLocalDateTimeValue(date).split('T');
    setNextActionDay(day);
    setNextActionTime(time);
  }

  function openFollowUpChoice() {
    setPlannedFollowUpKind(null);
    setStatus('PLANOWANE');
    setResult('');
    setFlowStep('follow-up');
  }

  function prepareFollowUp(kind: FollowUpKind) {
    const preset = followUpPreset(kind);
    setPlannedFollowUpKind(kind);
    setNextStepKind(kind);
    setType(preset.type);
    setStatus('PLANOWANE');
    setResult('');
    setNextAction((current) => current || preset.label);
    setFlowStep('confirmation');
  }

  function prepareDictation() {
    if (!result) setType('INNY_KONTAKT');
    setStatus('WYKONANE');
    setFlowStep('result');
  }

  function openDocuments() {
    if (!contactId) return toast.info('Najpierw wybierz klienta.');
    setDocumentDialog(true);
  }

  async function saveDocument() {
    if (!accountId || !selectedContact || !pendingDocument || documentUploading)
      return;
    setDocumentUploading(true);
    const session = (await db.auth.getSession()).data.session;
    if (!session?.user) {
      setDocumentUploading(false);
      return;
    }
    const safeName = pendingDocument.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const ownerPath = dealId || `contacts/${selectedContact.id}`;
    const storagePath = `${accountId}/${ownerPath}/${crypto.randomUUID()}-${safeName}`;
    try {
      const uploaded = await db.storage
        .from('deal-documents')
        .upload(storagePath, pendingDocument);
      if (uploaded.error) throw uploaded.error;
      if (dealId) {
        const documentRow = await db.from('deal_documents').insert({
          account_id: accountId,
          deal_id: dealId,
          user_id: session.user.id,
          name: pendingDocument.name,
          storage_path: storagePath,
          status: 'otrzymany',
          document_type: pendingDocument.type || 'plik',
          received_at: new Date().toISOString(),
          source_channel: documentSource,
        });
        if (documentRow.error) throw documentRow.error;
      }
      const history = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: session.user.id,
        activity_type: 'inny_kontakt',
        activity_status: 'WYKONANE',
        objective_type: 'OBSLUGA_SERWIS',
        contact_id: selectedContact.id,
        company_id: companyId || null,
        deal_id: dealId || null,
        title: `DOKUMENT — ${pendingDocument.name}`,
        description: `Dodano dokument do CRM: ${pendingDocument.name}`,
        occurred_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completed: true,
        call_channel: 'dokument',
        source: activityCustomerSource,
        product_group: activityProductCategory,
      });
      if (history.error) throw history.error;
      toast.success(
        dealId
          ? 'Dokument zapisany w tym Dealu i historii.'
          : 'Dokument zapisany przy Kontakcie i w historii.'
      );
      setPendingDocument(null);
      setDocumentDialog(false);
    } catch (error) {
      toast.error(
        `Nie zapisano dokumentu: ${error instanceof Error ? error.message : 'nieznany błąd'}`
      );
    } finally {
      setDocumentUploading(false);
    }
  }

  async function createDealRecord({
    contact,
    title,
    source,
    productCategory,
    userId,
  }: {
    contact: Contact;
    title: string;
    source: string;
    productCategory: string;
    userId: string;
  }) {
    const firstStage = stages[0];
    if (!firstStage) throw new Error('Brak etapu startowego dla nowego Deala.');
    const linkedCompany =
      contactCompanyLinks.find(
        (row) => row.contact_id === contact.id && row.is_primary
      ) ?? contactCompanyLinks.find((row) => row.contact_id === contact.id);
    const { data, error } = await db
      .from('deals')
      .insert({
        account_id: accountId,
        user_id: userId,
        pipeline_id: firstStage.pipeline_id,
        stage_id: firstStage.id,
        contact_id: contact.id,
        company_id: linkedCompany?.company_id || null,
        title,
        value: 0,
        currency: 'PLN',
        status: 'open',
        source,
        product_type: productCategory,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Deal;
  }

  async function createDealForSelectedContact(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!accountId || !selectedContact || dealCreating) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get('deal_title') ?? '').trim();
    const source = String(form.get('deal_source') ?? '').trim();
    const productCategory = String(
      form.get('deal_product_category') ?? ''
    ).trim();
    if (!title || !source || !productCategory)
      return toast.error('Podaj nazwę Deala, źródło i kategorię produktu.');
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    setDealCreating(true);
    try {
      const missingContactMetadata =
        !selectedContact.source || !selectedContact.product_category;
      if (missingContactMetadata) {
        const contactUpdates = {
          source: selectedContact.source || source,
          product_category: selectedContact.product_category || productCategory,
        };
        const { error } = await db
          .from('contacts')
          .update(contactUpdates)
          .eq('account_id', accountId)
          .eq('id', selectedContact.id);
        if (error) throw error;
        setContacts((rows) =>
          rows.map((row) =>
            row.id === selectedContact.id ? { ...row, ...contactUpdates } : row
          )
        );
      }
      const deal = await createDealRecord({
        contact: selectedContact,
        title,
        source,
        productCategory,
        userId: session.user.id,
      });
      setDeals((rows) => [...rows, deal]);
      applyDealContext(deal, {
        ...selectedContact,
        source: selectedContact.source || source,
        product_category: selectedContact.product_category || productCategory,
      });
      setDealDialog(false);
      toast.success('Deal utworzony. Dalsza aktywność dotyczy tej sprawy.');
    } catch (error) {
      toast.error(
        `Nie utworzono Deala: ${error instanceof Error ? error.message : 'nieznany błąd'}`
      );
    } finally {
      setDealCreating(false);
    }
  }

  async function createContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) return;
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('first_name') ?? '').trim();
    const lastName = String(form.get('last_name') ?? '').trim();
    const submittedPhone = String(form.get('phone') ?? '').trim();
    const source = String(form.get('source') ?? '').trim();
    const productCategory = String(form.get('product_category') ?? '').trim();
    const shouldCreateDeal = form.get('create_deal') === 'on';
    const dealTitle = String(form.get('deal_title') ?? '').trim();
    const parsedPhone = parseCrmPhone(submittedPhone);
    if (
      !parsedPhone.valid ||
      (!firstName && !lastName) ||
      !source ||
      !productCategory ||
      (shouldCreateDeal && !dealTitle)
    ) {
      toast.error(
        !parsedPhone.valid
          ? parsedPhone.reason
          : !firstName && !lastName
            ? 'Podaj imię lub nazwisko.'
            : shouldCreateDeal && !dealTitle
              ? 'Podaj nazwę Deala.'
              : 'Wybierz źródło i kategorię produktu.'
      );
      return;
    }
    const existing = contacts.find(
      (contact) =>
        normalizeActivityPhone(contact.phone ?? '') ===
        normalizeActivityPhone(submittedPhone)
    );
    if (existing) {
      chooseContact(existing);
      setContactDialog(false);
      toast.info('Kontakt już istnieje — został wybrany.');
      return;
    }
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const { data, error } = await db
      .from('contacts')
      .insert({
        account_id: accountId,
        user_id: session.user.id,
        first_name: firstName || null,
        last_name: lastName || null,
        name: fullName,
        phone: parsedPhone.canonical,
        source,
        product_category: productCategory,
      })
      .select('*')
      .single();
    if (error) return toast.error(`Nie zapisano Kontaktu: ${error.message}`);
    const contact = data as Contact;
    setContacts((rows) => [...rows, contact]);
    setContactDialog(false);
    if (shouldCreateDeal) {
      try {
        const deal = await createDealRecord({
          contact,
          title: dealTitle,
          source,
          productCategory,
          userId: session.user.id,
        });
        setDeals((rows) => [...rows, deal]);
        applyDealContext(deal, contact);
        toast.success('Kontakt i Deal zostały utworzone.');
      } catch (error) {
        chooseContact(contact);
        toast.warning(
          `Kontakt zapisany bez Deala: ${error instanceof Error ? error.message : 'nieznany błąd'}`
        );
      }
      return;
    }
    chooseContact(contact);
    toast.success('Kontakt został zapisany bez Deala.');
  }

  async function saveActivity() {
    if (!accountId || saving) return;
    if (!contactId)
      return toast.error(
        'Wybierz istniejącego klienta albo dodaj nowy Kontakt.'
      );
    if (type === 'TELEFON' && !result)
      return toast.error('Wybierz wynik rozmowy.');
    if (status === 'PLANOWANE' && !nextActionDay)
      return toast.error('Ustaw termin planowanej aktywności.');
    const number = phone.trim() || selectedContact?.phone || '';
    if (type === 'TELEFON' && normalizeActivityPhone(number).length < 7)
      return toast.error(
        'Wybrany Kontakt nie ma prawidłowego numeru telefonu.'
      );
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session?.user) return;
    setSaving(true);
    try {
      let attemptNumber = 0;
      if (type === 'TELEFON') {
        const { data } = await db
          .from('sales_activities')
          .select('attempt_number')
          .eq('account_id', accountId)
          .eq('activity_type', 'telefon')
          .eq('phone_number', number)
          .order('occurred_at', { ascending: false })
          .limit(1);
        attemptNumber =
          Number(data?.[0]?.attempt_number || 0) +
          (result === 'nie_odebral' ? 1 : 0);
      }
      const scheduledInput = nextActionDay
        ? `${nextActionDay}T${nextActionTime || '09:00'}`
        : '';
      const scheduledIso = scheduledInput
        ? warsawDateTimeInputToIso(scheduledInput)
        : null;
      const nowIso = new Date().toISOString();
      const storedNextAction = formatFollowUpAction(nextStepKind, nextAction);
      const activityType = activityTypeForDb(type);
      const channel = plannedFollowUpKind
        ? followUpPreset(plannedFollowUpKind).channel
        : type === 'TELEFON'
          ? 'telefon'
          : type === 'SPOTKANIE'
            ? 'spotkanie'
            : 'dyktat';
      const productCategory = activityProductCategory;
      const customerSource = activityCustomerSource;
      const acquiredAt =
        selectedContact?.created_at ||
        selectedDeal?.intake_received_at ||
        selectedDeal?.created_at ||
        selectedCompany?.created_at ||
        null;
      const migrationTag = findMigrationTag(
        selectedContact?.source,
        selectedContact?.source_details,
        selectedDeal?.source,
        selectedDeal?.source_details,
        selectedDeal?.intake_source
      );
      const analytics = buildActivityAnalytics({
        recordedAt: nowIso,
        channel,
        activityType,
        contactId,
        companyId: companyId || null,
        dealId: dealId || null,
        originalNote: note,
        result: type === 'TELEFON' ? result : status,
        nextAction: storedNextAction,
        nextActionAt: scheduledIso,
        blocker,
        previousBlocker: selectedDeal?.blocker,
        productCategory,
        customerSource,
        acquiredAt,
        migrationTag,
      });
      const { error } = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: session.user.id,
        activity_type: activityType,
        activity_status: status,
        objective_type: type === 'FOLLOW_UP' ? 'FOLLOW_UP' : DEFAULT_OBJECTIVE,
        contact_id: contactId,
        company_id: companyId || null,
        deal_id: dealId || null,
        phone_number: number || null,
        title: `${type.replaceAll('_', ' ')} — ${contactName(selectedContact)}`,
        description: note.trim() || null,
        occurred_at: status === 'WYKONANE' ? nowIso : (scheduledIso ?? nowIso),
        scheduled_at: status === 'PLANOWANE' ? scheduledIso : null,
        completed_at: status === 'WYKONANE' ? nowIso : null,
        completed: status === 'WYKONANE',
        call_result: type === 'TELEFON' ? result : null,
        call_category: serializeActivityAnalytics(analytics),
        call_product: productCategory,
        call_channel: channel,
        call_type: 'nowe_pozyskanie',
        source: customerSource,
        product_group: productCategory,
        next_action: storedNextAction || null,
        next_action_date: scheduledIso,
        next_contact_at: scheduledIso,
        next_contact_reason: storedNextAction || note.trim() || null,
        attempt_number: type === 'TELEFON' ? Math.min(attemptNumber, 3) : null,
        expires_at:
          type === 'TELEFON' && result === 'nie_odebral' && attemptNumber < 3
            ? new Date(Date.now() + 30 * 86400000).toISOString()
            : null,
      });
      if (error) throw error;
      let relationWarning = '';
      if (
        dealId &&
        (storedNextAction ||
          scheduledIso ||
          (!selectedDeal?.product_type && dealProductDraft.trim()) ||
          (!selectedDeal?.source && dealSourceDraft.trim()) ||
          blocker.trim() !== (selectedDeal?.blocker ?? ''))
      ) {
        const updates: Record<string, string | null> = {};
        if (storedNextAction) updates.next_action = storedNextAction;
        if (scheduledIso) updates.next_action_at = scheduledIso;
        if (!selectedDeal?.product_type && dealProductDraft.trim())
          updates.product_type = dealProductDraft.trim();
        if (!selectedDeal?.source && dealSourceDraft.trim())
          updates.source = dealSourceDraft.trim();
        updates.blocker = blocker.trim() || null;
        updates.blocker_since = blocker.trim()
          ? selectedDeal?.blocker_since || nowIso
          : null;
        const { error: dealError } = await db
          .from('deals')
          .update(updates)
          .eq('account_id', accountId)
          .eq('id', dealId);
        if (dealError) relationWarning = ' Nie zaktualizowano karty Deala.';
      }
      const { error: contactError } = await db
        .from('contacts')
        .update(
          buildContactActivityUpdate({
            contactResult: type === 'TELEFON' ? result : status,
            nextAction: storedNextAction,
            nextActionAt: scheduledIso,
          })
        )
        .eq('account_id', accountId)
        .eq('id', contactId);
      if (contactError)
        relationWarning += ' Nie zaktualizowano karty Kontaktu.';
      if (relationWarning) {
        toast.warning(`Aktywność została zapisana.${relationWarning}`);
      } else {
        toast.success('Aktywność zapisana. Wracasz do DZISIAJ.');
      }
      router.replace('/dashboard');
    } catch (error) {
      toast.error(
        `Nie zapisano aktywności: ${error instanceof Error ? error.message : 'nieznany błąd'}`
      );
    } finally {
      setSaving(false);
    }
  }

  const canSearch =
    query.trim().length >= MINIMUM_SEARCH_LENGTH ||
    normalizeActivityPhone(query).length >= MINIMUM_SEARCH_LENGTH;
  const newContactPhone = PHONE_QUERY.test(query.trim()) ? query.trim() : '';

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-24 text-slate-950 lg:pb-6">
      <header className="flex items-end justify-between gap-3 border-b border-emerald-950/10 px-1 pb-3">
        <div>
          <h1 className="text-xl font-black tracking-tight">
            {flowStep === 'confirmation' ? 'Podsumowanie rozmowy' : 'Aktywność'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {flowStep === 'selection' && 'Szukaj, wybierz, działaj'}
            {flowStep === 'action' && 'Wybierz jedną szybką akcję'}
            {flowStep === 'follow-up' && 'Wybierz rodzaj następnego kroku'}
            {flowStep === 'result' && 'Zapisz wynik i notatkę'}
            {flowStep === 'confirmation' && 'Szybki zapis po rozmowie'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800">
          {flowStep === 'selection' && 'KROK 1'}
          {flowStep === 'action' && 'KROK 2'}
          {(flowStep === 'follow-up' || flowStep === 'result') && 'KROK 3'}
          {flowStep === 'confirmation' && 'KROK 4'}
        </span>
      </header>

      <p className="px-1 text-xs font-black tracking-[0.12em] text-emerald-800 uppercase">
        {flowStep === 'selection' && 'Klient i Deal'}
        {flowStep === 'action' && 'Szybkie akcje po wyborze'}
        {flowStep === 'follow-up' && 'Rodzaj follow-upu'}
        {flowStep === 'result' && 'Wynik i dyktowanie'}
        {flowStep === 'confirmation' && 'Rozpoznany kontekst'}
      </p>

      {flowStep === 'selection' && (
        <section className="rounded-xl border border-emerald-950/10 bg-white p-3 shadow-sm">
          <Label htmlFor="mcrm-search" className="sr-only">
            Kontakt, telefon, Firma lub Deal
          </Label>
          <div className="relative">
            {loading ? (
              <Loader2 className="absolute top-4 left-4 size-6 animate-spin text-emerald-800" />
            ) : (
              <Search className="absolute top-4 left-4 size-6 text-emerald-900" />
            )}
            <Input
              id="mcrm-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-14 rounded-lg border-0 bg-[#f2f6f1] pr-11 pl-12 text-base shadow-none focus-visible:ring-2 focus-visible:ring-emerald-800"
              placeholder="Kontakt / telefon / Firma / Deal"
              autoComplete="off"
              inputMode="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute top-2.5 right-2.5 flex size-9 items-center justify-center rounded-full text-slate-500"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
          {!canSearch && query && (
            <p className="px-2 pt-2 text-xs text-slate-500">
              Wpisz minimum 3 znaki lub cyfry.
            </p>
          )}
          {canSearch && query && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              {searchMatches.map((match) => (
                <button
                  type="button"
                  key={`${match.kind}-${match.id}`}
                  onClick={() => chooseMatch(match)}
                  className="flex min-h-14 w-full items-center gap-3 border-b border-slate-100 px-3 text-left last:border-0 hover:bg-emerald-50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-950">
                    {match.kind === 'deal' ? (
                      <BriefcaseBusiness className="size-4" />
                    ) : (
                      <UserRound className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {match.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {match.subtitle}
                    </span>
                  </span>
                </button>
              ))}
              {searchMatches.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-500">
                  Brak pasujących klientów.
                </p>
              )}
            </div>
          )}
          {!query && !contactId && contacts.length > 0 && (
            <div className="mt-3">
              <p className="px-1 text-[10px] font-black tracking-wide text-slate-500 uppercase">
                Wybierz kontakt
              </p>
              <div className="mt-1 divide-y overflow-hidden rounded-xl border bg-white">
                {contacts.slice(0, 3).map((contact) => (
                  <button
                    type="button"
                    key={contact.id}
                    onClick={() =>
                      chooseMatch({
                        kind: 'contact',
                        id: contact.id,
                        title: contactName(contact),
                        subtitle: contact.phone || contact.email || 'Kontakt',
                        contact,
                      })
                    }
                    className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-emerald-50"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <UserRound className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {contactName(contact)}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {contact.phone || contact.email || 'Kontakt'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!contactId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setContactDialog(true)}
              className="mt-2 h-12 w-full justify-start rounded-xl text-emerald-950"
            >
              <Plus className="size-5" /> Rozpocznij nowy Kontakt
            </Button>
          )}
        </section>
      )}

      {selectedContact && flowStep !== 'confirmation' ? (
        <section className="space-y-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-900/10">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#123d2b] text-white">
              <Check className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Wybrany klient
              </p>
              <p className="truncate text-lg font-black">
                {contactName(selectedContact)}
              </p>
              <p className="truncate text-sm text-slate-600">
                {[selectedContact.phone, selectedCompany?.name]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Wybierz innego klienta lub Deala"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-500"
            >
              <X className="size-5" />
            </button>
          </div>
          {selectedDeal ? (
            <div className="rounded-lg bg-white p-3 ring-1 ring-emerald-900/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-wider text-emerald-800 uppercase">
                    Ta konkretna sprawa
                  </p>
                  <p className="mt-1 truncate font-black">
                    {selectedDeal.title}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDealId('');
                    const companyLink =
                      contactCompanyLinks.find(
                        (row) =>
                          row.contact_id === selectedContact.id &&
                          row.is_primary
                      ) ??
                      contactCompanyLinks.find(
                        (row) => row.contact_id === selectedContact.id
                      );
                    setCompanyId(companyLink?.company_id ?? '');
                    setBlocker('');
                    setFlowStep('selection');
                  }}
                  className="shrink-0 font-black text-emerald-900"
                >
                  ZMIEŃ DEAL
                </Button>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">Produkt</dt>
                <dd className="font-semibold">
                  {selectedDeal.product_type ||
                    dealProductDraft ||
                    'Do uzupełnienia'}
                </dd>
                <dt className="text-slate-500">Źródło</dt>
                <dd className="font-semibold">
                  {selectedDeal.source || dealSourceDraft || 'Do uzupełnienia'}
                </dd>
                {selectedStage && (
                  <>
                    <dt className="text-slate-500">Etap</dt>
                    <dd className="font-semibold">{selectedStage.name}</dd>
                  </>
                )}
              </dl>
              {(!selectedDeal.product_type || !selectedDeal.source) && (
                <div className="mt-3 grid gap-2 border-t border-emerald-900/10 pt-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Uzupełnij raz na tym Dealu
                  </p>
                  {!selectedDeal.product_type && (
                    <Input
                      value={dealProductDraft}
                      onChange={(event) =>
                        setDealProductDraft(event.target.value)
                      }
                      placeholder="Produkt / kategoria"
                      aria-label="Produkt lub kategoria Deala"
                      className="h-10 rounded-xl bg-white"
                    />
                  )}
                  {!selectedDeal.source && (
                    <Input
                      value={dealSourceDraft}
                      onChange={(event) =>
                        setDealSourceDraft(event.target.value)
                      }
                      placeholder="Źródło klienta"
                      aria-label="Źródło klienta z Deala"
                      className="h-10 rounded-xl bg-white"
                    />
                  )}
                </div>
              )}
            </div>
          ) : selectedContactDeals.length === 0 ? (
            <div className="space-y-2 rounded-xl bg-white px-3 py-3 text-sm text-slate-600">
              <p>
                Brak aktywnego Deala — aktywność zostanie przypięta do Kontaktu.
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-slate-500">Źródło</dt>
                <dd className="font-semibold">
                  {selectedContact.source || 'Brak danych'}
                </dd>
                <dt className="text-slate-500">Kategoria</dt>
                <dd className="font-semibold">
                  {selectedContact.product_category || 'Brak danych'}
                </dd>
              </dl>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDealDialog(true)}
                className="mt-1 h-11 w-full rounded-xl border-emerald-900/20 font-black text-emerald-950"
              >
                <BriefcaseBusiness className="size-4" /> UTWÓRZ DEAL
              </Button>
            </div>
          ) : null}
        </section>
      ) : !selectedContact ? (
        <p className="px-2 text-center text-sm text-slate-500">
          Najpierw wybierz klienta lub konkretny Deal.
        </p>
      ) : null}

      {flowStep === 'selection' &&
        selectedContact &&
        selectedContactDeals.length > 0 &&
        !selectedDeal && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <p className="font-black">Wybierz konkretny Deal</p>
            <p className="mt-1 text-sm text-slate-600">
              Wskaż sprawę, której dotyczy aktywność. System nie zgaduje Deala
              przy rzeczywistej wieloznaczności.
            </p>
            <div className="mt-3 space-y-2">
              {selectedContactDeals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => applyDealContext(deal, selectedContact)}
                  className="w-full rounded-lg bg-white p-3 text-left ring-1 ring-amber-300 transition hover:bg-amber-100"
                >
                  <span className="block font-black">{deal.title}</span>
                  <span className="block text-xs text-slate-600">
                    {[
                      deal.product_type,
                      companies.find(
                        (company) => company.id === deal.company_id
                      )?.name,
                      stages.find((stage) => stage.id === deal.stage_id)?.name,
                      Number(deal.value) > 0
                        ? `${Number(deal.value).toLocaleString('pl-PL')} ${deal.currency || 'PLN'}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Brak szczegółów'}
                  </span>
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setFlowStep('action')}
                className="h-10 w-full rounded-xl border-dashed border-slate-300 bg-transparent text-xs font-semibold text-slate-600"
              >
                OGÓLNA NOTATKA / RELACJA — BEZ DEALA
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDealDialog(true)}
                className="h-11 w-full rounded-xl font-black text-emerald-950"
              >
                <Plus className="size-4" /> UTWÓRZ NOWY DEAL
              </Button>
            </div>
          </section>
        )}

      {(flowStep === 'action' ||
        (flowStep === 'selection' && !selectedContact)) && (
        <section aria-label="Szybkie akcje" className="grid grid-cols-2 gap-2">
          {phone && contactId ? (
            <CallAction
              phone={phone}
              contactId={contactId}
              companyId={companyId}
              dealId={dealId}
              size="lg"
              className="h-14 rounded-lg border-0 bg-[#123d2b] text-base font-black text-white hover:bg-[#0b2d1f]"
            />
          ) : (
            <Button disabled className="h-14 rounded-lg text-base font-black">
              <Phone className="size-5" /> ZADZWOŃ
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!contactId}
            onClick={prepareDictation}
            className="h-14 rounded-lg border-emerald-900/20 bg-white text-base font-black text-emerald-950"
          >
            <Mic className="size-5" /> DYKTUJ
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!contactId}
            onClick={openFollowUpChoice}
            className="h-14 rounded-lg border-emerald-900/20 bg-white text-base font-black text-emerald-950"
          >
            <CalendarPlus className="size-5" /> UMÓW
          </Button>
          <div className="[&>button]:h-14 [&>button]:w-full [&>button]:rounded-lg [&>button]:border-emerald-900/20 [&>button]:bg-white [&>button]:text-base [&>button]:font-black [&>button]:text-emerald-950">
            {phone && contactId ? (
              <SmsAction
                phone={phone}
                contactName={contactName(selectedContact)}
                contactId={contactId}
                companyId={companyId}
                dealId={dealId}
                productCategory={activityProductCategory}
                customerSource={activityCustomerSource}
                size="lg"
                label="WIADOMOŚĆ"
              />
            ) : (
              <Button
                disabled
                variant="outline"
                className="h-14 w-full rounded-lg"
              >
                WIADOMOŚĆ
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!contactId}
            onClick={openDocuments}
            className="col-span-2 h-14 rounded-lg border-emerald-900/20 bg-white text-sm font-black text-emerald-950"
          >
            <FilePlus2 className="size-5" /> DODAJ DOKUMENT
          </Button>
        </section>
      )}

      {flowStep === 'follow-up' && (
        <section className="rounded-xl border border-emerald-950/10 bg-white p-4 shadow-sm">
          <p className="font-black">Co ma być następnym krokiem?</p>
          <p className="mt-1 text-sm text-slate-500">
            Wybierz typ. Datę, opcjonalną godzinę i krótką treść podasz dalej.
          </p>
          <div className="mt-3 grid gap-2">
            {(
              [
                ['TELEFON', 'TELEFON / ODDZWOŃ'],
                ['SPOTKANIE', 'SPOTKANIE'],
                ['INNY', 'INNY FOLLOW-UP'],
              ] as const
            ).map(([kind, label]) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                onClick={() => prepareFollowUp(kind)}
                className="h-14 justify-start rounded-lg border-emerald-900/20 bg-white font-black text-emerald-950"
              >
                <CalendarPlus className="size-5" /> {label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFlowStep('action')}
            className="mt-2 h-11 w-full"
          >
            <ArrowLeft className="size-4" /> Wróć
          </Button>
        </section>
      )}

      {flowStep === 'result' && type === 'TELEFON' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black tracking-[0.16em] text-slate-500 uppercase">
            Wynik rozmowy
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {OUTCOMES.map((outcome) => (
              <button
                type="button"
                key={outcome.value}
                onClick={() => selectOutcome(outcome.value)}
                className={`min-h-14 rounded-lg px-2 text-xs font-black transition ${result === outcome.value ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-700' : 'bg-slate-100 text-slate-700'}`}
              >
                {outcome.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {flowStep === 'result' && (
        <section
          id="mcrm-dictation"
          className="space-y-4 rounded-xl bg-[#123d2b] p-4 text-white shadow-sm"
        >
          <Label className="text-xs font-black tracking-[0.16em] text-white uppercase">
            Notatka
          </Label>
          <div className="mt-2 [&_button]:h-14 [&_button]:w-full [&_button]:rounded-lg [&_button]:border-0 [&_button]:bg-white [&_button]:text-base [&_button]:font-black [&_button]:text-emerald-950 [&_textarea]:min-h-32 [&_textarea]:rounded-lg [&_textarea]:border-0 [&_textarea]:bg-white [&_textarea]:text-base [&_textarea]:text-slate-950">
            <VoiceTextarea
              value={note}
              onChange={setNote}
              placeholder="Powiedz lub wpisz, co ustaliliście…"
            />
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFlowStep('action')}
              className="h-12 rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="size-4" /> Wróć
            </Button>
            <Button
              type="button"
              disabled={type === 'TELEFON' && !result}
              onClick={() => setFlowStep('confirmation')}
              className="h-12 rounded-xl bg-emerald-700 font-black text-white hover:bg-emerald-800"
            >
              Dalej <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      )}

      {flowStep === 'confirmation' && (
        <>
          <section
            id="mcrm-confirmation"
            className="space-y-3 rounded-xl border border-emerald-950/10 bg-white p-3 shadow-sm"
          >
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-emerald-800 uppercase">
                ROZPOZNAŁEM
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Potwierdź tylko next action, termin i ewentualny blocker.
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-900/10">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt className="font-bold text-emerald-800">Klient</dt>
                <dd className="font-semibold">
                  {contactName(selectedContact)}
                </dd>
                <dt className="font-bold text-emerald-800">Produkt</dt>
                <dd className="font-semibold">
                  {activityProductCategory || 'Brak danych'}
                </dd>
                <dt className="font-bold text-emerald-800">Źródło</dt>
                <dd className="font-semibold">
                  {activityCustomerSource || 'Brak danych'}
                </dd>
                <dt className="font-bold text-emerald-800">Deal</dt>
                <dd className="font-semibold">
                  {selectedDeal?.title || 'Bez Deala'}
                </dd>
              </dl>
            </div>
            <div className="rounded-lg border border-emerald-950/10 bg-[#f8faf7] p-3">
              <p className="text-[10px] font-black tracking-wide text-emerald-800 uppercase">
                Podsumowanie
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">
                {note.trim() ||
                  'Brak notatki — uzupełnij tylko ustalony następny krok.'}
              </p>
            </div>
            <div>
              <Label>Rodzaj następnego kroku</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(
                  [
                    ['TELEFON', 'TELEFON'],
                    ['SPOTKANIE', 'SPOTKANIE'],
                    ['INNY', 'INNY'],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setNextStepKind(kind);
                      setNextAction(
                        (current) => current || followUpPreset(kind).label
                      );
                    }}
                    className={`min-h-11 rounded-xl px-1 text-[11px] font-black ${nextStepKind === kind ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="mcrm-next-action">Next action</Label>
              <Input
                id="mcrm-next-action"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                placeholder="Co jest następnym krokiem?"
                className="mt-1 h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="mcrm-next-action-day">Termin</Label>
              <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                <Input
                  id="mcrm-next-action-day"
                  type="date"
                  value={nextActionDay}
                  onInput={(event) =>
                    setNextActionDay(event.currentTarget.value)
                  }
                  className="h-12 rounded-xl [color-scheme:light]"
                />
                <Input
                  type="time"
                  value={nextActionTime}
                  onInput={(event) =>
                    setNextActionTime(event.currentTarget.value)
                  }
                  aria-label="Opcjonalna godzina follow-upu"
                  className="h-12 w-32 rounded-xl [color-scheme:light]"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Godzina jest opcjonalna; bez niej zadanie pojawi się o 09:00.
              </p>
            </div>
            <div>
              <Label htmlFor="mcrm-blocker">Blocker</Label>
              <Input
                id="mcrm-blocker"
                value={blocker}
                onChange={(event) => setBlocker(event.target.value)}
                placeholder="Brak lub krótka przeszkoda"
                className="mt-1 h-12 rounded-xl"
              />
            </div>
          </section>

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFlowStep(plannedFollowUpKind ? 'follow-up' : 'result')
              }
              className="h-14 rounded-lg"
            >
              <ArrowLeft className="size-4" /> Wróć
            </Button>
            <Button
              type="button"
              onClick={saveActivity}
              disabled={saving || loading || !contactId}
              className="h-14 rounded-lg bg-[#123d2b] text-base font-black text-white shadow-lg hover:bg-[#0b2d1f]"
            >
              {saving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Save className="size-5" />
              )}
              {saving ? 'ZAPISUJĘ…' : 'ZAPISZ'}
            </Button>
          </div>
        </>
      )}

      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Nowy Kontakt</DialogTitle>
          </DialogHeader>
          <form onSubmit={createContact} className="space-y-3">
            <Input
              name="first_name"
              autoComplete="given-name"
              placeholder="Imię"
              defaultValue={newContactPhone ? '' : query.trim().split(' ')[0]}
            />
            <Input
              name="last_name"
              autoComplete="family-name"
              placeholder="Nazwisko"
              defaultValue={
                newContactPhone
                  ? ''
                  : query.trim().split(' ').slice(1).join(' ')
              }
            />
            <Input
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Telefon"
              defaultValue={newContactPhone}
              required
            />
            <div className="space-y-1">
              <Label htmlFor="new-contact-source">Źródło</Label>
              <select
                id="new-contact-source"
                name="source"
                required
                defaultValue=""
                className="border-input h-11 w-full rounded-xl border bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Wybierz źródło
                </option>
                {LEAD_SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-contact-product-category">
                Kategoria produktu
              </Label>
              <select
                id="new-contact-product-category"
                name="product_category"
                required
                defaultValue=""
                className="border-input h-11 w-full rounded-xl border bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Wybierz kategorię
                </option>
                {PRODUCT_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-950">
              <input
                type="checkbox"
                name="create_deal"
                checked={newContactCreateDeal}
                onChange={(event) =>
                  setNewContactCreateDeal(event.target.checked)
                }
                className="size-5"
              />
              UTWÓRZ DEAL — temat jest już zakwalifikowany
            </label>
            {newContactCreateDeal && (
              <Input
                name="deal_title"
                placeholder="Nazwa konkretnej sprawy"
                required
              />
            )}
            <Button type="submit" className="h-12 w-full rounded-xl">
              {newContactCreateDeal
                ? 'Zapisz Kontakt i utwórz Deal'
                : 'Zapisz Kontakt bez Deala'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dealDialog} onOpenChange={setDealDialog}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Utwórz Deal</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <form
              key={selectedContact.id}
              onSubmit={createDealForSelectedContact}
              className="space-y-3"
            >
              <p className="text-sm text-slate-600">
                Deal zostanie powiązany z Kontaktem{' '}
                <strong>{contactName(selectedContact)}</strong>. Jego
                wcześniejsza historia pozostaje na Kontakcie.
              </p>
              <Input
                name="deal_title"
                defaultValue={`${contactName(selectedContact)} — ${selectedContact.product_category || 'nowa sprawa'}`}
                placeholder="Nazwa konkretnej sprawy"
                required
              />
              <div className="space-y-1">
                <Label>Źródło</Label>
                <select
                  name="deal_source"
                  defaultValue={selectedContact.source || ''}
                  required
                  className="border-input h-11 w-full rounded-xl border bg-white px-3 text-sm"
                >
                  <option value="" disabled>
                    Wybierz źródło
                  </option>
                  {LEAD_SOURCE_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Kategoria produktu</Label>
                <select
                  name="deal_product_category"
                  defaultValue={selectedContact.product_category || ''}
                  required
                  className="border-input h-11 w-full rounded-xl border bg-white px-3 text-sm"
                >
                  <option value="" disabled>
                    Wybierz kategorię
                  </option>
                  {PRODUCT_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                disabled={dealCreating}
                className="h-12 w-full rounded-xl font-black"
              >
                {dealCreating ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <BriefcaseBusiness className="size-5" />
                )}
                UTWÓRZ DEAL
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={documentDialog} onOpenChange={setDocumentDialog}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>DODAJ DOKUMENT DO CRM</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm">
              <p className="font-black">
                {selectedDeal
                  ? selectedDeal.title
                  : `${contactName(selectedContact)} — bez Deala`}
              </p>
              <p className="text-xs text-slate-600">
                Dokument dziedziczy ten kontekst i stanie się zdarzeniem
                historii.
              </p>
            </div>
            <label className="flex h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 font-black text-emerald-950">
              <Camera className="size-5" /> ZRÓB ZDJĘCIE / SKAN
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  setDocumentSource('iphone_camera');
                  setPendingDocument(event.target.files?.[0] || null);
                }}
              />
            </label>
            <label className="flex h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 font-black text-emerald-950">
              <ImageIcon className="size-5" /> WYBIERZ ZDJĘCIE
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  setDocumentSource('iphone_photo');
                  setPendingDocument(event.target.files?.[0] || null);
                }}
              />
            </label>
            <label className="flex h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 font-black text-emerald-950">
              <FilePlus2 className="size-5" /> WYBIERZ PLIK / PDF
              <input
                type="file"
                accept="application/pdf,.doc,.docx,.xls,.xlsx,image/*"
                className="hidden"
                onChange={(event) => {
                  setDocumentSource('iphone_file');
                  setPendingDocument(event.target.files?.[0] || null);
                }}
              />
            </label>
            {pendingDocument && (
              <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold">
                Wybrano: {pendingDocument.name}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDocumentDialog(false);
                  setDealId('');
                  setFlowStep('selection');
                }}
              >
                ZMIEŃ KONTEKST
              </Button>
              <Button
                disabled={!pendingDocument || documentUploading}
                onClick={() => void saveDocument()}
              >
                {documentUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                ZAPISZ DOKUMENT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
