'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Building2,
  Layers,
  Link2,
  Loader2,
  Mail,
  Star,
  UserRound,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatWarsawDateTime } from '@/lib/date-time';
import { Button } from '@/components/ui/button';
import type {
  Contact,
  Deal,
  ContactCompany,
  ContactSpouseLink,
  Tag,
} from '@/types';
import type { ActivityHistoryRow } from '@/lib/sales/activity-history';
import type { ActivityHistorySnapshot } from '@/components/sales/activity-history';

type Client = ReturnType<typeof createClient>;

// The same regions stack and collapse below xl; desktop always shows all three.
export function ContactDetailColumn({
  area,
  title,
  label,
  children,
  expanded: controlledExpanded,
  onExpandedChange,
}: {
  area: 'context' | 'work' | 'results';
  title?: string;
  label: string;
  children: ReactNode;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const expanded = controlledExpanded ?? localExpanded;
  const id = useId();
  return (
    <section
      data-contact-column={area}
      aria-label={label}
      className="min-h-0 min-w-0 xl:overflow-y-auto xl:overscroll-contain"
    >
      {title && (
        <h2 className="mb-3 hidden text-sm font-black text-slate-950 xl:block">
          {title}
        </h2>
      )}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-content`}
        onClick={() => {
          setLocalExpanded(!expanded);
          onExpandedChange?.(!expanded);
        }}
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 text-left text-sm font-black text-slate-950 xl:hidden"
      >
        {title ?? label}
        <span aria-hidden>{expanded ? '−' : '+'}</span>
      </button>
      <div
        id={`${id}-content`}
        className={`${expanded ? 'block' : 'hidden'} space-y-3 break-words xl:block`}
      >
        {children}
      </div>
    </section>
  );
}

export function ContactCardFooter(
  props: { href: string } | { onClick: () => void }
) {
  const className =
    'mt-2 flex min-h-11 items-center text-xs font-semibold text-emerald-800 hover:underline';
  return 'href' in props ? (
    <Link href={props.href} className={className}>
      Zobacz wszystkie →
    </Link>
  ) : (
    <button type="button" onClick={props.onClick} className={className}>
      Zobacz wszystkie →
    </button>
  );
}

export type ContactTask = {
  id: string;
  title: string;
  completed: boolean;
  activity_status: string | null;
  scheduled_at: string | null;
  next_action_date: string | null;
};
export type ContactDocument = {
  id: string;
  deal_id: string;
  name: string;
  status: string;
  kind: 'document' | 'requirement';
};

export async function loadContactOwner(db: Client, contact: Contact) {
  if (!contact.user_id) return '';
  // contacts.user_id references auth.users; profiles.id is a different key.
  const { data, error } = await db
    .from('profiles')
    .select('full_name')
    .eq('user_id', contact.user_id)
    .eq('account_id', contact.account_id)
    .maybeSingle();
  if (error) throw new Error('CONTACT_OWNER_UNAVAILABLE');
  return data?.full_name?.trim() || '';
}

export async function loadContactTasks(
  db: Client,
  contact: Contact
): Promise<ContactTask[]> {
  const { data, error } = await db
    .from('sales_activities')
    .select('id,title,completed,activity_status,scheduled_at,next_action_date')
    .eq('contact_id', contact.id)
    .eq('account_id', contact.account_id)
    .eq('activity_type', 'zadanie')
    .order('scheduled_at', { ascending: true });
  if (error) throw new Error('CONTACT_TASKS_UNAVAILABLE');
  return data ?? [];
}

export async function loadContactDocuments(
  db: Client,
  accountId: string,
  dealIds: string[]
): Promise<ContactDocument[]> {
  if (!dealIds.length) return [];
  const [documents, requirements] = await Promise.all([
    db
      .from('deal_documents')
      .select('id,deal_id,name,status')
      .eq('account_id', accountId)
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false }),
    db
      .from('deal_document_requirements')
      .select('id,deal_id,name,status')
      .eq('account_id', accountId)
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false }),
  ]);
  if (documents.error || requirements.error)
    throw new Error('CONTACT_DOCUMENTS_UNAVAILABLE');
  return [
    ...(documents.data ?? []).map((row) => ({
      ...row,
      kind: 'document' as const,
    })),
    ...(requirements.data ?? []).map((row) => ({
      ...row,
      kind: 'requirement' as const,
    })),
  ];
}

export function useContactData<T>(load: () => Promise<T>) {
  const [result, setResult] = useState<{
    load: (() => Promise<T>) | null;
    data: T | null;
    loading: boolean;
    error: boolean;
  }>({ load: null, data: null, loading: true, error: false });
  useEffect(() => {
    let current = true;
    load().then(
      (data) => {
        if (current) setResult({ load, data, loading: false, error: false });
      },
      () => {
        if (current)
          setResult({ load, data: null, loading: false, error: true });
      }
    );
    return () => {
      current = false;
    };
  }, [load]);
  return result.load === load
    ? result
    : { data: null, loading: true, error: false };
}

export function ContactInfoCards({
  contact,
  owner,
  ownerRole = '',
  ownerError = false,
  companies = [],
  spouses = [],
  deals = [],
}: {
  contact: Contact;
  owner: string;
  ownerRole?: string;
  ownerError?: boolean;
  companies?: ContactCompany[];
  spouses?: ContactSpouseLink[];
  deals?: Deal[];
}) {
  const company = (companies.find((link) => link.is_primary) ?? companies[0])
    ?.company;
  const spouse = spouses[0]?.spouse;
  const segments = [
    ...new Set(
      [contact.product_category, ...deals.map((deal) => deal.product_type)]
        .map((value) => value?.trim())
        .filter(Boolean)
    ),
  ];
  const cards = [
    {
      title: 'Firma',
      icon: Building2,
      value: company?.name,
      detail: company?.nip ? `NIP: ${company.nip}` : undefined,
      href: company ? `/companies?open=${company.id}` : undefined,
    },
    {
      title: 'Współmałżonek/Partner',
      icon: Users,
      value: spouse?.name,
      detail: spouse?.phone ? `Telefon: ${spouse.phone}` : undefined,
      href: spouse ? `/contacts?open=${spouse.id}` : undefined,
    },
    {
      title: 'Źródło',
      icon: Link2,
      value: contact.source?.trim(),
      detail: contact.source_details,
      extra: contact.created_at
        ? `Dodano do CRM: ${formatWarsawDateTime(contact.created_at)}`
        : undefined,
    },
    { title: 'Segment', icon: Layers, value: segments.join(' · ') },
    {
      title: 'Opiekun',
      icon: UserRound,
      value: ownerError ? 'Nie udało się wczytać opiekuna.' : owner,
      detail: ownerRole ? `Rola: ${ownerRole}` : undefined,
    },
  ];
  return (
    <dl
      data-contact-info-cards
      className="grid min-w-0 shrink-0 grid-cols-[repeat(5,minmax(160px,1fr))] gap-[var(--card-gap)] px-[var(--content-pad-x)] py-[var(--content-pad-y)] text-xs max-xl:overflow-x-auto xl:grid-cols-[repeat(5,minmax(0,1fr))]"
    >
      {cards.map(({ title, icon: Icon, value, detail, extra, href }) => (
        <div
          key={title}
          data-contact-info-card={title}
          className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <dt className="flex items-start gap-2 font-black break-words text-slate-800">
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {title}
          </dt>
          <dd className="mt-2 font-semibold break-words text-slate-950">
            {href ? (
              <Link href={href} className="text-emerald-800 hover:underline">
                {value || 'Brak danych'}
              </Link>
            ) : (
              value || 'Brak danych'
            )}
          </dd>
          {detail && (
            <dd className="mt-1 break-words text-slate-700">{detail}</dd>
          )}
          {extra && (
            <dd
              className="mt-auto truncate pt-1 text-[11px] text-slate-600"
              title={extra}
            >
              {extra}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

export function ContactStatusTags({ tags }: { tags: Tag[] }) {
  const vip = tags.find((tag) => /^vip$/i.test(tag.name.trim()));
  const statuses = tags.filter((tag) => tag !== vip);
  if (!tags.length) return null;
  return (
    <div data-contact-status className="mt-1 flex flex-wrap gap-1 text-xs">
      {statuses.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-900"
        >
          {tag.name}
        </span>
      ))}
      {vip && (
        <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-900">
          <Star aria-hidden="true" className="size-3" />
          VIP
        </span>
      )}
    </div>
  );
}

export async function loadContactOwnerProfile(db: Client, contact: Contact) {
  if (!contact.user_id) return null;
  const { data, error } = await db
    .from('profiles')
    .select('full_name,account_role')
    .eq('user_id', contact.user_id)
    .eq('account_id', contact.account_id)
    .maybeSingle();
  if (error) throw new Error('CONTACT_OWNER_UNAVAILABLE');
  return data as {
    full_name: string | null;
    account_role: string | null;
  } | null;
}

export async function loadContactHistory(
  db: Client,
  contact: Contact
): Promise<ActivityHistorySnapshot> {
  const [activities, events] = await Promise.all([
    db
      .from('sales_activities')
      .select(
        'id,deal_id,title,description,activity_type,activity_status,call_result,call_category,phone_number,next_action,next_action_date,occurred_at'
      )
      .eq('contact_id', contact.id)
      .eq('account_id', contact.account_id)
      .order('occurred_at', { ascending: false }),
    db
      .from('work_queue_events')
      .select('id,event_type,occurred_at,deal_id')
      .eq('contact_id', contact.id)
      .eq('account_id', contact.account_id)
      .order('occurred_at', { ascending: false }),
  ]);
  if (activities.error || events.error)
    throw new Error('CONTACT_HISTORY_UNAVAILABLE');
  return {
    activities: activities.data ?? [],
    queueEvents: events.data ?? [],
    notes: [],
    loading: false,
  };
}

export function useContactOverviewData(
  db: Client,
  contact: Contact | null,
  deals: Deal[],
  enabled: boolean,
  loadingDeals: boolean
) {
  const ownerLoad = useMemo(
    () => () =>
      enabled && contact
        ? loadContactOwnerProfile(db, contact)
        : Promise.resolve(null),
    [db, contact, enabled]
  );
  const taskLoad = useMemo(
    () => () =>
      enabled && contact ? loadContactTasks(db, contact) : Promise.resolve([]),
    [db, contact, enabled]
  );
  const historyLoad = useMemo(
    () => () =>
      enabled && contact
        ? loadContactHistory(db, contact)
        : Promise.resolve(null),
    [db, contact, enabled]
  );
  const documentsLoad = useMemo(
    () => () =>
      enabled && contact && !loadingDeals
        ? loadContactDocuments(
            db,
            contact.account_id,
            deals.map((deal) => deal.id)
          )
        : Promise.resolve([]),
    [db, contact, deals, enabled, loadingDeals]
  );
  return {
    owner: useContactData(ownerLoad),
    tasks: useContactData(taskLoad),
    history: useContactData(historyLoad),
    documents: useContactData(documentsLoad),
  };
}

export function ContactNextAction({
  contact,
  deals,
  activities = [],
}: {
  contact: Contact;
  deals: Deal[];
  activities?: ActivityHistoryRow[];
}) {
  const activeDeals = deals.filter(
    (deal) => deal.status !== 'won' && deal.status !== 'lost'
  );
  const candidates = [
    ...(contact.next_step?.trim()
      ? [{ text: contact.next_step, date: contact.follow_up_at }]
      : []),
    ...activeDeals
      .filter((deal) => deal.next_action?.trim())
      .map((deal) => ({
        text: deal.next_action!,
        date: deal.next_action_at || deal.next_action_date || deal.follow_up_at,
      })),
    ...activities
      .filter(
        (activity) =>
          activity.next_action?.trim() &&
          activity.activity_status !== 'ANULOWANE' &&
          (activity.activity_type !== 'zadanie' ||
            activity.activity_status !== 'WYKONANE')
      )
      .map((activity) => ({
        text: activity.next_action!,
        date: activity.next_action_date,
      })),
  ].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const next = candidates[0];
  return (
    <section
      data-contact-next-action
      className="rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4"
      aria-labelledby="contact-next-action-title"
    >
      <h3
        id="contact-next-action-title"
        className="text-sm font-black text-emerald-950"
      >
        Next action
      </h3>
      <p className="mt-2 text-base font-bold text-emerald-950">
        {next?.text || 'Brak danych — ustal następne działanie.'}
      </p>
      <p className="mt-1 text-xs text-emerald-900">
        Termin: {next?.date ? formatWarsawDateTime(next.date) : 'Brak danych'}
      </p>
    </section>
  );
}

export function ContactEmailAction({ email }: { email?: string }) {
  const address = email?.trim();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!address}
      render={
        address ? (
          <a
            href={`mailto:${encodeURIComponent(address).replace(/%40/g, '@')}`}
          />
        ) : undefined
      }
    >
      <Mail className="size-4" /> E-mail
    </Button>
  );
}

export function DataState({
  loading,
  error,
}: {
  loading: boolean;
  error: boolean;
}) {
  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 aria-label="Ładowanie" className="size-5 animate-spin" />
      </div>
    );
  return (
    <p className="py-8 text-center text-sm text-slate-700">
      {error ? 'Nie udało się wczytać danych.' : 'Brak danych'}
    </p>
  );
}

export function ContactTaskList({ tasks }: { tasks: ContactTask[] }) {
  if (!tasks.length) return <DataState loading={false} error={false} />;
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const date = task.scheduled_at || task.next_action_date;
        return (
          <article
            key={task.id}
            className="rounded-lg border border-slate-300 bg-white p-3"
          >
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="mt-1 text-xs text-slate-700">
              {task.completed
                ? 'Zakończone'
                : task.activity_status?.replaceAll('_', ' ') || 'Planowane'}
            </p>
            <p className="mt-1 text-xs text-slate-700">
              Priorytet: Brak danych
            </p>
            {date ? (
              <p className="mt-1 text-xs text-slate-700">
                Termin: {formatWarsawDateTime(date)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-700">Termin: Brak danych</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function ContactTasks({ contact }: { contact: Contact }) {
  const db = useMemo(() => createClient(), []);
  const load = useMemo(
    () => () => loadContactTasks(db, contact),
    [db, contact]
  );
  const result = useContactData(load);
  return result.loading || result.error ? (
    <DataState {...result} />
  ) : (
    <ContactTaskList tasks={result.data ?? []} />
  );
}

export function ContactDocumentList({
  documents,
  deals,
}: {
  documents: ContactDocument[];
  deals: Deal[];
}) {
  if (!documents.length) return <DataState loading={false} error={false} />;
  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <Link
          key={`${document.kind}-${document.id}`}
          href={`/deals/${document.deal_id}?tab=files`}
          className="block rounded-lg border p-3 text-sm font-semibold"
        >
          {document.name}
          <span className="mt-1 block text-xs font-normal text-slate-700">
            {document.kind === 'requirement' ? 'Wymagany dokument' : 'Dokument'}{' '}
            · {document.status.replaceAll('_', ' ')} ·{' '}
            {deals.find((deal) => deal.id === document.deal_id)?.title}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ContactDocuments({
  contact,
  deals,
  loadingDeals,
}: {
  contact: Contact;
  deals: Deal[];
  loadingDeals: boolean;
}) {
  const db = useMemo(() => createClient(), []);
  const load = useMemo(
    () => () =>
      loadContactDocuments(
        db,
        contact.account_id,
        deals.map((deal) => deal.id)
      ),
    [db, contact.account_id, deals]
  );
  const result = useContactData(load);
  return loadingDeals || result.loading || result.error ? (
    <DataState loading={loadingDeals || result.loading} error={result.error} />
  ) : (
    <ContactDocumentList documents={result.data ?? []} deals={deals} />
  );
}
