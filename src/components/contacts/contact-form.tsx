'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { addContactTag, deleteContactTag } from '@/lib/contacts/tag-api';
import { toast } from 'sonner';
import type { Company, Contact, Tag, ContactTag } from '@/types';
import {
  findExistingContact,
  isExactMatch,
  isUniqueViolation,
  type ExistingContact,
} from '@/lib/contacts/dedupe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EntitySearchSelect } from '@/components/ui/entity-search-select';
import { MobileDateTimeInput } from '@/components/ui/mobile-date-time-input';
import { isValidNip, normalizeNip } from '@/lib/companies/nip';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  contactTags?: ContactTag[];
  onSaved: () => void;
  /** Open an existing contact's detail view — used by the duplicate
   *  notice to jump to the contact that already owns this number. */
  onViewExisting?: (contactId: string) => void;
}

export function ContactForm({
  open,
  onOpenChange,
  contact,
  contactTags = [],
  onSaved,
  onViewExisting,
}: ContactFormProps) {
  const t = useTranslations('Contacts.form');
  const supabase = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const isEdit = !!contact;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyNip, setNewCompanyNip] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [description, setDescription] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [source, setSource] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [contactResult, setContactResult] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [pesel, setPesel] = useState('');
  const [identityDocument, setIdentityDocument] = useState('');
  const [bikStatus, setBikStatus] = useState('');
  const [incomeType, setIncomeType] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [employmentFrom, setEmploymentFrom] = useState('');
  const [contractUntil, setContractUntil] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Duplicate-phone detection for NEW contacts. `exact` (same digits)
  // hard-blocks the save; a fuzzy trunk-variant match only warns. The
  // DB unique index (migration 022) is the real backstop — this is the
  // friendly heads-up before we get there.
  const [dupMatch, setDupMatch] = useState<{
    contact: ExistingContact;
    exact: boolean;
  } | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(contact?.first_name ?? contact?.name?.split(' ')[0] ?? '');
      setLastName(
        contact?.last_name ?? contact?.name?.split(' ').slice(1).join(' ') ?? ''
      );
      setPhone(contact?.phone ?? '');
      setEmail(contact?.email ?? '');
      setCompanyId('');
      setNewCompanyName('');
      setNewCompanyNip('');
      setShowNewCompany(false);
      setDescription(contact?.description ?? '');
      setPhoneSecondary(contact?.phone_secondary ?? '');
      setSource(contact?.source ?? '');
      setProductCategory(contact?.product_category ?? '');
      setContactResult(contact?.contact_result ?? '');
      setNextStep(contact?.next_step ?? '');
      setFollowUpAt(toLocalDateTime(contact?.follow_up_at));
      setLinkedinUrl(contact?.linkedin_url ?? '');
      setPesel(contact?.pesel ?? '');
      setIdentityDocument(contact?.identity_document ?? '');
      setBikStatus(contact?.bik_status ?? '');
      setIncomeType(contact?.income_type ?? '');
      setMonthlyIncome(contact?.monthly_income?.toString() ?? '');
      setEmployerName(contact?.employer_name ?? '');
      setEmploymentFrom(contact?.employment_from ?? '');
      setContractUntil(contact?.contract_until ?? '');
      setPreferredChannel(contact?.preferred_contact_channel ?? '');
      setAddress(contact?.address ?? '');
      setPostalCode(contact?.postal_code ?? '');
      setCity(contact?.city ?? '');
      setContactConsent(contact?.contact_consent ?? false);
      setMarketingConsent(contact?.marketing_consent ?? false);
      setSelectedTagIds(contactTags.map((ct) => ct.tag_id));
      setDupMatch(null);
      fetchTags();
      void fetchCompaniesAndLink();
    }
  }, [open, contact]);

  async function fetchCompaniesAndLink() {
    const [{ data: companyRows }, { data: linkRows }] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      contact?.id
        ? supabase
            .from('contact_companies')
            .select('company_id')
            .eq('contact_id', contact.id)
            .eq('is_primary', true)
            .limit(1)
        : Promise.resolve({ data: [] }),
    ]);
    setCompanies((companyRows ?? []) as Company[]);
    setCompanyId(
      (linkRows?.[0] as { company_id?: string } | undefined)?.company_id ?? ''
    );
  }

  async function createCompanyInline() {
    if (!newCompanyName.trim() || !accountId) return;
    if (!isValidNip(newCompanyNip)) {
      toast.error('NIP musi mieć 10 cyfr.');
      return;
    }
    const normalizedNip = normalizeNip(newCompanyNip);
    if (normalizedNip) {
      const { data: existing } = await supabase
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
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await supabase
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
    setCompanies((rows) =>
      [...rows, data as Company].sort((a, b) =>
        a.name.localeCompare(b.name, 'pl')
      )
    );
    setCompanyId(data.id);
    setNewCompanyName('');
    setNewCompanyNip('');
    setShowNewCompany(false);
    toast.success('Firma została dodana i wybrana.');
  }

  // Look up an existing contact with this number (new contacts only).
  // Runs on blur so we don't query on every keystroke.
  async function checkDuplicate() {
    if (isEdit || !accountId) return;
    const value = phone.trim();
    if (!value) {
      setDupMatch(null);
      return;
    }
    setCheckingDup(true);
    try {
      const existing = await findExistingContact(supabase, accountId, value);
      setDupMatch(
        existing
          ? { contact: existing, exact: isExactMatch(existing, value) }
          : null
      );
    } finally {
      setCheckingDup(false);
    }
  }

  async function fetchTags() {
    setLoadingTags(true);
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setTags(data);
    setLoadingTags(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    // Safari/iOS autofill can update the visible input without firing React's
    // change event. FormData is the submitted source of truth in that case.
    const submittedFirstName = String(
      form.get('first_name') ?? firstName
    ).trim();
    const submittedLastName = String(form.get('last_name') ?? lastName).trim();
    const submittedPhone = String(form.get('phone') ?? phone).trim();
    if (
      !submittedFirstName ||
      !submittedLastName ||
      normalizePhone(submittedPhone).length < 7
    ) {
      toast.error('Imię, nazwisko i numer telefonu są wymagane.');
      return;
    }

    // Hard-block an exact duplicate on create (the DB unique index is
    // the real backstop; this avoids a round-trip + a raw error toast).
    if (!isEdit && dupMatch?.exact) {
      toast.error(t('toastConflict'));
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId)
        throw new Error('Your profile is not linked to an account.');

      let contactId = contact?.id;

      const payload = {
        first_name: submittedFirstName,
        last_name: submittedLastName,
        name:
          [submittedFirstName, submittedLastName].filter(Boolean).join(' ') ||
          null,
        phone: submittedPhone,
        phone_secondary: phoneSecondary.trim() || null,
        email: email.trim() || null,
        description: description.trim() || null,
        source: source || null,
        product_category: productCategory || null,
        contact_result: contactResult || null,
        next_step: nextStep.trim() || null,
        follow_up_at: followUpAt || null,
        source_details: null,
        linkedin_url: linkedinUrl.trim() || null,
        pesel: pesel.trim() || null,
        identity_document: identityDocument.trim() || null,
        bik_status: bikStatus || null,
        income_type: incomeType || null,
        monthly_income: monthlyIncome.trim() ? Number(monthlyIncome) : null,
        employer_name: employerName.trim() || null,
        employment_from: employmentFrom || null,
        contract_until: contractUntil || null,
        preferred_contact_channel: preferredChannel || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        contact_consent: contactConsent,
        marketing_consent: marketingConsent,
      };

      if (isEdit && contactId) {
        const { error } = await supabase
          .from('contacts')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            account_id: accountId,
            ...payload,
          })
          .select('id')
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      // Sync tags
      if (contactId) {
        try {
          await supabase
            .from('contact_companies')
            .delete()
            .eq('contact_id', contactId)
            .eq('is_primary', true);
          if (companyId) {
            const { error: linkError } = await supabase
              .from('contact_companies')
              .upsert(
                {
                  contact_id: contactId,
                  company_id: companyId,
                  account_id: accountId,
                  role: 'Powiązana osoba',
                  is_primary: true,
                },
                { onConflict: 'contact_id,company_id' }
              );
            if (linkError) throw linkError;
          }
        } catch (relationError) {
          console.error(
            'Kontakt zapisany, ale nie udało się zapisać firmy:',
            relationError
          );
          toast.warning(
            'Kontakt zapisany. Powiązanie z firmą wymaga ponowienia.'
          );
        }
        const existingTagIds = new Set(contactTags.map((tag) => tag.tag_id));
        const desiredTagIds = new Set(selectedTagIds);
        const toRemove = [...existingTagIds].filter(
          (id) => !desiredTagIds.has(id)
        );
        const toAdd = [...desiredTagIds].filter(
          (id) => !existingTagIds.has(id)
        );

        for (const tagId of toRemove) {
          await deleteContactTag(contactId, tagId);
        }
        for (const tagId of toAdd) {
          await addContactTag(contactId, tagId);
        }
      }

      toast.success(isEdit ? t('toastSuccessEdit') : t('toastSuccessAdd'));
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      // The unique index (migration 022) rejects a duplicate phone that
      // slipped past the on-blur check (race, or a format that
      // normalizes equal). Surface it as the friendly duplicate notice
      // and, for new contacts, point the user at the existing record.
      if (isUniqueViolation(err)) {
        toast.error(t('toastConflict'));
        if (!isEdit && accountId) {
          const existing = await findExistingContact(
            supabase,
            accountId,
            phone.trim()
          );
          if (existing) setDupMatch({ contact: existing, exact: true });
        }
        return;
      }
      const message = err instanceof Error ? err.message : t('toastError');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {isEdit ? t('editTitle') : t('addTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? t('editDesc') : t('addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Imię *</Label>
              <Input
                name="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Imię"
              />
            </div>
            <div className="space-y-2">
              <Label>Nazwisko *</Label>
              <Input
                name="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nazwisko"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-phone" className="text-muted-foreground">
              {t('phoneLabel')} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="cf-phone"
              name="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (dupMatch) setDupMatch(null);
              }}
              onBlur={checkDuplicate}
              placeholder={t('phonePlaceholder')}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            {dupMatch ? (
              <div
                className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${
                  dupMatch.exact
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="space-y-1">
                  <p>{dupMatch.exact ? t('dupExact') : t('dupSimilar')}</p>
                  {onViewExisting && (
                    <button
                      type="button"
                      onClick={() => onViewExisting(dupMatch.contact.id)}
                      className="font-medium underline underline-offset-2 hover:no-underline"
                    >
                      {t('viewExisting', {
                        name: dupMatch.contact.name || dupMatch.contact.phone,
                      })}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">{t('phoneHint')}</p>
            )}
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Drugi telefon</Label>
              <Input
                value={phoneSecondary}
                onChange={(e) => setPhoneSecondary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Opis Kontaktu</Label>
            <VoiceTextarea
              value={description}
              onChange={setDescription}
              placeholder="Najważniejsze informacje o kliencie i ostatnie ustalenia"
              className="min-h-24"
            />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Kategoria / produkt</Label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="bg-muted border-border h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Wybierz</option>
                <option>ML — HIPOTEKA</option>
                <option>ML — FIRMA</option>
                <option>BC — FIRMA</option>
                <option>NML — OFF</option>
                <option>LEASING</option>
                <option>INNY</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Wynik kontaktu</Label>
              <select
                value={contactResult}
                onChange={(e) => setContactResult(e.target.value)}
                className="bg-muted border-border h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Wybierz</option>
                <option>Do kwalifikacji</option>
                <option>Zakwalifikowany</option>
                <option>Nie zainteresowany</option>
                <option>Nie odebrał</option>
                <option>Oddzwonić</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Następny krok</Label>
              <Input
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="Co należy zrobić dalej"
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up</Label>
              <MobileDateTimeInput
                value={followUpAt}
                onChange={setFollowUpAt}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Kod</Label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Miasto</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contactConsent}
                onChange={(e) => setContactConsent(e.target.checked)}
              />{' '}
              Zgoda na kontakt w sprawie zapytania
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />{' '}
              Zgoda marketingowa
            </label>
          </div>

          <div className="space-y-2">
            <Label>Powiązana firma</Label>
            <EntitySearchSelect
              value={companyId}
              onChange={setCompanyId}
              placeholder="Wyszukaj firmę"
              options={companies.map((row) => ({
                value: row.id,
                label: row.name,
                keywords: `${row.nip ?? ''} ${row.phone ?? ''}`,
              }))}
              onAdd={() => setShowNewCompany((value) => !value)}
              addLabel="Dodaj nową firmę"
            />
            {showNewCompany && (
              <div className="grid gap-2">
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nazwa nowej firmy"
                />
                <Input
                  value={newCompanyNip}
                  onChange={(e) => setNewCompanyNip(e.target.value)}
                  placeholder="NIP (opcjonalnie)"
                  inputMode="numeric"
                />
                <Button type="button" onClick={createCompanyInline}>
                  Dodaj
                </Button>
              </div>
            )}
          </div>

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer font-medium">
              Dane dodatkowe i do wniosków
            </summary>
            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <Label>Preferowany kontakt</Label>
                <select
                  value={preferredChannel}
                  onChange={(e) => setPreferredChannel(e.target.value)}
                  className="bg-muted border-border h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Wybierz</option>
                  <option>Telefon</option>
                  <option>WhatsApp</option>
                  <option>SMS</option>
                  <option>E-mail</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Źródło pozyskania</Label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="bg-muted border-border h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Wybierz</option>
                  <option>Podajnik mBank</option>
                  <option>Lead mFinanse</option>
                  <option>Własny kontakt</option>
                  <option>Polecenie</option>
                  <option>Strona makson.space</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>PESEL</Label>
                <Input
                  value={pesel}
                  onChange={(e) => setPesel(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label>Seria i numer dowodu</Label>
                <Input
                  value={identityDocument}
                  onChange={(e) => setIdentityDocument(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>BIK</Label>
                <select
                  value={bikStatus}
                  onChange={(e) => setBikStatus(e.target.value)}
                  className="bg-muted border-border h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Nie ustalono</option>
                  <option>Do pobrania</option>
                  <option>Posiada</option>
                  <option>Otrzymany</option>
                  <option>Sprawdzony</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Źródło dochodu</Label>
                <select
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value)}
                  className="bg-muted border-border h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Wybierz</option>
                  <option>Umowa o pracę</option>
                  <option>Działalność gospodarcza</option>
                  <option>Spółka</option>
                  <option>Emerytura / renta</option>
                  <option>Inne</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Dochód netto</Label>
                <Input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pracodawca / źródło</Label>
                <Input
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dochód od</Label>
                <Input
                  type="date"
                  value={employmentFrom}
                  onChange={(e) => setEmploymentFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Umowa do</Label>
                <Input
                  type="date"
                  value={contractUntil}
                  onChange={(e) => setContractUntil(e.target.value)}
                />
              </div>
            </div>
          </details>

          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('tagsLabel')}</Label>
            {loadingTags ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-3 animate-spin" />
                {t('loadingTags')}
              </div>
            ) : tags.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t('noTagsAvailable')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'ring-primary ring-offset-border ring-2 ring-offset-1'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={saving || checkingDup || (!isEdit && !!dupMatch?.exact)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toLocalDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}


