'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { addContactTag, deleteContactTag } from '@/lib/contacts/tag-api';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import type {
  Company,
  Contact,
  ContactCompany,
  Tag,
  ContactNote,
  CustomField,
  Deal,
  MessageTemplate,
  ContactSpouseLink,
} from '@/types';
import {
  TemplatePicker,
  type TemplateSendValues,
} from '@/components/inbox/template-picker';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone,
  Mail,
  Building2,
  CalendarDays,
  Copy,
  Check,
  Loader2,
  Plus,
  Trash2,
  Save,
  DollarSign,
  LayoutTemplate,
  Mic,
  MoreHorizontal,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EntityTagsEditor } from '@/components/tags/entity-tags-editor';
import { formatWarsawDateTime } from '@/lib/date-time';
import { WhatsAppAction } from '@/components/sales/whatsapp-action';
import { CallAction } from '@/components/sales/call-action';
import { ActivityHistory } from '@/components/sales/activity-history';
import {
  ContactDetailColumn,
  ContactDataCards,
  ContactDocuments,
  ContactEmailAction,
  ContactTasks,
} from './contact-detail-sections';
import { SpouseLinks } from '@/components/relationships/spouse-links';
import {
  canonicalSpousePair,
  loadSpouseLinks,
} from '@/lib/mcrm/spouse-relations';

interface ContactDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onUpdated: () => void;
}

type RelatedPerson = Pick<Contact, 'id' | 'name' | 'phone'>;

type RelatedPersonRow = {
  contact_id: string;
  contact: RelatedPerson | null;
};

export function ContactDetailView({
  open,
  onOpenChange,
  contactId,
  onUpdated,
}: ContactDetailViewProps) {
  const t = useTranslations('Contacts.detailView');
  const supabase = useMemo(() => createClient(), []);
  const { accountId, defaultCurrency } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [contextExpanded, setContextExpanded] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Send template — lets the business initiate (or re-open) a conversation
  // with this contact by sending an approved template. The send route
  // find-or-creates the conversation, so no inbound message is required.
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Details tab
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editPesel, setEditPesel] = useState('');
  const [editIdentityDocument, setEditIdentityDocument] = useState('');
  const [editBikStatus, setEditBikStatus] = useState('');
  const [editIncomeType, setEditIncomeType] = useState('');
  const [editMonthlyIncome, setEditMonthlyIncome] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Tags tab
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [contactTagIds, setContactTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  // Notes tab
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Custom fields tab
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [savingCustom, setSavingCustom] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // Deals tab
  const [deals, setDeals] = useState<Deal[]>([]);
  const [relatedPeople, setRelatedPeople] = useState<RelatedPerson[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Companies tab — real many-to-many links added by mCRM migration 040.
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactCompanies, setContactCompanies] = useState<ContactCompany[]>(
    []
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    if (open && contactId) {
      setActiveTab('overview');
      setContextExpanded(true);
    }
  }, [contactId, open]);
  const [companyRole, setCompanyRole] = useState('');
  const [savingCompanyLink, setSavingCompanyLink] = useState(false);
  const [spouseLinks, setSpouseLinks] = useState<ContactSpouseLink[]>([]);
  const [spouseCandidates, setSpouseCandidates] = useState<Contact[]>([]);
  const [selectedSpouseId, setSelectedSpouseId] = useState('');
  const [savingSpouse, setSavingSpouse] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);

    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (data) {
      setContact(data);
      setEditName(data.name ?? '');
      setEditFirstName(data.first_name ?? '');
      setEditLastName(data.last_name ?? '');
      setEditPhone(data.phone);
      setEditEmail(data.email ?? '');
      setEditDescription(data.description ?? '');
      setEditLinkedin(data.linkedin_url ?? '');
      setEditPesel(data.pesel ?? '');
      setEditIdentityDocument(data.identity_document ?? '');
      setEditBikStatus(data.bik_status ?? '');
      setEditIncomeType(data.income_type ?? '');
      setEditMonthlyIncome(
        data.monthly_income == null ? '' : String(data.monthly_income)
      );
    }
    setLoading(false);
  }, [contactId, supabase]);

  const fetchTags = useCallback(async () => {
    if (!contactId) return;

    const [tagsRes, contactTagsRes] = await Promise.all([
      supabase.from('tags').select('*').order('name'),
      supabase
        .from('contact_tags')
        .select('tag_id')
        .eq('contact_id', contactId),
    ]);

    if (tagsRes.data) setAllTags(tagsRes.data);
    if (contactTagsRes.data) {
      setContactTagIds(contactTagsRes.data.map((ct) => ct.tag_id));
    }
  }, [contactId, supabase]);

  const fetchNotes = useCallback(async () => {
    if (!contactId) return;
    setLoadingNotes(true);

    const notesResult = await supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (notesResult.data) setNotes(notesResult.data);
    setLoadingNotes(false);
  }, [contactId, supabase]);

  const fetchCustomFields = useCallback(async () => {
    if (!contactId) return;
    setLoadingCustom(true);

    const [fieldsRes, valuesRes] = await Promise.all([
      supabase.from('custom_fields').select('*').order('field_name'),
      supabase
        .from('contact_custom_values')
        .select('*')
        .eq('contact_id', contactId),
    ]);

    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (valuesRes.data) {
      const map: Record<string, string> = {};
      valuesRes.data.forEach((v) => {
        map[v.custom_field_id] = v.value ?? '';
      });
      setCustomValues(map);
    }
    setLoadingCustom(false);
  }, [contactId, supabase]);

  const fetchDeals = useCallback(async () => {
    if (!contactId) return;
    setLoadingDeals(true);
    const [
      { data: direct },
      { data: links },
      { data: additional },
      { data: coApplicant },
    ] = await Promise.all([
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .eq('contact_id', contactId),
      supabase
        .from('deal_contacts')
        .select('deal_id')
        .eq('contact_id', contactId),
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .contains('additional_contact_ids', [contactId]),
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .eq('co_applicant_contact_id', contactId),
    ]);
    const linkedIds = (links ?? []).map((row) => row.deal_id);
    const { data: linked } = linkedIds.length
      ? await supabase
          .from('deals')
          .select('*, stage:pipeline_stages(*)')
          .in('id', linkedIds)
      : { data: [] };
    const unique = new Map<string, Deal>();
    [
      ...(direct ?? []),
      ...(linked ?? []),
      ...(additional ?? []),
      ...(coApplicant ?? []),
    ].forEach((row) => unique.set(row.id, row as Deal));
    const contactDeals = [...unique.values()].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    );
    setDeals(contactDeals);
    const dealIds = contactDeals.map((deal) => deal.id);
    if (!dealIds.length) {
      setRelatedPeople([]);
    } else {
      const { data: peopleRows } = await supabase
        .from('deal_contacts')
        .select(
          'contact_id,contact:contacts!deal_contacts_contact_id_fkey(id,name,phone)'
        )
        .in('deal_id', dealIds)
        .neq('contact_id', contactId);
      const people = new Map<string, RelatedPerson>();
      ((peopleRows ?? []) as unknown as RelatedPersonRow[]).forEach((row) => {
        if (row.contact) people.set(row.contact.id, row.contact);
      });
      const participantIds = [
        ...new Set(
          contactDeals
            .flatMap((deal) => [
              deal.contact_id,
              deal.co_applicant_contact_id,
              ...((deal as Deal & { additional_contact_ids?: string[] })
                .additional_contact_ids ?? []),
            ])
            .filter((id): id is string => Boolean(id) && id !== contactId)
        ),
      ];
      if (participantIds.length) {
        const { data: participants } = await supabase
          .from('contacts')
          .select('id,name,phone')
          .in('id', participantIds);
        (participants ?? []).forEach((person) => people.set(person.id, person));
      }
      setRelatedPeople([...people.values()]);
    }
    setLoadingDeals(false);
  }, [contactId, supabase]);

  const fetchCompanies = useCallback(async () => {
    if (!contactId) return;
    const [companiesRes, linksRes] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase
        .from('contact_companies')
        .select('*, company:companies!contact_companies_company_id_fkey(*)')
        .eq('contact_id', contactId)
        .order('created_at'),
    ]);
    setCompanies((companiesRes.data ?? []) as Company[]);
    setContactCompanies((linksRes.data ?? []) as ContactCompany[]);
  }, [contactId, supabase]);

  const fetchSpouse = useCallback(async () => {
    if (!contactId) return;
    const [links, contactsResult] = await Promise.all([
      loadSpouseLinks(supabase, [contactId]),
      supabase.from('contacts').select('*').neq('id', contactId).order('name'),
    ]);
    setSpouseLinks(links);
    setSpouseCandidates((contactsResult.data ?? []) as Contact[]);
  }, [contactId, supabase]);

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
      fetchTags();
      fetchNotes();
      fetchCustomFields();
      fetchDeals();
      fetchCompanies();
      void fetchSpouse();
    }
  }, [
    open,
    contactId,
    fetchContact,
    fetchTags,
    fetchNotes,
    fetchCustomFields,
    fetchDeals,
    fetchCompanies,
    fetchSpouse,
  ]);

  async function linkSpouse() {
    if (!contactId || !selectedSpouseId || !accountId) return;
    setSavingSpouse(true);
    const { error } = await supabase.from('contact_spouses').insert({
      ...canonicalSpousePair(contactId, selectedSpouseId),
      account_id: accountId,
    });
    setSavingSpouse(false);
    if (error) {
      toast.error(
        error.code === '23505' || error.message.includes('only one spouse')
          ? 'Jeden z Kontaktów ma już przypisanego współmałżonka.'
          : 'Nie udało się zapisać współmałżonka.'
      );
      return;
    }
    setSelectedSpouseId('');
    await fetchSpouse();
    toast.success('Współmałżonek został powiązany.');
  }

  async function unlinkSpouse() {
    if (!contactId || !spouseLinks[0]) return;
    const pair = canonicalSpousePair(contactId, spouseLinks[0].spouse.id);
    const { error } = await supabase
      .from('contact_spouses')
      .delete()
      .eq('contact_a_id', pair.contact_a_id)
      .eq('contact_b_id', pair.contact_b_id);
    if (error) toast.error('Nie udało się odłączyć współmałżonka.');
    else await fetchSpouse();
  }

  async function linkCompany() {
    if (!contactId || !selectedCompanyId || !accountId) return;
    setSavingCompanyLink(true);
    const { error } = await supabase.from('contact_companies').insert({
      contact_id: contactId,
      company_id: selectedCompanyId,
      account_id: accountId,
      role: companyRole.trim() || null,
    });
    setSavingCompanyLink(false);
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Ta firma jest już przypisana do Kontaktu.'
          : 'Nie udało się przypisać firmy.'
      );
      return;
    }
    setSelectedCompanyId('');
    setCompanyRole('');
    await fetchCompanies();
    toast.success('Firma została przypisana do Kontaktu.');
  }

  async function unlinkCompany(companyId: string) {
    if (!contactId) return;
    const { error } = await supabase
      .from('contact_companies')
      .delete()
      .eq('contact_id', contactId)
      .eq('company_id', companyId);
    if (error) toast.error('Nie udało się odłączyć firmy.');
    else await fetchCompanies();
  }

  async function copyPhone() {
    if (!contact) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  async function saveDetails() {
    if (!contactId || !editPhone.trim()) {
      toast.error(t('toastPhoneRequired'));
      return;
    }

    setSavingDetails(true);
    const fullName =
      [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(' ') ||
      editName.trim();
    const { error } = await supabase
      .from('contacts')
      .update({
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        name: fullName || null,
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        description: editDescription.trim() || null,
        linkedin_url: editLinkedin.trim() || null,
        pesel: editPesel.trim() || null,
        identity_document: editIdentityDocument.trim() || null,
        bik_status: editBikStatus || null,
        income_type: editIncomeType.trim() || null,
        monthly_income: editMonthlyIncome.trim()
          ? Number(editMonthlyIncome)
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (error) {
      toast.error(t('toastUpdateFailed'));
    } else {
      toast.success(t('toastUpdated'));
      fetchContact();
      onUpdated();
    }
    setSavingDetails(false);
  }

  async function toggleTag(tagId: string) {
    if (!contactId) return;
    setSavingTags(true);

    const isSelected = contactTagIds.includes(tagId);

    try {
      if (isSelected) {
        await deleteContactTag(contactId, tagId);
        setContactTagIds((prev) => prev.filter((id) => id !== tagId));
      } else {
        await addContactTag(contactId, tagId);
        setContactTagIds((prev) => [...prev, tagId]);
      }
      onUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('toastUpdateFailed')
      );
    }
    setSavingTags(false);
  }

  async function addNote() {
    if (!contactId || !newNote.trim()) return;
    setSavingNote(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !accountId) {
      toast.error(t('toastNotAuthenticated'));
      setSavingNote(false);
      return;
    }

    const { error } = await supabase.from('contact_notes').insert({
      contact_id: contactId,
      account_id: accountId,
      user_id: user.id,
      note_text: newNote.trim(),
    });

    if (error) {
      toast.error(t('toastNoteAddFailed'));
    } else {
      setNewNote('');
      fetchNotes();
      toast.success(t('toastNoteAdded'));
    }
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase
      .from('contact_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error(t('toastNoteDeleteFailed'));
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success(t('toastNoteDeleted'));
    }
  }

  async function saveCustomFields() {
    if (!contactId) return;
    setSavingCustom(true);

    try {
      // Delete existing values and re-insert
      await supabase
        .from('contact_custom_values')
        .delete()
        .eq('contact_id', contactId);

      const rows = Object.entries(customValues)
        .filter(([, val]) => val.trim())
        .map(([fieldId, val]) => ({
          contact_id: contactId,
          custom_field_id: fieldId,
          value: val.trim(),
        }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('contact_custom_values')
          .insert(rows);
        if (error) throw error;
      }

      toast.success(t('toastCustomFieldsSaved'));
    } catch {
      toast.error(t('toastCustomFieldsFailed'));
    }
    setSavingCustom(false);
  }

  async function handleSendTemplate(
    template: MessageTemplate,
    values: TemplateSendValues
  ) {
    if (!contactId) return;
    setSendingTemplate(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // No conversation_id — the route find-or-creates one for this
          // contact, mirroring the inbox template-send payload otherwise.
          contact_id: contactId,
          message_type: 'template',
          template_name: template.name,
          template_language: template.language,
          template_message_params: {
            body: values.body,
            headerText: values.headerText,
            buttonParams: values.buttonParams,
          },
          template_params: values.body,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reason = payload?.error || `HTTP ${res.status}`;
        toast.error(t('toastTemplateFailed', { reason }));
        return;
      }

      toast.success(t('toastTemplateSent', { name: template.name }));
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'network error';
      toast.error(`Failed to send template: ${reason}`);
    } finally {
      setSendingTemplate(false);
    }
  }

  function getInitials(name?: string | null) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const notesContent = (
    <>
      <div className="mb-3 space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={t('notesTab.placeholder')}
          className="bg-muted border-border text-foreground min-h-[60px] resize-none text-sm placeholder:text-slate-600"
        />
        <Button
          onClick={addNote}
          disabled={!newNote.trim() || savingNote}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          {savingNote ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {t('notesTab.save')}
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loadingNotes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-slate-700" />
          </div>
        ) : notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-700">Brak danych</p>
        ) : (
          <>
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-muted/50 border-border/50 group rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm whitespace-pre-wrap text-slate-700">
                    {note.note_text}
                  </p>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="shrink-0 cursor-pointer text-slate-700 opacity-0 transition-all group-hover:opacity-100 hover:text-red-700"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-700">
                  {formatWarsawDateTime(note.created_at)} · Europe/Warsaw
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
  const documentsContent = contact && (
    <>
      <ContactDocuments
        key={contact.id}
        contact={contact}
        deals={deals}
        loadingDeals={loadingDeals}
      />
      <Button
        variant="outline"
        render={
          <Link href={`/quick-call?contact=${contact.id}&action=document`} />
        }
      >
        Dodaj dokument
      </Button>
    </>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 bg-white p-0 text-slate-950 data-[side=right]:w-full sm:max-w-xl md:data-[side=right]:w-full md:data-[side=right]:max-w-xl xl:data-[side=right]:w-[calc(100vw-2rem)] xl:data-[side=right]:max-w-[1440px]"
        >
          {loading || !contact ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-primary size-6 animate-spin" />
            </div>
          ) : (
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              {/* Header */}
              <SheetHeader className="border-border/50 shrink-0 border-b p-3 pr-12 sm:p-4 sm:pr-10">
                <p className="text-xs font-black tracking-[0.14em] text-slate-700 uppercase sm:hidden">
                  Klient
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="bg-muted border-border size-12 border">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-popover-foreground truncate">
                      {contact.name || t('unnamed')}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      {t('contactDetailsDesc')}
                    </SheetDescription>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                      <button
                        onClick={copyPhone}
                        className="hover:text-primary flex cursor-pointer items-center gap-1 transition-colors"
                      >
                        <Phone className="size-3" />
                        {contact.phone}
                        {copiedPhone ? (
                          <Check className="text-primary size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {contact.email}
                        </span>
                      )}
                      <Link
                        href={`/ankieta?contact=${contact.id}`}
                        className="min-h-8 rounded px-1 font-semibold text-emerald-800 hover:underline"
                      >
                        Wypełnij ankietę
                      </Link>
                      {contactCompanies.map((link) => (
                        <Link
                          key={link.company_id}
                          href={`/companies?open=${link.company_id}`}
                          className="flex min-h-8 items-center gap-1 rounded px-1 font-semibold text-emerald-800 hover:bg-emerald-50 hover:underline"
                        >
                          <Building2 className="size-3" />
                          {link.company?.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1 [&_a]:min-h-11 [&_a]:px-1 [&_a]:text-xs [&_button]:min-h-11 [&_button]:px-1 [&_button]:text-xs">
                  <CallAction
                    phone={contact.phone}
                    contactId={contact.id}
                    companyId={
                      contactCompanies.find((link) => link.is_primary)
                        ?.company_id ?? contactCompanies[0]?.company_id
                    }
                    className="border-emerald-900 bg-emerald-900 text-white hover:bg-emerald-800 hover:text-white"
                  />
                  <WhatsAppAction
                    phone={contact.phone}
                    contactId={contact.id}
                    className="border-slate-300 bg-white text-slate-950 hover:bg-slate-100 hover:text-slate-950"
                  />
                  <ContactEmailAction email={contact.email} />
                  <Button
                    size="sm"
                    render={
                      <Link
                        href={`/pipelines?new=deal&contact=${contact.id}`}
                      />
                    }
                    className="col-span-2 bg-emerald-800 text-white hover:bg-emerald-700 sm:col-span-1"
                  >
                    + NOWY DEAL
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden sm:inline-flex"
                    render={
                      <Link
                        href={`/quick-call?contact=${contact.id}&action=dictate`}
                      />
                    }
                  >
                    <Mic className="size-4" /> DYKTUJ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden sm:inline-flex"
                    render={
                      <Link
                        href={`/calendar?new=event&contact=${contact.id}`}
                      />
                    }
                  >
                    <CalendarDays className="size-4" /> DODAJ TERMIN
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden sm:inline-flex"
                    onClick={() => {
                      setActiveTab('overview');
                      setContextExpanded(true);
                      window.setTimeout(() => {
                        const details = document.getElementById(
                          'contact-deeper-details'
                        );
                        details?.setAttribute('open', '');
                        details
                          ?.querySelector('details')
                          ?.setAttribute('open', '');
                        details?.scrollIntoView({ behavior: 'smooth' });
                      }, 0);
                    }}
                  >
                    <MoreHorizontal className="size-4" /> WIĘCEJ
                  </Button>
                </div>
              </SheetHeader>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex min-h-0 flex-1 flex-col"
              >
                <TabsList
                  aria-label="Karta klienta"
                  className="mx-3 mt-2 flex h-auto w-auto shrink-0 [scrollbar-width:none] justify-start gap-1 overflow-x-auto rounded-none border-b bg-white p-0 pb-1 sm:mx-4 [&_[data-slot=tabs-trigger]]:min-h-11 [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]]:text-slate-800 [&_[data-slot=tabs-trigger][data-active]]:border-slate-300 [&_[data-slot=tabs-trigger][data-active]]:bg-slate-200 [&_[data-slot=tabs-trigger][data-active]]:text-slate-950 [&::-webkit-scrollbar]:hidden"
                >
                  <TabsTrigger value="overview">Podsumowanie</TabsTrigger>
                  <TabsTrigger value="deals">Aktywne Deale</TabsTrigger>
                  <TabsTrigger value="history">Aktywność</TabsTrigger>
                  <TabsTrigger value="tasks">Zadania</TabsTrigger>
                  <TabsTrigger value="notes">Notatki</TabsTrigger>
                  <TabsTrigger value="documents">Dokumenty</TabsTrigger>
                  <TabsTrigger value="people">Osoby</TabsTrigger>
                  <TabsTrigger value="relations">Relacje</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="overview"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <div
                    data-contact-columns
                    className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overscroll-contain px-4 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] xl:overflow-hidden"
                  >
                    <ContactDetailColumn
                      key={`${contact.id}-context`}
                      area="context"
                      title="Kontekst i wybór"
                      expanded={contextExpanded}
                      onExpandedChange={setContextExpanded}
                    >
                      <ContactDataCards key={contact.id} contact={contact} />
                      <section
                        className="rounded-xl border border-slate-300 bg-white p-3"
                        aria-labelledby="mobile-contact-relations"
                      >
                        <h3
                          id="mobile-contact-relations"
                          className="text-sm font-black tracking-wide text-slate-950 uppercase"
                        >
                          Powiązania
                        </h3>

                        <div className="mt-3">
                          <h4 className="text-xs font-black text-slate-800">
                            Firma ({contactCompanies.length})
                          </h4>
                          <div className="mt-1 space-y-2">
                            {contactCompanies.length ? (
                              contactCompanies.map((link) => (
                                <Link
                                  key={link.company_id}
                                  href={`/companies?open=${link.company_id}`}
                                  className="flex min-h-11 items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
                                >
                                  <span>
                                    {link.company?.name || 'Firma bez nazwy'}
                                  </span>
                                  <span aria-hidden className="text-slate-700">
                                    →
                                  </span>
                                </Link>
                              ))
                            ) : (
                              <p className="text-sm text-slate-700">
                                Brak powiązania
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <h4 className="text-xs font-black text-slate-800">
                            Współmałżonek ({spouseLinks.length})
                          </h4>
                          <div className="mt-1 space-y-2">
                            {spouseLinks.length ? (
                              spouseLinks.map(({ spouse }) => (
                                <Link
                                  key={spouse.id}
                                  href={`/contacts?open=${spouse.id}`}
                                  className="flex min-h-11 items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
                                >
                                  <span>{spouse.name || spouse.phone}</span>
                                  <span aria-hidden className="text-slate-700">
                                    →
                                  </span>
                                </Link>
                              ))
                            ) : (
                              <p className="text-sm text-slate-700">
                                Brak powiązania
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <h4 className="text-xs font-black text-slate-800">
                            Osoby ({relatedPeople.length})
                          </h4>
                          <div className="mt-1 space-y-2">
                            {relatedPeople.filter(
                              (person) =>
                                !spouseLinks.some(
                                  ({ spouse }) => spouse.id === person.id
                                )
                            ).length ? (
                              relatedPeople
                                .filter(
                                  (person) =>
                                    !spouseLinks.some(
                                      ({ spouse }) => spouse.id === person.id
                                    )
                                )
                                .map((person) => (
                                  <Link
                                    key={person.id}
                                    href={`/contacts?open=${person.id}`}
                                    className="flex min-h-11 items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
                                  >
                                    <span>{person.name || person.phone}</span>
                                    <span
                                      aria-hidden
                                      className="text-slate-700"
                                    >
                                      →
                                    </span>
                                  </Link>
                                ))
                            ) : (
                              <p className="text-sm text-slate-700">
                                Brak powiązania
                              </p>
                            )}
                          </div>
                        </div>
                      </section>

                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full border-slate-300 font-black text-slate-950"
                        onClick={() => {
                          setActiveTab('overview');
                          setContextExpanded(true);
                          window.setTimeout(() => {
                            const details = document.getElementById(
                              'contact-deeper-details'
                            );
                            details?.setAttribute('open', '');
                            details
                              ?.querySelector('details')
                              ?.setAttribute('open', '');
                            details?.scrollIntoView({ behavior: 'smooth' });
                          }, 0);
                        }}
                      >
                        PEŁNA KARTA KLIENTA
                      </Button>

                      <details
                        id="contact-deeper-details"
                        className="rounded-xl border bg-slate-50 p-3"
                      >
                        <summary className="cursor-pointer text-xs font-bold text-slate-800">
                          WIĘCEJ DANYCH KLIENTA
                        </summary>
                        <div className="mt-3 space-y-3">
                          <details className="rounded-lg border bg-white p-3">
                            <summary className="cursor-pointer text-xs font-bold">
                              Dane klienta
                            </summary>
                            <div className="mt-3">
                              <div className="space-y-3">
                                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50 p-3 text-xs sm:grid-cols-4 xl:grid-cols-2">
                                  <div>
                                    <dt className="font-black text-slate-600 uppercase">
                                      Źródło
                                    </dt>
                                    <dd className="mt-0.5 font-semibold text-slate-800">
                                      {contact.source || '—'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="font-black text-slate-600 uppercase">
                                      Kategoria
                                    </dt>
                                    <dd className="mt-0.5 font-semibold text-slate-800">
                                      {contact.product_category || '—'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="font-black text-slate-600 uppercase">
                                      Następny krok
                                    </dt>
                                    <dd className="mt-0.5 font-semibold text-slate-800">
                                      {contact.next_step || '—'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="font-black text-slate-600 uppercase">
                                      Termin
                                    </dt>
                                    <dd className="mt-0.5 font-semibold text-slate-800">
                                      {contact.follow_up_at
                                        ? new Date(
                                            contact.follow_up_at
                                          ).toLocaleString('pl-PL', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : '—'}
                                    </dd>
                                  </div>
                                </dl>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setTemplatePickerOpen(true)}
                                  disabled={sendingTemplate}
                                >
                                  {sendingTemplate ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <LayoutTemplate className="size-4" />
                                  )}
                                  {t('sendTemplateBtn')}
                                </Button>
                                <div className="grid gap-2 md:max-w-md md:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-700">
                                      Imię
                                    </Label>
                                    <Input
                                      value={editFirstName}
                                      onChange={(e) =>
                                        setEditFirstName(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-700">
                                      Nazwisko
                                    </Label>
                                    <Input
                                      value={editLastName}
                                      onChange={(e) =>
                                        setEditLastName(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-700">
                                    {t('name')}
                                  </Label>
                                  <Input
                                    value={editName}
                                    onChange={(e) =>
                                      setEditName(e.target.value)
                                    }
                                    className="bg-muted border-border text-foreground h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-700">
                                    {t('phone')}{' '}
                                    <span className="text-red-400">*</span>
                                  </Label>
                                  <Input
                                    value={editPhone}
                                    onChange={(e) =>
                                      setEditPhone(e.target.value)
                                    }
                                    className="bg-muted border-border text-foreground h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-700">
                                    {t('email')}
                                  </Label>
                                  <Input
                                    value={editEmail}
                                    onChange={(e) =>
                                      setEditEmail(e.target.value)
                                    }
                                    className="bg-muted border-border text-foreground h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-700">
                                    LinkedIn
                                  </Label>
                                  <Input
                                    type="url"
                                    value={editLinkedin}
                                    onChange={(e) =>
                                      setEditLinkedin(e.target.value)
                                    }
                                    placeholder="https://linkedin.com/in/..."
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-700">
                                    Opis Kontaktu
                                  </Label>
                                  <Textarea
                                    value={editDescription}
                                    onChange={(e) =>
                                      setEditDescription(e.target.value)
                                    }
                                    className="min-h-32 resize-y"
                                    placeholder="Pełny opis osoby i ustaleń"
                                  />
                                </div>
                                <details className="rounded-lg border p-3">
                                  <summary className="cursor-pointer text-xs font-semibold">
                                    Dane do wniosku — wrażliwe
                                  </summary>
                                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    <Input
                                      value={editPesel}
                                      onChange={(e) =>
                                        setEditPesel(e.target.value)
                                      }
                                      placeholder="PESEL"
                                    />
                                    <Input
                                      value={editIdentityDocument}
                                      onChange={(e) =>
                                        setEditIdentityDocument(e.target.value)
                                      }
                                      placeholder="Seria i numer dokumentu"
                                    />
                                    <select
                                      value={editBikStatus}
                                      onChange={(e) =>
                                        setEditBikStatus(e.target.value)
                                      }
                                      className="bg-muted h-9 rounded-md border px-2 text-sm"
                                    >
                                      <option value="">
                                        BIK — brak danych
                                      </option>
                                      <option>Sprawdzony — OK</option>
                                      <option>Wymaga analizy</option>
                                      <option>Negatywny</option>
                                    </select>
                                    <Input
                                      value={editIncomeType}
                                      onChange={(e) =>
                                        setEditIncomeType(e.target.value)
                                      }
                                      placeholder="Źródło dochodu"
                                    />
                                    <Input
                                      type="number"
                                      value={editMonthlyIncome}
                                      onChange={(e) =>
                                        setEditMonthlyIncome(e.target.value)
                                      }
                                      placeholder="Dochód miesięczny"
                                    />
                                  </div>
                                </details>
                                <Button
                                  onClick={saveDetails}
                                  disabled={savingDetails}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                                  size="sm"
                                >
                                  {savingDetails ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Save className="size-3.5" />
                                  )}
                                  {t('saveChangesBtn')}
                                </Button>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border bg-white p-3">
                            <summary className="cursor-pointer text-xs font-bold">
                              Tagi
                            </summary>
                            <div className="mt-3">
                              <div className="space-y-3">
                                {accountId && contactId && (
                                  <section className="rounded-xl border p-4">
                                    <h3 className="mb-3 text-sm font-semibold">
                                      Tagi CRM Kontaktu
                                    </h3>
                                    <EntityTagsEditor
                                      accountId={accountId}
                                      entityType="contact"
                                      entityId={contactId}
                                    />
                                  </section>
                                )}
                                <p className="text-xs text-slate-700">
                                  {t('tagsTab.clickTagDesc')}
                                </p>
                                {allTags.length === 0 ? (
                                  <p className="text-sm text-slate-700">
                                    {t('tagsTab.noTagsAvailable')}
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {allTags.map((tag) => {
                                      const selected = contactTagIds.includes(
                                        tag.id
                                      );
                                      return (
                                        <button
                                          key={tag.id}
                                          onClick={() => toggleTag(tag.id)}
                                          disabled={savingTags}
                                          className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                            selected
                                              ? 'ring-primary ring-offset-border ring-2 ring-offset-1'
                                              : 'opacity-50 hover:opacity-80'
                                          }`}
                                          style={{
                                            backgroundColor: tag.color + '20',
                                            color: tag.color,
                                          }}
                                        >
                                          {selected && (
                                            <Check className="mr-1 size-3" />
                                          )}
                                          {tag.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border bg-white p-3">
                            <summary className="cursor-pointer text-xs font-bold">
                              Pola dodatkowe
                            </summary>
                            <div className="mt-3">
                              {loadingCustom ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="size-5 animate-spin text-slate-700" />
                                </div>
                              ) : customFields.length === 0 ? (
                                <p className="py-8 text-center text-sm text-slate-700">
                                  {t('noCustomFields')}
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {customFields.map((field) => (
                                    <div key={field.id} className="space-y-1.5">
                                      <Label className="text-xs text-slate-700 capitalize">
                                        {field.field_name}
                                      </Label>
                                      <Input
                                        value={customValues[field.id] ?? ''}
                                        onChange={(e) =>
                                          setCustomValues((prev) => ({
                                            ...prev,
                                            [field.id]: e.target.value,
                                          }))
                                        }
                                        placeholder={t('enterCustomField', {
                                          name: field.field_name,
                                        })}
                                        className="bg-muted border-border text-foreground h-8 text-sm placeholder:text-slate-600"
                                      />
                                    </div>
                                  ))}
                                  <Button
                                    onClick={saveCustomFields}
                                    disabled={savingCustom}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                                    size="sm"
                                  >
                                    {savingCustom ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Save className="size-3.5" />
                                    )}
                                    {t('saveCustomFieldsBtn')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </details>
                    </ContactDetailColumn>
                    <ContactDetailColumn
                      key={`${contact.id}-work`}
                      area="work"
                      title="Główna praca"
                    >
                      <section
                        className="rounded-xl border border-slate-300 bg-white p-3"
                        aria-labelledby="mobile-contact-deals"
                      >
                        <h3
                          id="mobile-contact-deals"
                          className="text-sm font-black tracking-wide text-slate-950 uppercase"
                        >
                          Aktywne Deale (
                          {
                            deals.filter(
                              (deal) =>
                                deal.status !== 'won' && deal.status !== 'lost'
                            ).length
                          }
                          )
                        </h3>
                        {loadingDeals ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="size-5 animate-spin text-slate-700" />
                          </div>
                        ) : deals.some(
                            (deal) =>
                              deal.status !== 'won' && deal.status !== 'lost'
                          ) ? (
                          <div className="mt-2 space-y-2">
                            {deals
                              .filter(
                                (deal) =>
                                  deal.status !== 'won' &&
                                  deal.status !== 'lost'
                              )
                              .slice(0, 3)
                              .map((deal) => (
                                <Link
                                  key={deal.id}
                                  href={`/deals/${deal.id}`}
                                  className="block min-h-11 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-950 hover:bg-slate-100"
                                >
                                  <span className="block text-sm font-black">
                                    {deal.title} ·{' '}
                                    {formatCurrency(
                                      deal.value ?? 0,
                                      deal.currency || defaultCurrency
                                    )}{' '}
                                    · {deal.stage?.name || 'Etap nieustalony'}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-700">
                                    następny krok:{' '}
                                    {deal.next_action || 'nie ustalono'} ·
                                    termin:{' '}
                                    {deal.next_action_at
                                      ? formatWarsawDateTime(
                                          deal.next_action_at
                                        )
                                      : 'nie ustalono'}
                                  </span>
                                </Link>
                              ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-700">
                            Brak powiązanych deali.
                          </p>
                        )}
                      </section>

                      <section
                        className="rounded-xl border border-slate-300 bg-white p-3"
                        aria-labelledby="contact-overview-tasks"
                      >
                        <h3
                          id="contact-overview-tasks"
                          className="mb-2 text-sm font-black text-slate-950 uppercase"
                        >
                          Zadania
                        </h3>
                        <ContactTasks key={contact.id} contact={contact} />
                      </section>
                    </ContactDetailColumn>
                    <ContactDetailColumn
                      key={`${contact.id}-results`}
                      area="results"
                      title="Wyniki i bieżące działania"
                    >
                      <section
                        className="rounded-xl border border-slate-300 bg-white p-3"
                        aria-labelledby="mobile-contact-activities"
                      >
                        <h3
                          id="mobile-contact-activities"
                          className="text-sm font-black tracking-wide text-slate-950 uppercase"
                        >
                          Ostatnie aktywności
                        </h3>
                        <ActivityHistory
                          contactId={contact.id}
                          className="mt-2"
                        />
                      </section>

                      <section
                        className="rounded-xl border border-slate-300 bg-white p-3"
                        aria-labelledby="contact-overview-notes"
                      >
                        <h3
                          id="contact-overview-notes"
                          className="mb-2 text-sm font-black text-slate-950 uppercase"
                        >
                          Notatki
                        </h3>
                        {notesContent}
                      </section>
                      <section
                        className="rounded-xl border border-slate-300 bg-white p-3"
                        aria-labelledby="contact-overview-documents"
                      >
                        <h3
                          id="contact-overview-documents"
                          className="mb-2 text-sm font-black text-slate-950 uppercase"
                        >
                          Dokumenty
                        </h3>
                        {documentsContent}
                      </section>
                    </ContactDetailColumn>
                  </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent
                  value="notes"
                  className="flex min-h-0 flex-1 flex-col px-4 py-3"
                >
                  {notesContent}
                </TabsContent>

                {/* Relations Tab */}
                <TabsContent
                  value="relations"
                  className="flex-1 overflow-y-auto px-4 py-3"
                >
                  <ContactDataCards key={contact.id} contact={contact} />
                  <div className="my-3 space-y-3">
                    <SpouseLinks links={spouseLinks} />
                    <section className="rounded-xl border border-slate-200 p-3">
                      <h3 className="text-sm font-black">Relacja małżeńska</h3>
                      {spouseLinks.length ? (
                        <Button
                          className="mt-2 min-h-10"
                          variant="outline"
                          onClick={() => void unlinkSpouse()}
                        >
                          Odłącz współmałżonka
                        </Button>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <select
                            value={selectedSpouseId}
                            onChange={(event) =>
                              setSelectedSpouseId(event.target.value)
                            }
                            className="min-h-10 flex-1 rounded-md border bg-white px-3 text-sm"
                            aria-label="Wybierz współmałżonka"
                          >
                            <option value="">Wybierz Kontakt</option>
                            {spouseCandidates.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name || candidate.phone}
                              </option>
                            ))}
                          </select>
                          <Button
                            className="min-h-10"
                            disabled={!selectedSpouseId || savingSpouse}
                            onClick={() => void linkSpouse()}
                          >
                            {savingSpouse ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            Powiąż
                          </Button>
                        </div>
                      )}
                    </section>
                  </div>
                  <h3 className="mb-3 text-sm font-black">Firma</h3>
                  <div className="space-y-3">
                    {contactCompanies.length === 0 ? (
                      <p className="text-sm text-slate-700">
                        Kontakt nie jest jeszcze przypisany do żadnej firmy.
                      </p>
                    ) : (
                      contactCompanies.map((link) => (
                        <div
                          key={link.company_id}
                          className="border-border bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <Link
                            href={`/companies?open=${link.company_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 rounded px-1 py-1 hover:bg-emerald-50"
                          >
                            <p className="text-foreground truncate text-sm font-medium hover:text-emerald-800 hover:underline">
                              {link.company?.name ?? 'Firma'}
                            </p>
                            {link.role && (
                              <p className="text-xs text-slate-700">
                                Rola: {link.role}
                              </p>
                            )}
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unlinkCompany(link.company_id)}
                          >
                            Odłącz
                          </Button>
                        </div>
                      ))
                    )}
                    <div className="border-border space-y-2 border-t pt-3">
                      <select
                        value={selectedCompanyId}
                        onChange={(event) =>
                          setSelectedCompanyId(event.target.value)
                        }
                        className="border-border bg-muted text-foreground h-9 w-full rounded-lg border px-2.5 text-sm"
                      >
                        <option value="">Wybierz firmę</option>
                        {companies
                          .filter(
                            (company) =>
                              !contactCompanies.some(
                                (link) => link.company_id === company.id
                              )
                          )
                          .map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                      </select>
                      <Input
                        value={companyRole}
                        onChange={(event) => setCompanyRole(event.target.value)}
                        placeholder="Rola w firmie, np. właściciel"
                      />
                      <Button
                        variant="outline"
                        render={
                          <Link
                            href={`/companies?new=company&contact=${contact.id}`}
                          />
                        }
                        className="w-full"
                      >
                        <Plus className="size-4" />
                        Nowa Firma dla tego Kontaktu
                      </Button>

                      <Button
                        onClick={linkCompany}
                        disabled={!selectedCompanyId || savingCompanyLink}
                        className="w-full"
                      >
                        {savingCompanyLink ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                        Przypisz firmę
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Deals Tab */}
                <TabsContent
                  value="deals"
                  className="flex-1 overflow-y-auto px-4 py-3"
                >
                  {loadingDeals ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="text-primary size-5 animate-spin" />
                    </div>
                  ) : deals.filter(
                      (deal) => deal.status !== 'won' && deal.status !== 'lost'
                    ).length === 0 ? (
                    <p className="text-xs text-slate-700">
                      {t('dealsTab.noDeals')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {deals
                        .filter(
                          (deal) =>
                            deal.status !== 'won' && deal.status !== 'lost'
                        )
                        .map((deal) => (
                          <Link
                            key={deal.id}
                            href={`/deals/${deal.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border border-emerald-950/10 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-foreground text-sm font-medium">
                                {deal.title}
                              </p>
                              {deal.stage && (
                                <span
                                  className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: `${deal.stage.color}20`,
                                    color: deal.stage.color,
                                  }}
                                >
                                  {deal.stage.name}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-700">
                              Następny krok:{' '}
                              {deal.next_action || 'Nie ustalono'}
                            </p>
                            {deal.next_action_at && (
                              <p className="mt-1 text-xs text-slate-700">
                                {formatWarsawDateTime(deal.next_action_at)}
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-700">
                              <span className="flex items-center gap-1">
                                <DollarSign className="size-3" />
                                {formatCurrency(
                                  deal.value ?? 0,
                                  deal.currency || defaultCurrency
                                )}
                              </span>
                              {deal.status && deal.status !== 'open' && (
                                <span
                                  className={
                                    deal.status === 'won'
                                      ? 'text-primary'
                                      : 'text-red-700'
                                  }
                                >
                                  {deal.status}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent
                  value="documents"
                  className="flex-1 overflow-y-auto px-4 py-3"
                >
                  {documentsContent}
                </TabsContent>
                <TabsContent
                  value="tasks"
                  className="flex-1 overflow-y-auto px-4 py-3"
                >
                  <ContactTasks key={contact.id} contact={contact} />
                </TabsContent>
                <TabsContent
                  value="people"
                  className="flex-1 overflow-y-auto px-4 py-3"
                >
                  {loadingDeals ? (
                    <Loader2
                      aria-label="Ładowanie"
                      className="size-5 animate-spin"
                    />
                  ) : (
                    <div className="space-y-2">
                      {[
                        ...new Map(
                          [
                            ...spouseLinks.map(({ spouse }) => spouse),
                            ...relatedPeople,
                          ].map((person) => [person.id, person])
                        ).values(),
                      ].map((person) => (
                        <Link
                          key={person.id}
                          href={`/contacts?open=${person.id}`}
                          className="block min-h-11 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                        >
                          {person.name || person.phone}
                        </Link>
                      ))}
                      {!spouseLinks.length && !relatedPeople.length && (
                        <p className="py-8 text-center text-sm text-slate-700">
                          Brak danych
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent
                  value="history"
                  className="flex-1 overflow-y-auto px-4 py-3"
                >
                  <ActivityHistory contactId={contact.id} />
                </TabsContent>
              </Tabs>
              <div className="shrink-0 border-t bg-white p-3">
                <Button
                  aria-label="+ UTWÓRZ NOWY DEAL"
                  className="w-full bg-emerald-800 text-white"
                  render={
                    <Link
                      href={`/quick-call?contact=${contact.id}&newDeal=1`}
                    />
                  }
                >
                  + NOWY DEAL
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleSendTemplate}
      />
    </>
  );
}
