'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  ListTodo,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatWarsawDateTime } from '@/lib/date-time';
import { useAuth } from '@/hooks/use-auth';
import type { ContactNote } from '@/types';
import {
  activityHistoryRelation,
  type ActivityHistoryRow,
} from '@/lib/sales/activity-history';
import {
  analyticsFact,
  parseActivityAnalytics,
  type SalesMeaning,
} from '@/lib/sales/activity-analytics';

type ActivityHistoryProps = {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  className?: string;
  snapshot?: ActivityHistorySnapshot;
  compactNotes?: boolean;
};

export type QueueEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
  deal_id: string | null;
};
export type ContactNoteRow = Pick<
  ContactNote,
  'id' | 'note_text' | 'created_at' | 'user_id'
>;

export type ActivityHistorySnapshot = {
  activities: ActivityHistoryRow[];
  queueEvents: QueueEvent[];
  notes: ContactNoteRow[];
  loading: boolean;
  error?: boolean;
};

type HistoryItem =
  | { kind: 'activity'; occurredAt: string; activity: ActivityHistoryRow }
  | { kind: 'note'; occurredAt: string; note: ContactNoteRow };

const ACTIVITY_TYPES: Record<string, { label: string; icon: LucideIcon }> = {
  telefon: { label: 'Rozmowa', icon: Phone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  wiadomosc: { label: 'Wiadomość', icon: MessageCircle },
  email: { label: 'E-mail', icon: Mail },
  'e-mail': { label: 'E-mail', icon: Mail },
  spotkanie: { label: 'Spotkanie', icon: CalendarDays },
  notatka: { label: 'Notatka', icon: StickyNote },
  ankieta: { label: 'Ankieta', icon: ClipboardList },
  zadanie: { label: 'Zadanie', icon: ListTodo },
  dokument: { label: 'Dokument', icon: FileText },
  follow_up: { label: 'Follow-up', icon: Clock3 },
};

const GENERAL_ACTIVITY = { label: 'Aktywność', icon: Clock3 };

function activityType(activity: ActivityHistoryRow) {
  const type = activity.activity_type?.trim().toLowerCase();
  if (!type) return GENERAL_ACTIVITY;
  const analytics = parseActivityAnalytics(activity.call_category);
  const channel = analytics ? analyticsFact(analytics, 'channel') : null;
  if (
    type === 'wiadomosc' &&
    (String(channel).toLowerCase() === 'whatsapp' ||
      /^whatsapp\b/i.test(activity.title?.trim() || ''))
  )
    return ACTIVITY_TYPES.whatsapp;
  return Object.hasOwn(ACTIVITY_TYPES, type)
    ? ACTIVITY_TYPES[type]
    : GENERAL_ACTIVITY;
}

function ActivityType({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <span data-activity-type className="inline-flex items-center gap-1">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function mergeActivityHistory(
  activities: ActivityHistoryRow[],
  notes: ContactNoteRow[]
): HistoryItem[] {
  return [
    ...activities.map((activity) => ({
      kind: 'activity' as const,
      occurredAt: activity.occurred_at,
      activity,
    })),
    ...notes.map((note) => ({
      kind: 'note' as const,
      occurredAt: note.created_at,
      note,
    })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

const SALES_MEANING_LABELS: Record<SalesMeaning, string> = {
  brak_kontaktu: 'Brak kontaktu',
  kontakt_bez_postepu: 'Kontakt bez postępu',
  wartosciowa_rozmowa: 'Wartościowa rozmowa',
  nowy_realny_temat: 'Nowy realny temat',
  ustalony_next_action: 'Ustalony next action',
  usuniety_blocker: 'Usunięty blocker',
  deal_przesuniety: 'Deal przesunięty',
  krok_do_wniosku: 'Krok do wniosku',
  krok_do_decyzji: 'Krok do decyzji',
  krok_do_uruchomienia: 'Krok do uruchomienia',
};

function AnalyticsSummary({ value }: { value?: string | null }) {
  const analytics = parseActivityAnalytics(value);
  if (!analytics) return null;
  const blocker = analyticsFact(analytics, 'blocker');
  return (
    <div className="mt-2 space-y-1">
      {analytics.sales_meanings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analytics.sales_meanings.map((meaning) => (
            <span
              key={meaning}
              className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900"
            >
              {SALES_MEANING_LABELS[meaning]}
            </span>
          ))}
        </div>
      )}
      {typeof blocker === 'string' && blocker && (
        <p className="text-sm">
          <span className="font-semibold">Blocker:</span> {blocker}
        </p>
      )}
    </div>
  );
}

export function ActivityHistory({
  contactId,
  companyId,
  dealId,
  className,
  snapshot,
  compactNotes = false,
}: ActivityHistoryProps) {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [activities, setActivities] = useState<ActivityHistoryRow[]>([]);
  const [queueEvents, setQueueEvents] = useState<QueueEvent[]>([]);
  const [notes, setNotes] = useState<ContactNoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (snapshot) return;
    const relation = activityHistoryRelation({ contactId, companyId, dealId });
    if (!relation || !accountId) {
      setActivities([]);
      setQueueEvents([]);
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const notesQuery = contactId
      ? db
          .from('contact_notes')
          .select('id,note_text,created_at,user_id')
          .eq('contact_id', contactId)
          .eq('account_id', accountId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] });
    const [{ data }, { data: eventData }, { data: noteData }] =
      await Promise.all([
        db
          .from('sales_activities')
          .select(
            'id,deal_id,title,description,activity_type,activity_status,call_result,call_category,phone_number,next_action,next_action_date,occurred_at'
          )
          .eq(relation[0], relation[1])
          .eq('account_id', accountId)
          .order('occurred_at', { ascending: false }),
        db
          .from('work_queue_events')
          .select('id,event_type,occurred_at,deal_id')
          .eq(relation[0], relation[1])
          .eq('account_id', accountId)
          .order('occurred_at', { ascending: false }),
        notesQuery,
      ]);
    setActivities((data ?? []) as ActivityHistoryRow[]);
    setQueueEvents((eventData ?? []) as QueueEvent[]);
    setNotes((noteData ?? []) as ContactNoteRow[]);
    setLoading(false);
  }, [accountId, contactId, companyId, dealId, db, snapshot]);

  useEffect(() => void load(), [load]);

  return (
    <ActivityHistoryList
      {...(snapshot ?? { activities, queueEvents, notes, loading })}
      className={className}
      compactNotes={compactNotes}
    />
  );
}

export function ActivityHistoryList({
  activities,
  queueEvents,
  notes,
  loading,
  error,
  className,
  compactNotes = false,
}: ActivityHistorySnapshot & { className?: string; compactNotes?: boolean }) {
  if (error)
    return (
      <p className="py-8 text-center text-sm text-slate-700">
        Nie udało się wczytać aktywności.
      </p>
    );
  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-slate-700" />
      </div>
    );
  if (!activities.length && !queueEvents.length && !notes.length)
    return (
      <p className="py-8 text-center text-sm text-slate-700">
        Brak zapisanych aktywności.
      </p>
    );

  return (
    <div className={className}>
      <div className="space-y-2">
        {mergeActivityHistory(activities, notes).map((item) => {
          if (item.kind === 'note') {
            if (compactNotes && item.note.note_text.startsWith('Ankieta')) {
              return (
                <details
                  key={`note-${item.note.id}`}
                  className="rounded-lg border border-slate-300 bg-white p-3 text-slate-950"
                >
                  <summary className="flex cursor-pointer items-center gap-2 text-xs">
                    <ActivityType {...ACTIVITY_TYPES.ankieta} />
                    <span className="min-w-0 flex-1 truncate font-bold text-emerald-800">
                      Ankieta — otrzymana
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-slate-700">
                      {formatWarsawDateTime(item.note.created_at)}
                    </span>
                    <span className="shrink-0 font-semibold underline">
                      Szczegóły
                    </span>
                  </summary>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {item.note.note_text}
                  </p>
                </details>
              );
            }
            return (
              <article
                key={`note-${item.note.id}`}
                className="rounded-lg border border-slate-300 bg-white p-3 text-slate-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-bold text-emerald-800">
                    <ActivityType {...ACTIVITY_TYPES.notatka} />
                  </p>
                  <p className="text-xs text-slate-700">
                    {formatWarsawDateTime(item.note.created_at)}
                  </p>
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {item.note.note_text}
                </p>
              </article>
            );
          }

          const { activity } = item;
          const type = activityType(activity);
          const activityCard = (
            <article className="rounded-lg border border-slate-300 bg-white p-3 text-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    <ActivityType {...type} />
                  </p>
                  <p className="font-semibold">
                    {activity.title || type.label}
                  </p>
                </div>
                <p className="text-xs text-slate-700">
                  {formatWarsawDateTime(activity.occurred_at)}
                </p>
              </div>
              {(activity.activity_status || activity.call_result) && (
                <p className="mt-1 text-xs text-slate-700">
                  {[
                    activity.activity_status?.replaceAll('_', ' '),
                    activity.call_result?.replaceAll('_', ' '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {activity.phone_number && (
                <p className="mt-1 text-sm">Telefon: {activity.phone_number}</p>
              )}
              {activity.description && (
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {activity.description}
                </p>
              )}
              <AnalyticsSummary value={activity.call_category} />
              {activity.next_action && (
                <p className="mt-2 text-sm">
                  <span className="font-semibold">Następne działanie:</span>{' '}
                  {activity.next_action}
                </p>
              )}
              {activity.next_action_date && (
                <p className="text-xs text-slate-700">
                  Termin: {formatWarsawDateTime(activity.next_action_date)}
                </p>
              )}
            </article>
          );
          return activity.deal_id ? (
            <Link
              key={`activity-${activity.id}`}
              href={`/deals/${activity.deal_id}`}
              className="block rounded-lg hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {activityCard}
            </Link>
          ) : (
            <div key={`activity-${activity.id}`}>{activityCard}</div>
          );
        })}
        {queueEvents.map((event) => {
          const eventCard = (
            <article className="rounded-lg border border-slate-300 bg-white p-3 text-slate-950">
              <div className="flex justify-between gap-2">
                <p className="text-xs font-bold text-emerald-800">
                  <ActivityType {...GENERAL_ACTIVITY} />
                  {' · '}DO OBSŁUGI · {event.event_type.replaceAll('_', ' ')}
                </p>
                <p className="text-xs text-slate-700">
                  {formatWarsawDateTime(event.occurred_at)}
                </p>
              </div>
            </article>
          );
          return event.deal_id ? (
            <Link
              key={event.id}
              href={`/deals/${event.deal_id}`}
              className="block rounded-lg hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {eventCard}
            </Link>
          ) : (
            <div key={event.id}>{eventCard}</div>
          );
        })}
      </div>
    </div>
  );
}
