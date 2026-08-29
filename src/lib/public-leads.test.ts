import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isAllowedPublicFormOrigin,
  parsePublicLead,
  requestFingerprint,
  savePublicLead,
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
    expect(
      isAllowedPublicFormOrigin(
        'https://mediumslateblue-okapi-264879.hostingersite.com'
      )
    ).toBe(true);
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

  it('reuses a contact with the same email instead of creating a duplicate', async () => {
    const insertedSubmission = vi.fn().mockResolvedValue({ error: null });
    const insertedNote = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'accounts') {
        return {
          select: () => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'account-1' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'whatsapp_config') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: { user_id: 'user-1' } }),
            }),
          }),
        };
      }
      if (table === 'contacts') {
        return {
          select: () => ({
            eq: () => ({
              ilike: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'existing-contact' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'public_lead_submissions') {
        return { insert: insertedSubmission };
      }
      if (table === 'contact_notes') return { insert: insertedNote };
      throw new Error(`Unexpected table: ${table}`);
    });

    await savePublicLead(
      { from } as never,
      { ...parsePublicLead({ ...valid, email: 'jan@example.com' }) },
      { fingerprint: 'fingerprint', userAgent: 'test' }
    );

    expect(insertedSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'existing-contact',
        contact_created: false,
      })
    );
    expect(from).not.toHaveBeenCalledWith('deals');
  });
});

