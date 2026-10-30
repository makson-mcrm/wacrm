import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.db }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => h.db }));
import { POST } from './route';
import {
  GET as getConfig,
  POST as saveConfig,
} from '@/app/api/whatsapp/config/route';
import { decrypt } from '@/lib/whatsapp/encryption';

let row: Record<string, unknown> | null;
let foreign: boolean;
let role: string;
let authenticated: boolean;
let failStep: string;
let failSave: boolean;
let loseClaim: boolean;
let numbers: Record<string, unknown>[];
let phoneInfo: Record<string, unknown>;
const calls: string[] = [];
const fetchMock = vi.fn();
const input = {
  code: 'synthetic-oauth-code',
  phoneNumberId: '123456',
  wabaId: '789123',
};
function request(body: unknown = input) {
  return new Request('http://localhost/api/whatsapp/coexistence/onboard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  row = null;
  foreign = false;
  role = 'owner';
  authenticated = true;
  failStep = '';
  failSave = false;
  loseClaim = false;
  phoneInfo = {
    id: '123456', display_phone_number: '+48 555 000 111',
    verified_name: 'Firma testowa', is_on_biz_app: true, platform_type: 'CLOUD_API',
  };
  numbers = [{ ...phoneInfo }];
  calls.length = 0;
  vi.stubEnv('NEXT_PUBLIC_FB_APP_ID', '987654');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-role');
  h.db = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: 'user-1' } : null },
        error: null,
      }),
    },
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let operation = 'select';
      let ignoreDuplicates = false;
      let patch: Record<string, unknown> = {};
      const result = () => {
        if (table === 'profiles')
          return {
            data: { account_id: 'account-1', account_role: role },
            error: null,
          };
        if (operation !== 'select') {
          if (failSave) return { data: null, error: { code: 'XX000' } };
          if (operation === 'upsert' && ignoreDuplicates && row)
            return { data: [], error: null };
          row = { ...row, ...patch };
          return { data: [{ id: 'config-1' }], error: null };
        }
        if ('neq_account_id' in filters)
          return {
            data: foreign ? { account_id: 'other-account' } : null,
            error: null,
          };
        if ('phone_number_id' in filters)
          return {
            data: foreign ? { account_id: 'other-account' } : row,
            error: null,
          };
        return { data: row, error: null };
      };
      const query = {
        select() {
          return query;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return query;
        },
        neq(key: string, value: unknown) {
          filters[`neq_${key}`] = value;
          return query;
        },
        upsert(
          value: Record<string, unknown>,
          options?: { ignoreDuplicates?: boolean }
        ) {
          operation = 'upsert';
          patch = value;
          ignoreDuplicates = !!options?.ignoreDuplicates;
          return query;
        },
        update(value: Record<string, unknown>) {
          operation = 'update';
          patch = value;
          return query;
        },
        maybeSingle: async () => result(),
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve);
        },
      };
      return query;
    },
    rpc: async (_name: string, args: Record<string, unknown>) => {
      const column =
        args.p_sync_type === 'history'
          ? 'history_sync_requested_at'
          : 'contacts_sync_requested_at';
      if (loseClaim || row?.[column]) return { data: false, error: null };
      row = {
        ...row,
        [column]: new Date().toISOString(),
        coexistence_status: `${args.p_sync_type}_pending`,
      };
      return { data: true, error: null };
    },
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async (raw: string | URL, init?: RequestInit) => {
      const url = new URL(raw);
      const step = url.pathname.endsWith('/oauth/access_token')
        ? 'exchange_code'
        : url.pathname.endsWith('/subscribed_apps')
          ? 'subscribe'
          : url.pathname.endsWith('/smb_app_data')
            ? JSON.parse(String(init?.body)).sync_type
            : url.pathname.endsWith('/phone_numbers') ? 'resolve_phone' : 'phone_info';
      calls.push(step);
      if (failStep === step)
        return Response.json(
          {
            error: { message: 'SECRET synthetic-token client_secret=private' },
          },
          { status: 400 }
        );
      if (step === 'exchange_code')
        return Response.json({ access_token: 'synthetic-business-token' });
      if (step === 'resolve_phone') return Response.json({ data: numbers });
      if (step === 'phone_info') return Response.json(phoneInfo);
      return Response.json({ success: true });
    }
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Coexistence onboarding', () => {
  it('exchanges code, subscribes, encrypts credentials and requests each sync once without register', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      onboarding_mode: 'coexistence',
      phone_info: { verified_name: 'Firma testowa' },
    });
    expect(calls).toEqual([
      'exchange_code',
      'resolve_phone',
      'phone_info',
      'subscribe',
      'smb_app_state_sync',
      'history',
    ]);
    expect(row).toMatchObject({
      account_id: 'account-1',
      user_id: 'user-1',
      onboarding_mode: 'coexistence',
      coexistence_status: 'connected',
      status: 'connected',
    });
    expect(decrypt(String(row!.access_token))).toBe('synthetic-business-token');
    expect(decrypt(String(row!.verify_token))).toMatch(/^[a-f0-9]{64}$/);
    expect(row!.contacts_sync_requested_at).toBeTruthy();
    expect(row!.history_sync_requested_at).toBeTruthy();
    for (const [url] of fetchMock.mock.calls) {
      expect(String(url)).toContain('/v23.0/');
      expect(String(url)).not.toMatch(/\/register|\/deregister/);
    }
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('code')).toBe(
      input.code
    );
  });

  it('repeated invocation reuses the saved token without re-exchanging a single-use code or repeating sync', async () => {
    await POST(request());
    const before = { ...row };
    calls.length = 0;
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(calls).toEqual(['resolve_phone', 'phone_info']);
    expect(row).toEqual(before);
  });

  it('resolves a WABA-only finish to the single authorized business-app Cloud API number', async () => {
    numbers.unshift({ id: '999', is_on_biz_app: false, platform_type: 'CLOUD_API' });
    const response = await POST(request({ code: input.code, wabaId: input.wabaId }));
    expect(response.status).toBe(200);
    expect(row).toMatchObject({ phone_number_id: '123456', onboarding_mode: 'coexistence' });
    const [url, init] = fetchMock.mock.calls.find(([raw]) => String(raw).includes('/phone_numbers'))!;
    expect(new URL(url).pathname).toBe('/v23.0/789123/phone_numbers');
    expect(init.headers.Authorization).toBe('Bearer synthetic-business-token');
    expect(String(url)).not.toContain('synthetic-business-token');
    expect(calls).not.toContain('register');
  });

  it('repeats a WABA-only request without repeating OAuth or either synchronization', async () => {
    const body = { code: input.code, wabaId: input.wabaId };
    expect((await POST(request(body))).status).toBe(200);
    const before = { ...row };
    calls.length = 0;
    expect((await POST(request(body))).status).toBe(200);
    expect(calls).toEqual(['resolve_phone', 'phone_info']);
    expect(row).toEqual(before);
  });

  it.each([
    [],
    [{ id: '123456', is_on_biz_app: true, platform_type: 'CLOUD_API' },
      { id: '654321', is_on_biz_app: true, platform_type: 'CLOUD_API' }],
    [{ id: '123456', is_on_biz_app: false, platform_type: 'CLOUD_API' }],
    [{ id: '123456', is_on_biz_app: true, platform_type: 'ON_PREMISE' }],
    [{ id: '123456' }],
  ].map(value => ({ value })))('rejects absent/ambiguous/ineligible WABA numbers without saving: %j', async ({ value }) => {
    numbers = value;
    const response = await POST(request({ code: input.code, wabaId: input.wabaId }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ step: 'resolve_phone', message: expect.any(String) });
    expect(row).toBeNull();
    expect(calls).toEqual(['exchange_code', 'resolve_phone']);
  });

  it('rejects a supplied number that is not part of the authorized WABA', async () => {
    numbers = [{ ...phoneInfo, id: '654321' }];
    expect((await POST(request())).status).toBe(409);
    expect(row).toBeNull();
    expect(calls).not.toContain('subscribe');
  });

  it.each([
    { is_on_biz_app: false }, { is_on_biz_app: 'true' },
    { platform_type: 'ON_PREMISE' }, { platform_type: undefined }, { id: '654321' },
  ])('checks fresh phone metadata before persisting coexistence: %j', async (patch) => {
    phoneInfo = { ...phoneInfo, ...patch };
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).step).toBe('phone_info');
    expect(row).toBeNull();
    expect(calls).not.toContain('subscribe');
  });

  it('checks ownership of the server-resolved number before saving', async () => {
    foreign = true;
    const response = await POST(request({ code: input.code, wabaId: input.wabaId }));
    expect(response.status).toBe(409);
    expect(row).toBeNull();
    expect(calls).not.toContain('subscribe');
  });

  it('concurrent first-time requests preserve the winner and only send each sync once', async () => {
    const responses = await Promise.all([POST(request()), POST(request())]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(calls.filter((step) => step === 'smb_app_state_sync')).toHaveLength(
      1
    );
    expect(calls.filter((step) => step === 'history')).toHaveLength(1);
    expect(row).toMatchObject({
      coexistence_status: 'connected',
      status: 'connected',
    });
  });

  it('does not accept an unconfirmed subscription even with HTTP 200', async () => {
    const implementation = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) =>
      String(url).endsWith('/subscribed_apps')
        ? Response.json({ success: false })
        : implementation(url, init)
    );
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).step).toBe('subscribe');
    expect(row).toBeNull();
  });

  it.each(['exchange_code', 'resolve_phone', 'phone_info', 'subscribe'])(
    'returns sanitized Polish errors with step %s',
    async (step) => {
      failStep = step;
      const response = await POST(request());
      expect(response.status).toBe(502);
      const result = await response.json();
      expect(result.step).toBe(step);
      expect(result.message).toMatch(/Meta/);
      expect(JSON.stringify(result)).not.toMatch(
        /SECRET|synthetic-token|client_secret|private/
      );
      expect(row).toBeNull();
    }
  );

  it.each(['smb_app_state_sync', 'history'])(
    'persists an ambiguous %s failure and never retries the one-shot request',
    async (step) => {
      failStep = step;
      expect((await POST(request())).status).toBe(502);
      expect(row!.coexistence_status).toBe('sync_error');
      const count = calls.length;
      expect((await POST(request())).status).toBe(409);
      expect(calls).toHaveLength(count);
      expect(calls.filter((value) => value === step)).toHaveLength(1);
    }
  );

  it('handles a thrown network error without exposing its URL or secret', async () => {
    fetchMock.mockRejectedValueOnce(
      new Error('https://graph.facebook.com?client_secret=SECRET')
    );
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('SECRET');
  });

  it('does not request sync when the durable claim was won by another invocation', async () => {
    loseClaim = true;
    expect((await POST(request())).status).toBe(409);
    expect(calls).toEqual(['exchange_code', 'resolve_phone', 'phone_info', 'subscribe']);
  });

  it('does not send sync after a database save failure', async () => {
    failSave = true;
    expect((await POST(request())).status).toBe(500);
    expect(calls).not.toContain('smb_app_state_sync');
  });

  it.each([
    null,
    {},
    { ...input, code: '' },
    { ...input, phoneNumberId: '../evil' },
    { ...input, phoneNumberId: null },
    { ...input, phoneNumberId: '' },
    { ...input, wabaId: 789 },
  ])('rejects invalid input before any Graph request: %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['agent', 'viewer'])(
    'blocks %s before external effects',
    async (value) => {
      role = value;
      expect((await POST(request())).status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
  it('requires login', async () => {
    authenticated = false;
    expect((await POST(request())).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a number belonging to another account', async () => {
    foreign = true;
    expect((await POST(request())).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('fails closed when Meta app configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_FB_APP_ID', '');
    expect((await POST(request())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Existing config route with coexistence', () => {
  it('does not register a coexistence number even when a PIN is supplied to the manual form', async () => {
    await POST(request());
    const verifyToken = row!.verify_token;
    fetchMock.mockClear();
    const response = await saveConfig(
      request({
        phone_number_id: input.phoneNumberId,
        waba_id: input.wabaId,
        access_token: 'synthetic-business-token',
        pin: '123456',
      })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
    expect(
      fetchMock.mock.calls.map((call) => String(call[0])).join(' ')
    ).not.toMatch(/\/register|\/deregister/);
    expect(row!.onboarding_mode).toBe('coexistence');
    expect(row!.verify_token).toBe(verifyToken);
  });
  it('returns connected status and phone info for coexistence and flags an incomplete sync', async () => {
    await POST(request());
    expect(await (await getConfig()).json()).toMatchObject({
      connected: true,
      onboarding_mode: 'coexistence',
      coexistence_status: 'connected',
      phone_info: { verified_name: 'Firma testowa' },
    });
    row = { ...row, coexistence_status: 'history_pending' };
    expect(await (await getConfig()).json()).toMatchObject({
      connected: false,
      coexistence_status: 'history_pending',
      message: expect.any(String),
    });
  });
});
