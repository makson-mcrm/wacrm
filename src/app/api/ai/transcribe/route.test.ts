import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/ai/transcribe', () => {
  it('fails closed before reading an unclassified audio body or calling fetch', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const request = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: new FormData(),
    });
    const formData = vi.spyOn(request, 'formData');

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: 'LOCAL_AI_UNAVAILABLE',
      error:
        'Dyktowanie jest zablokowane do czasu uruchomienia zweryfikowanego lokalnego modelu.',
    });
    expect(formData).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
