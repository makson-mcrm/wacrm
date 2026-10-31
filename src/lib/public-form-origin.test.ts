import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as leads from '@/app/api/public/leads/route';
import * as questionnaires from '@/app/api/public/questionnaires/route';
import * as bookings from '@/app/api/public/bookings/route';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  isAllowedPublicFormOrigin,
  publicFormCorsHeaders,
} from './public-leads';

vi.mock('@/lib/flows/admin-client', () => ({
  supabaseAdmin: vi.fn(() => {
    throw new Error('Database access forbidden');
  }),
}));
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

const live = 'https://mediumseagreen-pelican-353577.hostingersite.com';
const allowed = [
  live,
  'https://makson.space',
  'https://www.makson.space',
  'https://crm.makson.space',
  'https://darkslateblue-mallard-102045.hostingersite.com',
  'https://mediumslateblue-okapi-264879.hostingersite.com',
  'https://forms.example.invalid:8443',
  'https://second.example.invalid',
];
const denied = [
  'https://evil.example',
  'https://evil-mediumseagreen-pelican-353577.hostingersite.com',
  `${live}.evil.example`,
  'https://another.hostingersite.com',
  `${live}:8443`,
  'https://evil-makson.space',
  'https://makson.space.evil.example',
  'https://sub.forms.example.invalid:8443',
  'https://forms.example.invalid',
  live.replace('https:', 'http:'),
  'http://makson.space',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  'null',
  'https://null',
  'file://',
  'file:///tmp/form.html',
  'ftp://makson.space',
  'https://user:password@makson.space',
  'https://makson.space@evil.example',
  'https://makson.space/path',
  'https://makson.space?query=1',
  'https://makson.space#fragment',
  'https://makson.space https://evil.example',
  'https://*.example.invalid',
  'https://wildcard.example.invalid',
  'https://path.example.invalid',
  'https://credentials.example.invalid',
];

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv(
    'ALLOWED_PUBLIC_FORM_ORIGINS',
    [
      ' https://forms.example.invalid:8443 ',
      '',
      ' https://second.example.invalid ',
      'https://*.example.invalid',
      'https://path.example.invalid/path',
      'https://user:password@credentials.example.invalid',
      'http://makson.space',
      'http://localhost:3000',
      'null',
      'file://',
    ].join(',')
  );
  vi.mocked(checkRateLimit).mockReturnValue({
    success: true,
    remaining: 7,
    limit: 8,
    reset: Date.now() + 60_000,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('public form origin policy', () => {
  it.each(allowed)('allows %s', (origin) => {
    expect(isAllowedPublicFormOrigin(origin, `${live}/api/public/leads`)).toBe(
      true
    );
  });

  it.each(denied)('denies %s', (origin) => {
    expect(isAllowedPublicFormOrigin(origin, `${live}/api/public/leads`)).toBe(
      false
    );
  });

  it('accepts a new exact same-origin host without a hosting allowlist entry', () => {
    const origin = 'https://new-deployment.example.invalid:8443';
    expect(
      isAllowedPublicFormOrigin(origin, `${origin}/api/public/leads?key=value`)
    ).toBe(true);
    expect(isAllowedPublicFormOrigin(origin)).toBe(false);
  });

  it('does not infer HTTPS from an HTTP request URL', () => {
    expect(
      isAllowedPublicFormOrigin(
        'https://new-deployment.example.invalid',
        'http://new-deployment.example.invalid'
      )
    ).toBe(false);
  });

  it.each([
    null,
    '',
    'not-a-url',
    'file:///tmp/form.html',
    'https://user@evil.example',
  ])(
    'does not derive same-origin from an invalid request URL: %s',
    (requestUrl) => {
      expect(
        isAllowedPublicFormOrigin(
          'https://evil.example',
          requestUrl ?? undefined
        )
      ).toBe(false);
    }
  );

  it('keeps the missing Origin behavior', () => {
    expect(isAllowedPublicFormOrigin(null, live)).toBe(true);
    expect(isAllowedPublicFormOrigin('')).toBe(true);
  });

  it.each(['development', 'test'])(
    'permits local HTTP only outside production (%s)',
    (mode) => {
      vi.stubEnv('NODE_ENV', mode);
      expect(isAllowedPublicFormOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedPublicFormOrigin('http://127.0.0.1:3000')).toBe(true);
      expect(
        isAllowedPublicFormOrigin(
          'http://localhost:4100',
          'http://localhost:4100/api/public/leads'
        )
      ).toBe(true);
      expect(
        isAllowedPublicFormOrigin(
          'http://[::1]:3000',
          'http://[::1]:3000/api/public/leads'
        )
      ).toBe(true);
      expect(
        isAllowedPublicFormOrigin(
          'http://makson.space',
          'http://makson.space/api/public/leads'
        )
      ).toBe(false);
    }
  );

  it.each(allowed)('uses the same policy for CORS GET: %s', (origin) => {
    const headers = publicFormCorsHeaders(
      new Request(`${live}/api/public/availability`, {
        headers: { origin },
      }),
      'GET, OPTIONS'
    );
    expect(headers['Access-Control-Allow-Origin']).toBe(origin);
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
    expect(headers.Vary).toBe('Origin');
  });

  it.each(denied)(
    'does not reflect a forbidden origin in CORS GET: %s',
    (origin) => {
      const headers = publicFormCorsHeaders(
        new Request(`${live}/api/public/availability`, {
          headers: { origin },
        }),
        'GET, OPTIONS'
      );
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers.Vary).toBe('Origin');
    }
  );
});

describe.each([
  ['leads', leads],
  ['questionnaires', questionnaires],
  ['bookings', bookings],
] as const)('/api/public/%s real handlers', (path, route) => {
  function request(origin: string | null, extraHeaders = {}, method = 'POST') {
    return new Request(`${live}/api/public/${path}`, {
      method,
      headers: { ...(origin === null ? {} : { origin }), ...extraHeaders },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
  }

  it.each(allowed)(
    'passes origin validation and reaches payload validation: %s',
    async (origin) => {
      const response = await route.POST(request(origin));
      expect(response.status).toBe(400);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Vary')).toBe('Origin');
      expect(supabaseAdmin).not.toHaveBeenCalled();
    }
  );

  it.each(denied)(
    'returns 403 before rate limit or database access: %s',
    async (origin) => {
      const response = await route.POST(request(origin));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: 'Niedozwolone źródło żądania.',
      });
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(checkRateLimit).not.toHaveBeenCalled();
      expect(supabaseAdmin).not.toHaveBeenCalled();
    }
  );

  it('ignores forged Host and forwarding headers', async () => {
    const response = await route.POST(
      request('https://evil.example', {
        host: 'evil.example',
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'https',
        forwarded: 'host=evil.example;proto=https',
      })
    );
    expect(response.status).toBe(403);
    const sameOrigin = await route.POST(
      request(live, { host: 'evil.example' })
    );
    expect(sameOrigin.status).toBe(400);
  });

  it('keeps requests without Origin allowed without CORS reflection', async () => {
    const response = await route.POST(request(null));
    expect(response.status).toBe(400);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(supabaseAdmin).not.toHaveBeenCalled();
  });

  it.each([...allowed, null])(
    'allows preflight with the same policy: %s',
    async (origin) => {
      const response = await route.OPTIONS(request(origin, {}, 'OPTIONS'));
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'POST, OPTIONS'
      );
      expect(checkRateLimit).not.toHaveBeenCalled();
      expect(supabaseAdmin).not.toHaveBeenCalled();
    }
  );

  it.each(denied)('rejects forbidden preflight: %s', async (origin) => {
    const response = await route.OPTIONS(request(origin, {}, 'OPTIONS'));
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(supabaseAdmin).not.toHaveBeenCalled();
  });

  it('retains CORS and rate-limit headers on 429 responses', async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      success: false,
      remaining: 0,
      limit: 8,
      reset: Date.now() + 60_000,
    });
    const response = await route.POST(request(live));
    expect(response.status).toBe(429);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(live);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(supabaseAdmin).not.toHaveBeenCalled();
  });
});
