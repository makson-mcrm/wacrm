import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deal, PipelineStage } from '@/types';

const harness = vi.hoisted(() => ({
  cells: [] as unknown[],
  cursor: 0,
  mounted: false,
  effects: [] as (() => unknown)[],
  db: {} as Record<string, unknown>,
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => unknown) => {
    if (!harness.mounted) harness.effects.push(fn);
  },
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.cells))
      harness.cells[index] =
        typeof initial === 'function' ? initial() : initial;
    return [
      harness.cells[index],
      (next: unknown) => {
        harness.cells[index] =
          typeof next === 'function' ? next(harness.cells[index]) : next;
      },
    ];
  },
  useRef: (value: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.cells)) harness.cells[index] = { current: value };
    return harness.cells[index];
  },
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => harness.db }));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    accountId: 'account-synthetic',
    profile: { id: 'profile-synthetic' },
  }),
}));
vi.mock('sonner', () => ({ toast: harness.toast }));
import { DealForm } from './deal-form';
import DealPage from '@/app/(dashboard)/deals/[id]/page';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'generated-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
import { saveDealContacts, updateDeal } from '@/lib/deals/persistence';
import { readFileSync } from 'node:fs';

type Row = Record<string, unknown>;
type Element = ReactElement<Record<string, unknown>>;
const contactId = '10000000-0000-4000-8000-000000000001';
const stageNames = [
  ...readFileSync('src/app/(dashboard)/pipelines/page.tsx', 'utf8').matchAll(
    /name: '([^']+)', color:/g
  ),
].map((match) => match[1]);
const stages = stageNames.map((name, position) => ({
  id: `stage-${position}`,
  name,
  pipeline_id: 'pipeline-synthetic',
  position,
})) as PipelineStage[];
let tables: Record<string, Row[]>;
let failure: { table: string; operation: string } | null;
let props: Parameters<typeof DealForm>[0];
let tree: ReactNode;
let view: 'form' | 'card' = 'form';

/** In-memory query double. It deliberately does NOT simulate the SQL history trigger. */
function database() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'user-synthetic' } } },
      }),
    },
    from: (table: string) => {
      let operation = 'select';
      let payload: Row | Row[] = {};
      const filters: ((row: Row) => boolean)[] = [];
      const result = (single = false) => {
        const rows = (tables[table] ??= []);
        if (failure?.table === table && failure.operation === operation)
          return {
            data: null,
            error: { code: '42501', message: 'synthetic permission denied' },
          };
        const selected = rows.filter((row) =>
          filters.every((filter) => filter(row))
        );
        let data = selected;
        if (operation === 'insert') {
          const row = { ...payload, id: `generated-${rows.length + 1}` };
          rows.push(row);
          data = [row];
        }
        if (operation === 'update')
          selected.forEach((row) => Object.assign(row, payload));
        if (operation === 'upsert') {
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            const old = rows.find(
              (candidate) =>
                candidate.deal_id === row.deal_id &&
                candidate.contact_id === row.contact_id
            );
            if (old) Object.assign(old, row);
            else rows.push({ ...row });
          }
        }
        if (operation === 'delete')
          tables[table] = rows.filter((row) => !selected.includes(row));
        return single && data.length !== 1
          ? {
              data: null,
              error: { code: 'PGRST116', message: 'synthetic zero rows' },
            }
          : {
              data: single ? { ...data[0] } : data.map((row) => ({ ...row })),
              error: null,
            };
      };
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        eq: (key: string, value: unknown) => {
          filters.push((row) => row[key] === value);
          return query;
        },
        in: (key: string, values: unknown[]) => {
          filters.push((row) => values.includes(row[key]));
          return query;
        },
        like: (_key: string, suffix: string) => {
          filters.push((row) =>
            String(row.phone).replace(/\D/g, '').endsWith(suffix.slice(1))
          );
          return query;
        },
        not: (key: string, _operator: string, values: string) => {
          filters.push(
            (row) => !values.slice(1, -1).split(',').includes(String(row[key]))
          );
          return query;
        },
        insert: (value: Row) => {
          operation = 'insert';
          payload = value;
          return query;
        },
        update: (value: Row) => {
          operation = 'update';
          payload = value;
          return query;
        },
        upsert: (value: Row | Row[]) => {
          operation = 'upsert';
          payload = value;
          return query;
        },
        delete: () => {
          operation = 'delete';
          return query;
        },
        single: async () => result(true),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  };
}
function render() {
  harness.cursor = 0;
  tree = view === 'form' ? DealForm(props) : DealPage();
}
function nodes(node: ReactNode = tree): Element[] {
  const found: Element[] = [];
  const pending: ReactNode[] = [node];
  while (pending.length) {
    const child = pending.pop();
    if (Array.isArray(child)) {
      pending.push(...child);
      continue;
    }
    if (!child || typeof child !== 'object' || !('props' in child)) continue;
    const element = child as Element;
    found.push(element);
    pending.push(element.props.children as ReactNode);
  }
  return found;
}
function find(key: string, value: unknown) {
  const node = nodes().find((element) => element.props[key] === value);
  if (!node) throw new Error(`Missing control: ${key}=${value}`);
  return node;
}
function invoke(element: Element, event: string, value?: unknown) {
  return (element.props[event] as (value?: unknown) => unknown)(value);
}
function input(placeholder: string, value: string) {
  invoke(find('placeholder', placeholder), 'onChange', { target: { value } });
  render();
}
function select(label: string, value: string) {
  invoke(find('label', label), 'set', value);
  render();
}
function field(label: string, value: string) {
  const child = nodes(find('label', label)).find(
    (node) => typeof node.props.onChange === 'function'
  );
  if (!child) throw new Error(`Missing field: ${label}`);
  invoke(child, 'onChange', value);
  render();
}
function save() {
  const button = nodes().find(
    (node) =>
      Array.isArray(node.props.children) &&
      node.props.children.includes(props.deal ? 'Zapisz zmiany' : 'UTWÓRZ')
  )!;
  return invoke(button, 'onClick');
}
async function mount(deal?: Deal, inheritContact = true) {
  view = 'form';
  harness.cells = [];
  harness.effects = [];
  harness.mounted = false;
  props = {
    open: true,
    onOpenChange: vi.fn(),
    onSaved: vi.fn(),
    pipelineId: 'pipeline-synthetic',
    stages,
    defaultStageId: 'stage-0',
    defaultContactId: inheritContact ? contactId : '',
    deal,
  };
  render();
  harness.mounted = true;
  for (const effect of harness.effects) effect();
  await vi.waitFor(() => {
    render();
    expect(
      nodes().find(
        (node) =>
          Array.isArray(node.props.children) &&
          node.props.children.includes(deal ? 'Zapisz zmiany' : 'UTWÓRZ')
      )?.props.disabled
    ).toBe(false);
  });
}
function fillNew(title = 'Sprawa syntetyczna Alfa') {
  input('Np. Hipoteka — Jan Kowalski', title);
  input('Więcej niż 0', '100000');
  invoke(
    find('placeholder', 'Sytuacja klienta, potrzeba i najważniejsze ustalenia'),
    'onChange',
    'Opis syntetyczny'
  );
  render();
  select('Kategoria produktu *', 'ML — HIPOTEKA');
}
beforeEach(() => {
  view = 'form';
  vi.stubGlobal('window', {
    location: { search: '' },
    setTimeout,
    clearTimeout,
  });
  tables = {
    contacts: [
      {
        id: contactId,
        name: 'Osoba syntetyczna Alfa',
        phone: '+48500111222',
        source: 'Polecenie',
      },
    ],
  };
  failure = null;
  harness.db = database();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('K3: rzeczywiste handlery formularza Deala, bez DOM i sieci', () => {
  it('tworzy dwa osobne Deale jednego kontaktu, z etapem istniejącego lejka', async () => {
    await mount();
    fillNew();
    await save();
    await mount();
    fillNew('Sprawa syntetyczna Beta');
    await save();
    expect(tables.deals).toHaveLength(2);
    expect(tables.deals.map((row) => row.id)).toEqual([
      'generated-1',
      'generated-2',
    ]);
    expect(
      tables.deals.every(
        (row) =>
          row.contact_id === contactId &&
          row.stage_id === stages[0].id &&
          row.pipeline_id === 'pipeline-synthetic'
      )
    ).toBe(true);
    expect(tables.deal_contacts).toHaveLength(2);
    expect(props.onSaved).toHaveBeenCalledOnce();
  });
  it('edytuje etap i następny krok; ponowne otwarcie zachowuje dane i warszawską godzinę', async () => {
    await mount();
    fillNew();
    await save();
    await mount(tables.deals[0] as unknown as Deal);
    invoke(find('value', 'stage-0'), 'onChange', {
      target: { value: 'stage-1' },
    });
    render();
    field('Następne działanie', 'Syntetyczny telefon');
    field('Termin następnego działania', '2026-11-02T10:30');
    await save();
    expect(tables.deals[0]).toMatchObject({
      stage_id: 'stage-1',
      next_action: 'Syntetyczny telefon',
      next_action_at: '2026-11-02T09:30:00.000Z',
      contact_id: contactId,
      description: 'Opis syntetyczny',
      value: 100000,
    });
    await mount(tables.deals[0] as unknown as Deal);
    expect(
      find('label', 'Termin następnego działania').props.children
    ).toMatchObject({ props: { value: '2026-11-02T10:30' } });
    expect(
      nodes().some((node) => node.props.value === 'Syntetyczny telefon')
    ).toBe(true);
    expect(nodes().some((node) => node.props.value === 'stage-1')).toBe(true);
  });
  it('błąd relacji pozostawia formularz otwarty; retry nie tworzy kolejnego Deala', async () => {
    await mount();
    fillNew();
    failure = { table: 'deal_contacts', operation: 'upsert' };
    await save();
    expect(tables.deals).toHaveLength(1);
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(harness.toast.error).toHaveBeenCalledWith(
      expect.stringContaining('synthetic permission denied')
    );
    failure = null;
    render();
    await save();
    expect(tables.deals).toHaveLength(1);
    expect(tables.deal_contacts).toHaveLength(1);
    expect(props.onSaved).toHaveBeenCalledOnce();
  });
  it('odmowa INSERT zwraca rzeczywisty komunikat bez sukcesu', async () => {
    await mount();
    fillNew();
    failure = { table: 'deals', operation: 'insert' };
    await save();
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(harness.toast.error).toHaveBeenCalledWith(
      expect.stringContaining('synthetic permission denied')
    );
  });
  it('nie zapisuje etapu spoza wybranego lejka', async () => {
    await mount();
    fillNew();
    props = {
      ...props,
      stages: stages.map((stage) => ({
        ...stage,
        pipeline_id: 'other-pipeline',
      })),
    };
    render();
    await save();
    expect(tables.deals).toBeUndefined();
  });
  it('inline normalizuje telefon i blokuje ten sam numer w innym formacie', async () => {
    await mount(undefined, false);
    invoke(find('placeholder', 'Wybierz istniejącego klienta'), 'onAdd');
    render();
    input('Imię *', 'Osoba');
    input('Nazwisko *', 'Syntetyczna');
    input('Telefon *', '500 333 444');
    const add = nodes().find(
      (node) => node.props.children === 'Dodaj klienta'
    )!;
    invoke(add, 'onClick');
    await vi.waitFor(() => expect(tables.contacts).toHaveLength(2));
    expect(tables.contacts[1].phone).toBe('+48500333444');
    await mount(undefined, false);
    invoke(find('placeholder', 'Wybierz istniejącego klienta'), 'onAdd');
    render();
    input('Imię *', 'Osoba');
    input('Nazwisko *', 'Syntetyczna');
    input('Telefon *', '0048 500-333-444');
    invoke(
      nodes().find((node) => node.props.children === 'Dodaj klienta')!,
      'onClick'
    );
    await vi.waitFor(() =>
      expect(harness.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('już istnieje')
      )
    );
    expect(tables.contacts).toHaveLength(2);
  });
  it('zero zmienionych wierszy (RLS) jest błędem zamiast pozornego sukcesu', async () => {
    const db = harness.db as unknown as Parameters<typeof updateDeal>[0];
    await expect(
      updateDeal(db, 'missing-deal', { stage_id: 'stage-1' })
    ).rejects.toMatchObject({ code: 'PGRST116' });
  });
  it('kontrakt SQL gwarantuje historię w tej samej transakcji co zmiana etapu', () => {
    const sql = readFileSync(
      'supabase/migrations/054_package2_deal_process_integrity.sql',
      'utf8'
    );
    expect(sql).toContain('AFTER UPDATE OF stage_id ON public.deals');
    expect(sql).toContain('IF OLD.stage_id IS DISTINCT FROM NEW.stage_id');
    expect(sql).toContain('INSERT INTO public.deal_stage_history');
    expect(sql).toContain(
      'NEW.account_id, NEW.id, OLD.stage_id, NEW.stage_id, auth.uid()'
    );
  });
});

describe('K3: błędy powiązań', () => {
  it.each(['upsert', 'delete'])(
    'zwraca błąd %s relacji i zachowuje stare powiązanie',
    async (operation) => {
      tables.deal_contacts = [
        { deal_id: 'deal-alpha', contact_id: 'contact-old', is_primary: true },
      ];
      failure = { table: 'deal_contacts', operation };
      await expect(
        saveDealContacts(
          harness.db as unknown as Parameters<typeof saveDealContacts>[0],
          'deal-alpha',
          'account-synthetic',
          contactId,
          '',
          ''
        )
      ).rejects.toMatchObject({ message: 'synthetic permission denied' });
      expect(
        tables.deal_contacts.some((row) => row.contact_id === 'contact-old')
      ).toBe(true);
    }
  );
  it('zwraca błąd zapisu firmy zamiast go ignorować', async () => {
    failure = { table: 'contact_companies', operation: 'upsert' };
    await expect(
      saveDealContacts(
        harness.db as unknown as Parameters<typeof saveDealContacts>[0],
        'deal-alpha',
        'account-synthetic',
        contactId,
        '',
        'company-synthetic'
      )
    ).rejects.toMatchObject({ message: 'synthetic permission denied' });
  });
});

async function mountCard() {
  view = 'card';
  harness.cells = [];
  harness.effects = [];
  harness.mounted = false;
  render();
  harness.mounted = true;
  for (const effect of harness.effects) effect();
  await vi.waitFor(() => {
    render();
    expect(
      nodes().some(
        (node) =>
          node.type === 'h1' &&
          node.props.children === 'Sprawa syntetyczna Alfa'
      )
    ).toBe(true);
  });
}

describe('K3: kartoteka /deals/[id]', () => {
  it('odczytuje dane, zmienia etap i zapisuje następny krok trwale po ponownym wejściu', async () => {
    await mount();
    fillNew();
    await save();
    tables.pipeline_stages = stages as unknown as Row[];
    tables.deals[0].contact = { ...tables.contacts[0] };
    await mountCard();
    const form = nodes().find((node) => node.type === DealForm)!;
    expect(form.props.deal).toMatchObject({
      title: 'Sprawa syntetyczna Alfa',
      contact_id: contactId,
      contact: { phone: '+48500111222' },
      description: 'Opis syntetyczny',
      value: 100000,
    });
    const stageSelect = nodes().find(
      (node) => node.type === 'select' && node.props.value === 'stage-0'
    )!;
    invoke(stageSelect, 'onChange', { target: { value: 'stage-1' } });
    await vi.waitFor(() => expect(tables.deals[0].stage_id).toBe('stage-1'));
    await mountCard();
    input('Ustal następny krok', 'Syntetyczny telefon z kartoteki');
    const dateInput = nodes().find(
      (node) => node.props.type === 'datetime-local'
    )!;
    invoke(dateInput, 'onChange', { target: { value: '2026-07-06T10:30' } });
    render();
    const button = nodes().find(
      (node) =>
        Array.isArray(node.props.children) &&
        node.props.children.includes('Zapisz status')
    )!;
    invoke(button, 'onClick');
    await vi.waitFor(() =>
      expect(tables.deals[0]).toMatchObject({
        next_action: 'Syntetyczny telefon z kartoteki',
        next_action_at: '2026-07-06T08:30:00.000Z',
      })
    );
    await mountCard();
    expect(find('placeholder', 'Ustal następny krok').props.value).toBe(
      'Syntetyczny telefon z kartoteki'
    );
    expect(
      nodes().some(
        (node) =>
          node.props.type === 'datetime-local' &&
          node.props.value === '2026-07-06T10:30'
      )
    ).toBe(true);
    expect(
      nodes().find((node) => node.type === DealForm)?.props.deal
    ).toMatchObject({
      contact_id: contactId,
      stage_id: 'stage-1',
      description: 'Opis syntetyczny',
      value: 100000,
    });
  });
});
