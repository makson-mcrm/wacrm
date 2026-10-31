'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatWarsawDateTime } from '@/lib/date-time';
import { Button } from '@/components/ui/button';
import type { Contact, Deal } from '@/types';

type Client = ReturnType<typeof createClient>;

// The same regions stack and collapse below xl; desktop always shows all three.
export function ContactDetailColumn({
  area,
  title,
  children,
  expanded: controlledExpanded,
  onExpandedChange,
}: {
  area: 'context' | 'work' | 'results';
  title: string;
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
      aria-labelledby={`${id}-heading`}
      className="min-h-0 min-w-0 xl:overflow-y-auto xl:overscroll-contain"
    >
      <h2
        id={`${id}-heading`}
        className="mb-3 text-sm font-black text-slate-950"
      >
        <span className="hidden xl:block">{title}</span>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => {
            setLocalExpanded(!expanded);
            onExpandedChange?.(!expanded);
          }}
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 text-left xl:hidden"
        >
          {title}
          <span aria-hidden>{expanded ? '−' : '+'}</span>
        </button>
      </h2>
      <div
        id={`${id}-content`}
        className={`${expanded ? 'block' : 'hidden'} space-y-3 break-words xl:block`}
      >
        {children}
      </div>
    </section>
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

function useContactData<T>(load: () => Promise<T>) {
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
  ownerError = false,
}: {
  contact: Contact;
  owner: string;
  ownerError?: boolean;
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <dt className="font-black text-slate-800">Źródło</dt>
        <dd className="mt-1 break-words text-slate-700">
          {contact.source?.trim() || 'Brak danych'}
        </dd>
        {contact.source_details?.trim() && (
          <dd className="mt-1 break-words text-slate-700">
            {contact.source_details}
          </dd>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <dt className="font-black text-slate-800">Opiekun</dt>
        <dd className="mt-1 break-words text-slate-700">
          {ownerError
            ? 'Nie udało się wczytać opiekuna.'
            : owner || 'Brak danych'}
        </dd>
      </div>
    </dl>
  );
}

export function ContactDataCards({ contact }: { contact: Contact }) {
  const db = useMemo(() => createClient(), []);
  const load = useMemo(
    () => () => loadContactOwner(db, contact),
    [db, contact]
  );
  const result = useContactData(load);
  return (
    <ContactInfoCards
      contact={contact}
      owner={result.loading ? 'Ładowanie…' : (result.data ?? '')}
      ownerError={result.error}
    />
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

function DataState({ loading, error }: { loading: boolean; error: boolean }) {
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
            {date && (
              <p className="mt-1 text-xs text-slate-700">
                Termin: {formatWarsawDateTime(date)}
              </p>
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
