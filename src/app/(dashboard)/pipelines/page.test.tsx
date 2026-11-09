import type { EffectCallback, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineStage } from '@/types';
import { PipelineBoard } from '@/components/pipelines/pipeline-board';
import type { DragEndEvent, DndContextProps } from '@dnd-kit/core';
import PipelinesPage from './page';

const harness = vi.hoisted(() => ({
  cursor: 0,
  currency: 'PLN',
  dnd: {} as DndContextProps,
  droppable: vi.fn(),
  draggable: vi.fn(),
  accountId: 'account-synthetic' as string | null,
  effects: [] as EffectCallback[],
  trackEffects: false,
  extensions: undefined as boolean | undefined,
  loadPipelines: vi.fn(),
  readPipelines: vi.fn(),
  toastError: vi.fn(),
  states: [] as unknown[],
  database: vi.fn(() => {
    throw new Error('Database forbidden in synthetic pipeline tests');
  }),
  network: vi.fn(() => {
    throw new Error('Network forbidden in synthetic pipeline tests');
  }),
}));

vi.mock('@/lib/ui/surface-flags', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/ui/surface-flags')>();
  return {
    ...original,
    surfaceFlags: {
      get pipelineExtensions() {
        return harness.extensions ?? original.surfaceFlags.pipelineExtensions;
      },
    },
  };
});

// Seed the loaded page without executing database effects. Other hooks retain
// React's normal server-render behaviour, including the real PipelineBoard.
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useEffect: (effect: EffectCallback) => {
      if (harness.trackEffects) harness.effects.push(effect);
    },
    useState: (initial: unknown) => {
      const index = harness.cursor++;
      const state = react.useState(
        index in harness.states ? harness.states[index] : initial
      );
      if (!harness.trackEffects) return state;
      // Capture async effect writes for the next SSR render, without a DOM or DB.
      return [
        state[0],
        (value: unknown) => {
          harness.states[index] =
            typeof value === 'function'
              ? value(harness.states[index] ?? initial)
              : value;
        },
      ];
    },
  };
});
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: harness.database }),
}));
vi.mock('@/lib/deals/pipeline-bootstrap', () => ({
  loadOrSeedPipelines: harness.loadPipelines,
  readPipelines: harness.readPipelines,
}));
vi.mock('sonner', () => ({ toast: { error: harness.toastError } }));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    accountId: harness.accountId,
    defaultCurrency: harness.currency,
  }),
}));
vi.mock('@/hooks/use-can', () => ({ useCan: () => true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/pipelines/pipeline-settings', () => ({
  PipelineSettings: () => null,
}));
vi.mock('@/components/pipelines/deal-form', () => ({ DealForm: () => null }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? children : null,
  DialogContent: ({ children }: { children: ReactNode }) => children,
  DialogHeader: ({ children }: { children: ReactNode }) => children,
  DialogTitle: ({ children }: { children: ReactNode }) => children,
  DialogFooter: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@dnd-kit/core', () => ({
  DndContext: (props: DndContextProps) => {
    harness.dnd = props;
    return props.children;
  },
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  KeyboardSensor: {},
  PointerSensor: {},
  closestCorners: vi.fn(),
  useSensor: () => ({}),
  useSensors: () => [],
  useDroppable: (options: { id: string }) => {
    harness.droppable(options.id);
    return { setNodeRef: vi.fn(), isOver: false };
  },
  useDraggable: (options: { id: string }) => {
    harness.draggable(options.id);
    return {
      setNodeRef: vi.fn(),
      attributes: { 'data-draggable': options.id },
      listeners: {},
      isDragging: false,
    };
  },
}));

const stages = ['Kontakt syntetyczny', 'Oferta syntetyczna', 'Pusty etap'].map(
  (name, position) => ({
    id: `stage-${position}`,
    pipeline_id: 'pipeline-synthetic',
    name,
    position,
  })
) as PipelineStage[];

const deals = [12340, 22660, 90000].map((value, index) => ({
  id: `deal-${index}`,
  title: `Deal syntetyczny ${index}`,
  user_id: 'user-synthetic',
  pipeline_id: 'pipeline-synthetic',
  contact_id: null,
  created_at: '2026-11-03T12:00:00Z',
  stage_id: index < 2 ? 'stage-0' : 'stage-1',
  status: 'open' as const,
  value,
  currency: 'PLN',
  expected_commission: 100,
  tagNames: ['Tag syntetyczny'],
  bankNames: ['Bank syntetyczny'],
  product_type: 'Produkt syntetyczny',
  next_action: 'Kontakt syntetyczny',
}));

function renderPage() {
  harness.cursor = 0;
  return renderToStaticMarkup(<PipelinesPage />);
}

function boardViews(html: string) {
  const boards = [...html.matchAll(/<div class="pipeline-scroll[^"]*"/g)];
  expect(boards).toHaveLength(1);
  expect(boards[0][0]).toContain('overflow-x-auto');
  expect(boards[0][0]).not.toMatch(/(?:hidden|md:flex)/);
  const board = html.slice(boards[0].index);
  // Both responsive views use this one board; CSS controls the viewport.
  return { mobile: board, desktop: board };
}

function textContent(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

beforeEach(() => {
  harness.extensions = undefined;
  harness.currency = 'PLN';
  harness.accountId = 'account-synthetic';
  harness.effects = [];
  harness.trackEffects = false;
  harness.loadPipelines.mockReset();
  harness.loadPipelines.mockResolvedValue([
    { id: 'pipeline-synthetic', name: 'Lejek syntetyczny' },
  ]);
  harness.states = [
    [{ id: 'pipeline-synthetic', name: 'Lejek syntetyczny' }],
    'pipeline-synthetic',
    stages,
    deals,
    false,
  ];
  vi.stubGlobal('fetch', harness.network);
});

afterEach(() => {
  expect(harness.database).not.toHaveBeenCalled();
  expect(harness.network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('K3-N4: minimalna struktura lejka 04A', () => {
  it('renderuje tytuł Lejek sprzedaży', () => {
    harness.extensions = true;
    expect(renderPage()).toMatch(/<h1[^>]*>Lejek sprzedaży<\/h1>/);
  });

  it.each(['desktop', 'mobile'] as const)(
    'renderuje przycisk Dodaj deal: %s',
    (viewport) => {
      harness.extensions = true;
      const html = boardViews(renderPage())[viewport];
      const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
      const addButtons = buttons.filter(
        (button) => textContent(button) === 'Dodaj deal'
      );
      expect(addButtons).toHaveLength(
        stages.length
      );
      expect(html).not.toContain('Dodaj sprawę');
    }
  );

  it.each(['desktop', 'mobile'] as const)(
    'łączy nazwę, sumę i licznik danego etapu: %s',
    (viewport) => {
      const html = boardViews(renderPage())[viewport];
      expect(html.match(/data-pipeline-column=/g)).toHaveLength(stages.length);
      expect(html.match(/<article\b[^>]*data-pipeline-deal/g)).toHaveLength(deals.length);
      for (const deal of deals) expect(html).toContain(`/deals/${deal.id}`);
      expect(html).not.toContain('aria-label="Etapy lejka"');
      const header = html.match(
        /<div[^>]*data-stage-header[^>]*>([\s\S]*?)<\/div>/
      )?.[0];
      expect(header).toBeDefined();
      expect(textContent(header!)).toBe(
        'Transakcja Kontakt syntetyczny · 35 000 zł · 2 transakcje'
      );
      expect(header).toContain('flex');
      expect(header).not.toMatch(/<(?:p|br)\b/);
      expect(header).not.toContain('szt.');
      expect(header).toContain('whitespace-nowrap');
    }
  );

  it('pokazuje niezależne sumy pozostałych kolumn oraz zero dla pustego etapu', () => {
    const { desktop } = boardViews(renderPage());
    const headers = [
      ...desktop.matchAll(/<div[^>]*data-stage-header[^>]*>([\s\S]*?)<\/div>/g),
    ].map((match) => textContent(match[0]));
    expect(headers).toEqual([
      'Transakcja Kontakt syntetyczny · 35 000 zł · 2 transakcje',
      'Transakcja Oferta syntetyczna · 90 000 zł · 1 transakcja',
      'Transakcja Pusty etap · 0 zł · 0 transakcji',
    ]);
  });

  it('zachowuje filtry, pięć statystyk i archiwum', () => {
    harness.extensions = true;
    const html = renderPage();
    for (const label of ['Produkt', 'Tag', 'Bank', 'Priorytet']) {
      expect(html).toMatch(new RegExp(`<label[^>]*>${label}<select`));
    }
    for (const label of [
      'Tylko przeterminowane',
      'Bez next action',
      'Więcej filtrów',
      'Archiwum (0)',
    ]) {
      expect(html).toContain(label);
    }
    const stats = html.match(
      /<section[^>]*aria-label="Statystyki lejka"[^>]*>([\s\S]*?)<\/section>/
    )?.[0];
    expect(stats).toBeDefined();
    expect(textContent(stats!)).toBe(
      'Aktywne sprawy 3 Przychód TERAZ 300 PLN Przychód PÓŹNIEJ 125 000 PLN Z blockerem 0 Z next action 3'
    );
  });
});

function desktopHeaders(html: string) {
  return [
    ...boardViews(html).desktop.matchAll(/<h3\b[^>]*>[\s\S]*?<\/h3>/g),
  ].map((match) => textContent(match[0]));
}

describe('K3-02B-01: suma i licznik nagłówka', () => {
  it.each(['desktop', 'mobile'] as const)(
    'pokazuje 1 500 zł i 1 transakcja: %s',
    (viewport) => {
      harness.states[3] = [{ ...deals[0], value: 1500 }];
      const html = boardViews(renderPage())[viewport];
      expect(textContent(html)).toContain(
        'Kontakt syntetyczny · 1 500 zł · 1 transakcja'
      );
    }
  );

  it('pokazuje jawne zero w każdej pustej kolumnie', () => {
    harness.states[3] = [];
    expect(desktopHeaders(renderPage())).toEqual(
      stages.map((stage) => `${stage.name} · 0 zł · 0 transakcji`)
    );
  });

  it('pokazuje zerową sumę przy niezerowym liczniku', () => {
    harness.states[3] = [{ ...deals[0], value: 0 }];
    expect(desktopHeaders(renderPage())[0]).toBe(
      'Kontakt syntetyczny · 0 zł · 1 transakcja'
    );
  });

  it.each([
    [2, 'transakcje'],
    [4, 'transakcje'],
    [5, 'transakcji'],
    [11, 'transakcji'],
    [12, 'transakcji'],
    [14, 'transakcji'],
    [21, 'transakcji'],
    [22, 'transakcje'],
    [25, 'transakcji'],
    [101, 'transakcji'],
    [112, 'transakcji'],
  ])('odmienia licznik %i jako %s', (count, noun) => {
    harness.states[3] = Array.from({ length: count }, (_, index) => ({
      ...deals[0],
      id: `synthetic-${index}`,
      value: 0,
    }));
    expect(desktopHeaders(renderPage())[0]).toBe(
      `Kontakt syntetyczny · 0 zł · ${count} ${noun}`
    );
  });

  it('używa waluty konta zamiast waluty pojedynczej karty, także dla pustego etapu', () => {
    harness.currency = 'EUR';
    const headers = desktopHeaders(renderPage());
    expect(headers[0]).toContain('€');
    expect(headers[2]).toContain('€');
    expect(headers.join(' ')).not.toContain('zł');
  });

  it('zachowuje kolumny, karty, linki i identyfikatory drag&drop', () => {
    const { desktop, mobile } = boardViews(renderPage());
    expect(desktop.match(/<h3\b/g)).toHaveLength(stages.length);
    expect(desktop.match(/href="\/deals\//g)).toHaveLength(deals.length);
    expect(mobile.match(/href="\/deals\//g)).toHaveLength(deals.length);
    for (const deal of deals) {
      expect(desktop).toContain(`href="/deals/${deal.id}"`);
      expect(desktop).toContain(`data-draggable="${deal.id}"`);
      expect(harness.draggable).toHaveBeenCalledWith(deal.id);
    }
    for (const stage of stages)
      expect(harness.droppable).toHaveBeenCalledWith(stage.id);
    expect(harness.dnd.onDragStart).toBeTypeOf('function');
    expect(harness.dnd.onDragCancel).toBeTypeOf('function');
  });

  it('wywołuje zmianę etapu po drag&drop i pomija nieprawidłowe cele', () => {
    harness.states = [];
    harness.cursor = 0;
    const onDealMoved = vi.fn();
    renderToStaticMarkup(
      <PipelineBoard
        stages={stages}
        deals={deals}
        onDealMoved={onDealMoved}
        onAddDeal={vi.fn()}
        onEditDeal={vi.fn()}
      />
    );
    const drop = (target: string | null) =>
      harness.dnd.onDragEnd?.({
        active: { id: 'deal-0' },
        over: target ? { id: target } : null,
      } as DragEndEvent);
    drop('stage-1');
    expect(onDealMoved).toHaveBeenCalledExactlyOnceWith('deal-0', 'stage-1');
    onDealMoved.mockClear();
    drop(null);
    drop('stage-0');
    drop('unknown-stage');
    expect(onDealMoved).not.toHaveBeenCalled();
  });
});

describe('K3-02B-02: jasne powierzchnie i kolory etapów', () => {
  it.each([
    ['Klasyfikacja', '#64748b'],
    ['Wymagana analiza', '#0ea5e9'],
    ['Propozycja', '#8b5cf6'],
    ['Wycena', '#8b5cf6'],
    ['Propozycja/Wycena', '#8b5cf6'],
    ['Propozycja Cenowa', '#8b5cf6'],
    ['Negocjacje', '#f59e0b'],
    ['Negocjacje/rewizja', '#f59e0b'],
    ['Zamknięty zdobyty', '#0f7b3f'],
    ['Zamknięty, utracony', '#b3261e'],
    ['  WYMAGANA   ANALIZA  ', '#0ea5e9'],
    ['Inny etap', '#94a3b8'],
    ['constructor', '#94a3b8'],
  ])(
    'kolor nazwy %s jest taki sam na desktop i mobile, niezależnie od pozycji',
    (name, color) => {
      harness.states[2] = [{ ...stages[0], name, position: 19 }];
      const views = boardViews(renderPage());
      for (const html of Object.values(views)) {
        expect(html).toContain(`data-stage-color="${color}"`);
        expect(html).toContain(`background-color:${color}`);
        expect(html).toContain('h-[3px] shrink-0');
        expect(html).toContain('size-2 shrink-0 rounded-full');
      }
    }
  );

  it('zachowuje sześć rozróżnialnych etapów, sumy i liczniki', () => {
    const names = [
      'Klasyfikacja',
      'Wymagana analiza',
      'Propozycja/Wycena',
      'Negocjacje',
      'Zamknięty zdobyty',
      'Zamknięty utracony',
    ];
    harness.states[2] = names.map((name, position) => ({
      ...stages[0],
      id: `stage-${position}`,
      name,
      position,
    }));
    const { desktop } = boardViews(renderPage());
    expect(desktop.match(/data-stage-color=/g)).toHaveLength(6);
    expect(
      new Set(
        [...desktop.matchAll(/data-stage-color="([^"]+)"/g)].map(
          (match) => match[1]
        )
      ).size
    ).toBe(6);
    expect(desktopHeaders(renderPage())).toEqual(
      names.map(
        (name, index) =>
          `${name} · ${index === 0 ? '35 000 zł · 2 transakcje' : index === 1 ? '90 000 zł · 1 transakcja' : '0 zł · 0 transakcji'}`
      )
    );
  });

  it.each(['desktop', 'mobile'] as const)(
    'jasna kolumna i biała karta z ciemnym tekstem: %s',
    (viewport) => {
      const html = boardViews(renderPage())[viewport];
      expect(html).toMatch(
        /data-stage-color="[^"]+" class="[^"]*w-\[230px\]/
      );
      expect(html).toMatch(
        /<article[^>]*data-pipeline-deal="true"[^>]*class="[^"]*bg-white[^"]*text-slate-900/
      );
      expect(html).toContain('rounded border');
      expect(html).toContain('text-xs text-slate-600');
      if (viewport === 'desktop') expect(html).toContain('data-stage-header');
    }
  );

  it('zachowuje linki i zielony przycisk telefonu w rzeczywistej karcie', () => {
    harness.extensions = true;
    harness.states[3] = [
      {
        ...deals[0],
        contact_id: 'contact-synthetic',
        contact: { phone: '+48000000000' },
      },
    ];
    const { desktop } = boardViews(renderPage());
    expect(desktop).toContain('href="/deals/deal-0"');
    expect(desktop).toContain('href="tel:+48000000000"');
    expect(desktop).toContain('bg-emerald-800 text-white');
    expect(desktop).toContain('ZADZWOŃ');
    expect(desktop).toContain('WIADOMOŚĆ');
    expect(desktop).toContain(
      '/quick-call?contact=contact-synthetic&amp;action=message&amp;deal=deal-0'
    );
  });

  it('tło przestrzeni roboczej jest jasne', () => {
    expect(renderPage()).toMatch(
      /data-pipeline-workspace="true" class="[^"]*bg-\[var\(--bigin-bg\)\]/
    );
  });
});

describe('K3-02B-03: powierzchnie bez nadpisań ciemnego motywu', () => {
  const forbiddenSurface =
    /bg-(?:slate-9(?:00|50)|card|background|muted)|dark:|bg-gradient|!important/;

  it.each(['desktop', 'mobile'] as const)(
    'każda kolumna i rzeczywista karta mają wyłącznie jasne powierzchnie: %s',
    (viewport) => {
      const html = boardViews(renderPage())[viewport];
      const columns =
        html.match(/<(?:div|section)\b[^>]*data-stage-color[^>]*>/g) ?? [];
      const cards =
        html.match(/<article\b[^>]*data-pipeline-deal[^>]*>/g) ?? [];
      expect(columns).toHaveLength(stages.length);
      expect(cards).toHaveLength(deals.length);
      for (const column of columns) {
        expect(column).toContain('w-[230px]');
        expect(column).toContain('px-[5px]');
        expect(column).toContain('flex-none');
        expect(column).not.toMatch(forbiddenSurface);
      }
      for (const card of cards) {
        expect(card).toContain('bg-white');
        expect(card).toContain('text-slate-900');
        expect(card).toContain('border-[var(--bigin-border)]');
        expect(card).toContain('rounded border');
        expect(card).toContain('shadow-[0_1px_2px_rgb(15_23_42_/_0.06)]');
        expect(card).not.toMatch(forbiddenSurface);
      }
      expect(html).not.toContain('article]');
      expect(html).not.toContain('--pipeline-stage-color');
    }
  );

  it('nagłówek i pasek karty używają koloru etapu, zachowując sumę i licznik', () => {
    harness.states[2] = [{ ...stages[0], name: 'Negocjacje' }];
    const { desktop } = boardViews(renderPage());
    expect(desktopHeaders(renderPage())).toEqual([
      'Negocjacje · 35 000 zł · 2 transakcje',
    ]);
    const header = desktop.match(
      /<div[^>]*data-stage-header[^>]*>[\s\S]*?<\/div>/
    )?.[0];
    expect(header).toContain('bg-[var(--bigin-surface)]');
    expect(header).toContain('background-color:#f59e0b');
    expect(header).not.toMatch(forbiddenSurface);
    const cards = desktop.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toContain('background-color:#f59e0b');
      expect(card).not.toContain('!');
    }
  });

  it.each([false, true])('nakładka przeciągania używa tej samej karty i przełącznika: %s', (enabled) => {
    harness.extensions = enabled;
    harness.states = ['deal-0'];
    harness.cursor = 0;
    const html = renderToStaticMarkup(
      <PipelineBoard
        stages={[{ ...stages[0], name: 'Wymagana analiza' }]}
        deals={[{
          ...deals[0],
          contact_id: 'contact-synthetic',
          contact: {
            id: 'contact-synthetic',
            user_id: 'user-synthetic',
            account_id: 'account-synthetic',
            name: 'Osoba syntetyczna',
            phone: '+48000000000',
            created_at: '2026-11-01T12:00:00Z',
            updated_at: '2026-11-03T12:00:00Z',
          },
        }]}
        onDealMoved={vi.fn()}
        onAddDeal={vi.fn()}
        onEditDeal={vi.fn()}
      />
    );
    const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(2); // shared board and drag overlay
    for (const card of cards) {
      expect(card).toMatch(/<article[^>]*bg-white[^>]*text-slate-900/);
      expect(card).toContain('background-color:#0ea5e9');
      expect(card.includes('Ostatnia aktywność:')).toBe(enabled);
      expect(card.includes('ZADZWOŃ')).toBe(enabled);
      expect(card.includes('WIADOMOŚĆ')).toBe(enabled);
    }
    expect(cards[1]).toContain('opacity-90');
  });
});

describe('K3-02B-04: białe karty i jasny obszar tablicy', () => {
  it.each(['desktop', 'mobile'] as const)(
    'maluje kartę na article, a jasne tło na kontenerze tablicy: %s',
    (viewport) => {
      const html = boardViews(renderPage())[viewport];
      const board = html.match(/<div class="pipeline-scroll[^"]*"/)?.[0];
      expect(board).toContain('bg-[var(--bigin-bg)]');
      expect(html.match(/data-pipeline-column=/g)).toHaveLength(stages.length);
      for (const deal of deals) expect(html).toContain(`/deals/${deal.id}`);
      const stage = html;
      const cards = stage?.match(/<article\b[^>]*data-pipeline-deal[^>]*>/g) ?? [];
      expect(cards).toHaveLength(deals.length);
      for (const card of cards) {
        expect(card).toContain('bg-white');
        expect(card).toContain('text-slate-900');
        expect(card).toContain('style="color:var(--bigin-text)"');
        expect(card).toContain('border-[var(--bigin-border)]');
        expect(card).toContain('rounded border');
        expect(card).toContain('shadow-[0_1px_2px_rgb(15_23_42_/_0.06)]');
      }
    }
  );

  it.each([false, true])(
    'jasny obszar treści wypełnia dostępną wysokość, loading=%s',
    (loading) => {
      harness.states[4] = loading;
      const workspace = renderPage().match(
        /<div[^>]*data-pipeline-workspace[^>]*>/
      )?.[0];
      expect(workspace).toContain('h-full min-h-0');
      expect(workspace).toContain('bg-[var(--bigin-bg)]');
    }
  );
});

describe('K3-02B-05: rzeczywisty błąd pobrania i Kontakt na karcie', () => {
  async function runPipelineLoad() {
    harness.effects = [];
    harness.trackEffects = true;
    renderPage();
    const cleanup = harness.effects[0]();
    await vi.waitFor(() => expect(harness.states[4]).toBe(false));
    harness.trackEffects = false;
    if (typeof cleanup === 'function') cleanup();
  }

  it('nie renderuje banera po udanym pobraniu, także po wcześniejszym błędzie', async () => {
    harness.loadPipelines.mockRejectedValueOnce({ message: 'Błąd syntetyczny' });
    await runPipelineLoad();
    expect(renderPage()).toContain('Nie wczytano lejków: Błąd syntetyczny');
    await runPipelineLoad();
    const html = renderPage();
    expect(html).not.toContain('Nie wczytano lejków:');
    expect(html).not.toContain('role="alert"');
    expect(desktopHeaders(html)).toHaveLength(stages.length);
    expect(harness.toastError).not.toHaveBeenCalled();
  });

  it('renderuje tekst rzeczywistego błędu również przy zachowanych danych tablicy', async () => {
    harness.loadPipelines.mockRejectedValueOnce({
      message: 'Odmowa dostępu — syntetyczna',
    });
    await runPipelineLoad();
    const html = renderPage();
    expect(html).toMatch(
      /<p role="alert"[^>]*>Nie wczytano lejków: Odmowa dostępu — syntetyczna<\/p>/
    );
    expect(desktopHeaders(html)).toEqual([
      'Kontakt syntetyczny · 35 000 zł · 2 transakcje',
      'Oferta syntetyczna · 90 000 zł · 1 transakcja',
      'Pusty etap · 0 zł · 0 transakcji',
    ]);
  });

  it('nie zamienia chwilowego braku konta w komunikat błędu pobrania', async () => {
    harness.accountId = null;
    harness.loadPipelines.mockRejectedValueOnce(
      new Error('Brak przypisanego konta.')
    );
    await runPipelineLoad();
    expect(renderPage()).not.toContain('Nie wczytano lejków:');
    expect(harness.toastError).not.toHaveBeenCalled();
    harness.accountId = 'account-synthetic';
    await runPipelineLoad();
    expect(renderPage()).not.toContain('Nie wczytano lejków:');
  });

  it.each(['desktop', 'mobile'] as const)(
    'pokazuje Kontakt między tytułem a kwotą i zachowuje datę oraz akcje: %s',
    (viewport) => {
      harness.extensions = true;
      harness.states[3] = [
        {
          ...deals[0],
          contact_id: 'contact-synthetic',
          contact: { name: 'Osoba syntetyczna', phone: '+48000000000' },
        },
      ];
      const html = boardViews(renderPage())[viewport];
      const card = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/)?.[0];
      expect(card).toBeDefined();
      expect(card).toMatch(
        /Deal syntetyczny 0<\/a><p class="truncate text-xs text-slate-600" title="Osoba syntetyczna">Osoba syntetyczna<\/p><p class="mt-2 text-sm font-bold">/
      );
      const amount = card!.match(
        /<p class="mt-2 text-sm font-bold">([^<]+)<\/p>/
      )?.[1];
      expect(amount?.replace(/\D/g, '')).toBe('12340');
      expect(card).toContain('Ostatnia aktywność: 03.11.2026');
      expect(card).toContain('ZADZWOŃ');
      expect(card).toContain('WIADOMOŚĆ');
      expect(card).toContain('href="tel:+48000000000"');
    }
  );

  it.each([
    undefined,
    null,
    {},
    { name: '' },
    { name: '   ', first_name: ' ', last_name: '' },
  ])(
    'nie renderuje pustego wiersza Kontaktu: %j',
    (contact) => {
      harness.states[3] = [{ ...deals[0], contact }];
      for (const html of Object.values(boardViews(renderPage()))) {
        const card = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/)?.[0];
        expect(card).toMatch(
          /Deal syntetyczny 0<\/a><p class="mt-2 text-sm font-bold">/
        );
        expect(card).not.toContain('truncate text-xs text-slate-600');
      }
    }
  );

  it('korzysta z imienia i nazwiska relacji, gdy name jest puste', () => {
    harness.states[3] = [
      {
        ...deals[0],
        contact: { name: ' ', first_name: ' Osoba ', last_name: ' Syntetyczna ' },
      },
    ];
    expect(boardViews(renderPage()).desktop).toContain('>Osoba Syntetyczna</p>');
  });
});

describe('KM3.2.08-BIGIN-SURFACE-02: jeden przełącznik całej powierzchni', () => {
  it.each([undefined, false, true])(
    'zachowuje rdzeń Bigin, ukrywa dodatki domyślnie i pokazuje je tylko po włączeniu flagi: %s',
    (extensions) => {
      harness.extensions = extensions;
      const enabled = extensions === true;
      harness.states[2] = Array.from({ length: 7 }, (_, position) => ({
        ...stages[0],
        id: `stage-${position}`,
        position,
        name: position === 6 ? '7. ARCHIWUM' : `Etap ${position + 1}`,
      }));
      harness.states[3] = [{
        ...deals[0],
        contact_id: 'contact-synthetic',
        contact: { name: 'Osoba syntetyczna', phone: '+48000000000' },
        updated_at: '2026-11-04T12:00:00Z',
        expected_close_date: '2026-11-20',
      }];
      harness.states[11] = true; // również rozwinięte dodatki filtrów
      const originalDeals = harness.states[3];
      const html = renderPage();
      const { desktop, mobile } = boardViews(html);
      expect(desktop.match(/data-pipeline-column=/g)).toHaveLength(6);
      expect(desktop.match(/w-\[230px\] flex-none/g)).toHaveLength(6);
      expect(desktop).toContain('gap-[0px] overflow-x-auto');
      expect(desktop.match(/>Transakcja<\/span>/g)).toHaveLength(6);
      expect(desktop.match(/Ten etap jest pusty/g)).toHaveLength(5);
      expect(desktop).not.toContain('7. ARCHIWUM');
      for (const view of [desktop, mobile]) {
        const cards = view.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
        expect(cards).toHaveLength(1);
        const card = cards[0]!;
        expect(card).toContain('bg-white');
        expect(card).toContain('href="/deals/deal-0"');
        expect(card).toContain('Deal syntetyczny 0');
        expect(card).toContain('Osoba syntetyczna');
        const amount = card.match(/<p class="mt-2 text-sm font-bold">([^<]+)<\/p>/)?.[1];
        expect(amount?.replace(/\D/g, '')).toBe('12340');
        expect(card).toContain('dateTime="2026-11-20"');
        expect(card).toContain('20.11.2026');
        for (const label of ['Ostatnia aktywność: 04.11.2026', 'ZADZWOŃ', 'WIADOMOŚĆ', 'href="tel:+48000000000"'])
          expect(card.includes(label)).toBe(enabled);
        expect(view.includes('Dodaj deal')).toBe(enabled);
      }
      for (const label of ['Produkt', 'Tag', 'Bank', 'Priorytet']) {
        expect(new RegExp(`<label[^>]*>${label}<select`).test(html)).toBe(enabled);
      }
      for (const label of [
        'Lejek sprzedaży', 'Wszystkie aktywne sprawy (Tomasz)', 'Archiwum (',
        'Tylko przeterminowane', 'Bez next action', 'Więcej filtrów', 'Wyczyść filtry',
        'Statystyki lejka', 'Aktywne sprawy', 'Przychód TERAZ', 'Przychód PÓŹNIEJ',
        'Z blockerem', 'Z next action', 'Asystent AI', 'AI+', 'Przeanalizuj lejek',
        'href="/assistant?feature=pipeline"',
      ]) expect(html.includes(label)).toBe(enabled);
      for (const label of ['Szukaj transakcji', 'Wszystkie transakcje', 'Właściciel zmiany', 'Więcej', 'Sortuj według'])
        expect(html).toContain(label);
      expect(html).toContain('bg-[var(--bigin-bg)]');
      expect(harness.states[3]).toBe(originalDeals);
    }
  );

  it('źródłowy przełącznik jest domyślnie false i zachowuje jawną listę dodatków', async () => {
    const actual = await vi.importActual<typeof import('@/lib/ui/surface-flags')>('@/lib/ui/surface-flags');
    expect(actual.surfaceFlags.pipelineExtensions).toBe(false);
    expect(actual.pipelineSurfaceExtensions.join(' ')).toContain('Asystenta AI');
    expect(actual.pipelineSurfaceExtensions.join(' ')).toContain('ZADZWOŃ i WIADOMOŚĆ');
  });
});

describe('KM3.2.08-BIGIN-CORE: tablica i narzędzia bez utraty funkcji mCRM', () => {
  // New toolbar state follows the existing page state, preserving the older fixtures.
  const toolbarState = { search: 24, view: 25, owner: 26, sort: 27 };
  function desktopCards() {
    return boardViews(renderPage()).desktop.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
  }

  it('po włączeniu dodatków renderuje sześć kolumn oraz filtry, KPI i AI w dotychczasowej kolejności', () => {
    harness.extensions = true;
    harness.states[2] = Array.from({ length: 7 }, (_, index) => ({
      ...stages[0],
      id: `stage-${index}`,
      position: index,
      name: index === 6 ? '7. ARCHIWUM' : `Etap ${index + 1}`,
    }));
    harness.states[3] = deals.map((deal) => ({
      ...deal,
      contact_id: 'contact-synthetic',
      contact: { name: 'Osoba syntetyczna', phone: '+48000000000' },
    }));
    const html = renderPage();
    const desktop = boardViews(html).desktop;
    expect(desktop.match(/data-pipeline-column=/g)).toHaveLength(6);
    expect(desktop.match(/data-pipeline-deal=/g)).toHaveLength(3);
    expect(desktop).not.toContain('7. ARCHIWUM');
    for (const card of desktop.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? []) {
      expect(card).toMatch(/Deal syntetyczny \d/);
      expect(card).toContain('Osoba syntetyczna');
      expect(card).toContain('mt-2 text-sm font-bold');
      expect(card).toContain('<time');
      expect(card).toContain('03.11.2026');
      expect(card).toContain('Ostatnia aktywność:');
      expect(card).toContain('ZADZWOŃ');
      expect(card).toContain('WIADOMOŚĆ');
    }
    for (const label of ['Produkt', 'Tag', 'Bank', 'Priorytet'])
      expect(html).toMatch(new RegExp(`<label[^>]*>${label}<select`));
    expect(html).toContain('href="/assistant?feature=pipeline"');
    const filters = html.indexOf('>Produkt<select');
    const stats = html.indexOf('aria-label="Statystyki lejka"');
    const assistant = html.indexOf('href="/assistant?feature=pipeline"');
    const toolbar = html.indexOf('aria-label="Narzędzia tablicy transakcji"');
    const board = html.indexOf('<div class="pipeline-scroll flex');
    expect(filters).toBeGreaterThan(0);
    expect(stats).toBeGreaterThan(filters);
    expect(assistant).toBeGreaterThan(stats);
    expect(toolbar).toBeGreaterThan(assistant);
    expect(board).toBeGreaterThan(toolbar);
    for (const text of ['Szukaj transakcji', '⌘K', 'Wszystkie transakcje', 'Właściciel zmiany', 'Więcej', 'Sortuj według'])
      expect(html).toContain(text);
    expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
  });

  it('wyszukuje po nazwie sprawy i kontakcie bez zmiany źródłowych danych', () => {
    harness.states[3] = deals.map((deal, index) => ({
      ...deal,
      contact: { name: index === 1 ? 'Osoba Alfa' : 'Osoba Beta' },
    }));
    harness.states[toolbarState.search] = '  OSOBA alfa  ';
    expect(desktopCards()).toHaveLength(1);
    expect(desktopCards()[0]).toContain('href="/deals/deal-1"');
    harness.states[toolbarState.search] = 'deal syntetyczny 2';
    expect(desktopCards()).toHaveLength(1);
    expect(desktopCards()[0]).toContain('href="/deals/deal-2"');
    harness.states[toolbarState.search] = 'brak dopasowania';
    expect(desktopCards()).toHaveLength(0);
    expect(boardViews(renderPage()).desktop).toContain('Ten etap jest pusty');
    expect(harness.states[3]).toHaveLength(3);
  });

  it('łączy widok statusu i filtr właściciela z istniejącym filtrem produktu', () => {
    harness.states[3] = [
      { ...deals[0], assigned_to: 'owner-a', assignee: { full_name: 'Opiekun syntetyczny' } },
      { ...deals[1], status: 'won', assigned_to: 'owner-a' },
      { ...deals[2], status: 'lost', product_type: 'Inny produkt' },
    ];
    expect(renderPage()).toContain('Opiekun syntetyczny');
    harness.states[toolbarState.view] = 'closed';
    expect(desktopCards()).toHaveLength(2);
    harness.states[toolbarState.owner] = 'owner-a';
    expect(desktopCards()).toHaveLength(1);
    expect(desktopCards()[0]).toContain('href="/deals/deal-1"');
    harness.states[5] = 'Inny produkt';
    expect(desktopCards()).toHaveLength(0);
    harness.states[toolbarState.owner] = 'unassigned';
    expect(desktopCards()).toHaveLength(1);
    expect(desktopCards()[0]).toContain('href="/deals/deal-2"');
    harness.states[5] = 'all';
    harness.states[toolbarState.owner] = 'all';
    harness.states[toolbarState.view] = 'open';
    expect(desktopCards()).toHaveLength(1);
    expect(desktopCards()[0]).toContain('href="/deals/deal-0"');
  });

  it.each([
    ['created-desc', ['deal-1', 'deal-0']],
    ['created-asc', ['deal-0', 'deal-1']],
    ['title', ['deal-1', 'deal-0']],
    ['value-desc', ['deal-1', 'deal-0']],
  ])('sortuje karty w etapie: %s', (sort, order) => {
    harness.states[3] = [
      { ...deals[0], title: 'Zeta', created_at: '2026-11-01T12:00:00Z' },
      { ...deals[1], title: 'Alfa', created_at: '2026-11-02T12:00:00Z' },
    ];
    harness.states[toolbarState.sort] = sort;
    expect(desktopCards().map((card) => card.match(/href="\/deals\/([^"]+)"/)?.[1])).toEqual(order);
    expect((harness.states[3] as typeof deals).map((deal) => deal.id)).toEqual(['deal-0', 'deal-1']);
  });
});
