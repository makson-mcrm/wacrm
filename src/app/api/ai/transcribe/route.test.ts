import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  loadAiConfig: vi.fn(),
}));

vi.mock('@/lib/auth/account', () => ({
  requireRole: mocks.requireRole,
  toErrorResponse: vi.fn(() =>
    Response.json({ error: 'unexpected error' }, { status: 500 })
  ),
}));

vi.mock('@/lib/ai/config', () => ({
  loadAiConfig: mocks.loadAiConfig,
}));

import { POST } from './route';

const originalCloudAllow = process.env.AI_CLOUD_EXPLICIT_ALLOW;

function request() {
  const body = new FormData();
  body.append(
    'audio',
    new File([new Uint8Array([1, 2, 3])], 'n.wav', { type: 'audio/wav' })
  );
  return new Request('http://localhost/api/ai/transcribe', {
    method: 'POST',
    body,
  });
}

beforeEach(() => {
  delete process.env.AI_CLOUD_EXPLICIT_ALLOW;
  mocks.requireRole.mockReset();
  mocks.loadAiConfig.mockReset();
  mocks.requireRole.mockResolvedValue({
    supabase: { name: 'scoped-client' },
    accountId: 'account-1',
  });
  mocks.loadAiConfig.mockResolvedValue({
    provider: 'openai',
    apiKey: 'sk-test',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalCloudAllow === undefined)
    delete process.env.AI_CLOUD_EXPLICIT_ALLOW;
  else process.env.AI_CLOUD_EXPLICIT_ALLOW = originalCloudAllow;
});

describe('POST /api/ai/transcribe', () => {
  it('returns 403 without the explicit cloud flag and does not call fetch', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps client data LOCAL_ONLY even when cloud is explicitly enabled', async () => {
    process.env.AI_CLOUD_EXPLICIT_ALLOW = 'true';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
});
