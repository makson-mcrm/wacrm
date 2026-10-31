import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// --- Scenario knobs the mock reads -----------------------------------------
// `mockUser`         — what getUser() resolves to (a refreshed session ⇒ user,
//                      or null for the logged-out path).
// `refreshedCookies` — cookies Supabase writes via setAll() during getUser(),
//                      i.e. the freshly *rotated* auth token. The whole point
//                      of the test is that these must survive onto whatever
//                      response the middleware returns — including redirects.
let mockUser: { id: string } | null = null;
let refreshedCookies: Array<{
  name: string;
  value: string;
  options: Record<string, unknown>;
}> = [];

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((
    _url: string,
    _key: string,
    opts: {
      cookies: { setAll: (c: typeof refreshedCookies) => void };
    },
  ) => ({
    auth: {
      // Mirrors real auth-js: an expired access token is transparently
      // refreshed inside getUser(), which rotates the refresh token and
      // pushes the new cookies through setAll() before resolving.
      getUser: async () => {
        if (refreshedCookies.length) opts.cookies.setAll(refreshedCookies);
        return { data: { user: mockUser } };
      },
    },
  })),
}));

// Imported after the mock is registered.
const { middleware } = await import("./middleware");
const { createServerClient } = await import("@supabase/ssr");

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  mockUser = null;
  refreshedCookies = [];
});

afterEach(() => vi.clearAllMocks());

describe("public legal pages", () => {
  it.each([
    '/polityka-prywatnosci', '/regulamin', '/usuwanie-danych',
    '/polityka-prywatnosci/', '/regulamin/', '/usuwanie-danych/',
  ])("serves %s without creating an auth client", async (path) => {
    const res = await middleware(new NextRequest(`https://app.test${path}`));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});

describe('anonymous page access', () => {
  it.each([
    [{ 'x-forwarded-host': 'public.test', 'x-forwarded-proto': 'https', host: 'internal.test' }, 'https://public.test/login'],
    [{ host: 'public.test:3111' }, 'http://public.test:3111/login'],
    [{}, 'http://fallback.test:3111/login'],
  ] as const)('redirects all protected pages using headers %j', async (headers, location) => {
    vi.stubEnv('NODE_ENV', 'development');
    try {
      for (const path of ['/contacts', '/deals', '/pipelines', '/companies', '/tasks', '/settings']) {
        const res = await middleware(new NextRequest(`http://fallback.test:3111${path}`, { headers }));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe(location);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('allows /login without a session', async () => {
    const res = await middleware(new NextRequest('https://public.test/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('keeps WhatsApp API authentication and webhook access unchanged', async () => {
    const api = await middleware(new NextRequest('https://public.test/api/whatsapp/messages'));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: 'Unauthorized' });
    const webhook = await middleware(new NextRequest('https://public.test/api/whatsapp/webhook'));
    expect(webhook.status).toBe(200);
  });
});

const ROTATED = {
  name: "sb-test-auth-token",
  value: "rotated-refresh-token",
  options: { path: "/", httpOnly: true },
};

describe("middleware — refreshed auth cookies survive redirects", () => {
  it.each([
    ['/login', true, '/dashboard'],
    ['/signup?invite=synthetic-token', true, '/join/synthetic-token'],
    ['/forgot-password', true, '/dashboard'],
    ['/dashboard', false, '/login'],
  ])('uses the public origin for %s with the internal listener URL', async (path, signedIn, location) => {
    mockUser = signedIn ? { id: 'synthetic-user' } : null;
    refreshedCookies = [ROTATED];
    const res = await middleware(new NextRequest(`https://0.0.0.0:3000${path}`, {
      headers: { 'x-forwarded-host': 'public.test', 'x-forwarded-proto': 'https' },
    }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`https://public.test${location}`);
    expect(res.cookies.get(ROTATED.name)?.value).toBe(ROTATED.value);
  });

  it.each([false, true])('allows /auth/callback through without losing code/next (signed in: %s)', async (signedIn) => {
    mockUser = signedIn ? { id: 'synthetic-user' } : null;
    const res = await middleware(new NextRequest(
      'https://0.0.0.0:3000/auth/callback?code=synthetic&next=/reset-password',
    ));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it("carries the rotated token when redirecting a signed-in user off /login", async () => {
    mockUser = { id: "user-1" };
    refreshedCookies = [ROTATED];

    const res = await middleware(
      new NextRequest("https://app.test/login"),
    );

    // Redirect to /dashboard…
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    // …and the rotated cookie MUST ride along, otherwise the browser keeps
    // replaying the now-consumed refresh token and the session wedges until
    // the user manually clears cookies.
    expect(res.cookies.get(ROTATED.name)?.value).toBe(ROTATED.value);
  });

  it("carries the rotated token when redirecting an unauth user to /login", async () => {
    mockUser = null;
    // Even on the logged-out path getUser() may emit cookie writes (e.g.
    // clearing a dead session); those must not be dropped on the redirect.
    refreshedCookies = [{ ...ROTATED, value: "cleared" }];

    const res = await middleware(
      new NextRequest("https://app.test/dashboard"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.cookies.get(ROTATED.name)?.value).toBe("cleared");
  });

  it("redirects a signed-in user with an invite token to /join/<token>", async () => {
    mockUser = { id: "user-1" };
    refreshedCookies = [ROTATED];

    const res = await middleware(
      new NextRequest("https://app.test/login?invite=abc123"),
    );

    expect(res.headers.get("location")).toContain("/join/abc123");
    expect(res.cookies.get(ROTATED.name)?.value).toBe(ROTATED.value);
  });

  it("passes through (no redirect) for a signed-in user on a protected page", async () => {
    mockUser = { id: "user-1" };
    refreshedCookies = [ROTATED];

    const res = await middleware(
      new NextRequest("https://app.test/dashboard"),
    );

    // No redirect — the normal NextResponse.next() already carries cookies.
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get(ROTATED.name)?.value).toBe(ROTATED.value);
  });
});
