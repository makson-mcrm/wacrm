import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/whatsapp/encryption';
import {
  chooseSyncDirection,
  googleEventBody,
  googleStart,
} from './sync-helpers';

const GOOGLE_API = 'https://www.googleapis.com/calendar/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type Connection = {
  account_id: string;
  user_id: string;
  calendar_id: string;
  account_email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  sync_token: string | null;
  last_synced_at: string | null;
};

type GoogleEvent = {
  id: string;
  etag?: string;
  status?: string;
  updated?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type LocalEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
  google_event_id: string | null;
  google_updated_at: string | null;
  local_updated_at: string | null;
  last_synced_at: string | null;
  deleted_at: string | null;
  sync_conflict: boolean;
};

export type SyncResult = {
  pushed: number;
  pulled: number;
  deleted: number;
  conflicts: number;
  connected: boolean;
};

async function tokenFor(
  db: SupabaseClient,
  connection: Connection | null,
): Promise<{ token: string; calendarId: string; legacy: boolean }> {
  if (!connection) {
    const legacy = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN?.trim();
    if (!legacy) throw new Error('Google Calendar nie jest połączony.');
    return {
      token: legacy,
      calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary',
      legacy: true,
    };
  }

  let token = decrypt(connection.access_token);
  const expiresSoon =
    !!connection.expires_at && +new Date(connection.expires_at) < Date.now() + 60_000;
  if (!expiresSoon) return { token, calendarId: connection.calendar_id, legacy: false };
  if (!connection.refresh_token) throw new Error('Połączenie Google wygasło. Połącz konto ponownie.');
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Brak konfiguracji OAuth Google Calendar.');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decrypt(connection.refresh_token),
      grant_type: 'refresh_token',
    }),
  });
  const refreshed = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !refreshed.access_token)
    throw new Error(refreshed.error_description || 'Nie udało się odnowić połączenia Google.');
  token = refreshed.access_token;
  await db
    .from('google_calendar_connections')
    .update({
      access_token: encrypt(token),
      expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('account_id', connection.account_id);
  return { token, calendarId: connection.calendar_id, legacy: false };
}

async function googleJson<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (response.status === 204) return {} as T;
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok)
    throw Object.assign(new Error(data.error?.message || 'Błąd Google Calendar.'), {
      status: response.status,
    });
  return data;
}

async function listGoogleEvents(
  token: string,
  calendarId: string,
  syncToken: string | null,
) {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const url = new URL(`${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('showDeleted', 'true');
    url.searchParams.set('maxResults', '2500');
    if (syncToken) url.searchParams.set('syncToken', syncToken);
    else
      url.searchParams.set(
        'timeMin',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      );
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await googleJson<{
      items?: GoogleEvent[];
      nextPageToken?: string;
      nextSyncToken?: string;
    }>(url.toString(), token);
    events.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { events, nextSyncToken };
}

function differs(local: LocalEvent, google: GoogleEvent) {
  const start = googleStart(google.start);
  const end = googleStart(google.end);
  return (
    (google.summary || 'Termin z Kalendarza Google') !== local.title ||
    (!!start && +new Date(start) !== +new Date(local.starts_at)) ||
    (!!end && +new Date(end) !== +new Date(local.ends_at ?? 0)) ||
    (google.status === 'cancelled') !== !!local.deleted_at
  );
}

export async function syncGoogleCalendar(input: {
  db: SupabaseClient;
  accountId: string;
  userId: string;
}): Promise<SyncResult> {
  const { db, accountId, userId } = input;
  const { data: row } = await db
    .from('google_calendar_connections')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();
  const connection = (row as Connection | null) ?? null;
  const credentials = await tokenFor(db, connection);
  const now = new Date().toISOString();
  let pushed = 0;
  let pulled = 0;
  let deleted = 0;
  let conflicts = 0;

  try {
    let listed: Awaited<ReturnType<typeof listGoogleEvents>>;
    try {
      listed = await listGoogleEvents(
        credentials.token,
        credentials.calendarId,
        connection?.sync_token ?? null,
      );
    } catch (error) {
      if ((error as { status?: number }).status !== 410 || !connection?.sync_token)
        throw error;
      listed = await listGoogleEvents(credentials.token, credentials.calendarId, null);
    }

    const { data: localRows, error: localError } = await db
      .from('calendar_events')
      .select(
        'id,title,starts_at,ends_at,status,google_event_id,google_updated_at,local_updated_at,last_synced_at,deleted_at,sync_conflict',
      )
      .eq('account_id', accountId);
    if (localError) throw localError;
    const locals = (localRows ?? []) as LocalEvent[];
    const byGoogle = new Map(
      locals.filter((event) => event.google_event_id).map((event) => [event.google_event_id!, event]),
    );

    for (const remote of listed.events) {
      if (!remote.id) continue;
      const local = byGoogle.get(remote.id);
      if (!local) {
        if (remote.status === 'cancelled') continue;
        const start = googleStart(remote.start);
        if (!start) continue;
        const { error } = await db.from('calendar_events').insert({
          account_id: accountId,
          user_id: userId,
          title: remote.summary || 'Termin z Kalendarza Google',
          event_type: 'spotkanie',
          starts_at: start,
          ends_at: googleStart(remote.end),
          google_event_id: remote.id,
          google_etag: remote.etag ?? null,
          google_updated_at: remote.updated ?? now,
          local_updated_at: remote.updated ?? now,
          last_synced_at: now,
          status: 'zaplanowane',
        });
        if (error) throw error;
        pulled += 1;
        continue;
      }
      const hasDifference = differs(local, remote);
      const direction = chooseSyncDirection({
        localUpdatedAt: local.local_updated_at,
        googleUpdatedAt: remote.updated,
        lastSyncedAt: local.last_synced_at,
        differs: hasDifference,
      });
      if (direction === 'conflict') {
        await db
          .from('calendar_events')
          .update({
            sync_conflict: true,
            sync_conflict_reason: 'Zdarzenie zmieniono jednocześnie w WaCRM i Google.',
            google_updated_at: remote.updated ?? null,
          })
          .eq('id', local.id);
        conflicts += 1;
      } else if (direction === 'google') {
        const start = googleStart(remote.start);
        await db
          .from('calendar_events')
          .update({
            title: remote.summary || 'Termin z Kalendarza Google',
            starts_at: start || local.starts_at,
            ends_at: googleStart(remote.end),
            status: remote.status === 'cancelled' ? 'anulowane' : 'zaplanowane',
            deleted_at: remote.status === 'cancelled' ? remote.updated ?? now : null,
            google_etag: remote.etag ?? null,
            google_updated_at: remote.updated ?? now,
            local_updated_at: remote.updated ?? now,
            last_synced_at: now,
            sync_conflict: false,
            sync_conflict_reason: null,
          })
          .eq('id', local.id);
        if (remote.status === 'cancelled') deleted += 1;
        else pulled += 1;
      } else if (direction === 'none') {
        await db
          .from('calendar_events')
          .update({
            google_etag: remote.etag ?? null,
            google_updated_at: remote.updated ?? local.google_updated_at,
            last_synced_at: now,
            sync_conflict: false,
            sync_conflict_reason: null,
          })
          .eq('id', local.id);
      }
    }

    const { data: freshRows, error: freshError } = await db
      .from('calendar_events')
      .select(
        'id,title,starts_at,ends_at,status,google_event_id,google_updated_at,local_updated_at,last_synced_at,deleted_at,sync_conflict',
      )
      .eq('account_id', accountId);
    if (freshError) throw freshError;
    for (const local of (freshRows ?? []) as LocalEvent[]) {
      if (local.sync_conflict) continue;
      const changed =
        !local.last_synced_at ||
        +new Date(local.local_updated_at ?? 0) > +new Date(local.last_synced_at);
      if (local.google_event_id && local.deleted_at && changed) {
        await googleJson(
          `${GOOGLE_API}/calendars/${encodeURIComponent(credentials.calendarId)}/events/${encodeURIComponent(local.google_event_id)}`,
          credentials.token,
          { method: 'DELETE' },
        );
        await db
          .from('calendar_events')
          .update({ last_synced_at: now, google_updated_at: now })
          .eq('id', local.id);
        deleted += 1;
      } else if (!local.deleted_at && (!local.google_event_id || changed)) {
        const method = local.google_event_id ? 'PATCH' : 'POST';
        const url = `${GOOGLE_API}/calendars/${encodeURIComponent(credentials.calendarId)}/events${local.google_event_id ? `/${encodeURIComponent(local.google_event_id)}` : ''}`;
        const remote = await googleJson<GoogleEvent>(url, credentials.token, {
          method,
          body: JSON.stringify(googleEventBody(local)),
        });
        await db
          .from('calendar_events')
          .update({
            google_event_id: remote.id,
            google_etag: remote.etag ?? null,
            google_updated_at: remote.updated ?? now,
            last_synced_at: now,
            sync_conflict: false,
            sync_conflict_reason: null,
          })
          .eq('id', local.id);
        pushed += 1;
      }
    }

    if (connection) {
      await db
        .from('google_calendar_connections')
        .update({
          sync_token: listed.nextSyncToken ?? connection.sync_token,
          last_synced_at: now,
          last_error: null,
          status: 'connected',
          updated_at: now,
        })
        .eq('account_id', accountId);
    }
    return { pushed, pulled, deleted, conflicts, connected: true };
  } catch (error) {
    if (connection)
      await db
        .from('google_calendar_connections')
        .update({
          status: 'error',
          last_error: error instanceof Error ? error.message : 'Błąd synchronizacji.',
          updated_at: now,
        })
        .eq('account_id', accountId);
    throw error;
  }
}

