import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { syncGoogleCalendar } from '@/lib/google-calendar/sync';

export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { data, error } = await supabase
      .from('google_calendar_connections')
      .select('account_email,calendar_id,status,last_synced_at,last_error')
      .eq('account_id', accountId)
      .maybeSingle();
    if (error) throw error;
    const legacy = !data && !!process.env.GOOGLE_CALENDAR_ACCESS_TOKEN?.trim();
    return NextResponse.json({
      connected: !!data || legacy,
      legacy,
      oauthReady: !!(
        process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
      ),
      account: data?.account_email ?? null,
      calendarId: data?.calendar_id ?? process.env.GOOGLE_CALENDAR_ID?.trim() ?? 'primary',
      status: data?.status ?? (legacy ? 'connected' : 'disconnected'),
      lastSyncedAt: data?.last_synced_at ?? null,
      error: data?.last_error ?? null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST() {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    return NextResponse.json(
      await syncGoogleCalendar({ db: supabase, accountId, userId }),
    );
  } catch (error) {
    if (error instanceof Error)
      return NextResponse.json({ error: error.message }, { status: 502 });
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { error } = await supabase
      .from('google_calendar_connections')
      .delete()
      .eq('account_id', accountId);
    if (error) throw error;
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

