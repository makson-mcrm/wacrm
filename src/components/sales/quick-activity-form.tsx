'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarPlus,
  Check,
  FilePlus2,
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
import { MobileDateTimeInput } from '@/components/ui/mobile-date-time-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Company, Contact, Deal } from '@/types';
import { warsawDateTimeInputToIso } from '@/lib/date-time';
import {
  activityTypeForDb,
  normalizeActivityPhone,
  suggestedRetryAt,
  toLocalDateTimeValue,
  type ActivityStatus,
  type ActivityType,
  type ObjectiveType,
} from '@/lib/sales/quick-activity';
import { parseCrmPhone } from '@/lib/contacts/phone';
import { CallAction } from '@/components/sales/call-action';
import { SmsAction } from '@/components/sales/sms-action';

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

function contactName(contact: Contact | undefined) {
  if (!contact) return '';
  return (
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.phone ||
    'Kontakt'
  );
}

function scrollToSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const [nextActionDate, setNextActionDate] = useState('');
  const [blocker, setBlocker] = useState('');
  const [contactDialog, setContactDialog] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [contactRows, companyRows, dealRows, companyLinkRows, dealLinkRows] =
      await Promise.all([
        db
          .from('contacts')
          .select('*')
          .eq('account_id', accountId)
          .order('name'),
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
      companyLinkRows,
      dealLinkRows,
    ].find((response) => response.error)?.error;
    if (firstError)
      toast.error(`Nie udało się wczytać klientów: ${firstError.message}`);
    setContacts((contactRows.data ?? []) as Contact[]);
    setCompanies((companyRows.data ?? []) as Company[]);
    setDeals((dealRows.data ?? []) as Deal[]);
    setContactCompanyLinks(
      (companyLinkRows.data ?? []) as ContactCompanyLink[]
    );
    setDealContactLinks((dealLinkRows.data ?? []) as DealContactLink[]);
    setLoading(false);
  }, [accountId, db]);

  useEffect(() => void load(), [load]);

  function chooseContact(contact: Contact) {
    setContactId(contact.id);
    setPhone(contact.phone ?? '');
    setQuery('');
    const companyLink =
      contactCompanyLinks.find(
        (row) => row.contact_id === contact.id && row.is_primary
      ) ?? contactCompanyLinks.find((row) => row.contact_id === contact.id);
    const directDeal = deals.find((row) => row.contact_id === contact.id);
    const dealLink =
      dealContactLinks.find(
        (row) => row.contact_id === contact.id && row.is_primary
      ) ?? dealContactLinks.find((row) => row.contact_id === contact.id);
    const linkedDeal =
      directDeal ?? deals.find((row) => row.id === dealLink?.deal_id);
    setCompanyId(linkedDeal?.company_id ?? companyLink?.company_id ?? '');
    setDealId(linkedDeal?.id ?? '');
    setBlocker(linkedDeal?.blocker ?? '');
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
    const deal = deals.find(
      (row) =>
        row.company_id === company.id &&
        (!contact || row.contact_id === contact.id)
    );
    setCompanyId(company.id);
    setDealId(deal?.id ?? '');
    setBlocker(deal?.blocker ?? '');
    setContactId(contact?.id ?? '');
    setPhone(contact?.phone ?? company.phone ?? '');
    setQuery('');
  }

  function chooseDeal(deal: Deal) {
    const dealLink =
      dealContactLinks.find(
        (row) => row.deal_id === deal.id && row.is_primary
      ) ?? dealContactLinks.find((row) => row.deal_id === deal.id);
    const contact = contacts.find(
      (row) => row.id === (deal.contact_id || dealLink?.contact_id)
    );
    setDealId(deal.id);
    setCompanyId(deal.company_id ?? '');
    setBlocker(deal.blocker ?? '');
    setContactId(contact?.id ?? '');
    setPhone(contact?.phone ?? '');
    setQuery('');
  }

  useEffect(() => {
    if (
      loading ||
      restoredCall.current ||
      searchParams.get('afterCall') !== '1'
    )
      return;
    const contact = contacts.find(
      (row) => row.id === searchParams.get('contact')
    );
    if (contact) chooseContact(contact);
    const restoredCompany = searchParams.get('company');
    const restoredDeal = searchParams.get('deal');
    if (restoredCompany) setCompanyId(restoredCompany);
    if (restoredDeal) {
      setDealId(restoredDeal);
      setBlocker(deals.find((row) => row.id === restoredDeal)?.blocker ?? '');
    }
    setType('TELEFON');
    setStatus('WYKONANE');
    restoredCall.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, contacts, deals, searchParams]);

  const selectedContact = contacts.find((row) => row.id === contactId);
  const selectedCompany = companies.find((row) => row.id === companyId);
  const selectedDeal = deals.find((row) => row.id === dealId);

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
        subtitle: 'Deal',
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
    setQuery('');
  }

  function selectOutcome(value: (typeof OUTCOMES)[number]['value']) {
    setType('TELEFON');
    setStatus('WYKONANE');
    setResult(value);
    if (value === 'nie_odebral') {
      setNextAction((current) => current || 'Ponowić telefon');
      setNextActionDate(
        (current) =>
          current || toLocalDateTimeValue(suggestedRetryAt(1) ?? new Date())
      );
    }
    if (value === 'oddzwonic') {
      setNextAction((current) => current || 'Oddzwonić');
      setNextActionDate((current) => {
        if (current) return current;
        return toLocalDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000));
      });
    }
    window.setTimeout(() => scrollToSection('mcrm-dictation'), 0);
  }

  function prepareMeeting() {
    setType('SPOTKANIE');
    setStatus('PLANOWANE');
    setResult('');
    setNextAction((current) => current || 'Spotkanie');
    scrollToSection('mcrm-confirmation');
  }

  function prepareDictation() {
    if (!result) setType('INNY_KONTAKT');
    setStatus('WYKONANE');
    scrollToSection('mcrm-dictation');
  }

  function openDocuments() {
    if (!dealId)
      return toast.info('Wybierz klienta z Dealem, aby dodać dokument.');
    router.push(`/deals/${dealId}`);
  }

  async function createContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) return;
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('first_name') ?? '').trim();
    const lastName = String(form.get('last_name') ?? '').trim();
    const submittedPhone = String(form.get('phone') ?? '').trim();
    const parsedPhone = parseCrmPhone(submittedPhone);
    if (!parsedPhone.valid || (!firstName && !lastName)) {
      toast.error(
        !parsedPhone.valid
          ? parsedPhone.reason
          : 'Podaj numer telefonu oraz imię lub nazwisko.'
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
      })
      .select('*')
      .single();
    if (error) return toast.error(`Nie zapisano Kontaktu: ${error.message}`);
    const contact = data as Contact;
    setContacts((rows) => [...rows, contact]);
    chooseContact(contact);
    setContactDialog(false);
    toast.success('Kontakt został dodany i wybrany.');
  }

  async function saveActivity() {
    if (!accountId || saving) return;
    if (!contactId)
      return toast.error(
        'Wybierz istniejącego klienta albo dodaj nowy Kontakt.'
      );
    if (type === 'TELEFON' && !result)
      return toast.error('Wybierz wynik rozmowy.');
    if (status === 'PLANOWANE' && !nextActionDate)
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
      const scheduledIso = nextActionDate
        ? warsawDateTimeInputToIso(nextActionDate)
        : null;
      const nowIso = new Date().toISOString();
      const description = [
        note.trim(),
        blocker.trim() && !dealId ? `Bloker: ${blocker.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      const { error } = await db.from('sales_activities').insert({
        account_id: accountId,
        user_id: session.user.id,
        activity_type: activityTypeForDb(type),
        activity_status: status,
        objective_type: DEFAULT_OBJECTIVE,
        contact_id: contactId,
        company_id: companyId || null,
        deal_id: dealId || null,
        phone_number: number || null,
        title: `${type.replaceAll('_', ' ')} — ${contactName(selectedContact)}`,
        description: description || nextAction.trim() || null,
        occurred_at: status === 'WYKONANE' ? nowIso : (scheduledIso ?? nowIso),
        scheduled_at: status === 'PLANOWANE' ? scheduledIso : null,
        completed_at: status === 'WYKONANE' ? nowIso : null,
        completed: status === 'WYKONANE',
        call_result: type === 'TELEFON' ? result : null,
        call_type: 'nowe_pozyskanie',
        next_action: nextAction.trim() || null,
        next_action_date: scheduledIso,
        next_contact_at: scheduledIso,
        next_contact_reason: nextAction.trim() || note.trim() || null,
        attempt_number: type === 'TELEFON' ? Math.min(attemptNumber, 3) : null,
        expires_at:
          type === 'TELEFON' && result === 'nie_odebral' && attemptNumber < 3
            ? new Date(Date.now() + 30 * 86400000).toISOString()
            : null,
      });
      if (error) throw error;
      if (
        dealId &&
        (nextAction.trim() ||
          scheduledIso ||
          blocker.trim() !== (selectedDeal?.blocker ?? ''))
      ) {
        const updates: Record<string, string | null> = {};
        if (nextAction.trim()) updates.next_action = nextAction.trim();
        if (scheduledIso) updates.next_action_at = scheduledIso;
        updates.blocker = blocker.trim() || null;
        updates.blocker_since = blocker.trim()
          ? selectedDeal?.blocker_since || nowIso
          : null;
        const { error: dealError } = await db
          .from('deals')
          .update(updates)
          .eq('id', dealId);
        if (dealError) throw dealError;
      }
      toast.success('Aktywność zapisana. Wracasz do DZISIAJ.');
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
    <div className="mx-auto max-w-2xl space-y-4 pb-24 text-slate-950 lg:pb-6">
      <header className="rounded-[1.75rem] bg-[#123d2b] px-5 py-6 text-white shadow-sm">
        <p className="text-xs font-black tracking-[0.22em] text-lime-300 uppercase">
          mCRM AI
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">AKTYWNOŚĆ</h1>
        <p className="mt-2 max-w-md text-sm leading-5 text-emerald-50/90">
          Wyszukaj klienta, wykonaj akcję i zapisz tylko to, co ważne.
        </p>
      </header>

      <section className="rounded-[1.5rem] border border-emerald-950/10 bg-white p-3 shadow-sm">
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
            className="h-14 rounded-2xl border-0 bg-[#f2f6f1] pr-11 pl-12 text-base shadow-none focus-visible:ring-2 focus-visible:ring-emerald-800"
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
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
            {searchMatches.map((match) => (
              <button
                type="button"
                key={`${match.kind}-${match.id}`}
                onClick={() => chooseMatch(match)}
                className="flex min-h-14 w-full items-center gap-3 border-b border-slate-100 px-3 text-left last:border-0 hover:bg-emerald-50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-950">
                  <UserRound className="size-4" />
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

      {selectedContact ? (
        <section className="flex items-start gap-3 rounded-[1.5rem] bg-emerald-50 p-4 ring-1 ring-emerald-900/10">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#123d2b] text-lime-300">
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
              {[
                selectedContact.phone,
                selectedCompany?.name,
                selectedDeal?.title,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Wybierz innego klienta"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-500"
          >
            <X className="size-5" />
          </button>
        </section>
      ) : (
        <p className="px-2 text-center text-sm text-slate-500">
          Najpierw wybierz klienta.
        </p>
      )}

      <section aria-label="Szybkie akcje" className="grid grid-cols-2 gap-2">
        {phone && contactId ? (
          <CallAction
            phone={phone}
            contactId={contactId}
            companyId={companyId}
            dealId={dealId}
            size="lg"
            className="h-16 rounded-2xl border-0 bg-[#123d2b] text-base font-black text-lime-300 hover:bg-[#0b2d1f]"
          />
        ) : (
          <Button disabled className="h-16 rounded-2xl text-base font-black">
            <Phone className="size-5" /> ZADZWOŃ
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={!contactId}
          onClick={prepareDictation}
          className="h-16 rounded-2xl border-emerald-900/20 bg-white text-base font-black text-emerald-950"
        >
          <Mic className="size-5" /> DYKTUJ
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!contactId}
          onClick={prepareMeeting}
          className="h-16 rounded-2xl border-emerald-900/20 bg-white text-base font-black text-emerald-950"
        >
          <CalendarPlus className="size-5" /> UMÓW
        </Button>
        <div className="[&>button]:h-16 [&>button]:w-full [&>button]:rounded-2xl [&>button]:border-emerald-900/20 [&>button]:bg-white [&>button]:text-base [&>button]:font-black [&>button]:text-emerald-950">
          {phone && contactId ? (
            <SmsAction
              phone={phone}
              contactName={contactName(selectedContact)}
              contactId={contactId}
              companyId={companyId}
              dealId={dealId}
              size="lg"
              label="WIADOMOŚĆ"
            />
          ) : (
            <Button
              disabled
              variant="outline"
              className="h-16 w-full rounded-2xl"
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
          className="col-span-2 h-14 rounded-2xl border-emerald-900/20 bg-white text-sm font-black text-emerald-950"
        >
          <FilePlus2 className="size-5" /> DODAJ DOKUMENT
        </Button>
      </section>

      {contactId && (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black tracking-[0.16em] text-slate-500 uppercase">
            Wynik rozmowy
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {OUTCOMES.map((outcome) => (
              <button
                type="button"
                key={outcome.value}
                onClick={() => selectOutcome(outcome.value)}
                className={`min-h-16 rounded-2xl px-2 text-xs font-black transition ${result === outcome.value ? 'bg-lime-300 text-emerald-950 ring-2 ring-emerald-900' : 'bg-slate-100 text-slate-700'}`}
              >
                {outcome.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        id="mcrm-dictation"
        className="rounded-[1.5rem] bg-[#123d2b] p-4 text-white shadow-sm"
      >
        <Label className="text-xs font-black tracking-[0.16em] text-lime-300 uppercase">
          Notatka
        </Label>
        <div className="mt-2 [&_button]:h-14 [&_button]:w-full [&_button]:rounded-2xl [&_button]:border-0 [&_button]:bg-lime-300 [&_button]:text-base [&_button]:font-black [&_button]:text-emerald-950 [&_textarea]:min-h-32 [&_textarea]:rounded-2xl [&_textarea]:border-0 [&_textarea]:bg-white [&_textarea]:text-base [&_textarea]:text-slate-950">
          <VoiceTextarea
            value={note}
            onChange={setNote}
            placeholder="Powiedz lub wpisz, co ustaliliście…"
          />
        </div>
      </section>

      <section
        id="mcrm-confirmation"
        className="space-y-4 rounded-[1.5rem] border border-emerald-950/10 bg-white p-4 shadow-sm"
      >
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-emerald-800 uppercase">
            Minimum do potwierdzenia
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Tylko trzy rzeczy przed zapisem.
          </p>
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
          <Label>Termin</Label>
          <div className="mt-1">
            <MobileDateTimeInput
              value={nextActionDate}
              onChange={setNextActionDate}
            />
          </div>
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

      <Button
        type="button"
        onClick={saveActivity}
        disabled={saving || loading || !contactId}
        className="h-16 w-full rounded-2xl bg-[#123d2b] text-lg font-black text-lime-300 shadow-lg hover:bg-[#0b2d1f]"
      >
        {saving ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Save className="size-5" />
        )}
        {saving ? 'ZAPISUJĘ…' : 'ZAPIS'}
      </Button>

      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-[1.5rem]">
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
            <Button type="submit" className="h-12 w-full rounded-xl">
              Zapisz i wybierz
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
