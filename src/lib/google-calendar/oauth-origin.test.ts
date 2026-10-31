import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as start } from '@/app/api/google-calendar/oauth/start/route';
import { GET as callback } from '@/app/api/google-calendar/oauth/callback/route';

const doubles = vi.hoisted(() => ({
  cookie: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  db: { from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn() },
  fetch: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => doubles.cookie) }));
vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(async () => ({ supabase: doubles.db, accountId: 'synthetic', userId: 'synthetic' })),
  toErrorResponse: vi.fn(() => { throw new Error('Unexpected auth error'); }),
}));
vi.mock('@/lib/whatsapp/encryption', () => ({ encrypt: vi.fn(() => 'encrypted-synthetic-token') }));

const live = 'https://mediumseagreen-pelican-353577.hostingersite.com';
function request(path: string, host = new URL(live).host) {
  return new NextRequest(`https://0.0.0.0:3000/api/google-calendar/oauth/${path}`, {
    headers: { 'x-forwarded-host': host, 'x-forwarded-proto': 'https' },
  });
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  vi.stubEnv('ALLOWED_PUBLIC_FORM_ORIGINS', '');
  vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', 'synthetic-client');
  vi.stubEnv('GOOGLE_CALENDAR_CLIENT_SECRET', 'synthetic-secret');
  doubles.cookie.get.mockReturnValue({ value: 'synthetic-state' });
  doubles.fetch.mockReset();
  vi.stubGlobal('fetch', doubles.fetch);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  doubles.db.from.mockReturnValue(doubles.db);
  doubles.db.select.mockReturnValue(doubles.db);
  doubles.db.eq.mockReturnValue(doubles.db);
  doubles.db.maybeSingle.mockResolvedValue({ data: null });
  doubles.db.upsert.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Google OAuth proxy origins', () => {
  it('sends a public redirect_uri to Google', async () => {
    const response = await start(request('start'));
    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('redirect_uri')).toBe(`${live}/api/google-calendar/oauth/callback`);
    expect(doubles.cookie.set).toHaveBeenCalledOnce();
    expect(doubles.fetch).not.toHaveBeenCalled();
  });

  it('rejects an evil host before initiating OAuth', async () => {
    const response = await start(request('start', 'evil.example'));
    expect(response.headers.get('location')).toBe('/settings?tab=calendar&google=configuration_required');
    expect(doubles.cookie.set).not.toHaveBeenCalled();
    expect(doubles.fetch).not.toHaveBeenCalled();
  });

  it('uses a relative redirect when Google is unconfigured', async () => {
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', '');
    const response = await start(request('start'));
    expect(response.headers.get('location')).toBe('/settings?tab=calendar&google=configuration_required');
  });

  it('uses a relative redirect for an invalid callback', async () => {
    const response = await callback(request('callback?code=synthetic&state=wrong'));
    expect(response.headers.get('location')).toBe('/settings?tab=calendar&google=authorization_failed');
    expect(doubles.fetch).not.toHaveBeenCalled();
  });

  it('rejects an evil callback host before any token exchange', async () => {
    const response = await callback(request('callback?code=synthetic&state=synthetic-state', 'evil.example'));
    expect(response.headers.get('location')).toBe('/settings?tab=calendar&google=authorization_failed');
    expect(doubles.fetch).not.toHaveBeenCalled();
  });

  it('uses the same public redirect_uri in the exchange and a relative success redirect', async () => {
    doubles.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'synthetic-token' }) })
      .mockResolvedValueOnce({ json: async () => ({ email: 'synthetic@example.invalid' }) });
    const response = await callback(request('callback?code=synthetic&state=synthetic-state'));
    expect(response.headers.get('location')).toBe('/settings?tab=calendar&google=connected');
    expect(doubles.fetch).toHaveBeenCalledTimes(2);
    expect(doubles.fetch.mock.calls[0][1].body.get('redirect_uri'))
      .toBe(`${live}/api/google-calendar/oauth/callback`);
    expect(doubles.db.upsert).toHaveBeenCalledOnce();
  });
});
