import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPreliminaryAnalysis,
  financialQuestionnaireErrorResponse,
  parseFinancialQuestionnaire,
  questionnaireMissingItems,
  saveFinancialQuestionnaire,
} from './financial-questionnaires';
import {
  QUESTIONNAIRE_FIELDS,
  questionnaireFormPayload,
} from './questionnaires/contract';
import { POST } from '@/app/api/public/questionnaires/route';
import { POST as crmPost } from '@/app/api/questionnaires/route';
import { POST as leadPost } from '@/app/api/public/leads/route';
import { loadCrmQuestionnaireContext } from '@/lib/questionnaires/crm-context';
import QuestionnairePage from '@/app/ankieta/page';
import { FinancialQuestionnaireForm } from '@/app/ankieta/questionnaire-form';
import {
  publicQuestionnairePayload,
  publicQuestionnairePreparation,
  publicQuestionnaireResponses,
} from './questionnaires/public-payload.fixture';
import type { ReactElement, ReactNode } from 'react';

const harness = vi.hoisted(() => ({
  db: {} as unknown,
  userId: null as string | null,
  adminCalls: 0,
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => harness.db,
}));
vi.mock('@/lib/flows/admin-client', () => ({
  supabaseAdmin: () => {
    harness.adminCalls++;
    return harness.db;
  },
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ success: true }),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { publicFinancialQuestionnaire: {} },
}));
const contact = {
  name: 'Osoba Syntetyczna',
  phone: '500 100 200',
  email: 'synthetic@example.invalid',
  company: 'Firma Syntetyczna',
};
const answers = {
  adults: '2',
  amount: '350000',
  children: '0',
  city: 'Miasto Syntetyczne',
  consent: true,
  debts: 'Brak',
  documents: ['Dokumenty potwierdzające dochód', 'Polisy do audytu'],
  goal: 'Refinansowanie',
  insurance: 'Mam oba rodzaje',
  investments: '10000',
  savings: '30000',
  timeline: 'Do 3 miesięcy',
};
const base = { ...answers, website: '', contact, startedAt: 1 };
type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let failure: { table: string; operation: string } | null;
// Explicit existing-schema contract: reject unknown columns in writes, SELECT,
// filters and ORDER BY. In particular, no constraints/columns from rejected 073.
const schema: Record<string, string[]> = {
  accounts: ['id', 'name', 'owner_user_id'],
  public_lead_submissions: [
    'id',
    'account_id',
    'contact_id',
    'submitted_name',
    'submitted_phone',
    'submitted_email',
    'submitted_company',
    'message',
    'inquiry_type',
    'callback_preference',
    'source',
    'consent_to_contact',
    'consented_at',
    'contact_created',
    'request_fingerprint',
    'user_agent',
  ],
  profiles: ['user_id', 'account_id', 'account_role'],
  contact_companies: ['account_id', 'contact_id', 'is_primary', 'company'],
  sales_activities: [
    'id',
    'account_id',
    'user_id',
    'contact_id',
    'activity_type',
    'activity_status',
    'completed',
    'title',
    'source',
    'next_action',
  ],
  whatsapp_config: ['account_id', 'user_id'],
  contacts: [
    'id',
    'account_id',
    'user_id',
    'phone',
    'phone_normalized',
    'name',
    'email',
    'company',
  ],
  financial_questionnaire_submissions: [
    'id',
    'account_id',
    'contact_id',
    'submitted_name',
    'submitted_phone',
    'submitted_email',
    'submitted_company',
    'responses',
    'preparation_plan',
    'status',
    'missing_items',
    'preliminary_analysis',
    'contact_created',
    'consent_to_analysis',
    'consented_at',
    'request_fingerprint',
    'user_agent',
    'created_at',
    'updated_at',
    'handled_at',
  ],
  client_intakes: [
    'id',
    'account_id',
    'contact_id',
    'company_id',
    'deal_id',
    'intake_type',
    'source',
    'status',
    'raw_payload',
    'submitted_at',
    'processed_at',
    'created_at',
  ],
  contact_notes: [
    'id',
    'account_id',
    'contact_id',
    'user_id',
    'note_text',
    'created_at',
  ],
};
type QueryHook = (table: string, operation: string) => Promise<void>;
let beforeQuery: QueryHook | null;
let afterQuery: QueryHook | null;
function rendezvous(tableName: string, operationName: string): QueryHook {
  let remaining = 2;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async (table, operation) => {
    if (table !== tableName || operation !== operationName || remaining === 0)
      return;
    remaining--;
    if (remaining === 0) release();
    await ready;
  };
}
function database() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: harness.userId ? { id: harness.userId } : null },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (!schema[table]) throw new Error(`Unknown table: ${table}`);
      const column = (key: string) => {
        if (!schema[table].includes(key.split('->>')[0]))
          throw new Error(`Unknown column: ${table}.${key}`);
      };
      const valueOf = (row: Row, key: string) => {
        const [root, jsonKey] = key.split('->>');
        return jsonKey ? (row[root] as Row | undefined)?.[jsonKey] : row[root];
      };
      let operation = 'select',
        payload: Row | Row[] = {};
      const filters: ((row: Row) => boolean)[] = [];
      const ordering: { key: string; ascending: boolean }[] = [];
      let rowLimit = Infinity;
      const run = (mode: 'many' | 'single' | 'maybe' = 'many') => {
        const rows = (tables[table] ??= []);
        if (failure?.table === table && failure.operation === operation)
          return {
            data: null,
            error: { code: '42501', message: 'synthetic denied' },
          };
        let result = rows.filter((row) =>
          filters.every((filter) => filter(row))
        );
        result.sort((a, b) => {
          for (const { key, ascending } of ordering) {
            const comparison = String(a[key]).localeCompare(String(b[key]));
            if (comparison) return ascending ? comparison : -comparison;
          }
          return 0;
        });
        result = result.slice(0, rowLimit);
        if (operation === 'insert') {
          const inserted: Row[] = [];
          for (const raw of Array.isArray(payload) ? payload : [payload]) {
            Object.keys(raw).forEach(column);
            const row: Row = {
              ...raw,
              id: `${table}-${String(rows.length + 1).padStart(3, '0')}`,
              created_at: new Date().toISOString(),
            };
            // Only contacts have a relevant existing uniqueness constraint.
            if (
              table === 'contacts' &&
              rows.some(
                (existing) =>
                  existing.account_id === row.account_id &&
                  existing.phone === row.phone
              )
            )
              return { data: null, error: { code: '23505' } };
            if (table === 'contact_notes' && !row.account_id)
              throw new Error('contact_notes.account_id is NOT NULL');
            rows.push(row);
            inserted.push(row);
          }
          result = inserted;
        }
        if (operation === 'update') {
          Object.keys(payload).forEach(column);
          result.forEach((row) => Object.assign(row, payload));
        }
        if (
          (mode === 'single' && result.length !== 1) ||
          (mode === 'maybe' && result.length > 1)
        )
          return { data: null, error: { code: 'PGRST116' } };
        return {
          data: mode === 'many' ? result : (result[0] ?? null),
          error: null,
        };
      };
      const execute = async (mode?: 'many' | 'single' | 'maybe') => {
        await beforeQuery?.(table, operation);
        const result = run(mode);
        await afterQuery?.(table, operation);
        return result;
      };
      const query = {
        select: (columns: string) => {
          if (columns === 'company:companies(name)') column('company');
          else if (columns !== '*')
            columns.split(',').forEach((key) => column(key.trim()));
          return query;
        },
        eq: (key: string, value: unknown) => {
          column(key);
          filters.push((row) => valueOf(row, key) === value);
          return query;
        },
        ilike: (key: string, value: string) => {
          column(key);
          filters.push(
            (row) =>
              String(row[key] ?? '').toLowerCase() === value.toLowerCase()
          );
          return query;
        },
        is: (key: string, value: unknown) => {
          column(key);
          filters.push((row) => (row[key] ?? null) === value);
          return query;
        },
        like: (key: string, pattern: string) => {
          column(key);
          filters.push((row) =>
            key === 'phone_normalized'
              ? String(row.phone).replace(/\D/g, '').endsWith(pattern.slice(1))
              : String(row[key]).startsWith(pattern.slice(0, -1))
          );
          return query;
        },
        order: (key: string, options: { ascending: boolean }) => {
          column(key);
          ordering.push({ key, ...options });
          return query;
        },
        limit: (value: number) => {
          rowLimit = value;
          return query;
        },
        insert: (value: typeof payload) => {
          operation = 'insert';
          payload = value;
          return query;
        },
        update: (value: Row) => {
          operation = 'update';
          payload = value;
          return query;
        },
        single: () => execute('single'),
        maybeSingle: () => execute('maybe'),
        then: (
          resolve: (value: Awaited<ReturnType<typeof execute>>) => unknown,
          reject: (error: unknown) => unknown
        ) => execute().then(resolve, reject),
      };
      return query;
    }),
  };
}
const metadata = { fingerprint: 'synthetic-hash', userAgent: 'synthetic-test' };
const save = (body = base) =>
  saveFinancialQuestionnaire(
    harness.db as never,
    parseFinancialQuestionnaire(body),
    metadata
  );
const api = (body: unknown) =>
  POST(
    new Request('http://localhost/api/public/questionnaires', {
      method: 'POST',
      headers: {
        origin: 'https://makson.space',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  );
beforeEach(() => {
  vi.stubEnv('MCRM_PUBLIC_FORM_ACCOUNT_ID', '');
  tables = {
    accounts: [{ id: 'account-synthetic' }],
    whatsapp_config: [
      { account_id: 'account-synthetic', user_id: 'user-synthetic' },
    ],
  };
  failure = null;
  harness.userId = null;
  harness.adminCalls = 0;
  beforeQuery = null;
  afterQuery = null;
  harness.db = database();
});

describe('K3/01-B/C: ankieta → Kontakt na istniejącym schemacie', () => {
  it('przenosi komplet 12 pól przez FormData, parser, API, submisję, intake i notatkę', async () => {
    const form = new FormData();
    for (const [field, value] of Object.entries(answers)) {
      if (Array.isArray(value))
        value.forEach((item) => form.append(field, item));
      else form.set(field, value === true ? 'on' : String(value));
    }
    form.set('website', '');
    const body = questionnaireFormPayload(form, contact, 1);
    expect(
      Object.keys(body)
        .filter((key) => !['contact', 'startedAt'].includes(key))
        .sort()
    ).toEqual([...QUESTIONNAIRE_FIELDS].sort());
    expect(QUESTIONNAIRE_FIELDS).toHaveLength(13);
    expect(parseFinancialQuestionnaire(body).responses).toEqual(answers);
    const response = await api(body);
    expect(response.status).toBe(201);
    const result = await response.json();
    const contactId = tables.contacts[0].id;
    const submissionId = tables.financial_questionnaire_submissions[0].id;
    expect(result.status).toBe('submitted');
    expect(tables.contacts).toHaveLength(1);
    expect(tables.contacts[0].phone).toBe('+48500100200');
    expect(tables.financial_questionnaire_submissions[0]).toMatchObject({
      responses: answers,
      contact_id: contactId,
      consent_to_analysis: true,
    });
    expect(tables.client_intakes[0]).toMatchObject({
      contact_id: contactId,
      raw_payload: {
        ...answers,
        submission_id: submissionId,
        submission_key: expect.any(String),
      },
    });
    const note = String(tables.contact_notes[0].note_text);
    for (const [key, value] of Object.entries(answers)) {
      if (Array.isArray(value))
        value.forEach((item) => expect(note).toContain(item));
      else if (key !== 'consent') expect(note).toContain(value);
    }
    expect(note).toContain('Zgoda na analizę: tak');
    expect(JSON.stringify(tables.client_intakes)).not.toContain('website');
  });
  it('powtórka z innym formatem telefonu nie tworzy drugiego kontaktu, submisji, intake ani Deala', async () => {
    const first = await save();
    const second = await save({
      ...base,
      contact: { ...contact, phone: '+48 500-100-200' },
    });
    expect(second.id).toBe(first.id);
    expect(second.contactId).toBe(first.contactId);
    for (const table of [
      'contacts',
      'financial_questionnaire_submissions',
      'client_intakes',
      'contact_notes',
    ])
      expect(tables[table]).toHaveLength(1);
    expect(
      (harness.db as ReturnType<typeof database>).from
    ).not.toHaveBeenCalledWith('deals');
  });
  it('K3/01-E: API przyjmuje ręczne dane bez e-maila/firmy i deduplikuje formaty telefonu', async () => {
    for (const phone of [
      '500 100 200',
      '+48 500-100-200',
      '0048 500 100 200',
    ]) {
      const response = await api({
        ...base,
        contact: { name: contact.name, phone, email: '', company: '' },
      });
      expect(response.status).toBe(201);
    }
    expect(tables.contacts).toHaveLength(1);
    expect(tables.contacts[0].phone).toBe('+48500100200');
    expect(tables.financial_questionnaire_submissions).toHaveLength(1);
    expect(tables.client_intakes).toHaveLength(1);
    expect(tables.contact_notes).toHaveLength(1);
  });
  it.each([
    { name: '', phone: contact.phone, message: 'Podaj imię i nazwisko.' },
    { name: '   ', phone: contact.phone, message: 'Podaj imię i nazwisko.' },
    { name: contact.name, phone: '', message: 'Podaj poprawny numer telefonu' },
  ])(
    'K3/01-E: API odrzuca brak wymaganej tożsamości przed bazą (%j)',
    async ({ name, phone, message }) => {
      const response = await api({
        ...base,
        contact: { ...contact, name, phone },
      });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain(message);
      expect(
        (harness.db as ReturnType<typeof database>).from
      ).not.toHaveBeenCalled();
    }
  );
  it('po dwóch równoległych INSERT-ach zwraca tę samą widoczną submisję, bez fikcyjnej unikalności', async () => {
    const initialReads = rendezvous(
      'financial_questionnaire_submissions',
      'select'
    );
    const writes = rendezvous('financial_questionnaire_submissions', 'insert');
    afterQuery = async (table, operation) => {
      await initialReads(table, operation);
      await writes(table, operation);
    };
    const results = await Promise.all([save(), save()]);
    expect(results[0].id).toBe(results[1].id);
    expect(results[0].id).toBe(
      tables.financial_questionnaire_submissions[0].id
    );
    expect(tables.contacts).toHaveLength(1);
    // No unique index: duplicates remain; application does not delete data.
    expect(tables.financial_questionnaire_submissions).toHaveLength(2);
    for (const table of ['client_intakes', 'contact_notes']) {
      expect(tables[table].length).toBeGreaterThanOrEqual(1);
      expect(tables[table].length).toBeLessThanOrEqual(2);
    }
    const sizes = Object.fromEntries(
      Object.entries(tables).map(([key, rows]) => [key, rows.length])
    );
    expect((await save()).id).toBe(results[0].id);
    for (const [key, size] of Object.entries(sizes))
      expect(tables[key]).toHaveLength(size);
    expect(
      (harness.db as ReturnType<typeof database>).from
    ).not.toHaveBeenCalledWith('deals');
  });
  it('późniejszy commit z wcześniejszym czasem może zmienić kanoniczne ID — brak atomowości', async () => {
    const initialReads = rendezvous(
      'financial_questionnaire_submissions',
      'select'
    );
    let release!: () => void;
    const delayedCommit = new Promise<void>((resolve) => {
      release = resolve;
    });
    let insertCount = 0;
    beforeQuery = async (table, operation) => {
      if (
        table === 'financial_questionnaire_submissions' &&
        operation === 'insert' &&
        ++insertCount === 1
      )
        await delayedCommit;
    };
    afterQuery = async (table, operation) => {
      await initialReads(table, operation);
      if (
        table === 'financial_questionnaire_submissions' &&
        operation === 'insert' &&
        tables[table].length === 2
      )
        // PostgreSQL NOW() is transaction time, not commit time.
        tables[table][1].created_at = '2000-01-01T00:00:00Z';
    };
    const requests = [save(), save()];
    try {
      const fast = await Promise.race(requests);
      release();
      const results = await Promise.all(requests);
      expect(new Set(results.map((result) => result.id)).size).toBe(2);
      expect(tables.financial_questionnaire_submissions).toHaveLength(2);
      const retry = await save();
      expect(retry.id).toBe(tables.financial_questionnaire_submissions[1].id);
      expect(retry.id).not.toBe(fast.id);
      expect(tables.financial_questionnaire_submissions).toHaveLength(2);
    } finally {
      release();
    }
  });
  it('nie scala różnych odpowiedzi tego samego kontaktu', async () => {
    const first = await save();
    const second = await save({ ...base, amount: '420000' });
    expect(second.id).not.toBe(first.id);
    expect(second.contactId).toBe(first.contactId);
    expect(tables.contacts).toHaveLength(1);
    for (const table of [
      'financial_questionnaire_submissions',
      'client_intakes',
      'contact_notes',
    ])
      expect(tables[table]).toHaveLength(2);
  });
  it('klucz JSON działa wyłącznie we własnym koncie i kontakcie', async () => {
    const first = await save();
    for (const table of [
      'financial_questionnaire_submissions',
      'client_intakes',
      'contact_notes',
    ]) {
      const row = tables[table][0];
      tables[table] = [
        { ...row, id: `${table}-foreign-account`, account_id: 'other-account' },
        { ...row, id: `${table}-foreign-contact`, contact_id: 'other-contact' },
      ];
    }
    const result = await save();
    expect(result.id).not.toBe(first.id);
    for (const table of [
      'financial_questionnaire_submissions',
      'client_intakes',
      'contact_notes',
    ])
      expect(tables[table]).toHaveLength(3);
  });
  it('retry zachowuje status obsługi intake i dopiski w notatce', async () => {
    const first = await save();
    tables.client_intakes[0].status = 'obsluzone';
    tables.client_intakes[0].processed_at = '2026-10-31T12:00:00Z';
    tables.contact_notes[0].note_text += '\nDopisek pracownika';
    const snapshot = JSON.stringify(tables);
    expect((await save()).id).toBe(first.id);
    expect(JSON.stringify(tables)).toBe(snapshot);
  });
  it('równoległy check-then-insert notatki/intake może zostawić duplikaty; retry ich nie mnoży', async () => {
    const first = await save();
    tables.contact_notes = [];
    tables.client_intakes = [];
    const notes = rendezvous('contact_notes', 'select');
    const intakes = rendezvous('client_intakes', 'select');
    afterQuery = async (table, operation) => {
      await notes(table, operation);
      await intakes(table, operation);
    };
    const results = await Promise.all([save(), save()]);
    expect(results.map((result) => result.id)).toEqual([first.id, first.id]);
    expect(tables.financial_questionnaire_submissions).toHaveLength(1);
    expect(tables.contact_notes).toHaveLength(2);
    expect(tables.client_intakes).toHaveLength(2);
    await save();
    expect(tables.contact_notes).toHaveLength(2);
    expect(tables.client_intakes).toHaveLength(2);
  });
  it('read-after-write sortuje po czasie, a przy remisie po ID, także gdy duplikaty już istnieją', async () => {
    await save();
    const row = tables.financial_questionnaire_submissions[0];
    tables.financial_questionnaire_submissions = [
      { ...row, id: 'sub-z', created_at: '2026-10-31T12:00:00Z' },
      { ...row, id: 'sub-b', created_at: '2026-10-30T12:00:00Z' },
      { ...row, id: 'sub-a', created_at: '2026-10-30T12:00:00Z' },
    ];
    expect((await save()).id).toBe('sub-a');
    expect(tables.financial_questionnaire_submissions).toHaveLength(3);
  });
  it('nie deduplikuje wstecz submisji bez klucza i nie modyfikuje starych rekordów', async () => {
    await save();
    tables.financial_questionnaire_submissions[0].responses = { ...answers };
    tables.client_intakes[0].raw_payload = { ...answers };
    const oldSubmission = JSON.stringify(
      tables.financial_questionnaire_submissions[0]
    );
    const oldIntake = JSON.stringify(tables.client_intakes[0]);
    await save();
    expect(tables.financial_questionnaire_submissions).toHaveLength(2);
    expect(tables.client_intakes).toHaveLength(2);
    expect(JSON.stringify(tables.financial_questionnaire_submissions[0])).toBe(
      oldSubmission
    );
    expect(JSON.stringify(tables.client_intakes[0])).toBe(oldIntake);
  });
  it('błąd odczytu po INSERT daje błąd HTTP; retry używa zapisanej submisji', async () => {
    afterQuery = async (table, operation) => {
      if (
        table === 'financial_questionnaire_submissions' &&
        operation === 'insert'
      )
        failure = { table, operation: 'select' };
    };
    expect((await api(base)).status).toBe(500);
    expect(tables.financial_questionnaire_submissions).toHaveLength(1);
    afterQuery = null;
    failure = null;
    expect((await api(base)).status).toBe(201);
    expect(tables.financial_questionnaire_submissions).toHaveLength(1);
    expect(tables.client_intakes).toHaveLength(1);
    expect(tables.contact_notes).toHaveLength(1);
  });
  it('dwa telefony o tym samym emailu tworzą dwa kontakty', async () => {
    await save();
    await save({ ...base, contact: { ...contact, phone: '600100200' } });
    expect(tables.contacts).toHaveLength(2);
    expect(
      new Set(tables.client_intakes.map((row) => row.contact_id)).size
    ).toBe(2);
  });
  it('uzupełnia tylko puste dane istniejącego kontaktu i zachowuje jego dane', async () => {
    tables.contacts = [
      {
        id: 'existing',
        account_id: 'account-synthetic',
        phone: '+48500100200',
        name: 'Zachowana nazwa',
        email: null,
        company: 'Zachowana firma',
      },
    ];
    await save();
    expect(tables.contacts).toHaveLength(1);
    expect(tables.contacts[0]).toMatchObject({
      name: 'Zachowana nazwa',
      email: contact.email,
      company: 'Zachowana firma',
    });
    expect(tables.client_intakes[0].contact_id).toBe('existing');
    expect(
      tables.financial_questionnaire_submissions[0].submitted_company
    ).toBe(contact.company);
  });
  it.each([
    ['contacts', 'select'],
    ['contacts', 'insert'],
    ['contacts', 'update'],
    ['financial_questionnaire_submissions', 'select'],
    ['financial_questionnaire_submissions', 'insert'],
    ['contact_notes', 'select'],
    ['contact_notes', 'insert'],
    ['client_intakes', 'select'],
    ['client_intakes', 'insert'],
  ])(
    'jawny błąd API przy awarii %s / %s; retry nie mnoży kontaktów',
    async (table, operation) => {
      if (operation === 'update')
        tables.contacts = [
          {
            id: 'existing',
            account_id: 'account-synthetic',
            phone: '+48500100200',
            name: null,
            email: null,
          },
        ];
      failure = { table, operation };
      const response = await api(base);
      expect(response.status).toBe(500);
      expect((await response.json()).error).toBeTruthy();
      failure = null;
      expect((await api(base)).status).toBe(201);
      expect(tables.contacts).toHaveLength(1);
      expect(tables.financial_questionnaire_submissions).toHaveLength(1);
      expect(tables.client_intakes).toHaveLength(1);
      expect(tables.contact_notes).toHaveLength(1);
    }
  );
  it.each([
    null,
    {},
    { ...base, adults: undefined },
    { ...base, documents: 'polisa' },
    { ...base, consent: false },
    { ...base, city: 123 },
    { ...base, children: '-1' },
    { ...base, website: 'spam.example' },
    { ...base, website: {} },
    { ...base, contact: { ...contact, phone: '123' } },
    { ...base, contact: undefined },
    { ...base, goal: 'x'.repeat(4001) },
  ])(
    'odrzuca błędny lub niekompletny payload %# przed zapisem',
    async (body) => {
      const response = await api(body);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBeTruthy();
      expect(
        (harness.db as ReturnType<typeof database>).from
      ).not.toHaveBeenCalled();
    }
  );
  it('jawnie puste odpowiedzi pozostają zapisane jako częściowa ankieta', async () => {
    const input = parseFinancialQuestionnaire({
      ...base,
      city: '',
      documents: [],
    });
    expect(questionnaireMissingItems(input)).toEqual([
      'Miejscowość',
      'Dokumenty do analizy',
    ]);
    expect(
      buildPreliminaryAnalysis(input, questionnaireMissingItems(input))
    ).toContain('nie decyzja kredytowa');
    expect(financialQuestionnaireErrorResponse(new Error('internal'))).toEqual({
      status: 500,
      message: 'Nie udało się zapisać ankiety.',
    });
  });
  it('migracja 073 jest usunięta; adapter odrzuca jej kolumny na każdym poziomie', async () => {
    expect(
      existsSync('supabase/migrations/073_questionnaire_retry_integrity.sql')
    ).toBe(false);
    const db = database();
    expect(() =>
      db.from('financial_questionnaire_submissions').eq('submission_key', 'key')
    ).toThrow('Unknown column');
    expect(() =>
      db.from('client_intakes').select('questionnaire_submission_id')
    ).toThrow('Unknown column');
    expect(() =>
      db
        .from('contact_notes')
        .order('questionnaire_submission_id', { ascending: true })
    ).toThrow('Unknown column');
    await expect(
      db
        .from('financial_questionnaire_submissions')
        .insert({ submission_key: 'key' })
        .single()
    ).rejects.toThrow('Unknown column');
    await expect(
      db
        .from('contact_notes')
        .insert({ questionnaire_submission_id: 'id' })
        .single()
    ).rejects.toThrow('Unknown column');
  });
});

describe('K3/01-H: zgodność publicznej koperty i historia odpowiedzi', () => {
  it('33 odpowiedzi + 5 przygotowań + 4 dane + płaskie duplikaty → 201 i pełny zapis', async () => {
    expect(Object.keys(publicQuestionnaireResponses)).toHaveLength(33);
    expect(Object.keys(publicQuestionnairePreparation)).toHaveLength(5);
    for (const [key, value] of Object.entries({
      ...publicQuestionnaireResponses,
      ...publicQuestionnairePreparation,
    }))
      expect(publicQuestionnairePayload).toHaveProperty(key, value);
    const response = await api(publicQuestionnairePayload);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ok: true,
      status: 'submitted',
      missingItems: [],
      preparationItems: [],
      message: 'Dziękujemy. Ankieta została zapisana.',
    });
    const saved = tables.financial_questionnaire_submissions[0];
    expect(saved).toMatchObject({
      submitted_name: publicQuestionnairePayload.name,
      submitted_phone: publicQuestionnairePayload.phone,
      submitted_email: publicQuestionnairePayload.email,
      submitted_company: publicQuestionnairePayload.company,
      preparation_plan: publicQuestionnairePreparation,
    });
    for (const [key, value] of Object.entries({
      ...publicQuestionnaireResponses,
      ...publicQuestionnairePreparation,
    })) {
      if (value !== '') {
        expect(saved.responses).toHaveProperty(key, value);
        expect(tables.client_intakes[0].raw_payload).toHaveProperty(key, value);
      }
    }
    expect(String(tables.contact_notes[0].note_text)).not.toContain(
      'undefined:'
    );
  });
  it('CRM: zachowuje 13 pól i odpowiedź 201 bez rozszerzenia kontraktu', async () => {
    expect(QUESTIONNAIRE_FIELDS).toHaveLength(13);
    expect((await api(base)).status).toBe(201);
    expect(
      tables.financial_questionnaire_submissions[0].responses
    ).toMatchObject(answers);
  });
  it('wartości z kopert wygrywają z płaskimi duplikatami, także pustymi i złego typu', async () => {
    const body = {
      ...publicQuestionnairePayload,
      goal: 123,
      documents: 'stary format',
      incomePreparation: false,
      responses: { ...publicQuestionnaireResponses, city: '' },
    };
    expect((await api(body)).status).toBe(201);
    const saved = tables.financial_questionnaire_submissions[0];
    expect(saved.responses).toMatchObject({
      goal: publicQuestionnaireResponses.goal,
      documents: publicQuestionnaireResponses.documents,
      city: '',
      incomePreparation: publicQuestionnairePreparation.incomePreparation,
    });
    expect(saved.missing_items).toEqual(['Miejscowość']);
  });
  it('koperty działają bez płaskich duplikatów odpowiedzi', async () => {
    const {
      name,
      phone,
      email,
      company,
      consent,
      website,
      responses,
      preparationPlan,
    } = publicQuestionnairePayload;
    expect(
      (
        await api({
          name,
          phone,
          email,
          company,
          consent,
          website,
          responses,
          preparationPlan,
        })
      ).status
    ).toBe(201);
  });
  it('nieznane klucze w każdym miejscu są akceptowane i zachowane, bez fałszywych braków', async () => {
    const body = {
      ...publicQuestionnairePayload,
      extraRoot: { publicVersion: 2 },
      extraEmpty: '',
      extraNull: null,
      extraArray: [],
      responses: {
        ...publicQuestionnaireResponses,
        extraAnswer: ['A', 'B'],
        extraZero: 0,
        extraFalse: false,
      },
      preparationPlan: {
        ...publicQuestionnairePreparation,
        extraPreparation: 'sprawdzić',
        extraEmptyPlan: '',
      },
    };
    const response = await api(body);
    expect(response.status).toBe(201);
    expect((await response.json()).missingItems).toEqual([]);
    expect(
      tables.financial_questionnaire_submissions[0].responses
    ).toMatchObject({
      extraRoot: { publicVersion: 2 },
      extraAnswer: ['A', 'B'],
      extraZero: 0,
      extraFalse: false,
      extraPreparation: 'sprawdzić',
    });
    expect(
      (await api({ ...base, contact: { ...contact, extraContact: 'ignored' } }))
        .status
    ).toBe(201);
  });
  it.each(['name', 'phone', 'consent'] as const)(
    'brak %s → czytelne 400 przed bazą',
    async (key) => {
      const body: Record<string, unknown> = { ...publicQuestionnairePayload };
      delete body[key];
      const response = await api(body);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toMatch(/imię|telefonu|Zgoda/);
      expect(harness.adminCalls).toBe(0);
    }
  );
  it.each([
    { ...publicQuestionnairePayload, website: 'bot.example' },
    {
      ...publicQuestionnairePayload,
      responses: { ...publicQuestionnaireResponses, website: 'bot.example' },
    },
    {
      ...publicQuestionnairePayload,
      website: 'bot.example',
      responses: { ...publicQuestionnaireResponses, website: '' },
    },
  ])('honeypot → 400 przed bazą (%#)', async (body) => {
    const response = await api(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Ankieta została odrzucona.');
    expect(harness.adminCalls).toBe(0);
  });
  it.each([
    { ...publicQuestionnairePayload, phone: '123' },
    { ...publicQuestionnairePayload, consent: false },
    { ...publicQuestionnairePayload, responses: [] },
    { ...publicQuestionnairePayload, preparationPlan: 'bad' },
    {
      ...publicQuestionnairePayload,
      responses: { ...publicQuestionnaireResponses, city: 123 },
    },
    {
      ...publicQuestionnairePayload,
      responses: { ...publicQuestionnaireResponses, incomeNet1: 9000 },
    },
    {
      ...publicQuestionnairePayload,
      responses: { ...publicQuestionnaireResponses, documents: 'polisa' },
    },
    {
      ...publicQuestionnairePayload,
      preparationPlan: {
        ...publicQuestionnairePreparation,
        incomePreparation: false,
      },
    },
    {
      ...publicQuestionnairePayload,
      responses: { ...publicQuestionnaireResponses, consent: false },
    },
  ])('znane pole ze złym typem/wartością → 400 (%#)', async (body) => {
    expect((await api(body)).status).toBe(400);
    expect(harness.adminCalls).toBe(0);
  });
  it('identyczny payload i zmiana kolejności kluczy → jeden komplet rekordów; zmiana odpowiedzi → historia', async () => {
    expect((await api(publicQuestionnairePayload)).status).toBe(201);
    expect((await api(publicQuestionnairePayload)).status).toBe(201);
    const reverse = (object: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(object).reverse());
    expect(
      (
        await api({
          ...reverse(publicQuestionnairePayload),
          responses: reverse(publicQuestionnaireResponses),
          preparationPlan: reverse(publicQuestionnairePreparation),
        })
      ).status
    ).toBe(201);
    for (const table of [
      'contacts',
      'financial_questionnaire_submissions',
      'client_intakes',
      'contact_notes',
      'sales_activities',
    ])
      expect(tables[table]).toHaveLength(1);
    expect(
      (
        await api({
          ...publicQuestionnairePayload,
          responses: { ...publicQuestionnaireResponses, incomeNet1: '9500' },
        })
      ).status
    ).toBe(201);
    expect(tables.contacts).toHaveLength(1);
    expect(tables.financial_questionnaire_submissions).toHaveLength(2);
    expect(
      (harness.db as ReturnType<typeof database>).from
    ).not.toHaveBeenCalledWith('deals');
  });
});

describe('K3/01-I: działanie best-effort po zapisie ankiety', () => {
  const successBody = {
    ok: true,
    status: 'submitted',
    missingItems: [],
    preparationItems: [],
    message: 'Dziękujemy. Ankieta została zapisana.',
  };

  it('sukces i identyczne ponowienie → 201, jedna submisja i jedno działanie', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await api(publicQuestionnairePayload);
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(successBody);
      }
      expect(tables.financial_questionnaire_submissions).toHaveLength(1);
      expect(tables.sales_activities).toHaveLength(1);
      expect(tables.sales_activities[0]).toMatchObject({
        title: `Ankieta ${tables.financial_questionnaire_submissions[0].id}`,
        contact_id: tables.contacts[0].id,
        activity_type: 'zadanie',
        activity_status: 'PLANOWANE',
        next_action: 'Omówić ankietę i przygotować spotkanie.',
      });
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it.each([
    ['select', 'returned'],
    ['select', 'thrown'],
    ['insert', 'returned'],
    ['insert', 'thrown'],
  ])(
    '%s / %s: 201 bez ujawnienia błędu; retry bez duplikatów',
    async (operation, mode) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const sensitiveError = {
        code: '42703',
        message: contact.name,
        details: contact.phone,
        hint: contact.email,
      };
      if (mode === 'returned')
        failure = { table: 'sales_activities', operation };
      else
        beforeQuery = async (table, queryOperation) => {
          if (table === 'sales_activities' && queryOperation === operation)
            throw sensitiveError;
        };
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await api(publicQuestionnairePayload);
          expect(response.status).toBe(201);
          expect(await response.json()).toEqual(successBody);
        }
        expect(tables.financial_questionnaire_submissions).toHaveLength(1);
        expect(tables.sales_activities ?? []).toHaveLength(0);
        expect(log.mock.calls).toEqual(
          Array.from({ length: 2 }, () => [
            'financial_questionnaire_activity_failed',
            { operation, code: mode === 'returned' ? '42501' : '42703' },
          ])
        );
        failure = null;
        beforeQuery = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await api(publicQuestionnairePayload);
          expect(response.status).toBe(201);
          expect(await response.json()).toEqual(successBody);
        }
        expect(tables.financial_questionnaire_submissions).toHaveLength(1);
        expect(tables.sales_activities).toHaveLength(1);
        expect(tables.client_intakes).toHaveLength(1);
        expect(tables.contact_notes).toHaveLength(1);
        expect(log).toHaveBeenCalledTimes(2);
      } finally {
        log.mockRestore();
      }
    }
  );

  it('utracona odpowiedź INSERT: 201 i retry rozpoznaje zapisane działanie', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    afterQuery = async (table, operation) => {
      if (table === 'sales_activities' && operation === 'insert')
        throw new Error(`synthetic response lost: ${contact.email}`);
    };
    try {
      expect((await api(publicQuestionnairePayload)).status).toBe(201);
      expect(tables.sales_activities).toHaveLength(1);
      afterQuery = null;
      expect((await api(publicQuestionnairePayload)).status).toBe(201);
      expect(tables.sales_activities).toHaveLength(1);
      expect(tables.financial_questionnaire_submissions).toHaveLength(1);
      expect(log.mock.calls).toEqual([
        [
          'financial_questionnaire_activity_failed',
          { operation: 'insert', code: 'UNKNOWN' },
        ],
      ]);
    } finally {
      log.mockRestore();
    }
  });

  it('częściowa ankieta i błąd odczytu: zachowuje status, braki i komunikat 201; nie loguje treści code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    beforeQuery = async (table) => {
      if (table === 'sales_activities') throw { code: contact.email };
    };
    try {
      const response = await api({
        ...publicQuestionnairePayload,
        responses: { ...publicQuestionnaireResponses, city: '' },
      });
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        ...successBody,
        status: 'partial',
        missingItems: ['Miejscowość'],
        message:
          'Dziękujemy. Ankieta została zapisana z listą informacji do uzupełnienia.',
      });
      expect(tables.financial_questionnaire_submissions).toHaveLength(1);
      expect(tables.sales_activities ?? []).toHaveLength(0);
      expect(log.mock.calls).toEqual([
        [
          'financial_questionnaire_activity_failed',
          { operation: 'select', code: 'UNKNOWN' },
        ],
      ]);
    } finally {
      log.mockRestore();
    }
  });
});

const crmContactId = '00000000-0000-4000-8000-000000000001';
const foreignContactId = '00000000-0000-4000-8000-000000000002';
function advisor() {
  harness.userId = 'advisor-synthetic';
  tables.profiles = [
    {
      user_id: harness.userId,
      account_id: 'account-synthetic',
      account_role: 'agent',
    },
  ];
  tables.contacts = [
    {
      id: crmContactId,
      account_id: 'account-synthetic',
      name: contact.name,
      phone: '+48500100200',
      email: contact.email,
      company: 'Firma historyczna',
    },
    {
      id: foreignContactId,
      account_id: 'other-account',
      name: 'Obca osoba syntetyczna',
      phone: '+48600100200',
      email: 'foreign@example.invalid',
    },
  ];
  tables.contact_companies = [
    {
      account_id: 'account-synthetic',
      contact_id: crmContactId,
      is_primary: true,
      company: { name: contact.company },
    },
  ];
}
const crmApi = (body: unknown = base, id = crmContactId) =>
  crmPost(
    new Request(`https://crm.makson.space/api/questionnaires?contact=${id}`, {
      method: 'POST',
      headers: {
        origin: 'https://crm.makson.space',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  );
function findForm(
  node: ReactNode
): ReactElement<{ crmContext: unknown }> | undefined {
  if (Array.isArray(node)) return node.map(findForm).find(Boolean);
  if (!node || typeof node !== 'object' || !('props' in node)) return;
  const element = node as ReactElement<{
    children?: ReactNode;
    crmContext: unknown;
  }>;
  return element.type === FinancialQuestionnaireForm
    ? element
    : findForm(element.props.children);
}

describe('K3/01-G: jedna ankieta publiczna i doradcy', () => {
  it('uprawniony doradca otwiera ten sam formularz z czterema danymi Kontaktu', async () => {
    advisor();
    const page = await QuestionnairePage({
      searchParams: Promise.resolve({ contact: crmContactId }),
    });
    expect(findForm(page)?.props.crmContext).toEqual({
      contactId: crmContactId,
      contact: { ...contact, phone: '+48500100200' },
    });
    expect(harness.adminCalls).toBe(0);
  });
  it.each([
    'anonymous',
    'foreign',
    'malformed',
    'array',
    'missing-profile',
    'lookup-error',
  ])(
    '%s: parametr nie ujawnia danych i strona renderuje publiczną ankietę',
    async (mode) => {
      advisor();
      let id: string | string[] = crmContactId;
      if (mode === 'anonymous') harness.userId = null;
      if (mode === 'foreign') id = foreignContactId;
      if (mode === 'malformed') id = 'not-a-uuid';
      if (mode === 'array') id = [crmContactId, foreignContactId];
      if (mode === 'missing-profile') tables.profiles = [];
      if (mode === 'lookup-error')
        failure = { table: 'contacts', operation: 'select' };
      const page = await QuestionnairePage({
        searchParams: Promise.resolve({ contact: id }),
      });
      expect(findForm(page)?.props.crmContext).toBeNull();
      expect(harness.adminCalls).toBe(0);
    }
  );
  it('brak contact nie odczytuje sesji ani kontaktów', async () => {
    expect(await loadCrmQuestionnaireContext(undefined)).toBeNull();
    expect(
      (harness.db as ReturnType<typeof database>).from
    ).not.toHaveBeenCalled();
  });
  it('CRM: poprawia tożsamość wskazanego Kontaktu, zapisuje źródło/autora/zgodę/historię i działanie; retry bez duplikatów i bez Deala', async () => {
    advisor();
    const body = {
      ...base,
      contact: {
        ...contact,
        name: 'Poprawiona Osoba',
        phone: '0048 700 100 200',
        email: 'edited@example.invalid',
        company: 'Firma zgłoszona',
      },
    };
    expect((await crmApi(body)).status).toBe(201);
    expect(
      (
        await crmApi({
          ...body,
          contact: { ...body.contact, phone: '+48 700-100-200' },
        })
      ).status
    ).toBe(201);
    expect(tables.contacts).toHaveLength(2); // own selected + untouched foreign
    expect(tables.contacts[0]).toMatchObject({
      id: crmContactId,
      name: body.contact.name,
      phone: '+48700100200',
      email: body.contact.email,
    });
    for (const table of [
      'financial_questionnaire_submissions',
      'contact_notes',
      'client_intakes',
      'sales_activities',
    ])
      expect(tables[table]).toHaveLength(1);
    expect(tables.financial_questionnaire_submissions[0]).toMatchObject({
      contact_id: crmContactId,
      submitted_company: body.contact.company,
      consent_to_analysis: true,
      consented_at: expect.any(String),
      created_at: expect.any(String),
      responses: { source: 'crm', submitted_by: harness.userId },
    });
    expect(tables.client_intakes[0]).toMatchObject({
      source: 'crm',
      contact_id: crmContactId,
      raw_payload: {
        source: 'crm',
        submitted_by: harness.userId,
        consent_to_analysis: true,
      },
    });
    expect(tables.contact_notes[0]).toMatchObject({
      user_id: harness.userId,
      contact_id: crmContactId,
    });
    expect(tables.sales_activities[0]).toMatchObject({
      source: 'crm',
      user_id: harness.userId,
      contact_id: crmContactId,
      completed: false,
      next_action: expect.any(String),
    });
    expect(
      (harness.db as ReturnType<typeof database>).from
    ).not.toHaveBeenCalledWith('deals');
  });
  it.each(['anonymous', 'foreign', 'viewer', 'missing-profile'])(
    'CRM POST %s: ponowna kontrola sesji i uprawnień przed adminem/zapisem',
    async (mode) => {
      advisor();
      if (mode === 'anonymous') harness.userId = null;
      if (mode === 'viewer') tables.profiles[0].account_role = 'viewer';
      if (mode === 'missing-profile') tables.profiles = [];
      const before = JSON.stringify(tables);
      const response = await crmApi(
        base,
        mode === 'foreign' ? foreignContactId : crmContactId
      );
      expect(response.status).toBe(
        mode === 'anonymous' ? 401 : mode === 'foreign' ? 404 : 403
      );
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(JSON.stringify(tables)).toBe(before);
      expect(harness.adminCalls).toBe(0);
    }
  );
  it('kolizja telefonu w CRM daje jawne 409 bez przepięcia ankiety lub nowego Kontaktu', async () => {
    advisor();
    tables.contacts.push({
      id: 'other-own',
      account_id: 'account-synthetic',
      phone: '+48700100200',
    });
    const before = JSON.stringify(tables);
    const response = await crmApi({
      ...base,
      contact: { ...contact, phone: '700100200' },
    });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('innego kontaktu');
    expect(JSON.stringify(tables)).toBe(before);
  });
  it('publiczny POST ignoruje contact w URL; nie ujawnia ani nie wiąże obcego Kontaktu', async () => {
    advisor();
    harness.userId = null;
    const response = await POST(
      new Request(
        `https://makson.space/api/public/questionnaires?contact=${foreignContactId}`,
        { method: 'POST', body: JSON.stringify(base) }
      )
    );
    expect(response.status).toBe(201);
    expect(await response.json()).not.toHaveProperty('contact');
    expect(tables.financial_questionnaire_submissions[0].contact_id).toBe(
      crmContactId
    );
    expect(tables.client_intakes[0].source).toBe('makson.space/ankieta');
    expect(tables.sales_activities[0].source).toBe('makson.space/ankieta');
    expect(
      (harness.db as ReturnType<typeof database>).from
    ).not.toHaveBeenCalledWith('deals');
  });
  it.each(['contactId', 'source', 'crm', 'submitted_by'])(
    'publiczny payload nie może podszyć się pod kontekst CRM: %s',
    async (key) => {
      expect((await api({ ...base, [key]: crmContactId })).status).toBe(201);
      expect(tables.financial_questionnaire_submissions[0]).toMatchObject({
        contact_id: tables.contacts[0].id,
        responses: { source: 'makson.space/ankieta', submitted_by: null },
      });
      expect(tables.client_intakes[0].source).toBe('makson.space/ankieta');
      if (key === 'source' || key === 'submitted_by') {
        expect(
          tables.financial_questionnaire_submissions[0].responses
        ).toHaveProperty(`original_answers.${key}`, crmContactId);
      }
      expect(tables.sales_activities[0].source).toBe('makson.space/ankieta');
      expect(tables.profiles).toBeUndefined();
    }
  );
  it('retry publiczny zachowuje istniejące zaplanowane działanie', async () => {
    await save();
    tables.sales_activities[0].completed = true;
    tables.sales_activities[0].next_action =
      'Działanie poprawione przez doradcę';
    const before = JSON.stringify(tables.sales_activities);
    await save();
    expect(JSON.stringify(tables.sales_activities)).toBe(before);
  });
  it('odrębne ścieżki zachowują historię i autora bez duplikowania Kontaktu', async () => {
    advisor();
    await save();
    expect((await crmApi()).status).toBe(201);
    expect(tables.contacts).toHaveLength(2);
    expect(tables.financial_questionnaire_submissions).toHaveLength(2);
    expect(tables.client_intakes.map((row) => row.source)).toEqual([
      'makson.space/ankieta',
      'crm',
    ]);
  });
  it('awaria działania CRM nie odrzuca ankiety; retry naprawia zapis bez duplikowania submisji', async () => {
    advisor();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    failure = { table: 'sales_activities', operation: 'insert' };
    const response = await crmApi();
    expect(response.status).toBe(201);
    expect(await response.json()).not.toHaveProperty('error');
    expect(log).toHaveBeenCalledWith(
      'financial_questionnaire_activity_failed',
      {
        operation: 'insert',
        code: '42501',
      }
    );
    log.mockRestore();
    failure = null;
    expect((await crmApi()).status).toBe(201);
    expect(tables.financial_questionnaire_submissions).toHaveLength(1);
    expect(tables.sales_activities).toHaveLength(1);
  });
});

it('K3/01-G: rzeczywiste handlery /formularz → /ankieta oraz retry tworzą jeden Kontakt po E.164 i zero Deali', async () => {
  const response = await leadPost(
    new Request('https://makson.space/api/public/leads', {
      method: 'POST',
      body: JSON.stringify({
        ...contact,
        consent: true,
        message: 'Syntetyczne badanie potrzeb finansowych',
        inquiryType: 'financial-audit',
        callbackPreference: 'any-time',
        website: '',
        startedAt: 1,
      }),
    })
  );
  expect(response.status).toBe(201);
  for (const phone of ['+48 500-100-200', '0048 500100200']) {
    expect(
      (await api({ ...base, contact: { ...contact, phone } })).status
    ).toBe(201);
  }
  expect(tables.contacts).toHaveLength(1);
  expect(tables.contacts[0].phone).toBe('+48500100200');
  expect(tables.public_lead_submissions).toHaveLength(1);
  expect(tables.public_lead_submissions[0]).toMatchObject({
    source: 'makson_space_form',
    consent_to_contact: true,
    consented_at: expect.any(String),
  });
  expect(tables.financial_questionnaire_submissions).toHaveLength(1);
  expect(tables.client_intakes).toHaveLength(1);
  expect(tables.contact_notes).toHaveLength(2); // original lead + questionnaire history
  expect(tables.sales_activities).toHaveLength(1);
  expect(
    (harness.db as ReturnType<typeof database>).from
  ).not.toHaveBeenCalledWith('deals');
});
