'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatWarsawDateTime } from '@/lib/date-time';
import { activityHistoryLabel, type ActivityHistoryRow } from '@/lib/sales/activity-history';

type ActivityHistoryProps = {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  className?: string;
};

export function ActivityHistory({ contactId, companyId, dealId, className }: ActivityHistoryProps) {
  const db = useMemo(() => createClient(), []);
  const [activities, setActivities] = useState<ActivityHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const relation = dealId ? ['deal_id', dealId] : companyId ? ['company_id', companyId] : contactId ? ['contact_id', contactId] : null;
    if (!relation) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db.from('sales_activities')
      .select('id,title,description,activity_type,activity_status,call_result,phone_number,next_action,next_action_date,occurred_at')
      .eq(relation[0], relation[1])
      .order('occurred_at', { ascending: false });
    setActivities((data ?? []) as ActivityHistoryRow[]);
    setLoading(false);
  }, [contactId, companyId, dealId, db]);

  useEffect(() => void load(), [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  if (!activities.length) return <p className="py-8 text-center text-sm text-muted-foreground">Brak zapisanych aktywności.</p>;

  return (
    <div className={className}>
      <div className="space-y-2">
        {activities.map((activity) => (
          <article key={activity.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-800">{activityHistoryLabel(activity)}</p>
                <p className="font-semibold">{activity.title || activityHistoryLabel(activity)}</p>
              </div>
              <p className="text-xs text-muted-foreground">{formatWarsawDateTime(activity.occurred_at)}</p>
            </div>
            {(activity.activity_status || activity.call_result) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[activity.activity_status?.replaceAll('_', ' '), activity.call_result?.replaceAll('_', ' ')].filter(Boolean).join(' · ')}
              </p>
            )}
            {activity.phone_number && <p className="mt-1 text-sm">Telefon: {activity.phone_number}</p>}
            {activity.description && <p className="mt-1 whitespace-pre-wrap text-sm">{activity.description}</p>}
            {activity.next_action && (
              <p className="mt-2 text-sm"><span className="font-semibold">Następne działanie:</span> {activity.next_action}</p>
            )}
            {activity.next_action_date && <p className="text-xs text-muted-foreground">Termin: {formatWarsawDateTime(activity.next_action_date)}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

