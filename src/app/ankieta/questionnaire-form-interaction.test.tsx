import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseFinancialQuestionnaire } from '@/lib/financial-questionnaires';

// Exercise the real component's handlers with a hook double, without a DOM,
// new dependencies, network access or a database.
const hooks = vi.hoisted(() => ({
  cells: [] as unknown[],
  cursor: 0,
  mounted: false,
  effects: [] as (() => void)[],
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useEffect: (effect: () => void) => {
    if (!hooks.mounted) hooks.effects.push(effect);
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.cells)) hooks.cells[index] = initial;
    return [
      hooks.cells[index],
      (next: unknown) => {
        hooks.cells[index] = next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.cells)) hooks.cells[index] = { current: initial };
    return hooks.cells[index];
  },
}));
import { FinancialQuestionnaireForm } from './questionnaire-form';
import { LeadForm } from '@/app/formularz/lead-form';
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));

type Element = ReactElement<Record<string, unknown>>;
let tree: ReactNode;
let leadMode = false;
let crmContext: { contactId: string; contact: typeof context } | undefined;
const NativeFormData = globalThis.FormData;
let businessData: FormData;
const fetchMock = vi.fn();
const context = {
  name: 'Osoba Syntetyczna',
  phone: '500 100 200',
  email: 'synthetic@example.invalid',
  company: 'Firma Syntetyczna',
};
function render() {
  hooks.cursor = 0;
  tree = leadMode ? LeadForm() : FinancialQuestionnaireForm({ crmContext });
}
function nodes(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child));
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as Element;
  // These local child components have no hooks; expand them so tests invoke
  // the actual input event bindings, as well as the parent's submit handler.
  if (typeof element.type === 'function')
    return nodes(
      (element.type as (props: Record<string, unknown>) => ReactNode)(
        element.props
      )
    );
  return [element, ...nodes(element.props.children as ReactNode)];
}
function input(label: string) {
  const field = nodes(tree).find(
    (node) =>
      node.type === 'label' &&
      nodes(node).some(
        (child) => child.type === 'span' && child.props.children === label
      )
  );
  const control = nodes(field).find((node) => node.type === 'input');
  if (!control) throw new Error(`Missing input: ${label}`);
  return control;
}
function change(label: string, value: string) {
  (input(label).props.onChange as (event: unknown) => void)({
    target: { value },
  });
  render();
}
function mount(saved: string | null = null, storageFails = false) {
  vi.stubGlobal('window', {
    location: { assign: vi.fn() },
    sessionStorage: {
      setItem: vi.fn(),
      getItem: vi.fn(() => {
        if (storageFails) throw new Error('Synthetic storage unavailable');
        return saved;
      }),
    },
  });
  render();
  hooks.mounted = true;
  for (const effect of hooks.effects) effect();
  render();
}
async function submit() {
  const form = nodes(tree).find((node) => node.type === 'form')!;
  const preventDefault = vi.fn();
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({
    preventDefault,
    currentTarget: { reset: vi.fn() },
  });
  expect(preventDefault).toHaveBeenCalledOnce();
  render();
}
function sentBody() {
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][0]).toBe('/api/public/questionnaires');
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}
beforeEach(() => {
  leadMode = false;
  navigation.push.mockReset();
  crmContext = undefined;
  hooks.cells = [];
  hooks.cursor = 0;
  hooks.effects = [];
  hooks.mounted = false;
  businessData = new NativeFormData();
  businessData.set('consent', 'on');
  // Only replace browser FormData construction; preserve the actual contract.
  vi.stubGlobal(
    'FormData',
    class {
      constructor() {
        return businessData;
      }
    }
  );
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('K3/01-E: ręczne dane i opcjonalny kontekst sesji', () => {
  it('bez kontekstu wysyła ręcznie wpisane imię i telefon; e-mail/firma opcjonalne', async () => {
    mount();
    expect(input('Imię i nazwisko').props.value).toBe('');
    change('Imię i nazwisko', context.name);
    change('Telefon z kodem kraju', context.phone);
    await submit();
    const body = sentBody();
    expect(body.contact).toEqual({
      name: context.name,
      phone: '+48500100200',
      email: '',
      company: '',
    });
    expect(parseFinancialQuestionnaire(body)).toMatchObject({
      phone: '+48500100200',
      email: null,
      company: null,
    });
    expect(nodes(tree).some((node) => node.props.role === 'status')).toBe(true);
  });
  it('wstępnie wypełnia wszystkie pola i wysyła ich poprawione wartości', async () => {
    mount(JSON.stringify(context));
    const labels = [
      'Imię i nazwisko',
      'Telefon z kodem kraju',
      'E-mail',
      'Firma',
    ];
    expect(labels.map((label) => input(label).props.value)).toEqual(
      Object.values(context)
    );
    const edited = [
      'Osoba Poprawiona',
      '0044 7700 900123',
      'edited@example.invalid',
      'Firma Poprawiona',
    ];
    labels.forEach((label, index) => change(label, edited[index]));
    await submit();
    expect(sentBody().contact).toEqual({
      name: edited[0],
      phone: '+447700900123',
      email: edited[2],
      company: edited[3],
    });
  });
  it.each([
    ['', context.phone, 'imię i nazwisko'],
    ['   ', context.phone, 'imię i nazwisko'],
    [context.name, '', 'numer telefonu'],
    [context.name, '123', 'numer telefonu'],
  ])(
    'brak/błędne dane (%s, %s) blokują wysyłkę i pokazują błąd',
    async (name, phone, message) => {
      mount();
      change('Imię i nazwisko', name);
      change('Telefon z kodem kraju', phone);
      await submit();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        nodes(tree).find((node) => node.props.role === 'alert')?.props.children
      ).toContain(message);
    }
  );
  it.each(['{', 'null', '[]', '{"name":123,"phone":{}}'])(
    'uszkodzony kontekst %s nie blokuje ręcznego wpisu',
    async (saved) => {
      mount(saved);
      change('Imię i nazwisko', context.name);
      change('Telefon z kodem kraju', context.phone);
      await submit();
      expect(sentBody().contact.phone).toBe('+48500100200');
    }
  );
  it('niedostępny sessionStorage nie blokuje ręcznego wpisu', async () => {
    mount(null, true);
    change('Imię i nazwisko', context.name);
    change('Telefon z kodem kraju', context.phone);
    await submit();
    expect(sentBody().contact.phone).toBe('+48500100200');
  });
});

describe('K3/01-G: przejście z formularza i edytowalny kontekst CRM', () => {
  it.each([true, false])(
    'checkbox %s: przekierowuje tylko po wyborze i zachowuje kontekst',
    async (checked) => {
      leadMode = true;
      Object.entries(context).forEach(([key, value]) =>
        businessData.set(key, value)
      );
      if (checked) businessData.set('fillQuestionnaire', 'on');
      mount();
      const checkbox = nodes(tree).find(
        (node) => node.props.name === 'fillQuestionnaire'
      )!;
      expect(checkbox.props.type).toBe('checkbox');
      expect(checkbox.props.defaultChecked).toBeUndefined();
      expect(checkbox.props.checked).toBeUndefined();
      await submit();
      expect(fetchMock.mock.calls[0][0]).toBe('/api/public/leads');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
        'fillQuestionnaire'
      );
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'mcrmLeadContext',
        JSON.stringify(context)
      );
      if (checked) expect(navigation.push).toHaveBeenCalledWith('/ankieta');
      else expect(navigation.push).not.toHaveBeenCalled();
      // Follow the redirect using the same browser context and real prefill effect.
      leadMode = false;
      hooks.cells = [];
      hooks.mounted = false;
      hooks.effects = [];
      mount(JSON.stringify(context));
      expect(input('Imię i nazwisko').props.value).toBe(context.name);
      expect(input('Telefon z kodem kraju').props.value).toBe(context.phone);
      await submit();
      expect(fetchMock.mock.calls[1][0]).toBe('/api/public/questionnaires');
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).contact.phone).toBe(
        '+48500100200'
      );
    }
  );
  it('błąd wysyłki zgłoszenia nie przekierowuje i nie ustawia kontekstu', async () => {
    leadMode = true;
    businessData.set('fillQuestionnaire', 'on');
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Syntetyczny błąd zapisu' }),
    });
    mount();
    await submit();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    expect(
      nodes(tree).find((node) => node.props.role === 'alert')?.props.children
    ).toBe('Syntetyczny błąd zapisu');
  });
  it('CRM ma pierwszeństwo przed sessionStorage, pozwala poprawić wszystkie cztery dane i używa chronionego API', async () => {
    crmContext = {
      contactId: '00000000-0000-4000-8000-000000000001',
      contact: context,
    };
    mount(
      JSON.stringify({ ...context, name: 'Nieaktualny kontekst publiczny' })
    );
    expect(window.sessionStorage.getItem).not.toHaveBeenCalled();
    expect(input('Imię i nazwisko').props.value).toBe(context.name);
    change('Imię i nazwisko', 'Osoba Poprawiona');
    change('Telefon z kodem kraju', '0044 7700 900123');
    change('E-mail', 'edited@example.invalid');
    change('Firma', 'Firma Poprawiona');
    await submit();
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/questionnaires?contact=${crmContext.contactId}`
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contact).toEqual({
      name: 'Osoba Poprawiona',
      phone: '+447700900123',
      email: 'edited@example.invalid',
      company: 'Firma Poprawiona',
    });
    expect(body).not.toHaveProperty('contactId');
    expect(parseFinancialQuestionnaire(body).phone).toBe('+447700900123');
  });
  it.each([false, true])(
    'jawny błąd zapisu ankiety, CRM=%s; brak pozornego sukcesu',
    async (crm) => {
      if (crm)
        crmContext = {
          contactId: '00000000-0000-4000-8000-000000000001',
          contact: context,
        };
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Syntetyczna awaria ankiety' }),
      });
      mount(JSON.stringify(context));
      await submit();
      expect(
        nodes(tree).find((node) => node.props.role === 'alert')?.props.children
      ).toBe('Syntetyczna awaria ankiety');
      expect(nodes(tree).some((node) => node.props.role === 'status')).toBe(
        false
      );
    }
  );
});
