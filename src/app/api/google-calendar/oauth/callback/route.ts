import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { encrypt } from '@/lib/whatsapp/encryption';

export async function GET(request: NextRequest) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const cookieStore = await cookies();
    const expected = cookieStore.get('google_calendar_oauth_state')?.value;
    cookieStore.delete('google_calendar_oauth_state');
    const state = request.nextUrl.searchParams.get('state');
    const code = request.nextUrl.searchParams.get('code');
    if (!expected || !state || expected !== state || !code)
      return NextResponse.redirect(
        new URL('/settings?tab=calendar&google=authorization_failed', request.url),
      );
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) throw new Error('Brak konfiguracji OAuth Google Calendar.');
    const redirectUri = new URL('/api/google-calendar/oauth/callback', request.nextUrl.origin);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri.toString(),
        grant_type: 'authorization_code',
      }),
    });
    const token = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!tokenResponse.ok || !token.access_token)
      throw new Error(token.error_description || 'Google nie zwrócił tokenu dostępu.');
    const identityResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const identity = (await identityResponse.json().catch(() => ({}))) as {
      email?: string;
    };
    const { data: existing } = await supabase
      .from('google_calendar_connections')
      .select('refresh_token')
      .eq('account_id', accountId)
      .maybeSingle();
    const { error } = await supabase.from('google_calendar_connections').upsert({
      account_id: accountId,
      user_id: userId,
      calendar_id: process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary',
      account_email: identity.email ?? null,
      access_token: encrypt(token.access_token),
      refresh_token: token.refresh_token
        ? encrypt(token.refresh_token)
        : existing?.refresh_token ?? null,
      expires_at: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(),
      sync_token: null,
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&google=connected', request.url),
    );
  } catch (error) {
    console.error('[google-calendar/oauth/callback]', error);
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&google=authorization_failed', request.url),
    );
  }
}

