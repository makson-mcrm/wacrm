'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarSync, CheckCircle2, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BUSINESS_TIME_ZONE } from '@/lib/date-time';

type Status = {
  connected: boolean;
  legacy: boolean;
  oauthReady: boolean;
  account: string | null;
  calendarId: string;
  status: string;
  lastSyncedAt: string | null;
  error: string | null;
};

export function GoogleCalendarSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/google-calendar/sync', { cache: 'no-store' });
    const body = (await response.json().catch(() => ({}))) as Status & { error?: string };
    if (!response.ok) toast.error(body.error || 'Nie udało się odczytać statusu.');
    else setStatus(body);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function syncNow() {
    setSyncing(true);
    const response = await fetch('/api/google-calendar/sync', { method: 'POST' });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.ok) toast.success('Kalendarze zsynchronizowane.');
    else toast.error(body.error || 'Synchronizacja nie powiodła się.');
    await load();
    setSyncing(false);
  }

  async function disconnect() {
    if (!confirm('Odłączyć Google Calendar? Zdarzenia w obu kalendarzach pozostaną.')) return;
    const response = await fetch('/api/google-calendar/sync', { method: 'DELETE' });
    if (!response.ok) return toast.error('Nie udało się odłączyć kalendarza.');
    toast.success('Google Calendar odłączony.');
    await load();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Spotkania są aktualizowane automatycznie w WaCRM i Google.
        </p>
      </div>
      <Card className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Sprawdzam połączenie…
          </div>
        ) : status?.connected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
              <div>
                <p className="font-semibold">Google Calendar połączony</p>
                <p className="text-sm text-muted-foreground">
                  {status.account || (status.legacy ? 'Połączenie istniejące' : status.calendarId)}
                </p>
              </div>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Ostatnia synchronizacja</dt>
                <dd className="font-medium">
                  {status.lastSyncedAt
                    ? new Date(status.lastSyncedAt).toLocaleString('pl-PL', {
                        timeZone: BUSINESS_TIME_ZONE,
                      })
                    : 'Jeszcze nie wykonano'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stan</dt>
                <dd className="font-medium">
                  {status.error ? `Wymaga uwagi: ${status.error}` : 'Działa prawidłowo'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void syncNow()} disabled={syncing}>
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <CalendarSync className="size-4" />}
                Synchronizuj teraz
              </Button>
              {!status.legacy && (
                <Button variant="outline" onClick={() => void disconnect()}>
                  <Unplug className="size-4" /> Odłącz
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Google Calendar niepołączony</p>
              <p className="text-sm text-muted-foreground">
                Połącz konto raz. Później synchronizacja działa podczas pracy w WaCRM także na iPhonie.
              </p>
            </div>
            {status?.oauthReady ? (
              <Button render={<a href="/api/google-calendar/oauth/start" />}>
                <CalendarSync className="size-4" /> Połącz Google Calendar
              </Button>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Połączenie oczekuje na przygotowanie bezpiecznej autoryzacji Google.
              </p>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

