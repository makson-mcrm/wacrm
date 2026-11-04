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
          update: () => {
            const query = {
              eq: () => query,
              is: vi.fn().mockResolvedValue({ error: null }),
              then: (resolve: (value: { error: null }) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            };
            return query;
          },
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
      if (table === 'sales_activities') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
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

type Row = Record<string, unknown>;

/** In-memory query double: applies tenant/NULL filters and the join's unique key. */
function leadDatabase(source: string | null = null) {
  const rows: Record<string, Row[]> = {
    accounts: [{ id: 'account-1' }],
    whatsapp_config: [{ account_id: 'account-1', user_id: 'user-1' }],
    contacts: [
      { id: 'contact-1', account_id: 'account-1', email: 'lead@example.com', source },
      { id: 'contact-2', account_id: 'other-account', email: 'lead@example.com', source: null },
    ],
    public_lead_submissions: [], contact_notes: [], sales_activities: [],
    tags: [], contact_tags: [],
  };
  const calls: { table: string; operation: string; payload: Row; filters: [string, unknown][]; options?: Row }[] = [];
  const from = vi.fn((table: string) => {
    if (!rows[table]) throw new Error(`Unexpected table: ${table}`);
    let operation = 'select';
    let payload: Row = {};
    let options: Row | undefined;
    const filters: [string, unknown][] = [];
    const execute = (single = false) => {
      calls.push({ table, operation, payload, filters: [...filters], options });
      const matches = rows[table].filter(row =>
        filters.every(([key, value]) => row[key] === value));
      if (operation === 'update') matches.forEach(row => Object.assign(row, payload));
      if (operation === 'insert' || operation === 'upsert') {
        if (payload.id && rows[table].some(row => row.id === payload.id)) {
          return { data: null, error: { code: '23505' } };
        }
        const duplicate = table === 'contact_tags' && rows[table].some(row =>
          row.contact_id === payload.contact_id && row.tag_id === payload.tag_id);
        if (duplicate && !(operation === 'upsert' && options?.ignoreDuplicates && options.onConflict === 'contact_id,tag_id')) {
          return { data: null, error: { code: '23505' } };
        }
        if (!duplicate) rows[table].push({ id: `${table}-${rows[table].length + 1}`, ...payload });
        return { data: rows[table].at(-1), error: null };
      }
      return { data: single ? matches[0] ?? null : matches, error: null };
    };
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      ilike: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      limit: () => query,
      maybeSingle: async () => execute(true),
      single: async () => execute(true),
      update: (value: Row) => { operation = 'update'; payload = value; return query; },
      insert: (value: Row) => { operation = 'insert'; payload = value; return query; },
      upsert: (value: Row, config?: Row) => { operation = 'upsert'; payload = value; options = config; return query; },
      then: (resolve: (value: ReturnType<typeof execute>) => unknown) =>
        Promise.resolve(execute()).then(resolve),
    };
    return query;
  });
  return { db: { from } as never, rows, calls, from };
}

const attributionPayload = {
  ...valid,
  email: 'lead@example.com',
  source_page: '/domy/projekt-syntetyczny',
  utm_source: 'synthetic-newsletter',
  utm_campaign: 'synthetic-campaign',
  segment: 'DOMY',
  selected_home_project: 'Projekt syntetyczny A',
};
const requestMetadata = { fingerprint: 'synthetic-fingerprint', userAgent: 'unit-test' };

describe('public lead CRM attribution', () => {
  afterEach(() => vi.useRealTimers());

  it('persists consent, attribution and the follow-up after parsing a DOMY payload', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00.000Z'));
    const { db, rows, calls, from } = leadDatabase();
    await savePublicLead(db, parsePublicLead(attributionPayload), requestMetadata);

    expect(rows.contacts[0]).toMatchObject({ source: 'makson.space', contact_consent: true });
    const details = rows.contacts[0].source_details as string;
    for (const value of [attributionPayload.source_page, attributionPayload.utm_source,
      attributionPayload.utm_campaign, 'DOMY', attributionPayload.selected_home_project]) {
      expect(details).toContain(value);
    }
    expect(details.length).toBeLessThanOrEqual(500);
    const sourceUpdate = calls.find(call => call.operation === 'update' && 'source' in call.payload);
    expect(sourceUpdate?.filters).toEqual(expect.arrayContaining([
      ['account_id', 'account-1'], ['id', 'contact-1'], ['source', null],
    ]));
    expect(rows.contacts[1]).toMatchObject({ source: null });
    expect(rows.contacts[1]).not.toHaveProperty('contact_consent');
    const note = rows.contact_notes[0].note_text as string;
    expect(note).toContain('Zgoda na kontakt: tak');
    expect(note).toContain('wersja: makson.space/contact-v1');
    expect(note).toContain('kanał: formularz WWW');
    expect(note).toContain('2026-11-04T10:00:00.000Z');
    expect(rows.public_lead_submissions[0]).toMatchObject({
      consent_to_contact: true, consented_at: '2026-11-04T10:00:00.000Z',
    });
    expect(rows.sales_activities).toEqual([expect.objectContaining({
      account_id: 'account-1', user_id: 'user-1', contact_id: 'contact-1',
      activity_type: 'zadanie', completed: false, activity_status: 'PLANOWANE',
      title: 'Zgłoszenie: audyt finansowy / sprawdzenie możliwości',
      next_action: expect.any(String),
    })]);
    expect(rows.tags).toHaveLength(0);
    expect(from).not.toHaveBeenCalledWith('deals');
  });

  it.each(['Rekomendacja', ''])('preserves a non-NULL contact source (%j)', async source => {
    const { db, rows } = leadDatabase(source);
    await savePublicLead(db, parsePublicLead(attributionPayload), requestMetadata);
    expect(rows.contacts[0]).toMatchObject({ source, contact_consent: true });
  });

  it('bounds source_details and keeps the full attribution in the note', async () => {
    const { db, rows } = leadDatabase();
    const payload = { ...attributionPayload, source_page: '/domy/' + 'a'.repeat(490) };
    await savePublicLead(db, parsePublicLead(payload), requestMetadata);
    expect((rows.contacts[0].source_details as string).length).toBeLessThanOrEqual(500);
    expect(rows.contact_notes[0].note_text).toContain(attributionPayload.selected_home_project);
  });

  it('creates the education tag once and attaches it without duplicates on repeat submissions', async () => {
    const { db, rows, calls } = leadDatabase();
    const input = parsePublicLead({ ...attributionPayload, segment: 'EDUKACJA — BUDŻET' });
    await savePublicLead(db, input, requestMetadata);
    await savePublicLead(db, input, requestMetadata);
    expect(rows.tags).toEqual([expect.objectContaining({
      account_id: 'account-1', user_id: 'user-1', name: 'EDUKACJA — BUDŻET',
    })]);
    expect(calls.filter(call => call.table === 'tags' && call.operation === 'insert')).toHaveLength(1);
    expect(rows.contact_tags).toEqual([expect.objectContaining({ contact_id: 'contact-1', tag_id: rows.tags[0].id })]);
    expect(rows.sales_activities).toHaveLength(2);
    expect(rows.contacts).toHaveLength(2);
  });

  it('reuses the account education tag, ignoring the same name in another account', async () => {
    const { db, rows } = leadDatabase();
    rows.tags.push(
      { id: 'foreign-tag', account_id: 'other-account', name: 'EDUKACJA — BUDŻET' },
      { id: 'our-tag', account_id: 'account-1', name: 'EDUKACJA — BUDŻET' },
    );
    await savePublicLead(db, parsePublicLead({ ...attributionPayload, segment: 'EDUKACJA — BUDŻET' }), requestMetadata);
    expect(rows.tags).toHaveLength(2);
    expect(rows.contact_tags[0].tag_id).toBe('our-tag');
  });

  it('converges concurrent education submissions on one tag and one assignment', async () => {
    const { db, rows } = leadDatabase();
    const input = parsePublicLead({ ...attributionPayload, segment: 'EDUKACJA — BUDŻET' });
    await Promise.all([
      savePublicLead(db, input, requestMetadata),
      savePublicLead(db, input, requestMetadata),
    ]);
    expect(rows.tags).toHaveLength(1);
    expect(rows.contact_tags).toHaveLength(1);
    expect(rows.contact_tags[0].tag_id).toBe(rows.tags[0].id);
  });
});

