import type { ReactNode } from 'react';
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
  states: [] as unknown[],
  database: vi.fn(() => {
    throw new Error('Database forbidden in synthetic pipeline tests');
  }),
  network: vi.fn(() => {
    throw new Error('Network forbidden in synthetic pipeline tests');
  }),
}));

// Seed the loaded page without executing database effects. Other hooks retain
// React's normal server-render behaviour, including the real PipelineBoard.
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useEffect: () => {},
    useState: (initial: unknown) => {
      const index = harness.cursor++;
      return react.useState(
        index in harness.states ? harness.states[index] : initial
      );
    },
  };
});
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: harness.database }),
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    accountId: 'account-synthetic',
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
  const desktopStart = html.indexOf('<div class="pipeline-scroll hidden');
  expect(desktopStart).toBeGreaterThan(0);
  return {
    mobile: html.slice(0, desktopStart),
    desktop: html.slice(desktopStart),
  };
}

function textContent(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

beforeEach(() => {
  harness.currency = 'PLN';
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
    expect(renderPage()).toMatch(/<h1[^>]*>Lejek sprzedaży<\/h1>/);
  });

  it.each(['desktop', 'mobile'] as const)(
    'renderuje przycisk Dodaj deal: %s',
    (viewport) => {
      const html = boardViews(renderPage())[viewport];
      const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
      const addButtons = buttons.filter(
        (button) => textContent(button) === 'Dodaj deal'
      );
      expect(addButtons).toHaveLength(
        viewport === 'desktop' ? stages.length : 1
      );
      expect(html).not.toContain('Dodaj sprawę');
    }
  );

  it.each(['desktop', 'mobile'] as const)(
    'łączy nazwę, sumę i licznik danego etapu: %s',
    (viewport) => {
      const html = boardViews(renderPage())[viewport];
      const header =
        viewport === 'mobile'
          ? html.match(
              /<button[^>]*aria-expanded="true"[^>]*>([\s\S]*?)<\/button>/
            )?.[0]
          : html.match(
              /<div[^>]*data-stage-header[^>]*>([\s\S]*?)<\/div>/
            )?.[0];
      expect(header).toBeDefined();
      expect(textContent(header!)).toBe(
        'Kontakt syntetyczny · 35 000 zł · 2 transakcje'
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
      'Kontakt syntetyczny · 35 000 zł · 2 transakcje',
      'Oferta syntetyczna · 90 000 zł · 1 transakcja',
      'Pusty etap · 0 zł · 0 transakcji',
    ]);
  });

  it('zachowuje filtry, pięć statystyk i archiwum', () => {
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
    expect(mobile.match(/href="\/deals\//g)).toHaveLength(2);
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
        /data-stage-color="[^"]+" class="[^"]*bg-\[#f1f3f6\]/
      );
      expect(html).toMatch(
        /<article[^>]*data-pipeline-deal="true"[^>]*class="[^"]*bg-white[^"]*text-slate-900/
      );
      expect(html).toContain('rounded-[10px]');
      expect(html).toContain('text-[#475569]');
      if (viewport === 'desktop') expect(html).toContain('data-stage-header');
    }
  );

  it('zachowuje linki i zielony przycisk telefonu w rzeczywistej karcie', () => {
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
      /data-pipeline-workspace="true" class="[^"]*bg-\[#f8f9fb\]/
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
      expect(columns).toHaveLength(viewport === 'desktop' ? stages.length : 1);
      expect(cards).toHaveLength(viewport === 'desktop' ? deals.length : 2);
      for (const column of columns) {
        expect(column).toContain('bg-[#f1f3f6]');
        expect(column).toContain('border-[#e3e7ec]');
        expect(column).not.toMatch(forbiddenSurface);
      }
      for (const card of cards) {
        expect(card).toContain('bg-white');
        expect(card).toContain('text-slate-900');
        expect(card).toContain('border-[#e3e7ec]');
        expect(card).toContain('rounded-[10px]');
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
    expect(header).toContain('bg-[#f1f3f6]');
    expect(header).toContain('background-color:#f59e0b');
    expect(header).not.toMatch(forbiddenSurface);
    const cards = desktop.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toContain('background-color:#f59e0b');
      expect(card).not.toContain('!');
    }
  });

  it('nakładka przeciągania korzysta z tej samej białej karty i koloru etapu', () => {
    harness.states = ['deal-0'];
    harness.cursor = 0;
    const html = renderToStaticMarkup(
      <PipelineBoard
        stages={[{ ...stages[0], name: 'Wymagana analiza' }]}
        deals={[deals[0]]}
        onDealMoved={vi.fn()}
        onAddDeal={vi.fn()}
        onEditDeal={vi.fn()}
      />
    );
    const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(3); // mobile, desktop and drag overlay
    for (const card of cards) {
      expect(card).toMatch(/<article[^>]*bg-white[^>]*text-slate-900/);
      expect(card).toContain('background-color:#0ea5e9');
    }
    expect(cards[2]).toContain('opacity-90');
  });
});
