import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

type GoogleEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export async function POST() {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const token = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN?.trim();
    const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary';
    if (!token)
      return NextResponse.json(
        {
          error:
            'Kalendarz Google nie jest skonfigurowany. Ustaw GOOGLE_CALENDAR_ACCESS_TOKEN i opcjonalnie GOOGLE_CALENDAR_ID.',
        },
        { status: 503 }
      );
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const { data: local, error: localError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('account_id', accountId)
      .order('starts_at');
    if (localError) throw localError;

    let pushed = 0;
    for (const event of local ?? []) {
      if (event.google_event_id) continue;
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            summary: event.title,
            description: event.description || undefined,
            location: event.location || undefined,
            start: { dateTime: event.starts_at },
            end: {
              dateTime:
                event.ends_at ||
                new Date(
                  +new Date(event.starts_at) + 60 * 60 * 1000
                ).toISOString(),
            },
          }),
        }
      );
      const created = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: { message?: string };
      };
      if (!response.ok || !created.id)
        return NextResponse.json(
          {
            error:
              created.error?.message ||
              'Nie udało się wysłać terminu do Google.',
          },
          { status: 502 }
        );
      await supabase
        .from('calendar_events')
        .update({ google_event_id: created.id })
        .eq('id', event.id);
      pushed += 1;
    }

    const timeMin = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();
    const listUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    );
    listUrl.searchParams.set('singleEvents', 'true');
    listUrl.searchParams.set('orderBy', 'startTime');
    listUrl.searchParams.set('timeMin', timeMin);
    listUrl.searchParams.set('maxResults', '2500');
    const listResponse = await fetch(listUrl, { headers });
    const listed = (await listResponse.json().catch(() => ({}))) as {
      items?: GoogleEvent[];
      error?: { message?: string };
    };
    if (!listResponse.ok)
      return NextResponse.json(
        {
          error:
            listed.error?.message ||
            'Nie udało się odczytać Kalendarza Google.',
        },
        { status: 502 }
      );
    const knownIds = new Set(
      (local ?? []).map((event) => event.google_event_id).filter(Boolean)
    );
    const incoming = (listed.items ?? []).filter(
      (event) =>
        event.id &&
        !knownIds.has(event.id) &&
        (event.start?.dateTime || event.start?.date)
    );
    if (incoming.length) {
      const { error } = await supabase.from('calendar_events').insert(
        incoming.map((event) => ({
          account_id: accountId,
          user_id: userId,
          title: event.summary || 'Termin z Kalendarza Google',
          event_type: 'spotkanie',
          starts_at:
            event.start?.dateTime || `${event.start?.date}T00:00:00.000Z`,
          ends_at:
            event.end?.dateTime ||
            (event.end?.date ? `${event.end.date}T00:00:00.000Z` : null),
          description: event.description || null,
          location: event.location || null,
          google_event_id: event.id,
          status: 'zaplanowane',
        }))
      );
      if (error) throw error;
    }
    return NextResponse.json({ pushed, pulled: incoming.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
