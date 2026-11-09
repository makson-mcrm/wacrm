import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postcss, { type Root } from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import type { Deal, PipelineStage } from '@/types';
import { PipelineBoard } from './pipeline-board';
import { DealCard } from './deal-card';
import { MOBILE_BREAKPOINT, MOBILE_STAGE_TAB_HEIGHT } from '@/lib/ui/layout-geometry';

// Exercise the board's click handlers in the existing Node test environment.
// Nested components and static renders keep the real React hooks.
const state = vi.hoisted(() => ({ active: false, cursor: 0, cells: [] as unknown[] }));
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  return {
    ...original,
    useMemo: (fn: () => unknown, deps: unknown[]) => state.active ? fn() : original.useMemo(fn, deps),
    useState: (initial: unknown) => {
      if (!state.active) return original.useState(initial);
      const index = state.cursor++;
      if (!(index in state.cells)) state.cells[index] = initial;
      return [state.cells[index], (next: unknown) => { state.cells[index] = next; }];
    },
  };
});

const flags = vi.hoisted(() => ({ extensions: undefined as boolean | undefined }));
vi.mock('@/lib/ui/surface-flags', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/ui/surface-flags')>();
  return {
    ...original,
    surfaceFlags: {
      get pipelineExtensions() {
        return flags.extensions ?? original.surfaceFlags.pipelineExtensions;
      },
    },
  };
});
beforeEach(() => {
  flags.extensions = undefined;
  state.active = false;
  state.cursor = 0;
  state.cells = [];
});

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ defaultCurrency: 'PLN' }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => children,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  KeyboardSensor: {},
  PointerSensor: {},
  closestCorners: vi.fn(),
  useSensor: () => ({}),
  useSensors: () => [],
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({
    setNodeRef: vi.fn(),
    attributes: {},
    listeners: {},
    isDragging: false,
  }),
}));

const names = [
  ...readFileSync('src/app/(dashboard)/pipelines/page.tsx', 'utf8').matchAll(
    /name: '([^']+)', color:/g
  ),
].map((match) => match[1]).slice(0, 6);
const stages = names.map((name, position) => ({
  id: `stage-${position}`,
  name,
  position,
  pipeline_id: 'pipeline-synthetic',
})) as PipelineStage[];
const render = (deals: Deal[]) =>
  renderToStaticMarkup(
    <PipelineBoard
      stages={stages}
      deals={deals}
      onDealMoved={vi.fn()}
      onAddDeal={vi.fn()}
      onEditDeal={vi.fn()}
    />
  );

describe('K3: Lejek po odświeżeniu danych', () => {
  it('pokazuje dwa Deale jednego kontaktu jako oddzielne karty właściwego etapu', () => {
    const deals = ['deal-alpha', 'deal-beta'].map((id) => ({
      id,
      title: id,
      contact_id: 'contact-synthetic',
      stage_id: 'stage-1',
      value: 100000,
      currency: 'PLN',
      created_at: '2026-11-05T12:00:00Z',
    })) as Deal[];
    const html = render(deals);
    expect(html).toContain('data-stage="stage-1" href="/deals/deal-alpha"');
    expect(html).toContain('data-stage="stage-1" href="/deals/deal-beta"');
    for (const name of names) expect(html).toContain(name);
  });
  it('ponowny render po odczycie zapisanego etapu przenosi kartę do nowej kolumny', () => {
    const deal = {
      id: 'deal-alpha',
      title: 'Sprawa syntetyczna',
      contact_id: 'contact-synthetic',
      stage_id: 'stage-0',
      value: 100000,
      currency: 'PLN',
      created_at: '2026-11-05T12:00:00Z',
    } as Deal;
    expect(render([deal])).toContain(
      'data-stage="stage-0" href="/deals/deal-alpha"'
    );
    const refreshed = { ...deal, stage_id: 'stage-4' };
    const html = render([refreshed]);
    expect(html).toContain('data-stage="stage-4" href="/deals/deal-alpha"');
    expect(html).not.toContain('data-stage="stage-0" href="/deals/deal-alpha"');
  });
});

describe('KM3.2.08-BIGIN-CORE: rdzeń tablicy', () => {
  function desktop(html: string) {
    return html.slice(html.indexOf('<div class="pipeline-scroll hidden'));
  }

  it('pokazuje sześć stałych kolumn 220 px i odstęp 10 px z przewijaniem', () => {
    const html = desktop(render([]));
    expect(html.match(/data-pipeline-column=/g)).toHaveLength(6);
    expect(html.match(/w-\[220px\] flex-none/g)).toHaveLength(6);
    expect(html).toContain('gap-[10px] overflow-x-auto');
    expect(html.match(/>Transakcja<\/span>/g)).toHaveLength(6);
    expect(html.match(/Ten etap jest pusty/g)).toHaveLength(6);
    for (const name of names) expect(html).toContain(name);
  });

  it.each([false, true])('karta zachowuje rdzeń, a dodatki zależą od przełącznika: %s', (enabled) => {
    flags.extensions = enabled;
    const html = desktop(render([{
      id: 'deal-core',
      title: 'Sprawa syntetyczna Bigin',
      stage_id: 'stage-0',
      contact_id: 'contact-synthetic',
      contact: { name: 'Kontakt syntetyczny', phone: '+48000000000' },
      value: 25000,
      currency: 'PLN',
      created_at: '2026-11-01T12:00:00Z',
      updated_at: '2026-11-03T12:00:00Z',
      expected_close_date: '2026-11-20',
    } as Deal]));
    const card = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/)?.[0];
    expect(card).toContain('Sprawa syntetyczna Bigin');
    expect(card).toContain('Kontakt syntetyczny');
    expect(card).toContain('href="/deals/deal-core"');
    const amount = card!.match(/<p class="mt-2 text-sm font-bold">([^<]+)<\/p>/)?.[1];
    expect(amount?.replace(/\D/g, '')).toBe('25000');
    expect(card).toContain('dateTime="2026-11-20"');
    expect(card).toContain('20.11.2026');
    for (const label of ['Ostatnia aktywność: 03.11.2026', 'ZADZWOŃ', 'WIADOMOŚĆ']) {
      expect(card?.includes(label)).toBe(enabled);
    }
    expect(card?.includes('href="tel:+48000000000"')).toBe(enabled);
    expect(card?.includes('/quick-call?contact=contact-synthetic&amp;action=message&amp;deal=deal-core')).toBe(enabled);
    expect(html.includes('Dodaj deal')).toBe(enabled);
  });

  it.each([undefined, false, true])('pokazuje dodatki domyślnie i według flagi %s na mobile i desktop, zachowując rdzeń', (override) => {
    flags.extensions = override;
    const enabled = override !== false;
    const html = render([{
      id: 'deal-default',
      title: 'Sprawa syntetyczna',
      stage_id: 'stage-0',
      contact_id: 'contact-synthetic',
      contact: { name: 'Kontakt syntetyczny', phone: '+48000000000' },
      value: 25000,
      currency: 'PLN',
      created_at: '2026-11-01T12:00:00Z',
    } as Deal]);
    expect(desktop(html).match(/data-pipeline-column=/g)).toHaveLength(6);
    const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(2); // rzeczywiste karty desktop i mobile
    for (const card of cards) {
      expect(card).toContain('Sprawa syntetyczna');
      expect(card).toContain('Kontakt syntetyczny');
      expect(card).toContain('01.11.2026');
      expect(card).toContain('bg-white');
    }
    for (const card of cards) {
      for (const label of ['Ostatnia aktywność', 'ZADZWOŃ', 'WIADOMOŚĆ', 'href="tel:+48000000000"'])
        expect(card.includes(label)).toBe(enabled);
    }
    expect(html.includes('Dodaj deal')).toBe(enabled);
  });
});

describe('KM3.2.18: mobile i firma na karcie', () => {
  let css: Root;
  beforeAll(async () => {
    // Compile the actual Tailwind defaults: assertions below evaluate generated
    // display/media rules, including the exact 767/768 px boundary.
    const result = await postcss([tailwindcss()]).process(
      '@import "tailwindcss" source(none); @source inline("flex hidden md:flex md:hidden");',
      { from: resolve('src/app/globals.css') }
    );
    css = result.root;
  });

  function display(classes: string, viewport: number) {
    let value = '';
    const selectors = classes.split(' ').map((name) => `.${name.replaceAll(':', '\\:')}`);
    css.walkDecls('display', (decl) => {
      let matches = false;
      let applies = true;
      let parent: typeof decl.parent | Root['parent'] = decl.parent;
      while (parent) {
        if (parent.type === 'rule' && parent.selectors.some((selector) => selectors.includes(selector))) matches = true;
        if (parent.type === 'atrule' && parent.name === 'media') {
          const min = parent.params.match(/width >= ([\d.]+)(rem|px)/);
          if (min) applies &&= viewport >= Number(min[1]) * (min[2] === 'rem' ? 16 : 1);
        }
        parent = parent.parent;
      }
      if (matches && applies) value = decl.value;
    });
    return value;
  }

  const deals = [0, 1, 1].map((position, index) => ({
    id: `deal-mobile-${index}`, title: `Transakcja syntetyczna ${index}`,
    stage_id: `stage-${position}`, value: 1000, currency: 'PLN',
    created_at: '2026-11-09T08:00:00Z',
  })) as Deal[];

  function mobile(html: string) {
    return html.slice(0, html.indexOf('<div class="pipeline-scroll hidden'));
  }

  type Element = ReactElement<Record<string, unknown>>;
  function nodes(tree: ReactNode): Element[] {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!isValidElement<Record<string, unknown>>(tree)) return [];
    return [tree, ...nodes(tree.props.children as ReactNode)];
  }
  function board(currentStages = stages) {
    state.cursor = 0;
    state.active = true;
    try {
      return PipelineBoard({ stages: currentStages, deals, onDealMoved: vi.fn(), onAddDeal: vi.fn(), onEditDeal: vi.fn() });
    } finally { state.active = false; }
  }

  it.each([390, 767, 768, 1024])('przy szerokości %i px pokazuje właściwy widok', (viewport) => {
    expect(MOBILE_BREAKPOINT).toBe(768);
    const html = render(deals);
    const mobileClasses = html.match(/<div class="([^"]*md:hidden[^"]*)"/)![1];
    const desktopClasses = html.match(/<div class="(pipeline-scroll hidden[^"]*)"/)![1];
    expect(display(mobileClasses, viewport) === 'none').toBe(viewport >= MOBILE_BREAKPOINT);
    expect(display(desktopClasses, viewport)).toBe(viewport < MOBILE_BREAKPOINT ? 'none' : 'flex');
    const content = mobile(html);
    expect(content).toContain('aria-label="Etapy lejka"');
    expect(content).toContain('overflow-x-auto');
    expect(content).not.toContain('data-pipeline-column=');
    expect(content.match(/data-pipeline-deal/g)).toHaveLength(1);
    expect(content).toContain('/deals/deal-mobile-0');
    expect(content).not.toContain('/deals/deal-mobile-1');
    expect(content).not.toContain('/deals/deal-mobile-2');
    const nav = content.match(/<nav\b[\s\S]*?<\/nav>/)![0];
    expect(nav).toContain(`${names[0]}<span>1</span>`);
    expect(nav).toContain(`${names[1]}<span>2</span>`);
    expect(nav).toContain(`${names[2]}<span>0</span>`);
    expect(MOBILE_STAGE_TAB_HEIGHT).toBe(44);
    expect(nav).toContain('height:44px;border-bottom-color:#0B4A63');
    expect(nav.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it('wybór innego etapu pokazuje wyłącznie jego karty i zmienia podkreślenie', () => {
    const tree = board();
    const tab = nodes(tree).find((node) => node.type === 'button' &&
      Array.isArray(node.props.children) && node.props.children[0] === names[1])!;
    (tab.props.onClick as () => void)();
    const html = mobile(renderToStaticMarkup(board()));
    expect(html.match(/data-pipeline-deal/g)).toHaveLength(2);
    expect(html).toContain('/deals/deal-mobile-1');
    expect(html).toContain('/deals/deal-mobile-2');
    expect(html).not.toContain('/deals/deal-mobile-0');
    expect(html).toContain(`aria-current="step">${names[1]}`);

    const empty = nodes(board()).find((node) => node.type === 'button' &&
      Array.isArray(node.props.children) && node.props.children[0] === names[2])!;
    (empty.props.onClick as () => void)();
    const emptyHtml = mobile(renderToStaticMarkup(board()));
    expect(emptyHtml).toContain('Ten etap jest pusty');
    expect(emptyHtml).not.toContain('data-pipeline-deal');
    expect(mobile(renderToStaticMarkup(board([stages[0]])))).toContain('/deals/deal-mobile-0');
    expect(mobile(renderToStaticMarkup(board([])))).not.toContain('data-pipeline-deal');
  });

  it.each(['Firma syntetyczna', undefined, '   '])('tytuł karty dla firmy %s zachowuje powiązanie kontaktu', (companyName) => {
    const deal = { ...deals[0], company_name: companyName,
      contact: { first_name: 'Jan', last_name: 'Syntetyczny' } as Deal['contact'] } as Deal;
    const html = renderToStaticMarkup(<DealCard deal={deal} stage={stages[0]} onEdit={vi.fn()} />);
    const title = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/)![0];
    expect(title).toContain(companyName?.trim() || deal.title);
    expect(title).toContain('font-semibold');
    expect(html).toContain(`Jan Syntetyczny${companyName?.trim() ? ' · kontakt' : ''}</p>`);
    if (companyName?.trim()) expect(title).not.toContain(deal.title);
  });

  it('mapuje także firmę z relacji company odczytywanej przez stronę Lejka', () => {
    const deal = { ...deals[0], company: { name: 'Firma powiązana' } as Deal['company'],
      contact: { name: 'Kontakt powiązany' } as Deal['contact'] };
    const html = renderToStaticMarkup(<DealCard deal={deal} stage={stages[0]} onEdit={vi.fn()} />);
    expect(html).toContain('Firma powiązana</a>');
    expect(html).toContain('Kontakt powiązany · kontakt</p>');
  });
});
