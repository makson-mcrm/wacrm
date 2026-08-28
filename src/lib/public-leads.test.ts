import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isAllowedPublicFormOrigin,
  parsePublicLead,
  requestFingerprint,
} from './public-leads';

const valid = {
  name: 'Jan Kowalski',
  phone: '+48500000000',
  message: 'Audyt możliwości finansowych',
  inquiryType: 'financial-audit',
  callbackPreference: '09:00-12:00',
  consent: true,
};

describe('public financial lead intake', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts a complete financial-audit lead', () => {
    expect(parsePublicLead(valid)).toMatchObject({
      inquiryType: 'financial-audit',
      message: 'Audyt możliwości finansowych',
      callbackPreference: '09:00-12:00',
    });
  });

  it.each([
    [{ ...valid, name: '' }, 'imię'],
    [{ ...valid, phone: '' }, 'telefon'],
    [{ ...valid, message: 'krótko' }, '10 znaków'],
    [{ ...valid, inquiryType: '' }, 'rodzaj potrzeby'],
    [{ ...valid, callbackPreference: '' }, 'godzinę'],
    [{ ...valid, consent: false }, 'Zgoda'],
    [{ ...valid, email: 'błędny' }, 'e-mail'],
  ])('rejects invalid input %#', (body, message) => {
    expect(() => parsePublicLead(body)).toThrow(message);
  });

  it('rejects a filled honeypot', () => {
    expect(() =>
      parsePublicLead({ ...valid, website: 'spam.example' })
    ).toThrow('odrzucone');
  });

  it('allows only production form origins', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedPublicFormOrigin('https://makson.space')).toBe(true);
    expect(isAllowedPublicFormOrigin('https://evil.example')).toBe(false);
  });

  it('stores a hash, not a raw IP', () => {
    const value = requestFingerprint('203.0.113.5', 'browser');
    expect(value).toMatch(/^[a-f0-9]{64}$/);
    expect(value).not.toContain('203.0.113.5');
  });

  it('has no code path that writes a deal', () => {
    const service = readFileSync(
      new URL('./public-leads.ts', import.meta.url),
      'utf8'
    );
    const route = readFileSync(
      new URL('../app/api/public/leads/route.ts', import.meta.url),
      'utf8'
    );
    expect(`${service}\n${route}`).not.toMatch(/\.from\(["']deals["']\)/);
  });
});
