'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import type { Company, Contact, Deal } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { EntitySearchSelect } from '@/components/ui/entity-search-select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { EntityTagsEditor } from '@/components/tags/entity-tags-editor';
import { isValidNip, normalizeNip } from '@/lib/companies/nip';
import { SmsAction } from '@/components/sales/sms-action';
import {
  Building2,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
} from 'lucide-react';

interface LinkedContactRow {
  contact_id: string;
  role: string | null;
  is_primary: boolean;
  contact: Contact | null;
}

export default function CompaniesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const canEdit = useCan('send-messages');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);
  const [pendingContactId, setPendingContactId] = useState('');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    if (error) toast.error('Nie udało się pobrać firm.');
    setCompanies((data ?? []) as Company[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // The async loader owns the state updates after the Supabase request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCompanies();
  }, [loadCompanies]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pl');
    if (!term) return companies;
    return companies.filter((company) =>
      [company.name, company.nip, company.email, company.phone]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('pl').includes(term))
    );
  }, [companies, search]);

  function openNew(contactId = '') {
    setSelected(null);
    setPendingContactId(contactId);
    setSheetOpen(true);
  }

  function openCompany(company: Company) {
    setSelected(company);
    setSheetOpen(true);
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const timer = window.setTimeout(() => {
      if (query.get('new') === 'company') {
        openNew(query.get('contact') ?? '');
        window.history.replaceState({}, '', '/companies');
        return;
      }
      const openId = query.get('open');
      if (openId && companies.length) {
        const company = companies.find((row) => row.id === openId);
        if (company) openCompany(company);
        window.history.replaceState({}, '', '/companies');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [companies]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Firmy</h1>
          <p className="text-muted-foreground text-sm">
            Kartoteka firm powiązana z Kontaktami i Dealami.
          </p>
        </div>
        <Button onClick={() => openNew()} disabled={!canEdit}>
          <Plus className="size-4" /> Dodaj firmę
        </Button>
      </div>

      <div className="relative max-w-lg">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Szukaj po nazwie, NIP, telefonie lub e-mailu"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-primary size-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Brak firm. Dodaj pierwszą firmę albo zmień wyszukiwanie.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => openCompany(company)}
              className="text-left"
            >
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-lg p-2">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-medium">
                        {company.name}
                      </p>
                      {company.nip && (
                        <p className="text-muted-foreground text-xs">
                          NIP: {company.nip}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    {company.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="size-3" />
                        {company.phone}
                      </p>
                    )}
                    {company.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="size-3" />
                        {company.email}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <CompanySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        company={selected}
        accountId={accountId}
        canEdit={canEdit}
        initialContactId={pendingContactId}
        onSaved={loadCompanies}
        onExisting={(existing) => {
          setSelected(existing);
          setPendingContactId('');
        }}
      />
    </div>
  );
}

function CompanySheet({
  open,
  onOpenChange,
  company,
  accountId,
  canEdit,
  initialContactId,
  onSaved,
  onExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  accountId: string | null;
  canEdit: boolean;
  initialContactId: string;
  onSaved: () => Promise<void>;
  onExisting: (company: Company) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [regon, setRegon] = useState('');
  const [krs, setKrs] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [pkd, setPkd] = useState('');
  const [accountingType, setAccountingType] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [businessStartedOn, setBusinessStartedOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<LinkedContactRow[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contactId, setContactId] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState('');
  const [newContactLastName, setNewContactLastName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const loadRelations = useCallback(async () => {
    if (!company) {
      setLinkedContacts([]);
      setDeals([]);
      return;
    }
    const [links, companyDeals] = await Promise.all([
      supabase
        .from('contact_companies')
        .select(
          'contact_id, role, is_primary, contact:contacts!contact_companies_contact_id_fkey(*)'
        )
        .eq('company_id', company.id),
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
    ]);
    setLinkedContacts((links.data ?? []) as unknown as LinkedContactRow[]);
    setDeals((companyDeals.data ?? []) as Deal[]);
  }, [company, supabase]);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset the controlled form when a different company sheet opens */
    setName(company?.name ?? '');
    setNip(company?.nip ?? '');
    setPhone(company?.phone ?? '');
    setEmail(company?.email ?? '');
    setNotes(company?.notes ?? '');
    setDescription(company?.description ?? '');
    setDriveFolderUrl(company?.drive_folder_url ?? '');
    setRegon(company?.regon ?? '');
    setKrs(company?.krs ?? '');
    setLegalForm(company?.legal_form ?? '');
    setPkd(company?.pkd ?? '');
    setAccountingType(company?.accounting_type ?? '');
    setAddress(company?.address ?? '');
    setPostalCode(company?.postal_code ?? '');
    setCity(company?.city ?? '');
    setWebsite(company?.website ?? '');
    setBusinessStartedOn(company?.business_started_on ?? '');
    setContactId('');
    setContactRole('');
    /* eslint-enable react-hooks/set-state-in-effect */
    void loadRelations();
    void supabase
      .from('contacts')
      .select('*')
      .order('name')
      .then(({ data }) => setContacts((data ?? []) as Contact[]));
  }, [open, company, loadRelations, supabase]);

  async function saveCompany() {
    if (!name.trim() || !accountId) {
      toast.error('Nazwa firmy jest wymagana.');
      return;
    }
    if (!isValidNip(nip)) {
      toast.error('NIP musi mieć 10 cyfr.');
      return;
    }
    setSaving(true);
    const normalizedNip = normalizeNip(nip);
    if (!company && normalizedNip) {
      const { data: existing } = await supabase
        .from('companies')
        .select('*')
        .eq('account_id', accountId)
        .eq('nip_normalized', normalizedNip)
        .maybeSingle();
      if (existing) {
        if (initialContactId) {
          const { error: linkError } = await supabase
            .from('contact_companies')
            .upsert(
              {
                contact_id: initialContactId,
                company_id: existing.id,
                account_id: accountId,
                role: 'Powiązana osoba',
                is_primary: true,
              },
              { onConflict: 'contact_id,company_id' }
            );
          if (linkError) {
            setSaving(false);
            toast.error(
              'Znaleziono Firmę, ale nie udało się jej powiązać z Kontaktem.'
            );
            return;
          }
        }
        setSaving(false);
        await onSaved();
        onExisting(existing as Company);
        toast.info(
          `Firma z tym NIP już istnieje: ${existing.name}. Otwieram ją.`
        );
        return;
      }
    }
    const payload = {
      name: name.trim(),
      nip: normalizedNip || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
      description: description.trim() || null,
      drive_folder_url: driveFolderUrl.trim() || null,
      regon: regon.trim() || null,
      krs: krs.trim() || null,
      legal_form: legalForm || null,
      pkd: pkd.trim() || null,
      accounting_type: accountingType || null,
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
      website: website.trim() || null,
      business_started_on: businessStartedOn || null,
    };
    let error;
    let createdCompanyId = company?.id ?? '';
    if (company) {
      ({ error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', company.id));
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setSaving(false);
        toast.error('Brak aktywnego logowania.');
        return;
      }
      const created = await supabase
        .from('companies')
        .insert({
          ...payload,
          account_id: accountId,
          user_id: session.user.id,
        })
        .select('id')
        .single();
      error = created.error;
      createdCompanyId = created.data?.id ?? '';
    }
    setSaving(false);
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Firma o takim NIP już istnieje.'
          : `Nie udało się zapisać firmy: ${error.message}`
      );
      return;
    }
    if (!company && initialContactId && createdCompanyId) {
      const link = await supabase.from('contact_companies').upsert(
        {
          contact_id: initialContactId,
          company_id: createdCompanyId,
          account_id: accountId,
          role: 'Powiązana osoba',
          is_primary: true,
        },
        { onConflict: 'contact_id,company_id' }
      );
      if (link.error) {
        toast.error(
          'Firma powstała, ale nie udało się powiązać jej z Kontaktem.'
        );
        return;
      }
    }
    toast.success(
      company
        ? 'Firma została zaktualizowana.'
        : initialContactId
          ? 'Firma została utworzona i powiązana z Kontaktem.'
          : 'Firma została utworzona.'
    );
    await onSaved();
    onOpenChange(false);
  }

  async function linkContact() {
    if (!company || !contactId || !accountId) return;
    const { error } = await supabase.from('contact_companies').insert({
      company_id: company.id,
      contact_id: contactId,
      account_id: accountId,
      role: contactRole.trim() || null,
    });
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Ten Kontakt jest już przypisany do firmy.'
          : 'Nie udało się przypisać Kontaktu.'
      );
      return;
    }
    setContactId('');
    setContactRole('');
    await loadRelations();
  }

  async function createAndLinkContact() {
    if (!company || !accountId || !newContactPhone.trim()) {
      toast.error('Numer telefonu jest wymagany.');
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    const fullName = [newContactFirstName.trim(), newContactLastName.trim()]
      .filter(Boolean)
      .join(' ');
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        user_id: session.user.id,
        first_name: newContactFirstName.trim() || null,
        last_name: newContactLastName.trim() || null,
        name: fullName || null,
        phone: newContactPhone.trim(),
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
    const link = await supabase.from('contact_companies').insert({
      company_id: company.id,
      contact_id: data.id,
      account_id: accountId,
      role: contactRole.trim() || 'Powiązana osoba',
      is_primary: true,
    });
    if (link.error) {
      toast.error('Kontakt powstał, ale nie udało się powiązać go z firmą.');
      return;
    }
    setNewContactFirstName('');
    setNewContactLastName('');
    setNewContactPhone('');
    setShowNewContact(false);
    setContactRole('');
    toast.success('Kontakt został dodany i powiązany z firmą.');
    await loadRelations();
  }

  async function unlinkContact(linkedContactId: string) {
    if (!company) return;
    const { error } = await supabase
      .from('contact_companies')
      .delete()
      .eq('company_id', company.id)
      .eq('contact_id', linkedContactId);
    if (error) toast.error('Nie udało się odłączyć Kontaktu.');
    else await loadRelations();
  }

  const smsContact = linkedContacts.find((link) => link.contact?.phone)?.contact ?? null;
  const actionPhone = company?.phone || smsContact?.phone;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={`w-full overflow-y-auto ${company ? 'sm:max-w-[calc(100vw-15rem)]' : 'sm:max-w-xl'}`}
      >
        <SheetHeader>
          <SheetTitle>
            {company ? `Firma: ${company.name}` : 'Nowa firma'}
          </SheetTitle>
          {company && actionPhone && (
            <div className="flex flex-wrap gap-2 pt-2">
              <a className={buttonVariants({ size: 'sm' })} href={`tel:${actionPhone}`}><Phone className="size-4" /> Zadzwoń</a>
              <SmsAction phone={actionPhone} contactName={smsContact?.name || company.name} contactId={smsContact?.id} companyId={company.id} />
            </div>
          )}
        </SheetHeader>
        <div className="mt-5 space-y-5">
          <section className="grid max-w-xl gap-3">
            <Field label="Nazwa firmy *">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="NIP *">
              <Input value={nip} onChange={(e) => setNip(e.target.value)} />
            </Field>
            <Field label="Telefon">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="E-mail">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Strona internetowa">
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </Field>
            <Field label="Adres">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="Miasto">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="Kod pocztowy">
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </Field>
          </section>

          <details className="max-w-xl rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold">Dane rejestrowe</summary>
            <div className="mt-4 grid gap-3">
            <Field label="REGON">
              <Input value={regon} onChange={(e) => setRegon(e.target.value)} />
            </Field>
            <Field label="KRS">
              <Input value={krs} onChange={(e) => setKrs(e.target.value)} />
            </Field>
            <Field label="Forma prawna">
              <select
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value)}
                className="border-border bg-muted h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Wybierz</option>
                <option>Jednoosobowa działalność</option>
                <option>Spółka cywilna</option>
                <option>Spółka z o.o.</option>
                <option>Inna</option>
              </select>
            </Field>
            <Field label="Forma księgowości">
              <select
                value={accountingType}
                onChange={(e) => setAccountingType(e.target.value)}
                className="border-border bg-muted h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Wybierz</option>
                <option>KPiR</option>
                <option>Ryczałt</option>
                <option>Pełna księgowość</option>
                <option>Karta podatkowa</option>
              </select>
            </Field>
            <Field label="PKD">
              <Input value={pkd} onChange={(e) => setPkd(e.target.value)} />
            </Field>
            <Field label="Data rozpoczęcia działalności">
              <Input
                type="date"
                value={businessStartedOn}
                onChange={(e) => setBusinessStartedOn(e.target.value)}
              />
            </Field>
            </div>
          </details>
          <details className="max-w-xl rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold">Informacje dodatkowe</summary>
            <div className="mt-4 space-y-3">
          <Field label="Opis firmy">
            <VoiceTextarea
              value={description}
              onChange={setDescription}
              placeholder="Stałe informacje dotyczące firmy"
            />
          </Field>
          <Field label="Notatka">
            <VoiceTextarea value={notes} onChange={setNotes} />
          </Field>
          <Field label="Folder dokumentów na Google Drive">
            <Input
              type="url"
              value={driveFolderUrl}
              onChange={(e) => setDriveFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </Field>
            </div>
          </details>
          <Button
            onClick={saveCompany}
            disabled={!canEdit || saving}
            className="w-full max-w-xl"
          >
            {saving && <Loader2 className="size-4 animate-spin" />} Zapisz firmę
          </Button>

          {company && accountId && (
            <section className="border-border space-y-3 border-t pt-5">
              <h3 className="font-medium">Tagi firmy</h3>
              <EntityTagsEditor
                accountId={accountId}
                entityType="company"
                entityId={company.id}
              />
            </section>
          )}

          {company && (
            <>
              <section className="border-border space-y-3 border-t pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Users className="size-4" /> Kontakty w firmie
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewContact((value) => !value)}
                  >
                    <Plus className="size-4" />
                    Nowy Kontakt
                  </Button>
                </div>
                {linkedContacts.map((link) => (
                  <div
                    key={link.contact_id}
                    className="border-border flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {link.contact?.name || link.contact?.phone}
                      </p>
                      {link.role && (
                        <p className="text-muted-foreground text-xs">
                          {link.role}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkContact(link.contact_id)}
                      disabled={!canEdit}
                    >
                      Odłącz
                    </Button>
                  </div>
                ))}
                {linkedContacts.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Brak przypisanych Kontaktów.
                  </p>
                )}
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <EntitySearchSelect
                    value={contactId}
                    onChange={setContactId}
                    placeholder="Wyszukaj Kontakt"
                    options={contacts
                      .filter(
                        (contact) =>
                          !linkedContacts.some(
                            (link) => link.contact_id === contact.id
                          )
                      )
                      .map((contact) => ({
                        value: contact.id,
                        label: contact.name || contact.phone,
                        keywords: [contact.phone, contact.email, contact.pesel]
                          .filter(Boolean)
                          .join(' '),
                      }))}
                    onAdd={() => setShowNewContact((value) => !value)}
                    addLabel="Dodaj nowy Kontakt"
                  />
                  <Input
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="Rola, np. właściciel"
                  />
                  <Button
                    onClick={linkContact}
                    disabled={!canEdit || !contactId}
                  >
                    Przypisz
                  </Button>
                </div>
                {showNewContact && (
                  <div className="bg-muted/40 grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
                    <Input
                      value={newContactFirstName}
                      onChange={(e) => setNewContactFirstName(e.target.value)}
                      placeholder="Imię"
                    />
                    <Input
                      value={newContactLastName}
                      onChange={(e) => setNewContactLastName(e.target.value)}
                      placeholder="Nazwisko"
                    />
                    <Input
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="Telefon *"
                    />
                    <Button
                      className="sm:col-span-3"
                      onClick={createAndLinkContact}
                    >
                      Dodaj i powiąż Kontakt
                    </Button>
                  </div>
                )}
              </section>

              <section className="border-border space-y-3 border-t pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Deale firmy</h3>
                  <Button
                    size="sm"
                    render={
                      <Link
                        href={`/pipelines?new=deal&company=${company.id}`}
                      />
                    }
                  >
                    <Plus className="size-4" />
                    Nowy Deal
                  </Button>
                </div>
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="border-border rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {deal.stage?.name ?? 'Bez etapu'}
                    </p>
                  </Link>
                ))}
                {deals.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Brak Deali powiązanych z firmą.
                  </p>
                )}
              </section>
            </>
          )}
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
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}


