import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { GET } from './route';

const exchange = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession: exchange } })),
}));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  exchange.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('auth callback behind the standalone proxy', () => {
  const headers: Record<string, string>[] = [
    {},
    { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' },
    {
      'x-forwarded-host': 'mediumseagreen-pelican-353577.hostingersite.com',
      'x-forwarded-proto': 'https',
    },
  ];
  describe.each(headers)('headers %j', (header) => {
    const origin = `https://${header['x-forwarded-host'] || '0.0.0.0:3000'}`;
    const request = (query = '') =>
      new NextRequest(`https://0.0.0.0:3000/auth/callback${query}`, { headers: header });

    it('redirects a missing code to the request origin, without initializing auth', async () => {
      const response = await GET(request('?next=//evil'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${origin}/login?error=missing_auth_code`);
      expect(createClient).not.toHaveBeenCalled();
    });

    it('redirects an invalid code to the request origin', async () => {
      exchange.mockResolvedValue({ error: { message: 'Synthetic invalid code' } });
      const response = await GET(request('?code=abc123'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${origin}/login?error=auth_callback_failed`);
      expect(exchange).toHaveBeenCalledExactlyOnceWith('abc123');
    });

    it('exchanges a valid code and returns to /dashboard', async () => {
      const response = await GET(request('?code=synthetic-valid'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
      expect(exchange).toHaveBeenCalledExactlyOnceWith('synthetic-valid');
    });

    it.each(['/reset-password', '/join/synthetic-token', '/dashboard?tab=sales']) (
      'preserves the local destination %s', async (next) => {
        const response = await GET(request(`?code=ok&next=${encodeURIComponent(next)}`));
        expect(response.headers.get('location')).toBe(`${origin}${next}`);
      },
    );

    it.each([
      '//evil', 'https://evil.example', '/\\evil.example', '///evil.example',
      '/%2fevil.example', '/%5cevil.example', '/..//evil.example',
      '/\t/evil.example', '/%0d%0aLocation:https://evil.example', '%',
    ])('ignores an unsafe next=%s', async (next) => {
      const response = await GET(request(`?code=ok&next=${encodeURIComponent(next)}`));
      expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
    });
  });
});
