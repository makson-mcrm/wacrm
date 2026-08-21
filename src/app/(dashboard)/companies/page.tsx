'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import type { Company, Contact, Deal } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { EntityTagsEditor } from '@/components/tags/entity-tags-editor';
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
  const supabase = createClient();
  const { accountId } = useAuth();
  const canEdit = useCan('send-messages');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);

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

  function openNew() {
    setSelected(null);
    setSheetOpen(true);
  }

  function openCompany(company: Company) {
    setSelected(company);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Firmy</h1>
          <p className="text-muted-foreground text-sm">
            Kartoteka firm powiązana z Kontaktami i Dealami.
          </p>
        </div>
        <Button onClick={openNew} disabled={!canEdit}>
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
        onSaved={loadCompanies}
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  accountId: string | null;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const supabase = createClient();
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

  const loadRelations = useCallback(async () => {
    if (!company) {
      setLinkedContacts([]);
      setDeals([]);
      return;
    }
    const [links, companyDeals] = await Promise.all([
      supabase
        .from('contact_companies')
        .select('contact_id, role, is_primary, contact:contacts(*)')
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
    setRegon(company?.regon ?? ''); setKrs(company?.krs ?? '');
    setLegalForm(company?.legal_form ?? ''); setPkd(company?.pkd ?? '');
    setAccountingType(company?.accounting_type ?? ''); setAddress(company?.address ?? '');
    setPostalCode(company?.postal_code ?? ''); setCity(company?.city ?? '');
    setWebsite(company?.website ?? ''); setBusinessStartedOn(company?.business_started_on ?? '');
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
    setSaving(true);
    const payload = {
      name: name.trim(),
      nip: nip.trim() || null,
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
      ({ error } = await supabase.from('companies').insert({
        ...payload,
        account_id: accountId,
        user_id: session.user.id,
      }));
    }
    setSaving(false);
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Firma o takim NIP już istnieje.'
          : 'Nie udało się zapisać firmy.'
      );
      return;
    }
    toast.success(
      company ? 'Firma została zaktualizowana.' : 'Firma została utworzona.'
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {company ? `Firma: ${company.name}` : 'Nowa firma'}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nazwa firmy *">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="NIP">
              <Input value={nip} onChange={(e) => setNip(e.target.value)} />
            </Field>
            <Field label="Telefon">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="E-mail">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="REGON"><Input value={regon} onChange={(e) => setRegon(e.target.value)} /></Field>
            <Field label="KRS"><Input value={krs} onChange={(e) => setKrs(e.target.value)} /></Field>
            <Field label="Forma prawna"><select value={legalForm} onChange={(e) => setLegalForm(e.target.value)} className="border-border bg-muted h-9 w-full rounded-md border px-3 text-sm"><option value="">Wybierz</option><option>Jednoosobowa działalność</option><option>Spółka cywilna</option><option>Spółka z o.o.</option><option>Inna</option></select></Field>
            <Field label="Forma księgowości"><select value={accountingType} onChange={(e) => setAccountingType(e.target.value)} className="border-border bg-muted h-9 w-full rounded-md border px-3 text-sm"><option value="">Wybierz</option><option>KPiR</option><option>Ryczałt</option><option>Pełna księgowość</option><option>Karta podatkowa</option></select></Field>
            <Field label="PKD"><Input value={pkd} onChange={(e) => setPkd(e.target.value)} /></Field>
            <Field label="Data rozpoczęcia działalności"><Input type="date" value={businessStartedOn} onChange={(e) => setBusinessStartedOn(e.target.value)} /></Field>
            <Field label="Strona internetowa"><Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr]"><Field label="Adres"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field><Field label="Kod"><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></Field><Field label="Miasto"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field></div>
          <Field label="Opis firmy">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Stałe informacje dotyczące firmy" />
          </Field>
          <Field label="Notatka">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field label="Folder dokumentów na Google Drive">
            <Input type="url" value={driveFolderUrl} onChange={(e) => setDriveFolderUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
          </Field>
          <Button
            onClick={saveCompany}
            disabled={!canEdit || saving}
            className="w-full"
          >
            {saving && <Loader2 className="size-4 animate-spin" />} Zapisz firmę
          </Button>

          {company && accountId && (
            <section className="border-border space-y-3 border-t pt-5">
              <h3 className="font-medium">Tagi firmy</h3>
              <EntityTagsEditor accountId={accountId} entityType="company" entityId={company.id} />
            </section>
          )}

          {company && (
            <>
              <section className="border-border space-y-3 border-t pt-5">
                <h3 className="flex items-center gap-2 font-medium">
                  <Users className="size-4" /> Kontakty w firmie
                </h3>
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
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="border-border bg-muted h-9 rounded-lg border px-3 text-sm"
                  >
                    <option value="">Wybierz Kontakt</option>
                    {contacts
                      .filter(
                        (c) =>
                          !linkedContacts.some(
                            (link) => link.contact_id === c.id
                          )
                      )
                      .map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name || contact.phone}
                        </option>
                      ))}
                  </select>
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
              </section>

              <section className="border-border space-y-3 border-t pt-5">
                <h3 className="font-medium">Deale firmy</h3>
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
