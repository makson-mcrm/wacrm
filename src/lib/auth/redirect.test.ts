import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { relativeRedirect, safeRedirectPath } from './redirect';

afterEach(() => vi.unstubAllEnvs());

describe('absolute redirects use the public request origin', () => {
  it.each([
    ['production', 'http://0.0.0.0:3000', { 'x-forwarded-host': 'public.test', host: 'internal.test', 'x-forwarded-proto': 'https' }, 'https://public.test'],
    ['production', 'http://0.0.0.0:3000', { host: 'public.test:8443' }, 'https://public.test:8443'],
    ['production', 'http://fallback.test:3000', {}, 'https://fallback.test:3000'],
    ['development', 'http://fallback.test:3111', {}, 'http://fallback.test:3111'],
    ['development', 'https://fallback.test', {}, 'https://fallback.test'],
    ['development', 'http://0.0.0.0:3000', { host: '127.0.0.1:3111' }, 'http://127.0.0.1:3111'],
    ['development', 'http://0.0.0.0:3000', { 'x-forwarded-host': 'public.test', 'x-forwarded-proto': 'https' }, 'https://public.test'],
    ['production', 'https://0.0.0.0:3000', { 'x-forwarded-host': 'public.test', 'x-forwarded-proto': 'http' }, 'http://public.test'],
  ] as const)('uses %s / %s / %j', (env, url, headers, origin) => {
    vi.stubEnv('NODE_ENV', env);
    const response = relativeRedirect('/login?next=/contacts#form', new NextRequest(url, { headers }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${origin}/login?next=/contacts#form`);
  });
});

describe('redirect paths cannot change the origin', () => {
  it.each([
    '//evil.example', 'https://evil.example', '/\\evil.example', '///evil.example',
    '/%2fevil.example', '/%5cevil.example', '/..//evil.example',
    '/\t/evil.example', '/%0d%0aLocation:https://evil.example', '/\u007f', '%',
  ])('rejects %j', (path) => {
    const request = new NextRequest('https://public.test/contacts');
    expect(safeRedirectPath(path)).toBe('/dashboard');
    const response = relativeRedirect(path, request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://public.test/dashboard');
  });
});
