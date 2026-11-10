import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deal, Pipeline, PipelineStage } from '@/types';
import { Header } from '@/components/layout/header';
import { GlobalAdd } from '@/components/layout/global-add';
import { GlobalSearch } from '@/components/layout/global-crm-search';
import { DealCard } from './deal-card';
import { DealForm } from './deal-form';
import { PipelineSettings } from './pipeline-settings';
import { PipelineBoard, PipelineToolbar } from './pipeline-board';
import PipelinesPage from '@/app/(dashboard)/pipelines/page';
import { biginGeometryCssVars, SHELL_CSS_VARS } from '@/lib/ui/layout-geometry';

type Props = Record<string, unknown> & { children?: ReactNode };
const h = vi.hoisted(() => ({
  cursor: 0, refCursor: 0, cells: [] as unknown[], refs: [] as { current: unknown }[],
  effects: [] as (() => void | (() => void))[], pathname: '/pipelines', canAct: true,
  push: vi.fn(), signOut: vi.fn(), from: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = h.cursor++;
    if (!(index in h.cells)) h.cells[index] = typeof initial === 'function' ? initial() : initial;
    return [h.cells[index], (value: unknown) => { h.cells[index] = typeof value === 'function' ? value(h.cells[index]) : value; }];
  },
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useRef: (initial: unknown) => h.refs[h.refCursor++] ?? (h.refs[h.refCursor - 1] = { current: initial }),
  useEffect: (effect: () => void | (() => void)) => { h.effects.push(effect); },
}));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({
  accountId: 'account-synthetic', defaultCurrency: 'PLN', profile: { full_name: 'Osoba testowa' }, signOut: h.signOut,
}) }));
vi.mock('@/hooks/use-can', () => ({ useCan: () => h.canAct }));
vi.mock('next/navigation', () => ({ usePathname: () => h.pathname, useRouter: () => ({ push: h.push }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: h.from }) }));
vi.mock('./deal-form', () => ({ DealForm: () => null }));
vi.mock('./pipeline-settings', () => ({ PipelineSettings: () => null }));

function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...nodes(node.props.children)];
}
function find(node: ReactNode, predicate: (node: ReactElement<Props>) => boolean) {
  const found = nodes(node).find(predicate);
  expect(found).toBeDefined();
  return found!;
}
function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return isValidElement<Props>(node) ? text(node.props.children) : '';
}
function click(node: ReactElement<Props>) {
  expect(node.props.onClick).toBeTypeOf('function');
  (node.props.onClick as () => void)();
}
function change(node: ReactElement<Props>, value: string) {
  expect(node.props.onChange).toBeTypeOf('function');
  (node.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}
function render<T>(component: () => T): T {
  h.cursor = 0; h.refCursor = 0; h.effects = [];
  return component();
}
const pipelines = [
  { id: 'pipeline-a', name: 'Lejek A' }, { id: 'pipeline-b', name: 'Lejek B' },
] as Pipeline[];
const stages = [{ id: 'stage-a', name: 'Etap A', position: 0, pipeline_id: 'pipeline-a' }] as PipelineStage[];
const deals = [
  { id: 'deal-a', title: 'Zeta', created_at: '2026-11-01', value: 100 },
  { id: 'deal-b', title: 'Alfa', created_at: '2026-11-02', value: 200 },
].map((deal) => ({ ...deal, user_id: 'user-synthetic', contact_id: null, stage_id: 'stage-a', pipeline_id: 'pipeline-a', status: 'open', currency: 'PLN', tagNames: [], bankNames: [] })) as Deal[];
function page() { return render(PipelinesPage); }
function toolbar(pageTree = page()) {
  const node = find(pageTree, (node) => node.type === PipelineToolbar);
  return PipelineToolbar(node.props as unknown as Parameters<typeof PipelineToolbar>[0]);
}

beforeEach(() => {
  h.cells = []; h.refs = []; h.canAct = true; h.pathname = '/pipelines';
  h.from.mockImplementation(() => { throw new Error('Unexpected database access'); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('KM3.5.1G: zwijanie Potoków zespołu', () => {
  const storageKey = 'mcrm:pipelines:team-panel-collapsed';
  let stored: Map<string, string>;
  let getItem: ReturnType<typeof vi.fn>;
  let setItem: ReturnType<typeof vi.fn>;
  const workspace = (tree = page()) => find(tree, (node) => node.props['data-pipeline-workspace'] !== undefined);
  const toggle = (tree = page()) => find(tree, (node) => node.props['data-pipeline-team-toggle'] !== undefined);
  const panel = (tree = page()) => find(tree, (node) => node.props['data-pipeline-team-panel'] !== undefined);
  const restore = () => {
    page();
    h.effects.at(-1)!(); // storage effect; database effects are deliberately not run
  };
  beforeEach(() => {
    h.cells = [pipelines, 'pipeline-a', stages, deals, false];
    stored = new Map();
    getItem = vi.fn((key: string) => stored.get(key) ?? null);
    setItem = vi.fn((key: string, value: string) => { stored.set(key, value); });
    vi.stubGlobal('window', { localStorage: { getItem, setItem } });
  });

  it('domyślnie rozwija panel, klik zwija, drugi rozwija i zapisuje obie wartości', () => {
    restore();
    expect(getItem).toHaveBeenCalledWith(storageKey);
    expect(setItem).not.toHaveBeenCalled();
    for (const collapsed of [false, true, false]) {
      const tree = page();
      expect(workspace(tree).props['data-pipeline-team-collapsed']).toBe(collapsed);
      expect(panel(tree).props.hidden).toBe(collapsed);
      const button = toggle(tree);
      const label = collapsed ? 'Rozwiń panel potoków' : 'Zwiń panel potoków';
      expect(button.type).toBe('button');
      expect(button.props).toMatchObject({ type: 'button', 'aria-label': label, title: label,
        'aria-expanded': !collapsed, 'aria-controls': panel(tree).props.id });
      if (!collapsed && setItem.mock.calls.length) break;
      click(button);
      expect(stored.get(storageKey)).toBe(String(!collapsed));
    }
    expect(setItem.mock.calls).toEqual([[storageKey, 'true'], [storageKey, 'false']]);
    expect(h.from).not.toHaveBeenCalled();
  });

  it('odtwarza zapis po ponownym wejściu i nie nadpisuje go przed odczytem', () => {
    click(toggle());
    h.cells = [pipelines, 'pipeline-a', stages, deals, false]; // remount
    restore();
    expect(workspace().props['data-pipeline-team-collapsed']).toBe(true);
    expect(panel().props.hidden).toBe(true);
    expect(setItem).toHaveBeenCalledTimes(1);
    click(toggle());
    h.cells = [pipelines, 'pipeline-a', stages, deals, false];
    restore();
    expect(workspace().props['data-pipeline-team-collapsed']).toBe(false);
    expect(stored.get(storageKey)).toBe('false');
  });

  it.each(['false', 'invalid', null])('wartość %s zachowuje domyślny stan rozwinięty', (value) => {
    if (value !== null) stored.set(storageKey, value);
    restore();
    expect(workspace().props['data-pipeline-team-collapsed']).toBe(false);
  });

  it('odmowa odczytu/zapisu localStorage nie blokuje obu kliknięć', () => {
    getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    setItem.mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(restore).not.toThrow();
    click(toggle());
    expect(workspace().props['data-pipeline-team-collapsed']).toBe(true);
    click(toggle());
    expect(workspace().props['data-pipeline-team-collapsed']).toBe(false);
  });

  it('przekazuje odtworzony stan także do szkieletu ładowania', () => {
    h.cells[4] = true;
    stored.set(storageKey, 'true');
    restore();
    expect(workspace().props['data-pipeline-team-collapsed']).toBe(true);
  });

  // CSS contract checks complement handler tests. They do not replace browser DOM measurements.
  it.each([1536, 1024, 768, 390])('CSS: po kliknięciach poprawna geometria i ograniczenie overflow przy %s px', (viewport) => {
    const sheet = postcss.parse(readFileSync('src/app/globals.css', 'utf8'));
    const rules = (selector: string) => {
      const values: Record<string, string> = {};
      sheet.walkRules((rule) => {
        if (!rule.selectors.includes(selector)) return;
        if (rule.parent?.type === 'atrule') {
          const maximum = Number(rule.parent.params.match(/max-width: (\d+)px/)?.[1]);
          if (!maximum || viewport > maximum) return;
        }
        rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
      });
      return values;
    };
    const collapsedSelector = "[data-bigin-pipeline-shell] [data-pipeline-workspace][data-pipeline-team-collapsed='true']";
    const inherited = { ...SHELL_CSS_VARS, ...biginGeometryCssVars('pipelines'),
      ...rules("[data-slot='app-shell']"),
      ...rules('[data-bigin-pipeline-shell] [data-pipeline-workspace]') } as Record<string, string>;
    const pixel = (value: string, variables: Record<string, string>): number => {
      const reference = /^var\((--[^)]+)\)$/.exec(value);
      return reference ? pixel(variables[reference[1]], variables) : Number.parseFloat(value);
    };
    const rail = pixel(inherited['--app-sidebar-width'], inherited);
    const expected = viewport === 1536 ? [295, 115, 295] : viewport === 390 ? [272, 114, 272] : [272, 114, 272];
    expected.forEach((x, index) => {
      const tree = page();
      const collapsed = workspace(tree).props['data-pipeline-team-collapsed'];
      expect(collapsed).toBe(index === 1);
      const variables = { ...inherited, ...(collapsed ? rules(collapsedSelector) : {}) };
      const padding = rules(collapsed ? collapsedSelector : '[data-pipeline-workspace]')['padding-left'];
      const contentX = rail + pixel(padding, variables);
      const inset = pixel(rules('[data-bigin-pipeline-shell] .pipeline-scroll')['padding-left'], variables);
      expect(contentX + inset).toBe(x);
      expect(pixel(variables['--pipeline-team-panel-width'], variables)).toBe(collapsed ? 0 : viewport === 390 ? 199 : viewport <= 1280 ? 199 : 221);
      expect(pixel(variables['--pipeline-column-width'], variables)).toBe(230);
      expect(pixel(variables['--pipeline-card-width'], variables)).toBe(220);
      expect(viewport - contentX).toBeGreaterThan(0);
      expect(rules('[data-pipeline-workspace]').overflow).toBe('hidden');
      expect(rules('[data-pipeline-content]')).toMatchObject({ 'min-width': '0', overflow: 'hidden' });
      expect(rules('[data-bigin-pipeline-shell] .pipeline-scroll')).toMatchObject({ 'min-width': '0', 'overflow-x': 'auto' });
      const control = rules('[data-pipeline-workspace] [data-pipeline-team-toggle]');
      expect(control).toMatchObject({ position: 'absolute', bottom: '8px', width: '32px', height: '32px', display: 'inline-flex' });
      const left = collapsed ? 5 : pixel(variables['--pipeline-team-panel-width'], variables) - 40;
      expect(rail + left + 32).toBeLessThanOrEqual(contentX);
      expect(toggle(tree).props['aria-expanded']).toBe(!collapsed);
      if (index < 2) click(toggle(tree));
    });
    expect(rules("[data-pipeline-workspace][data-pipeline-team-collapsed='true'] [data-pipeline-team-panel]")).toMatchObject({ display: 'none', width: '0' });
  });
});

describe('KM3.5.1F: nagłówek podłączony do istniejących akcji', () => {
  it.each([['Zadania', '/tasks'], ['Powiadomienia', '/notifications'], ['Ustawienia', '/settings']])('%s prowadzi do %s', (label, href) => {
    const link = find(render(Header), (node) => node.props['aria-label'] === label);
    expect(link.props.href).toBe(href);
    expect(link.props.className).not.toMatch(/hidden/);
  });
  it('pokazuje logo, tytuł modułu, istniejące Dodaj, pomoc i wylogowanie', () => {
    const tree = render(Header);
    expect(find(tree, (node) => node.props['aria-label'] === 'mCRM AI — DZISIAJ').props.href).toBe('/dashboard');
    expect(text(find(tree, (node) => Boolean(node.props['data-header-module'])))).toBe('LEJEK');
    expect(find(tree, (node) => node.type === GlobalAdd).props.compact).toBe(true);
    expect(find(tree, (node) => node.props['aria-label'] === 'Pomoc')).toBeDefined();
    for (const href of ['/assistant', '/audyt-crm']) {
      expect(nodes(tree).some((node) => isValidElement<Props>(node.props.render) && node.props.render.props.href === href)).toBe(true);
    }
    click(find(tree, (node) => node.props.onClick === h.signOut));
    expect(h.signOut).toHaveBeenCalledOnce();
  });
  it('plus zachowuje wszystkie istniejące wejścia formularzy', () => {
    const tree = GlobalAdd({ compact: true });
    const routes = nodes(tree).flatMap((node) => isValidElement<Props>(node.props.render) ? [node.props.render.props.href] : []);
    expect(routes).toEqual(['/quick-call', '/pipelines?new=deal', '/contacts?new=contact', '/companies?new=company', '/tasks?new=task', '/calendar?new=event']);
    expect(find(tree, (node) => node.props['aria-label'] === 'Dodaj w mCRM').props.className).toBe('header-icon');
  });
});

describe('KM3.5.1F: wyszukiwarka globalna', () => {
  it.each(['metaKey', 'ctrlKey'])('%s+K ustawia fokus, respektuje modal i usuwa listener przy odmontowaniu', (modifier) => {
    const add = vi.fn(), remove = vi.fn(), querySelector = vi.fn().mockReturnValue(null), focus = vi.fn();
    vi.stubGlobal('window', { addEventListener: add, removeEventListener: remove });
    vi.stubGlobal('document', { querySelector });
    const tree = render(GlobalSearch);
    const input = find(tree, (node) => node.type === 'input');
    expect(input.props.placeholder).toBe('Szukaj (⌘K)');
    expect(input.props['aria-keyshortcuts']).toBe('Meta+K Control+K');
    (input.props.ref as { current: unknown }).current = { focus };
    const cleanup = h.effects[0]();
    const handler = add.mock.calls[0][1];
    const event = { key: 'K', [modifier]: true, preventDefault: vi.fn() };
    handler(event);
    expect(focus).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    querySelector.mockReturnValue({});
    handler(event);
    handler({ key: 'x' });
    expect(focus).toHaveBeenCalledOnce();
    if (typeof cleanup === 'function') cleanup();
    expect(remove).toHaveBeenCalledWith('keydown', handler);
  });
  it('wpisanie zapytania uruchamia obecne wyszukiwanie i linki wyników, Escape zamyka wyniki', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    h.from.mockImplementation((table: string) => {
      const result = { data: table === 'deals' ? [deals[0]] : table === 'contacts' ? [{ id: 'contact-a', name: 'Kontakt' }] : [{ id: 'company-a', name: 'Firma' }] };
      const query = { select: vi.fn(() => query), eq: vi.fn(() => query), ilike: vi.fn(() => query), or: vi.fn(() => query), limit: vi.fn(async () => result) };
      return query;
    });
    change(find(render(GlobalSearch), (node) => node.type === 'input'), 'Alfa');
    render(GlobalSearch);
    h.effects[1]();
    await vi.runAllTimersAsync();
    expect(h.from.mock.calls.map(([table]) => table)).toEqual(['deals', 'contacts', 'companies']);
    const tree = render(GlobalSearch);
    for (const href of ['/deals/deal-a', '/contacts?open=contact-a', '/companies?open=company-a']) {
      expect(find(tree, (node) => node.props.href === href)).toBeDefined();
    }
    const input = find(tree, (node) => node.type === 'input');
    expect(input.props['aria-expanded']).toBe(true);
    (input.props.onKeyDown as (e: {key: string}) => void)({ key: 'Escape' });
    expect(find(render(GlobalSearch), (node) => node.type === 'input').props['aria-expanded']).toBe(false);
  });
});

describe('KM3.5.1F: panel i toolbar używają stanu istniejącej strony', () => {
  beforeEach(() => { h.cells = [pipelines, 'pipeline-a', stages, deals, false]; });
  it('plus otwiera istniejący dialog tworzenia lejka, Plan sprzedaży istniejące ustawienia', () => {
    click(find(page(), (node) => node.props['aria-label'] === 'Dodaj lejek'));
    expect(h.cells[13]).toBe(true); // newPipelineOpen, dotychczasowy stan strony
    click(find(page(), (node) => node.type === 'button' && text(node) === 'Plan sprzedaży'));
    const settings = find(page(), (node) => node.type === PipelineSettings);
    expect(settings.props.open).toBe(true);
    expect(settings.props.pipeline).toBe(pipelines[0]);
    expect(settings.props.stages).toBe(stages);
  });
  it('wybór w panelu i menu Wszystkie Transakcje zmienia ten sam lejek', () => {
    click(find(page(), (node) => node.type === 'button' && node.props.title === 'Lejek B'));
    expect(find(page(), (node) => node.type === PipelineToolbar).props.selectedPipelineId).toBe('pipeline-b');
    click(find(toolbar(), (node) => Boolean(node.props.onClick) && text(node) === 'Lejek A'));
    expect(find(page(), (node) => node.type === PipelineToolbar).props.selectedPipelineId).toBe('pipeline-a');
    expect(h.from).not.toHaveBeenCalled(); // efekty pobrania danych pozostają istniejące
  });
  it('zmiana sortowania zmienia kolejność kart bez mutowania danych', () => {
    const ids = () => (find(page(), (node) => node.type === PipelineBoard).props.deals as Deal[]).map((deal) => deal.id);
    expect(ids()).toEqual(['deal-b', 'deal-a']);
    change(find(toolbar(), (node) => node.type === 'select'), 'created-asc');
    expect(ids()).toEqual(['deal-a', 'deal-b']);
    change(find(toolbar(), (node) => node.type === 'select'), 'title');
    expect(ids()).toEqual(['deal-b', 'deal-a']);
    expect(h.cells[3]).toBe(deals);
    expect(deals.map((deal) => deal.id)).toEqual(['deal-a', 'deal-b']);
  });
  it('Transakcja otwiera ten sam DealForm z wybranym lejkiem i pierwszym etapem', () => {
    click(find(toolbar(), (node) => node.props['aria-label'] === 'Dodaj transakcję'));
    const form = find(page(), (node) => node.type === DealForm);
    expect(form.props).toMatchObject({ open: true, deal: null, pipelineId: 'pipeline-a', defaultStageId: 'stage-a' });
  });
  it('zachowuje bramki ról i blokuje dodawanie transakcji bez wybranego lejka', () => {
    h.canAct = false;
    expect(find(page(), (node) => node.props['aria-label'] === 'Dodaj lejek').props.canAct).toBe(false);
    expect(find(toolbar(), (node) => node.props['aria-label'] === 'Dodaj transakcję').props.canAct).toBe(false);
    h.canAct = true; h.cells[0] = []; h.cells[1] = '';
    expect(find(toolbar(), (node) => node.props['aria-label'] === 'Dodaj transakcję').props.canAct).toBe(false);
    expect(find(page(), (node) => node.type === 'button' && text(node) === 'Plan sprzedaży').props.disabled).toBe(true);
  });
  it('klik karty kieruje do istniejącej strony transakcji', () => {
    const props = find(page(), (node) => node.type === PipelineBoard).props;
    const card = DealCard({ deal: deals[0], stage: stages[0], onEdit: props.onEditDeal as (deal: Deal) => void });
    const stopPropagation = vi.fn();
    card.props.onClick({ stopPropagation } as unknown as React.MouseEvent<HTMLElement>);
    expect(h.push).toHaveBeenCalledExactlyOnceWith('/deals/deal-a');
    expect(stopPropagation).toHaveBeenCalledOnce();
    h.push.mockClear();
    card.props.onKeyDown({ target: card, currentTarget: card, key: 'Enter', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    expect(h.push).toHaveBeenCalledExactlyOnceWith('/deals/deal-a');
    const link = find(card, (node) => node.type === 'a');
    expect(link.props).toMatchObject({ href: '/deals/deal-a', target: '_blank' });
  });
});
