import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAllowedPublicFormOrigin } from '@/lib/public-origin';
import { getPublicAppOrigin } from './public-url';

const live = 'https://mediumseagreen-pelican-353577.hostingersite.com';
const proxy = (host: string, proto = 'https') => new Headers({
  'x-forwarded-host': host,
  'x-forwarded-proto': proto,
  host: '0.0.0.0:3000',
});

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  vi.stubEnv('ALLOWED_PUBLIC_FORM_ORIGINS', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('trusted public origin for outgoing links', () => {
  it('accepts the known LIVE proxy with an internal Host', () => {
    expect(getPublicAppOrigin(proxy(new URL(live).host))).toBe(live);
  });

  it('uses the shared configurable exact-origin allowlist', () => {
    vi.stubEnv('ALLOWED_PUBLIC_FORM_ORIGINS', ' https://app.example.invalid:8443 ');
    expect(getPublicAppOrigin(proxy('app.example.invalid:8443')))
      .toBe('https://app.example.invalid:8443');
    expect(getPublicAppOrigin(proxy('app.example.invalid'))).toBeNull();
    expect(isAllowedPublicFormOrigin('https://app.example.invalid:8443')).toBe(true);
  });

  it('does not turn the CORS same-origin exception into trust for an outgoing link', () => {
    expect(isAllowedPublicFormOrigin('https://evil.example', 'https://evil.example/api')).toBe(true);
    expect(getPublicAppOrigin(proxy('evil.example'))).toBeNull();
  });

  it('allows an explicit trusted URL and gives it precedence over headers', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', ' https://crm.makson.space/ ');
    expect(getPublicAppOrigin(proxy('evil.example'))).toBe('https://crm.makson.space');
  });

  it.each([
    'https://0.0.0.0:3000', 'https://localhost:3000', 'https://evil.example',
    'http://crm.makson.space', 'https://crm.makson.space/path',
    'https://crm.makson.space?x=1', 'https://user@crm.makson.space',
  ])('rejects invalid explicit configuration %s', (value) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', value);
    expect(getPublicAppOrigin(proxy(new URL(live).host))).toBeNull();
  });

  it.each([
    'evil.example', '0.0.0.0:3000', 'crm.makson.space.evil.example',
    'crm.makson.space:8443', 'user@crm.makson.space', 'crm.makson.space/path',
    'crm.makson.space,evil.example', 'evil.example,crm.makson.space',
    'crm.makson.space#evil', 'crm.makson.space?evil',
  ])('rejects an untrusted or malformed forwarded host %s', (host) => {
    expect(getPublicAppOrigin(proxy(host))).toBeNull();
  });

  it.each(['http', 'javascript', 'https,http', 'https://'])('rejects proto %s', (proto) => {
    expect(getPublicAppOrigin(proxy(new URL(live).host, proto))).toBeNull();
  });

  it.each<Record<string, string>>([
    {}, { host: '0.0.0.0:3000' }, { host: 'evil.example' },
    { 'x-forwarded-host': 'crm.makson.space' }, { 'x-forwarded-proto': 'https' },
    { forwarded: 'host=crm.makson.space;proto=https' },
  ])('has no unsafe fallback for headers %j', (headers) => {
    expect(getPublicAppOrigin(new Headers(headers))).toBeNull();
  });

  it('supports a direct allowlisted HTTPS Host', () => {
    expect(getPublicAppOrigin(new Headers({ host: new URL(live).host }))).toBe(live);
  });

  it('never accepts the standalone listener even when included in configuration', () => {
    vi.stubEnv('ALLOWED_PUBLIC_FORM_ORIGINS', 'https://0.0.0.0:3000');
    expect(getPublicAppOrigin(proxy('0.0.0.0:3000'))).toBeNull();
  });
});
