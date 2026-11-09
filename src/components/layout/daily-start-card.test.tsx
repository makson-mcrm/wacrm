import { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyStartCard } from './daily-start-card';

const state = vi.hoisted(() => ({
  started: false,
  effects: [] as (() => void)[],
}));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: () => [state.started, (value: boolean) => { state.started = value; }],
  useEffect: (effect: () => void) => { state.effects.push(effect); },
}));
vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ComponentProps<'button'>) => <button {...props} />,
}));

function findButton(node: ReactNode): React.ComponentProps<'button'> | undefined {
  if (!isValidElement<{ children?: ReactNode; onClick?: unknown }>(node)) return;
  if (node.props.onClick) return node.props as React.ComponentProps<'button'>;
  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
  for (const child of children) {
    const button = findButton(child);
    if (button) return button;
  }
}

describe('KM3.5.1E: opcjonalny Nowy dzień na Dzisiaj', () => {
  const getItem = vi.fn();
  const setItem = vi.fn();
  beforeEach(() => {
    state.started = false;
    state.effects = [];
    getItem.mockReturnValue(null);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 12));
    vi.stubGlobal('window', { localStorage: { getItem, setItem } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('domyślnie renderuje zamknięty panel w treści, bez modala i progów szerokości', () => {
    const html = renderToStaticMarkup(<DailyStartCard />);
    expect(html).toContain('<summary');
    expect(html).toContain('mCRM AI · Nowy dzień');
    expect(html).toContain('ROZPOCZNIJ DZIEŃ');
    expect(html.match(/<details[^>]*>/)?.[0]).not.toMatch(/\bopen(?:=|\s|>)/);
    expect(html).not.toMatch(/fixed|inset-0|lg:hidden|role="dialog"|aria-modal/);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('rozpoczyna dzień wyłącznie po kliknięciu i zachowuje dotychczasowy klucz pamięci', () => {
    const tree = DailyStartCard();
    state.effects.forEach((effect) => effect());
    expect(state.started).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    const button = findButton(tree);
    expect(button?.onClick).toBeTypeOf('function');
    button!.onClick!({} as React.MouseEvent<HTMLButtonElement>);
    expect(setItem).toHaveBeenCalledExactlyOnceWith('mcrm-ai-day-started:2026-11-09', '1');
    const html = renderToStaticMarkup(<DailyStartCard />);
    expect(html).toContain('DZIEŃ ROZPOCZĘTY');
    expect(html).toContain('disabled');
    expect(html).toContain('<summary');
  });

  it('odczytuje rozpoczęty dzień bez automatycznego otwierania panelu', () => {
    getItem.mockReturnValue('1');
    DailyStartCard();
    state.effects.forEach((effect) => effect());
    expect(getItem).toHaveBeenCalledWith('mcrm-ai-day-started:2026-11-09');
    const html = renderToStaticMarkup(<DailyStartCard />);
    expect(html).toContain('DZIEŃ ROZPOCZĘTY');
    expect(html.match(/<details[^>]*>/)?.[0]).not.toMatch(/\bopen(?:=|\s|>)/);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('osadza wejście na /dashboard w obu wariantach istniejącej flagi', () => {
    const source = readFileSync(new URL('../../app/(dashboard)/dashboard/page.tsx', import.meta.url), 'utf8');
    const [core, extensions] = source.split('if (!surfaceFlags.dashboardExtensions) {')[1].split('max-w-[1800px]');
    expect(core).toContain('<DailyStartCard />');
    expect(extensions).toContain('<DailyStartCard />');
    const card = readFileSync(new URL('./daily-start-card.tsx', import.meta.url), 'utf8');
    expect(card).not.toContain('matchMedia');
    expect(card).not.toContain('lg:hidden');
  });
});
