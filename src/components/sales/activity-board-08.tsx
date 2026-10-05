'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarPlus,
  CheckSquare,
  FilePlus2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { CallAction } from '@/components/sales/call-action';
import type { Contact, Deal, PipelineStage } from '@/types';
import {
  formatWarsawDateTime,
  toWarsawDateTimeInput,
  warsawDateTimeInputToIso,
} from '@/lib/date-time';
import {
  activityContextReturnPath,
  buildContactActivityUpdate,
  buildDealActivityUpdate,
  normalizeActivityPhone,
} from '@/lib/sales/quick-activity';

type ActionKind =
  'TELEFON' | 'SPOTKANIE' | 'EMAIL' | 'WIADOMOSC' | 'INNY_KONTAKT';
type ActivityRow = {
  id: string;
  title: string;
  occurred_at: string;
  activity_type: string;
  description?: string | null;
  call_result?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  blocker?: string | null;
  activity_status?: string | null;
  scheduled_at?: string | null;
};

type DocumentRow = {
  id: string;
  name: string;
  document_type?: string | null;
  received_at: string;
};

type ActivityView = 'new' | 'history' | 'documents' | 'tasks';

const ACTIVITY_08_DEMO_ACCOUNT_ID = '00000000-0000-4000-8000-000000000008';
const ACTIVITY_08_DEMO_CONTACT: Contact = {
  id: '00000000-0000-4000-8000-000000000108',
  user_id: '00000000-0000-4000-8000-000000000208',
  account_id: ACTIVITY_08_DEMO_ACCOUNT_ID,
  name: 'Tomasz Skowroński',
  phone: '+48 537 357 757',
  company: 'KOLOR-MET TOMASZ Sp. z o.o.',
  email: 'test-aktywnosc08@example.invalid',
  source: 'Test roboczy 08',
  product_category: 'NML — OFF',
  created_at: '2026-09-01T08:00:00.000Z',
  updated_at: '2026-09-26T20:00:00.000Z',
};
const ACTIVITY_08_DEMO_DEAL: Deal = {
  id: '00000000-0000-4000-8000-000000000308',
  user_id: ACTIVITY_08_DEMO_CONTACT.user_id,
  pipeline_id: '00000000-0000-4000-8000-000000000408',
  stage_id: '00000000-0000-4000-8000-000000000508',
  contact_id: ACTIVITY_08_DEMO_CONTACT.id,
  title: 'KONSOLA prywatna',
  value: 460000,
  currency: 'PLN',
  product_type: 'NML — OFF',
  source: 'Test roboczy 08',
  tracking_number: 'DEAL-2026-017',
  status: 'open',
  created_at: '2026-09-01T08:00:00.000Z',
  updated_at: '2026-09-26T20:00:00.000Z',
};
const ACTIVITY_08_DEMO_HISTORY: ActivityRow[] = [
  {
    id: 'demo-history-1',
    title: 'Spotkanie online — wnioski',
    occurred_at: '2026-09-10T08:00:00.000Z',
    activity_type: 'spotkanie',
  },
  {
    id: 'demo-history-2',
    title: 'Wysłano ofertę',
    occurred_at: '2026-09-08T08:00:00.000Z',
    activity_type: 'wiadomosc',
  },
  {
    id: 'demo-history-3',
    title: 'Rozmowa telefoniczna',
    occurred_at: '2026-09-05T08:00:00.000Z',
    activity_type: 'telefon',
  },
  {
    id: 'demo-history-4',
    title: 'Notatka — analiza zgodności',
    occurred_at: '2026-09-02T08:00:00.000Z',
    activity_type: 'notatka',
  },
  {
    id: 'demo-history-5',
    title: 'Dodano dokument wyciąg.pdf',
    occurred_at: '2026-08-28T08:00:00.000Z',
    activity_type: 'dokument',
  },
];
const ACTIVITY_08_DEMO_STAGE: PipelineStage = {
  id: ACTIVITY_08_DEMO_DEAL.stage_id,
  pipeline_id: ACTIVITY_08_DEMO_DEAL.pipeline_id,
  name: '5. WNIOSKI / DECYZJA',
  position: 5,
  color: '#047857',
  created_at: '2026-09-01T08:00:00.000Z',
};

const OUTCOMES = [
  ['odebral', 'Odebrał'],
  ['nie_odebral', 'Nie odebrał'],
  ['oddzwonic', 'Oddzwonić'],
] as const;

const RECENT_ACTIVITIES_LABEL = 'Ostatnie aktywności w tym dealu';

function contactName(contact?: Contact | null) {
  if (!contact) return '';
  return (
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.phone ||
    'Kontakt'
  );
}

function actionDbType(action: ActionKind) {
  if (action === 'EMAIL') return 'wiadomosc';
  return action.toLocaleLowerCase('pl');
}

export function ActivityBoard08({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useMemo(() => createClient(), []);
  const { accountId: authenticatedAccountId } = useAuth();
  const accountId = demo ? ACTIVITY_08_DEMO_ACCOUNT_ID : authenticatedAccountId;
  const [contacts, setContacts] = useState<Contact[]>(
    demo ? [ACTIVITY_08_DEMO_CONTACT] : []
  );
  const [deals, setDeals] = useState<Deal[]>(
    demo ? [ACTIVITY_08_DEMO_DEAL] : []
  );
  const [stages, setStages] = useState<PipelineStage[]>(
    demo ? [ACTIVITY_08_DEMO_STAGE] : []
  );
  const [activities, setActivities] = useState<ActivityRow[]>(
    demo ? ACTIVITY_08_DEMO_HISTORY : []
  );
  const [fullActivities, setFullActivities] = useState<ActivityRow[]>(
    demo ? ACTIVITY_08_DEMO_HISTORY : []
  );
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [activeView, setActiveView] = useState<ActivityView>('new');
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState(
    demo ? ACTIVITY_08_DEMO_CONTACT.id : ''
  );
  const [dealId, setDealId] = useState(demo ? ACTIVITY_08_DEMO_DEAL.id : '');
  const [action, setAction] = useState<ActionKind>('TELEFON');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [showOccurredAt, setShowOccurredAt] = useState(false);
  const [blocker, setBlocker] = useState('');
  const [stageId, setStageId] = useState(demo ? ACTIVITY_08_DEMO_STAGE.id : '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creatingContact, setCreatingContact] = useState(false);
  const [createTask, setCreateTask] = useState(false);
  const [emailCopy, setEmailCopy] = useState(false);

  const selectedContact = contacts.find((row) => row.id === contactId) ?? null;
  const selectedDeal = deals.find((row) => row.id === dealId) ?? null;
  const contactDeals = selectedContact
    ? deals.filter(
        (deal) =>
          deal.contact_id === selectedContact.id && deal.status === 'open'
      )
    : [];
  const rawPhone = /^\+?[\d\s()-]{3,}$/.test(query.trim()) ? query.trim() : '';

  const load = useCallback(async () => {
    if (demo) return;
    if (!accountId) return;
    const [contactRows, dealRows, stageRows] = await Promise.all([
      db.from('contacts').select('*').eq('account_id', accountId).order('name'),
      db
        .from('deals')
        .select('*')
        .eq('account_id', accountId)
        .order('updated_at', { ascending: false }),
      db.from('pipeline_stages').select('*').order('position'),
    ]);
    const error = contactRows.error || dealRows.error || stageRows.error;
    if (error)
      return toast.error(`Nie udało się wczytać AKTYWNOŚCI: ${error.message}`);
    setContacts((contactRows.data ?? []) as Contact[]);
    setDeals((dealRows.data ?? []) as Deal[]);
    setStages((stageRows.data ?? []) as PipelineStage[]);
  }, [accountId, db, demo]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    if (demo) return;
    const requestedDealId = searchParams.get('deal');
    const requestedContactId = searchParams.get('contact');
    const requestedAction = searchParams.get('action');
    if (requestedAction === 'message') setAction('WIADOMOSC');
    if (requestedAction === 'call') setAction('TELEFON');
    if (requestedAction === 'meeting') setAction('SPOTKANIE');
    if (requestedAction === 'document') setAction('INNY_KONTAKT');

    if (requestedDealId) {
      const requestedDeal = deals.find((deal) => deal.id === requestedDealId);
      if (requestedDeal) {
        setDealId(requestedDeal.id);
        if (requestedDeal.contact_id) setContactId(requestedDeal.contact_id);
        return;
      }
    }
    if (
      requestedContactId &&
      contacts.some((contact) => contact.id === requestedContactId)
    ) {
      const active = deals.filter(
        (deal) =>
          deal.contact_id === requestedContactId && deal.status === 'open'
      );
      setContactId(requestedContactId);
      setDealId(active.length === 1 ? active[0].id : '');
      setQuery('');
    }
  }, [contacts, deals, demo, searchParams]);

  useEffect(() => {
    if (demo) {
      void fetch('/api/activity08-demo')
        .then((response) => (response.ok ? response.json() : null))
        .then((saved: ActivityRow[] | null) => {
          const rows = saved ?? ACTIVITY_08_DEMO_HISTORY;
          setFullActivities(rows);
          setActivities(rows.slice(0, 5));
        })
        .catch(() => {
          setFullActivities(ACTIVITY_08_DEMO_HISTORY);
          setActivities(ACTIVITY_08_DEMO_HISTORY);
        });
      return;
    }
    if (!accountId || (!dealId && !contactId)) {
      setActivities([]);
      setFullActivities([]);
      setDocuments([]);
      return;
    }
    let activityRequest = db
      .from('sales_activities')
      .select(
        'id,title,occurred_at,activity_type,activity_status,scheduled_at,description,call_result,next_action,next_action_date'
      )
      .eq('account_id', accountId)
      .order('occurred_at', { ascending: false });
    activityRequest = dealId
      ? activityRequest.eq('deal_id', dealId)
      : activityRequest.eq('contact_id', contactId);
    const documentRequest = dealId
      ? db
          .from('deal_documents')
          .select('id,name,document_type,received_at')
          .eq('account_id', accountId)
          .eq('deal_id', dealId)
          .order('received_at', { ascending: false })
      : Promise.resolve({ data: [] });
    void Promise.all([activityRequest, documentRequest]).then(
      ([activityRows, documentRows]) => {
        const rows = (activityRows.data ?? []) as ActivityRow[];
        setFullActivities(rows);
        setActivities(rows.slice(0, 5));
        setDocuments((documentRows.data ?? []) as DocumentRow[]);
      }
    );
  }, [accountId, contactId, db, dealId, demo]);

  useEffect(() => {
    if (!selectedDeal) {
      setStageId('');
      setBlocker('');
      return;
    }
    setStageId(selectedDeal.stage_id);
    setBlocker(selectedDeal.blocker || '');
    setNextAction(selectedDeal.next_action || '');
    setNextAt(
      selectedDeal.next_action_at
        ? toWarsawDateTimeInput(selectedDeal.next_action_at)
        : ''
    );
  }, [selectedDeal]);

  const plannedTasks = fullActivities.filter(
    (row) =>
      row.activity_type === 'zadanie' && row.activity_status === 'PLANOWANE'
  );

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pl');
    const digits = normalizeActivityPhone(query);
    if (q.length < 3 && digits.length < 3) return [];
    const contactMatches = contacts
      .filter((contact) => {
        const hay =
          `${contactName(contact)} ${contact.phone || ''} ${contact.email || ''}`.toLocaleLowerCase(
            'pl'
          );
        return (
          hay.includes(q) ||
          (digits.length >= 3 &&
            normalizeActivityPhone(contact.phone || '').includes(digits))
        );
      })
      .slice(0, 5)
      .map((contact) => ({
        kind: 'contact' as const,
        id: contact.id,
        label: contactName(contact),
        sub: contact.phone || contact.email || 'Kontakt',
      }));
    const dealMatches = deals
      .filter((deal) => deal.title.toLocaleLowerCase('pl').includes(q))
      .slice(0, 4)
      .map((deal) => ({
        kind: 'deal' as const,
        id: deal.id,
        label: deal.title,
        sub:
          [deal.product_type, deal.source].filter(Boolean).join(' · ') ||
          'Deal',
      }));
    return [...contactMatches, ...dealMatches].slice(0, 8);
  }, [contacts, deals, query]);

  function chooseContact(id: string) {
    const contact = contacts.find((row) => row.id === id);
    if (!contact) return;
    const active = deals.filter(
      (deal) => deal.contact_id === id && deal.status === 'open'
    );
    setContactId(id);
    setDealId(active.length === 1 ? active[0].id : '');
    setQuery('');
  }

  function chooseDeal(id: string) {
    const deal = deals.find((row) => row.id === id);
    if (!deal) return;
    setDealId(id);
    if (deal.contact_id) setContactId(deal.contact_id);
    setQuery('');
  }

  async function createContactFromPhone() {
    const phoneToCreate = newPhone.trim() || rawPhone;
    if (!accountId || !newName.trim() || !phoneToCreate || creatingContact)
      return;
    const session = (await db.auth.getSession()).data.session;
    if (!session?.user) return;
    setCreatingContact(true);
    try {
      const { data, error } = await db
        .from('contacts')
        .insert({
          account_id: accountId,
          user_id: session.user.id,
          name: newName.trim(),
          phone: phoneToCreate,
        })
        .select('*')
        .single();
      if (error) throw error;
      const contact = data as Contact;
      setContacts((rows) => [...rows, contact]);
      setContactId(contact.id);
      setDealId('');
      setQuery('');
      setNewName('');
      setNewPhone('');
      toast.success('Kontakt utworzony. Możesz zapisać rozmowę.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Nie utworzono Kontaktu.'
      );
    } finally {
      setCreatingContact(false);
    }
  }

  async function uploadDocument(file: File) {
    if (!accountId || !selectedContact || uploading) return;
    const session = (await db.auth.getSession()).data.session;
    if (!session?.user) return;
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const ownerPath = dealId || `contacts/${selectedContact.id}`;
      const storagePath = `${accountId}/${ownerPath}/${crypto.randomUUID()}-${safe}`;
      const uploaded = await db.storage
        .from('deal-documents')
        .upload(storagePath, file);
      if (uploaded.error) throw uploaded.error;
      if (dealId) {
        const row = await db
          .from('deal_documents')
          .insert({
            account_id: accountId,
            deal_id: dealId,
            user_id: session.user.id,
            name: file.name,
            storage_path: storagePath,
            status: 'otrzymany',
            document_type: file.type || 'plik',
            received_at: new Date().toISOString(),
            source_channel: 'activity',
          })
          .select('id,name,document_type,received_at')
          .single();
        if (row.error) throw row.error;
        setDocuments((items) => [row.data as DocumentRow, ...items]);
      }
      toast.success('Dokument dodany.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Nie dodano dokumentu.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveActivity() {
    if (!accountId || !selectedContact || saving)
      return toast.error('Wybierz klienta.');
    if (contactDeals.length > 1 && !selectedDeal)
      return toast.error('Wybierz konkretny Deal.');
    if (action === 'TELEFON' && !result)
      return toast.error('Wybierz wynik rozmowy.');
    if (action === 'WIADOMOSC' && !note.trim())
      return toast.error('Wpisz treść wiadomości WhatsApp.');
    let whatsappSent = false;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const occurredIso = occurredAt
        ? warsawDateTimeInputToIso(occurredAt)
        : now;
      const nextIso = nextAt ? warsawDateTimeInputToIso(nextAt) : null;
      if (demo) {
        const row: ActivityRow = {
          id:
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `demo-${Date.now()}`,
          title: `${action.replaceAll('_', ' ')} — ${contactName(selectedContact)}`,
          occurred_at: occurredIso,
          activity_type: actionDbType(action),
          description: note.trim() || null,
          call_result: action === 'TELEFON' ? result : null,
          next_action: nextAction.trim() || null,
          next_action_date: nextIso,
          blocker: blocker.trim() || null,
        };
        const persistedRows = [row, ...activities].slice(0, 5);
        const response = await fetch('/api/activity08-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(persistedRows),
        });
        if (!response.ok) throw new Error('Nie zapisano testu roboczego.');
        setActivities(persistedRows);
        toast.success(
          'Aktywność testowa zapisana trwale w środowisku roboczym.'
        );
        return;
      }

      const session = (await db.auth.getSession()).data.session;
      if (!session?.user) return;
      if (action === 'WIADOMOSC') {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: selectedContact.id,
            deal_id: selectedDeal?.id || null,
            message_type: 'text',
            content_text: note.trim(),
            activity_occurred_at: occurredIso,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          history_saved?: boolean;
        };
        if (!response.ok) {
          throw new Error(payload.error || 'Nie wysłano wiadomości WhatsApp.');
        }
        whatsappSent = true;
        if (payload.history_saved === false) {
          toast.warning(
            'WhatsApp wysłany, ale zapis historii wymaga ponowienia przez system.'
          );
        }
      } else {
        const { error } = await db.from('sales_activities').insert({
          account_id: accountId,
          user_id: session.user.id,
          activity_type: actionDbType(action),
          activity_status: 'WYKONANE',
          objective_type: 'NOWE_POZYSKANIE',
          contact_id: selectedContact.id,
          company_id: selectedDeal?.company_id || null,
          deal_id: selectedDeal?.id || null,
          phone_number: selectedContact.phone || null,
          title: `${action.replaceAll('_', ' ')} — ${contactName(selectedContact)}`,
          description: note.trim() || null,
          occurred_at: occurredIso,
          completed_at: now,
          completed: true,
          call_result: action === 'TELEFON' ? result : null,
          call_channel:
            action === 'TELEFON'
              ? 'telefon'
              : action === 'SPOTKANIE'
                ? 'spotkanie'
                : action === 'EMAIL'
                  ? 'email'
                  : 'inny',
          source: selectedDeal?.source || selectedContact.source || null,
          product_group:
            selectedDeal?.product_type ||
            selectedContact.product_category ||
            null,
          next_action: nextAction.trim() || null,
          next_action_date: nextIso,
          next_contact_at: nextIso,
          next_contact_reason: nextAction.trim() || note.trim() || null,
        });
        if (error) throw error;
      }

      const contactUpdate = buildContactActivityUpdate({
        contactResult: action === 'TELEFON' ? result : 'WYKONANE',
        nextAction: nextAction.trim(),
        nextActionAt: nextIso,
      });
      contactUpdate.updated_at = now;
      const contactWrite = await db
        .from('contacts')
        .update(contactUpdate)
        .eq('account_id', accountId)
        .eq('id', selectedContact.id);
      if (contactWrite.error) throw contactWrite.error;

      if (selectedDeal) {
        const dealUpdate: Record<string, string | null> =
          buildDealActivityUpdate({
            nextAction: nextAction.trim(),
            nextActionAt: nextIso,
            blocker: blocker.trim(),
            blockerSince: selectedDeal.blocker_since || now,
          });
        dealUpdate.updated_at = now;
        dealUpdate.next_action_at = nextIso;
        if (stageId && stageId !== selectedDeal.stage_id)
          dealUpdate.stage_id = stageId;
        const dealWrite = await db
          .from('deals')
          .update(dealUpdate)
          .eq('account_id', accountId)
          .eq('id', selectedDeal.id);
        if (dealWrite.error) throw dealWrite.error;
      }

      if (createTask && nextAction.trim()) {
        const taskWrite = await db.from('sales_activities').insert({
          account_id: accountId,
          user_id: session.user.id,
          activity_type: 'zadanie',
          activity_status: 'PLANOWANE',
          contact_id: selectedContact.id,
          company_id: selectedDeal?.company_id || null,
          deal_id: selectedDeal?.id || null,
          title: nextAction.trim(),
          description: note.trim() || null,
          occurred_at: occurredIso,
          scheduled_at: nextIso,
          completed: false,
        });
        if (taskWrite.error) throw taskWrite.error;
      }

      if (emailCopy && selectedContact.email) {
        const subject = encodeURIComponent(
          selectedDeal ? `Podsumowanie — ${selectedDeal.title}` : 'Podsumowanie'
        );
        const body = encodeURIComponent(note.trim());
        window.open(
          `mailto:${encodeURIComponent(selectedContact.email)}?subject=${subject}&body=${body}`,
          '_blank',
          'noopener,noreferrer'
        );
      }
      if (emailCopy && !selectedContact.email) {
        toast.warning(
          'Klient nie ma adresu e-mail. Aktywność zapisano bez kopii e-mail.'
        );
      }

      toast.success(
        action === 'WIADOMOSC'
          ? 'Wiadomość WhatsApp wysłana i zapisana w historii.'
          : 'Aktywność zapisana.'
      );
      router.replace(
        activityContextReturnPath({
          contactId: selectedContact.id,
          dealId: selectedDeal?.id,
        })
      );
    } catch (error) {
      if (whatsappSent) {
        toast.warning(
          'WhatsApp został wysłany. Nie wysyłaj ponownie — system nie domknął danych kolejnego kroku.'
        );
        router.replace(
          activityContextReturnPath({
            contactId: selectedContact.id,
            dealId: selectedDeal?.id,
          })
        );
        return;
      }
      toast.error(
        error instanceof Error ? error.message : 'Nie zapisano aktywności.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function closeDeal(status: 'won' | 'lost') {
    if (!accountId || !selectedDeal) return;
    if (demo) {
      setDeals((rows) =>
        rows.map((row) =>
          row.id === selectedDeal.id ? { ...row, status } : row
        )
      );
      toast.success(
        status === 'won'
          ? 'Deal testowy zamknięty jako wygrany.'
          : 'Deal testowy zamknięty jako przegrany.'
      );
      return;
    }
    const { error } = await db
      .from('deals')
      .update({ status })
      .eq('account_id', accountId)
      .eq('id', selectedDeal.id);
    if (error) return toast.error(error.message);
    toast.success(
      status === 'won'
        ? 'Deal zamknięty jako wygrany.'
        : 'Deal zamknięty jako przegrany.'
    );
    await load();
  }

  return (
    <div
      className="mx-auto min-h-[calc(var(--app-viewport-height,100dvh)-6rem)] w-full max-w-[1480px] space-y-3 pb-[calc(5rem+env(safe-area-inset-bottom))] text-slate-950 lg:space-y-4 lg:pb-8"
      data-mobile-page="activity-08"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#071747]">
            Aktywność
          </h1>
          <p className="text-sm text-slate-700">
            Rozmawiaj, notuj i działaj szybciej
          </p>
        </div>
      </div>

      <div className="relative -mx-3 lg:mx-0">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#f5f8fb] to-transparent lg:hidden" />
        <div
          className="flex snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:#047857_#dbe5ea] gap-2 overflow-x-auto px-3 pr-12 pb-2 text-sm font-semibold lg:px-0 lg:pr-0"
          role="tablist"
          aria-label="Widoki aktywności"
        >
          {(
            [
              ['new', 'Nowa aktywność', 'Nowa'],
              ['history', 'Historia aktywności', 'Historia'],
              ['documents', 'Notatki i pliki', 'Notatki'],
              ['tasks', 'Zadania po rozmowie', 'Zadania'],
            ] as const
          ).map(([view, label, shortLabel]) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={activeView === view}
              onClick={() => setActiveView(view)}
              className={`min-h-10 shrink-0 snap-start rounded-lg border px-4 py-2 whitespace-nowrap ${
                activeView === view
                  ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span className="lg:hidden">{shortLabel}</span>
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute right-3 -bottom-3 z-20 rounded-full bg-white px-1.5 text-xs font-bold text-emerald-800 shadow-sm lg:hidden">
          przesuń zakładki →
        </span>
      </div>

      {activeView !== 'new' && (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          {!selectedContact ? (
            <p className="py-10 text-center text-sm text-slate-600">
              Wybierz klienta w zakładce „Nowa aktywność”, aby zobaczyć ten
              widok.
            </p>
          ) : activeView === 'history' ? (
            <div className="space-y-2">
              <h2 className="font-black text-[#0b1b55]">
                Pełna historia aktywności
              </h2>
              {!fullActivities.length ? (
                <p className="py-8 text-sm text-slate-600">
                  Brak zapisanych aktywności dla wybranego klienta lub deala.
                </p>
              ) : (
                fullActivities.map((row) => (
                  <article key={row.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold text-[#0b1b55]">
                        {row.title}
                      </p>
                      <time className="text-xs text-slate-700">
                        {formatWarsawDateTime(row.occurred_at)}
                      </time>
                    </div>
                    {(row.description || row.next_action) && (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-slate-600">
                        {[row.description, row.next_action]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          ) : activeView === 'documents' ? (
            <div className="space-y-2">
              <h2 className="font-black text-[#0b1b55]">Notatki i pliki</h2>
              {!selectedDeal ? (
                <p className="py-8 text-sm text-slate-600">
                  Wybierz deal, aby zobaczyć powiązane dokumenty.
                </p>
              ) : !documents.length ? (
                <p className="py-8 text-sm text-slate-600">
                  Brak dokumentów powiązanych z tym dealem.
                </p>
              ) : (
                documents.map((document) => (
                  <article
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-semibold text-[#0b1b55]">
                        {document.name}
                      </p>
                      <p className="text-xs text-slate-700">
                        {document.document_type || 'Plik'}
                      </p>
                    </div>
                    <time className="text-xs text-slate-700">
                      {formatWarsawDateTime(document.received_at)}
                    </time>
                  </article>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="font-black text-[#0b1b55]">Zadania po rozmowie</h2>
              {!plannedTasks.length ? (
                <p className="py-8 text-sm text-slate-600">
                  Brak planowanych zadań dla wybranego klienta lub deala.
                </p>
              ) : (
                plannedTasks.map((task) => (
                  <article key={task.id} className="rounded-lg border p-3">
                    <p className="font-semibold text-[#0b1b55]">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Termin:{' '}
                      {task.scheduled_at
                        ? formatWarsawDateTime(task.scheduled_at)
                        : 'nie ustawiono'}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      )}

      {activeView === 'new' && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.65fr)] xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.7fr)]">
          <section className="space-y-3 rounded-xl border border-slate-300 bg-white p-3 shadow-sm lg:p-4">
            <h2 className="font-black text-[#071747]">
              <span className="lg:hidden">Wyszukaj / wybierz</span>
              <span className="hidden lg:inline">Klient i Deal</span>
            </h2>
            <div className="relative">
              <Search className="absolute top-3.5 left-3 size-5 text-blue-600" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj klienta, wpisz numer telefonu..."
                className="h-12 pl-10 text-base"
              />
            </div>
            {matches.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                {matches.map((match) => (
                  <button
                    key={`${match.kind}-${match.id}`}
                    type="button"
                    onClick={() =>
                      match.kind === 'contact'
                        ? chooseContact(match.id)
                        : chooseDeal(match.id)
                    }
                    className="block min-h-12 w-full border-b px-3 py-2 text-left last:border-0 hover:bg-emerald-50"
                  >
                    <span className="block font-bold">{match.label}</span>
                    <span className="block text-xs text-slate-700">
                      {match.sub}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!selectedContact && (
              <Link
                href="/pipelines?new=deal"
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-black text-slate-950 hover:bg-slate-100"
              >
                + UTWÓRZ NOWY DEAL
              </Link>
            )}

            {!selectedContact && rawPhone && matches.length === 0 && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900">
                  Nowy numer — możesz zadzwonić przed utworzeniem Kontaktu.
                </p>
                <CallAction
                  phone={rawPhone}
                  size="lg"
                  className="h-11 w-full bg-emerald-800 text-white"
                />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Imię i nazwisko po rozmowie"
                />
                <Input
                  value={newPhone || rawPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Telefon"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void createContactFromPhone()}
                  className="w-full"
                >
                  Utwórz Kontakt
                </Button>
              </div>
            )}

            {selectedContact && (
              <div className="space-y-2">
                <h3 className="text-sm font-black text-[#0b1b55] lg:hidden">
                  Klient
                </h3>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-12 border-2 border-white shadow-sm">
                        {selectedContact.avatar_url ? (
                          <AvatarImage
                            src={selectedContact.avatar_url}
                            alt={contactName(selectedContact)}
                          />
                        ) : null}
                        <AvatarFallback className="bg-emerald-100 font-black text-emerald-900">
                          {contactName(selectedContact)
                            .split(/\s+/)
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-black text-[#0b1b55]">
                          {contactName(selectedContact)}
                        </p>
                        <a
                          href={`tel:${selectedContact.phone}`}
                          className="inline-flex min-h-11 items-center text-sm text-blue-700 hover:underline"
                        >
                          {selectedContact.phone}
                        </a>
                        <p className="truncate text-xs text-slate-700">
                          {selectedContact.company ||
                            selectedContact.email ||
                            ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Usuń wybór klienta"
                      onClick={() => {
                        setContactId('');
                        setDealId('');
                      }}
                      className="flex size-11 items-center justify-center rounded-lg text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedContact && (
              <div className="space-y-2">
                <h3 className="text-sm font-black text-[#0b1b55] lg:hidden">
                  Klient / Deal
                </h3>
                <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        Deal
                      </span>
                      {selectedDeal && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-black text-[#0b1b55]">
                          {selectedDeal.tracking_number ||
                            `DEAL-${selectedDeal.id.slice(0, 7).toUpperCase()}`}
                        </span>
                      )}
                    </div>
                    {contactDeals.length > 1 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setDealId(e.target.value);
                        }}
                        aria-label="Zmień Deal"
                        className="min-h-11 max-w-[160px] rounded-md border border-slate-300 bg-white px-2 py-1 text-base font-black text-blue-800 md:min-h-0 md:text-xs"
                      >
                        <option value="">ZMIEŃ DEAL</option>
                        {contactDeals.map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            {deal.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {selectedDeal && (
                    <>
                      <Link
                        href={`/deals/${selectedDeal.id}`}
                        className="mt-2 flex min-h-11 items-center rounded-md font-black text-[#0b1b55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      >
                        {selectedDeal.title}
                      </Link>
                      <dl className="mt-2 grid grid-cols-[90px_1fr] gap-y-1 text-sm">
                        <dt className="text-slate-700">Produkt</dt>
                        <dd className="font-semibold">
                          {selectedDeal.product_type || '—'}
                        </dd>
                        <dt className="text-slate-700">Wartość</dt>
                        <dd className="font-semibold">
                          {Number(selectedDeal.value || 0).toLocaleString(
                            'pl-PL'
                          )}{' '}
                          {selectedDeal.currency || 'PLN'}
                        </dd>
                        <dt className="text-slate-700">Etap</dt>
                        <dd className="font-semibold">
                          {stages.find((s) => s.id === selectedDeal.stage_id)
                            ?.name || '—'}
                        </dd>
                      </dl>
                    </>
                  )}
                  {!selectedDeal && (
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      Brak aktywnego deala w tym kontekście.
                    </p>
                  )}
                  <Link
                    href={`/pipelines?new=deal&contact=${selectedContact.id}`}
                    className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-black text-slate-950 hover:bg-slate-100"
                  >
                    + UTWÓRZ NOWY DEAL
                  </Link>
                </div>
              </div>
            )}
            {selectedContact && selectedDeal && (
              <div className="hidden border-t pt-3 lg:block">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <h2 className="text-sm font-black text-[#0b1b55]">
                    {RECENT_ACTIVITIES_LABEL}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        activityContextReturnPath({
                          contactId: selectedContact.id,
                          dealId: selectedDeal.id,
                        })
                      )
                    }
                    className="min-h-11 text-xs font-semibold text-blue-700"
                  >
                    Zobacz wszystkie →
                  </button>
                </div>
                <div className="space-y-1">
                  {activities.length === 0 ? (
                    <p className="py-2 text-sm text-slate-600">
                      Brak zapisanych aktywności w tym dealu.
                    </p>
                  ) : (
                    activities.map((row) => (
                      <article
                        key={row.id}
                        className="grid grid-cols-[76px_1fr] gap-2 border-b py-2 text-xs last:border-0"
                      >
                        <time className="text-slate-700">
                          {new Date(row.occurred_at).toLocaleDateString(
                            'pl-PL'
                          )}
                        </time>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0b1b55]">
                            {row.title}
                          </p>
                          {(row.description || row.next_action) && (
                            <p className="mt-0.5 line-clamp-2 text-slate-700">
                              {[row.description, row.next_action]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-3 shadow-sm lg:p-4">
            <div className="order-1">
              <h2 className="font-black text-[#0b1b55]">
                <span className="lg:hidden">Akcja</span>
                <span className="hidden lg:inline">Akcja</span>
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <button
                  type="button"
                  onClick={() => setAction('TELEFON')}
                  className={`min-h-16 rounded-lg border px-2 text-sm font-bold sm:min-h-12 sm:text-xs ${action === 'TELEFON' ? 'border-emerald-900 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                >
                  <Phone className="mx-auto mb-1 size-4" />
                  <span className="sm:hidden">Rozmowa</span>
                  <span className="hidden sm:inline">Rozmowa telefoniczna</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('SPOTKANIE')}
                  className={`min-h-16 rounded-lg border px-2 text-sm font-bold sm:min-h-12 sm:text-xs ${action === 'SPOTKANIE' ? 'border-emerald-900 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                >
                  <CalendarPlus className="mx-auto mb-1 size-4" />
                  Spotkanie
                </button>
                <button
                  type="button"
                  onClick={() => setAction('EMAIL')}
                  className={`min-h-16 rounded-lg border px-2 text-sm font-bold sm:min-h-12 sm:text-xs ${action === 'EMAIL' ? 'border-emerald-900 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                >
                  <Mail className="mx-auto mb-1 size-4" />
                  E-mail
                </button>
                <button
                  type="button"
                  onClick={() => setAction('WIADOMOSC')}
                  className={`min-h-16 rounded-lg border px-2 text-sm font-bold sm:min-h-12 sm:text-xs ${action === 'WIADOMOSC' ? 'border-emerald-900 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                >
                  <MessageSquare className="mx-auto mb-1 size-4" />
                  Wiadomość
                </button>
                <button
                  type="button"
                  onClick={() => setAction('INNY_KONTAKT')}
                  className={`col-span-2 min-h-16 rounded-lg border px-2 text-sm font-bold sm:col-span-1 sm:min-h-12 sm:text-xs ${action === 'INNY_KONTAKT' ? 'border-emerald-900 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                >
                  <MoreHorizontal className="mx-auto mb-1 size-4" />
                  <span className="sm:hidden">Więcej</span>
                  <span className="hidden sm:inline">Inna aktywność</span>
                </button>
              </div>
            </div>

            <div className="order-2 flex flex-col">
              <div className="order-2 mt-4 flex items-center justify-between gap-3 lg:order-1 lg:mt-0">
                <h2 className="font-black text-[#0b1b55]">
                  <span className="lg:hidden">Wynik</span>
                  <span className="hidden lg:inline">Wynik</span>
                </h2>
                {action === 'TELEFON' && (
                  <select
                    aria-label="Wynik rozmowy"
                    value={result}
                    onChange={(event) => setResult(event.target.value)}
                    className="hidden h-11 rounded-md border border-slate-200 bg-white px-2 text-base font-semibold text-slate-700 lg:block lg:h-8 lg:text-xs"
                  >
                    <option value="">Wybierz wynik</option>
                    {OUTCOMES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {action === 'TELEFON' && (
                <div className="order-2 mt-2 grid grid-cols-3 gap-2 lg:hidden">
                  {OUTCOMES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={result === value}
                      onClick={() => setResult(value)}
                      className={`min-h-11 rounded-lg border px-2 text-xs font-black ${
                        result === value
                          ? 'border-emerald-900 bg-emerald-800 text-white'
                          : 'border-slate-300 bg-white text-slate-950'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <h2 className="order-1 font-black text-[#0b1b55] lg:order-2 lg:mt-4">
                <span className="lg:hidden">Notatka / dyktuj</span>
                <span className="hidden lg:inline">Notatka lub dyktowanie</span>
              </h2>
              <div className="order-1 mt-2 lg:order-2 [&_textarea]:min-h-48 [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:text-base sm:[&_textarea]:min-h-28">
                <VoiceTextarea
                  value={note}
                  onChange={setNote}
                  placeholder="Wpisz notatkę z rozmowy lub użyj dyktowania..."
                  layout="side"
                />
              </div>
              <div className="order-3 mt-2 hidden flex-wrap gap-2 lg:flex">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold">
                  <FilePlus2 className="size-4" />{' '}
                  {uploading ? 'Dodaję…' : 'Dodaj załącznik'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={!selectedContact || uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadDocument(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNextAction((v) => v || 'Zadanie po rozmowie');
                    setCreateTask(true);
                    requestAnimationFrame(() =>
                      document.getElementById('activity-task-title')?.focus()
                    );
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold"
                >
                  <CheckSquare className="size-4" /> Dodaj zadanie
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOccurredAt(true);
                    setOccurredAt(
                      (value) => value || toWarsawDateTimeInput(new Date())
                    );
                    requestAnimationFrame(() =>
                      document.getElementById('activity-occurred-at')?.focus()
                    );
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-bold"
                >
                  <CalendarPlus className="size-4" /> Dodaj datę
                </button>
              </div>
              {showOccurredAt && (
                <div className="order-4 mt-2 hidden max-w-sm rounded-lg border border-blue-200 bg-blue-50 p-3 lg:block">
                  <Label htmlFor="activity-occurred-at">Data aktywności</Label>
                  <Input
                    id="activity-occurred-at"
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(event) => setOccurredAt(event.target.value)}
                    className="mt-1 h-11 bg-white text-base md:h-10"
                  />
                </div>
              )}
              {createTask && (
                <div className="order-4 mt-2 hidden gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:grid-cols-2 lg:grid">
                  <div>
                    <Label htmlFor="activity-task-title">Treść zadania</Label>
                    <Input
                      id="activity-task-title"
                      value={nextAction}
                      onChange={(event) => setNextAction(event.target.value)}
                      placeholder="Co trzeba zrobić?"
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-task-at">Termin zadania</Label>
                    <Input
                      id="activity-task-at"
                      type="datetime-local"
                      value={nextAt}
                      onChange={(event) => setNextAt(event.target.value)}
                      className="mt-1 bg-white text-base"
                    />
                  </div>
                  <p className="text-xs text-emerald-900 sm:col-span-2">
                    Zadanie zostanie utworzone razem z zapisem aktywności.
                  </p>
                </div>
              )}
            </div>

            <div className="order-3 hidden rounded-xl border border-lime-400 bg-lime-100 p-3 lg:block">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <Sparkles className="mt-0.5 size-5 text-lime-700" />
                  <div>
                    <p className="font-black text-[#0b1b55]">
                      AI porządkuje{' '}
                      <span className="rounded bg-lime-200 px-1 text-xs">
                        AI+
                      </span>
                    </p>
                    <p className="text-xs text-slate-600">
                      Podsumuje rozmowę, wyodrębni kolejne kroki i rozpozna
                      kontekst.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedDeal}
                  onClick={() =>
                    selectedDeal &&
                    router.push(
                      `/assistant?deal=${selectedDeal.id}&feature=prepare`
                    )
                  }
                  className="w-full border-lime-600 bg-white text-slate-950 sm:w-auto"
                >
                  Przygotuj podsumowanie
                </Button>
              </div>
            </div>

            <div className="order-4">
              <h2 className="hidden font-black text-[#0b1b55] lg:block">
                Następny krok
              </h2>
              <div className="mt-2 grid gap-3 rounded-lg border border-slate-300 bg-slate-50/80 p-3 lg:grid-cols-3">
                <div>
                  <Label htmlFor="activity-next">Następny krok</Label>
                  <Input
                    id="activity-next"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    placeholder="Co dalej?"
                    className="mt-1 h-11 bg-white md:h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="activity-next-at">Termin</Label>
                  <Input
                    id="activity-next-at"
                    type="datetime-local"
                    value={nextAt}
                    onChange={(e) => setNextAt(e.target.value)}
                    className="mt-1 h-11 bg-white text-base md:h-10"
                  />
                </div>
                <div className="hidden">
                  <Label htmlFor="activity-blocker">Bloker</Label>
                  <Input
                    id="activity-blocker"
                    value={blocker}
                    onChange={(e) => setBlocker(e.target.value)}
                    placeholder="Co blokuje?"
                    className="mt-1 h-11 bg-white md:h-10"
                  />
                </div>
              </div>
            </div>
            <div
              data-slot="activity-mobile-save"
              className="order-5 flex flex-col gap-2 rounded-xl border border-emerald-900/20 bg-white p-2 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
            >
              <span className="text-sm font-black text-[#0b1b55]">
                <span className="lg:hidden">Zapis</span>
                <span className="hidden lg:inline">Zapis</span>
              </span>
              <label className="hidden min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 lg:inline-flex">
                <input
                  type="checkbox"
                  checked={createTask}
                  onChange={(event) => setCreateTask(event.target.checked)}
                  disabled={!nextAction.trim()}
                  className="size-5 accent-emerald-800"
                />
                Utwórz zadanie z kolejnych kroków
              </label>
              <label className="hidden min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 sm:ml-3 lg:inline-flex">
                <input
                  type="checkbox"
                  checked={emailCopy}
                  onChange={(event) => setEmailCopy(event.target.checked)}
                  className="size-5 accent-emerald-800"
                />
                Wyślij kopię e-maila do klienta
              </label>
              {selectedContact && !selectedContact.email && (
                <span className="hidden text-xs text-amber-800 lg:inline">
                  Brak adresu e-mail klienta — aktywność zapisze się bez kopii.
                </span>
              )}
              <Button
                type="button"
                disabled={!selectedContact || saving}
                onClick={() => void saveActivity()}
                className="h-11 w-full bg-emerald-800 font-black sm:ml-auto sm:w-auto"
              >
                {saving
                  ? 'Zapisuję…'
                  : action === 'WIADOMOSC'
                    ? 'Wyślij WhatsApp i zapisz'
                    : 'Zapisz aktywność'}
              </Button>
            </div>
            <details className="order-6 rounded-xl border border-slate-300 bg-slate-50">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-black text-slate-950">
                WIĘCEJ / OPCJE
              </summary>
              <div className="space-y-3 border-t border-slate-300 p-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-950">
                    <FilePlus2 className="size-4" />
                    {uploading ? 'Dodaję…' : 'Dodaj załącznik'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={!selectedContact || uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadDocument(file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateTask((value) => !value)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-950"
                  >
                    <CheckSquare className="size-4" /> Dodaj zadanie
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOccurredAt(true);
                      setOccurredAt(
                        (value) => value || toWarsawDateTimeInput(new Date())
                      );
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-950"
                  >
                    <CalendarPlus className="size-4" /> Dodaj datę
                  </button>
                </div>
                {showOccurredAt && (
                  <div>
                    <Label htmlFor="activity-occurred-at-mobile">
                      Data aktywności
                    </Label>
                    <Input
                      id="activity-occurred-at-mobile"
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(event) => setOccurredAt(event.target.value)}
                      className="mt-1 h-11 bg-white text-base"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="activity-blocker-mobile">Bloker</Label>
                  <Input
                    id="activity-blocker-mobile"
                    value={blocker}
                    onChange={(event) => setBlocker(event.target.value)}
                    placeholder="Co blokuje?"
                    className="mt-1 h-11 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="activity-stage-mobile">Etap Deala</Label>
                  <select
                    id="activity-stage-mobile"
                    value={stageId}
                    disabled={!selectedDeal}
                    onChange={(event) => setStageId(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950"
                  >
                    <option value="">Etap Deala</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    disabled={!selectedDeal}
                    onClick={() => void closeDeal('won')}
                    className="bg-emerald-800"
                  >
                    <Trophy className="size-4" /> Wygrana
                  </Button>
                  <Button
                    type="button"
                    disabled={!selectedDeal}
                    variant="outline"
                    onClick={() => void closeDeal('lost')}
                    className="border-red-500 bg-white text-red-800"
                  >
                    Przegrana
                  </Button>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={emailCopy}
                    onChange={(event) => setEmailCopy(event.target.checked)}
                    className="size-5 accent-emerald-800"
                  />
                  Wyślij kopię e-maila do klienta
                </label>
                {createTask && (
                  <div className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div>
                      <Label htmlFor="activity-task-title-mobile">
                        Treść zadania
                      </Label>
                      <Input
                        id="activity-task-title-mobile"
                        value={nextAction}
                        onChange={(event) => setNextAction(event.target.value)}
                        placeholder="Co trzeba zrobić?"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activity-task-at-mobile">
                        Termin zadania
                      </Label>
                      <Input
                        id="activity-task-at-mobile"
                        type="datetime-local"
                        value={nextAt}
                        onChange={(event) => setNextAt(event.target.value)}
                        className="mt-1 bg-white text-base"
                      />
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedDeal || !note.trim()}
                  onClick={() =>
                    selectedDeal &&
                    router.push(
                      `/assistant?deal=${selectedDeal.id}&feature=prepare`
                    )
                  }
                  className="min-h-11 w-full border-lime-600 bg-lime-100 font-black text-slate-950"
                >
                  <Sparkles className="size-4" /> AI: rozpoznaj z notatki
                </Button>
              </div>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
