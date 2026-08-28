'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { Notification } from '@/types';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icon per notification type. Only one type exists today
// (conversation_assigned) but this keeps future types a one-line add.
const TYPE_ICON: Record<Notification['type'], typeof Bell> = {
  conversation_assigned: UserPlus,
};

export default function NotificationsPage() {
  const router = useRouter();
  const { accountId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [processAlerts, setProcessAlerts] = useState<
    { id: string; title: string; reason: string }[]
  >([]);

  const load = useCallback(async () => {
    if (!accountId) return;
    const supabase = createClient();
    const [notificationResult, dealResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('deals')
        .select(
          'id,title,blocker,next_action_at,questionnaire_due_at,questionnaire_received_at,document_requirements:deal_document_requirements(status,required)'
        )
        .eq('account_id', accountId)
        .eq('status', 'open'),
    ]);
    const { data, error: fetchErr } = notificationResult;
    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }
    setNotifications((data ?? []) as Notification[]);
    const now = Date.now();
    const alerts: { id: string; title: string; reason: string }[] = [];
    for (const deal of dealResult.data ?? []) {
      const missing = (deal.document_requirements ?? []).filter(
        (item: { status: string; required: boolean }) =>
          item.required && !['zaakceptowany', 'wyslany'].includes(item.status)
      ).length;
      const reasons = [
        deal.blocker ? `Bloker: ${deal.blocker}` : '',
        deal.next_action_at && new Date(deal.next_action_at).getTime() < now
          ? 'Minął termin następnego działania'
          : '',
        missing ? `Brakuje ${missing} wymaganych dokumentów` : '',
        deal.questionnaire_due_at &&
        !deal.questionnaire_received_at &&
        new Date(deal.questionnaire_due_at).getTime() < now
          ? 'Minął termin wypełnienia ankiety przed konsultacją'
          : '',
      ].filter(Boolean);
      if (reasons.length)
        alerts.push({
          id: deal.id,
          title: deal.title,
          reason: reasons.join(' · '),
        });
    }
    setProcessAlerts(alerts);
  }, [accountId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Realtime — new assignments appear without a refresh, and a
  // "mark all read" fired from another tab/device stays in sync here.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Notification;
            setNotifications((prev) => {
              if (!prev) return [row];
              if (prev.some((n) => n.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Notification;
            setNotifications(
              (prev) =>
                prev?.map((n) => (n.id === row.id ? { ...n, ...row } : n)) ??
                prev
            );
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<Notification>;
            setNotifications(
              (prev) => prev?.filter((n) => n.id !== oldRow.id) ?? prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic — the row is already visually "read" by the time the
      // request lands, so the UI doesn't wait on the round-trip.
      setNotifications(
        (prev) =>
          prev?.map((n) =>
            n.id === id && !n.read_at
              ? { ...n, read_at: new Date().toISOString() }
              : n
          ) ?? prev
      );
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (updateErr) {
        toast.error('Nie udało się oznaczyć powiadomienia jako przeczytane.');
        load();
      }
    },
    [load]
  );

  const handleClick = useCallback(
    (n: Notification) => {
      if (!n.read_at) markRead(n.id);
      if (n.conversation_id) {
        router.push(`/inbox?c=${n.conversation_id}`);
      }
    },
    [markRead, router]
  );

  const unreadIds =
    notifications?.filter((n) => !n.read_at).map((n) => n.id) ?? [];

  const markAllRead = useCallback(async () => {
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    setNotifications(
      (prev) =>
        prev?.map((n) => (n.read_at ? n : { ...n, read_at: now })) ?? prev
    );
    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .is('read_at', null);
    setMarkingAll(false);
    if (updateErr) {
      toast.error('Nie udało się oznaczyć wszystkich powiadomień.');
      load();
    }
  }, [unreadIds.length, load]);

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (notifications === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Powiadomienia</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tu pojawią się pilne zdarzenia wymagające reakcji: przypisana
            rozmowa, nowy lead, zaległy termin lub ważna zmiana w Dealu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadIds.length === 0 || markingAll}
          onClick={markAllRead}
        >
          {markingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Oznacz wszystkie jako przeczytane
        </Button>
      </div>

      <section className="bg-card rounded-xl border p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-5 text-amber-500" />
          Pilne sprawy sprzedażowe
        </h2>
        {!processAlerts.length ? (
          <p className="text-muted-foreground text-sm">
            Brak zaległych terminów, blokerów i braków blokujących.
          </p>
        ) : (
          <div className="space-y-2">
            {processAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => router.push(`/deals/${alert.id}`)}
                className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left"
              >
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-muted-foreground text-xs">{alert.reason}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {notifications.length === 0 ? (
        <div className="border-border bg-muted/40 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
            <Bell className="text-primary h-6 w-6" />
          </div>
          <p className="text-foreground mt-3 text-sm font-medium">
            Brak nowych powiadomień
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Gdy pojawi się zdarzenie wymagające reakcji, zobaczysz je tutaj.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            const isUnread = !n.read_at;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    isUnread
                      ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                      : 'border-border bg-card hover:border-border/70'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                      isUnread ? 'bg-primary/15' : 'bg-muted'
                    )}
                    aria-hidden
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isUnread ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-sm font-semibold',
                          isUnread ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {n.title}
                      </span>
                      {isUnread && (
                        <span
                          aria-label="Nieprzeczytane"
                          className="bg-primary h-2 w-2 flex-shrink-0 rounded-full"
                        />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {n.body}
                      </p>
                    )}
                    <p className="text-muted-foreground/70 mt-1 text-[11px]">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
