import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const db = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(async () => ({
    accountId: 'synthetic-account', userId: 'synthetic-user', supabase: db,
  })),
  toErrorResponse: vi.fn(() => { throw new Error('Unexpected auth error'); }),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true })),
  RATE_LIMITS: { adminAction: {} },
  rateLimitResponse: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  vi.stubEnv('ALLOWED_PUBLIC_FORM_ORIGINS', '');
  db.from.mockReturnValue(db);
  db.insert.mockReturnValue(db);
  db.select.mockReturnValue(db);
  db.single.mockResolvedValue({ data: { id: 'synthetic-invite' }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

const live = 'https://mediumseagreen-pelican-353577.hostingersite.com';
function request(headers = {}) {
  return new Request('https://0.0.0.0:3000/api/account/invitations', {
    method: 'POST', headers, body: JSON.stringify({ role: 'agent' }),
  });
}

describe('invitation links use a trusted public origin', () => {
  it('creates a LIVE link instead of an internal or marketing-site URL', async () => {
    const response = await POST(request({
      host: '0.0.0.0:3000', 'x-forwarded-host': new URL(live).host, 'x-forwarded-proto': 'https',
    }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toBe(`${live}/join/${body.token}`);
    expect(db.insert).toHaveBeenCalledOnce();
    expect(db.insert.mock.calls[0][0]).not.toHaveProperty('token');
  });

  it.each([{}, { host: '0.0.0.0:3000' }, {
    host: 'evil.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https',
  }])('rejects an unresolved public origin before inserting: %j', async (headers) => {
    const response = await POST(request(headers));
    expect(response.status).toBe(503);
    expect(db.from).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain('evil.example');
  });

  it('uses explicit trusted configuration even with absent proxy headers', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', live);
    const response = await POST(request());
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toBe(`${live}/join/${body.token}`);
  });
});
