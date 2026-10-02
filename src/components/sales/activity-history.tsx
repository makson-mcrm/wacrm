'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatWarsawDateTime } from '@/lib/date-time';
import { useAuth } from '@/hooks/use-auth';
import type { ContactNote } from '@/types';
import {
  activityHistoryLabel,
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
};

type QueueEvent = { id: string; event_type: string; occurred_at: string };
type ContactNoteRow = Pick<
  ContactNote,
  'id' | 'note_text' | 'created_at' | 'user_id'
>;

type HistoryItem =
  | { kind: 'activity'; occurredAt: string; activity: ActivityHistoryRow }
  | { kind: 'note'; occurredAt: string; note: ContactNoteRow };

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
}: ActivityHistoryProps) {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [activities, setActivities] = useState<ActivityHistoryRow[]>([]);
  const [queueEvents, setQueueEvents] = useState<QueueEvent[]>([]);
  const [notes, setNotes] = useState<ContactNoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
            'id,title,description,activity_type,activity_status,call_result,call_category,phone_number,next_action,next_action_date,occurred_at'
          )
          .eq(relation[0], relation[1])
          .eq('account_id', accountId)
          .order('occurred_at', { ascending: false }),
        db
          .from('work_queue_events')
          .select('id,event_type,occurred_at')
          .eq(relation[0], relation[1])
          .eq('account_id', accountId)
          .order('occurred_at', { ascending: false }),
        notesQuery,
      ]);
    setActivities((data ?? []) as ActivityHistoryRow[]);
    setQueueEvents((eventData ?? []) as QueueEvent[]);
    setNotes((noteData ?? []) as ContactNoteRow[]);
    setLoading(false);
  }, [accountId, contactId, companyId, dealId, db]);

  useEffect(() => void load(), [load]);

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  if (!activities.length && !queueEvents.length && !notes.length)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Brak zapisanych aktywności.
      </p>
    );

  return (
    <div className={className}>
      <div className="space-y-2">
        {mergeActivityHistory(activities, notes).map((item) => {
          if (item.kind === 'note') {
            return (
              <article
                key={`note-${item.note.id}`}
                className="rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-bold text-emerald-800">Notatka</p>
                  <p className="text-muted-foreground text-xs">
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
          return (
            <article
              key={`activity-${activity.id}`}
              className="rounded-lg border p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase">
                    {activityHistoryLabel(activity)}
                  </p>
                  <p className="font-semibold">
                    {activity.title || activityHistoryLabel(activity)}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatWarsawDateTime(activity.occurred_at)}
                </p>
              </div>
              {(activity.activity_status || activity.call_result) && (
                <p className="text-muted-foreground mt-1 text-xs">
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
                <p className="text-muted-foreground text-xs">
                  Termin: {formatWarsawDateTime(activity.next_action_date)}
                </p>
              )}
            </article>
          );
        })}
        {queueEvents.map((event) => (
          <article key={event.id} className="rounded-lg border p-3">
            <div className="flex justify-between gap-2">
              <p className="text-xs font-bold text-emerald-800 uppercase">
                DO OBSŁUGI · {event.event_type.replaceAll('_', ' ')}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatWarsawDateTime(event.occurred_at)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
