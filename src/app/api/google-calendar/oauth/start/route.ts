import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET(request: NextRequest) {
  try {
    await requireRole('agent');
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
    if (!clientId)
      return NextResponse.redirect(
        new URL('/settings?tab=calendar&google=configuration_required', request.url),
      );
    const state = randomBytes(24).toString('hex');
    const cookieStore = await cookies();
    cookieStore.set('google_calendar_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });
    const callback = new URL('/api/google-calendar/oauth/callback', request.nextUrl.origin);
    const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorization.searchParams.set('client_id', clientId);
    authorization.searchParams.set('redirect_uri', callback.toString());
    authorization.searchParams.set('response_type', 'code');
    authorization.searchParams.set(
      'scope',
      'openid email https://www.googleapis.com/auth/calendar.events',
    );
    authorization.searchParams.set('access_type', 'offline');
    authorization.searchParams.set('prompt', 'consent');
    authorization.searchParams.set('include_granted_scopes', 'true');
    authorization.searchParams.set('state', state);
    return NextResponse.redirect(authorization);
  } catch (error) {
    return toErrorResponse(error);
  }
}

