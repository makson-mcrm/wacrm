import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compile } from 'tailwindcss';
import { parse } from 'postcss';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactDetailView } from './contact-detail-view';

const fixture = vi.hoisted(() => ({
  effects: [] as {
    effect: () => void | (() => void);
    deps?: readonly unknown[];
  }[],
  refs: [] as { current: unknown }[],
  backClick: undefined as undefined | (() => void),
  tab: 'overview',
  stateIndex: 0,
  moreTabsOpen: false,
  moreClick: undefined as undefined | (() => void),
  moreActionsOpen: false,
  moreActionsClick: undefined as undefined | (() => void),
  viewClicks: [] as (() => void)[],
  menuKeyDowns: {} as Record<string, React.KeyboardEventHandler>,
  footerClicks: [] as (() => void)[],
  expanded: true,
  emptyArrayIndex: 0,
  tags: [] as import('@/types').Tag[],
  assignedTagIds: null as string[] | null,
  notes: [] as import('@/types').ContactNote[],
  tasks: [] as {
    id: string;
    title: string;
    completed: boolean;
    activity_status: string | null;
    scheduled_at: string | null;
    next_action_date: string | null;
  }[],
  documents: [] as {
    id: string;
    deal_id: string;
    name: string;
    status: string;
    kind: 'document';
  }[],
  activities: [] as import('@/lib/sales/activity-history').ActivityHistoryRow[],
  dataLoading: false,
  dataError: false,
  contact: {
    id: 'contact-synthetic',
    account_id: 'account-synthetic',
    user_id: 'user-synthetic',
    name: 'Osoba syntetyczna',
    phone: '+48000000000',
    email: 'synthetic@example.test',
    source: 'formularz',
    source_details: 'utm_source=test',
  },
}));
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>();
  return {
    ...react,
    useEffect: (
      effect: () => void | (() => void),
      deps?: readonly unknown[]
    ) => {
      fixture.effects.push({ effect, deps });
    },
    useRef: (initial: unknown) => {
      const ref = react.useRef(initial);
      fixture.refs.push(ref);
      return ref;
    },
    useState: (initial: unknown) => {
      const stateIndex = fixture.stateIndex++;
      if (stateIndex === 2)
        return [
          fixture.tab,
          (value: string) => {
            fixture.tab = value;
          },
        ];
      if (stateIndex === 4)
        return [
          fixture.moreTabsOpen,
          (value: boolean | ((previous: boolean) => boolean)) => {
            fixture.moreTabsOpen =
              typeof value === 'function' ? value(fixture.moreTabsOpen) : value;
          },
        ];
      if (stateIndex === 5)
        return [
          fixture.moreActionsOpen,
          (value: boolean) => {
            fixture.moreActionsOpen = value;
          },
        ];
      // Seed the existing tag, tag-ID and note states without running database effects.
      if (Array.isArray(initial) && initial.length === 0) {
        const index = fixture.emptyArrayIndex++;
        if (index === 0) initial = fixture.tags;
        if (index === 1)
          initial = fixture.assignedTagIds ?? fixture.tags.map(({ id }) => id);
        if (index === 2) initial = fixture.notes;
      }
      return react.useState(
        initial === null
          ? fixture.contact
          : initial === 'overview'
            ? fixture.tab
            : initial === true
              ? fixture.expanded
              : initial
      );
    },
  };
});
vi.mock('./contact-detail-sections', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('./contact-detail-sections')>();
  return {
    ...actual,
    ContactCardFooter: (
      props: React.ComponentProps<typeof actual.ContactCardFooter>
    ) => {
      if ('onClick' in props) fixture.footerClicks.push(props.onClick);
      return <actual.ContactCardFooter {...props} />;
    },
    useContactOverviewData: () => ({
      owner: { data: null, loading: false, error: false },
      tasks: {
        data: fixture.tasks,
        loading: fixture.dataLoading,
        error: fixture.dataError,
      },
      documents: {
        data: fixture.documents,
        loading: fixture.dataLoading,
        error: fixture.dataError,
      },
      history: {
        data: { activities: fixture.activities, queueEvents: [] },
        loading: fixture.dataLoading,
        error: fixture.dataError,
      },
    }),
  };
});
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => {
      throw new Error('No database in render tests');
    }),
  }),
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ accountId: 'account-synthetic', defaultCurrency: 'PLN' }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, ...props }: React.ComponentProps<'nav'>) => (
    <nav role="tablist" {...props}>
      {children}
    </nav>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => (
    <button role="tab" data-value={value} data-slot="tabs-trigger">
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value,
    className,
  }: {
    children: ReactNode;
    value: string;
    className: string;
  }) =>
    value === fixture.tab ? (
      <section role="tabpanel" className={className}>
        {children}
      </section>
    ) : null,
}));
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AvatarFallback: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));
vi.mock('@/components/ui/button', async () => {
  const { cloneElement } = await import('react');
  return {
    Button: ({
      children,
      render,
      ...props
    }: React.ComponentProps<'button'> & {
      render?: React.ReactElement;
    }) => {
      if (props['aria-controls'] === 'contact-more-tabs')
        fixture.moreClick = props.onClick as () => void;
      if (props['aria-controls'] === 'contact-more-actions')
        fixture.moreActionsClick = props.onClick as () => void;
      if (props['aria-label'] === 'Wróć do listy')
        fixture.backClick = props.onClick as () => void;
      return render ? (
        cloneElement(render, {}, children)
      ) : (
        <button {...props}>{children}</button>
      );
    },
  };
});
// Keep the card's menu state, items and handlers observable in these Node SSR
// tests. The shared Base UI primitives own browser focus and arrow-key handling.
vi.mock('@/components/ui/dropdown-menu', async () => {
  const { cloneElement, createContext, useContext } = await import('react');
  const MenuContext = createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>({
    open: false,
    onOpenChange: vi.fn<(open: boolean) => void>(),
  });
  return {
    DropdownMenu: ({
      children,
      ...state
    }: {
      children: ReactNode;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }) => <MenuContext.Provider value={state}>{children}</MenuContext.Provider>,
    DropdownMenuTrigger: ({
      render,
      children,
      ...props
    }: {
      render: React.ReactElement<React.ComponentProps<'button'>>;
      children: ReactNode;
    }) => {
      const { open, onOpenChange } = useContext(MenuContext);
      return cloneElement(
        render,
        {
          ...props,
          onClick: () => onOpenChange(!open),
        },
        children
      );
    },
    DropdownMenuContent: ({
      children,
      id,
      onKeyDown,
      className,
      'aria-label': label,
    }: React.ComponentProps<'div'> & { align: string }) => {
      const { open } = useContext(MenuContext);
      if (!open) return null;
      fixture.menuKeyDowns[id!] = onKeyDown!;
      return (
        <div
          role="menu"
          id={id}
          aria-label={label}
          className={className}
          onKeyDown={onKeyDown}
        >
          {children}
        </div>
      );
    },
    DropdownMenuItem: ({
      render,
      children,
      onClick,
    }: {
      render?: React.ReactElement<React.ComponentProps<'a'>>;
      children: ReactNode;
      onClick?: () => void;
    }) => {
      if (onClick) fixture.viewClicks.push(onClick);
      return render ? (
        cloneElement(render, { role: 'menuitem' }, children)
      ) : (
        <button role="menuitem" onClick={onClick}>
          {children}
        </button>
      );
    },
  };
});
vi.mock('@/components/inbox/template-picker', () => ({
  TemplatePicker: () => null,
}));
vi.mock('@/components/tags/entity-tags-editor', () => ({
  EntityTagsEditor: () => <div>Edytor tagów</div>,
}));
vi.mock('@/components/sales/activity-history', () => ({
  ActivityHistory: ({
    contactId,
    compactNotes,
  }: {
    contactId: string;
    compactNotes?: boolean;
  }) => (
    <div data-history={contactId} data-compact-notes={compactNotes}>
      Historia aktywności
    </div>
  ),
}));
vi.mock('@/components/sales/call-action', () => ({
  CallAction: () => <button>ZADZWOŃ</button>,
}));
vi.mock('@/components/sales/whatsapp-action', () => ({
  WhatsAppAction: ({ label }: { label: string }) => <button>{label}</button>,
}));

const render = (
  props: Partial<React.ComponentProps<typeof ContactDetailView>> = {}
) => {
  fixture.emptyArrayIndex = 0;
  fixture.stateIndex = 0;
  fixture.footerClicks = [];
  fixture.viewClicks = [];
  fixture.menuKeyDowns = {};
  return renderToStaticMarkup(
    <ContactDetailView
      open
      contactId={fixture.contact.id}
      onOpenChange={vi.fn()}
      onUpdated={vi.fn()}
      {...props}
    />
  );
};
beforeEach(() => {
  fixture.effects = [];
  fixture.refs = [];
  fixture.backClick = undefined;
  fixture.tab = 'overview';
  fixture.moreTabsOpen = false;
  fixture.moreClick = undefined;
  fixture.moreActionsOpen = false;
  fixture.moreActionsClick = undefined;
  fixture.expanded = true;
  fixture.tags = [];
  fixture.assignedTagIds = null;
  fixture.notes = [];
  fixture.tasks = [];
  fixture.documents = [];
  fixture.activities = [];
  fixture.dataLoading = false;
  fixture.dataError = false;
});

afterEach(() => vi.unstubAllGlobals());

describe('K3/01-L: karta klienta 02A', () => {
  it('renderuje dokładnie 8 zakładek we właściwej kolejności', () => {
    const html = render();
    expect(
      [
        ...html.matchAll(
          /role="tab" data-value="[^"]+" data-slot="tabs-trigger">([^<]+)<span[^>]*>[^<]*<\/span><\/button>/g
        ),
      ].map((match) => match[1])
    ).toEqual([
      'Podsumowanie',
      'Aktywne Deale',
      'Aktywność',
      'Zadania',
      'Notatki',
      'Dokumenty',
      'Osoby',
      'Relacje',
    ]);
  });
  it('zachowuje sekcje podsumowania, ankietę, dyktowanie, terminy, nowy deal i edycję', () => {
    fixture.moreActionsOpen = true;
    const html = render();
    for (const text of [
      'Firma',
      'Współmałżonek/Partner',
      'Osoby powiązane',
      'Aktywne Deale',
      'Ostatnia aktywność',
      'Źródło',
      'Opiekun',
      'WIĘCEJ DANYCH KLIENTA',
      'Dane klienta',
      'Edytor tagów',
      'Pola dodatkowe',
    ])
      expect(html).toContain(text);
    for (const href of [
      '/ankieta?contact=contact-synthetic',
      '/quick-call?contact=contact-synthetic&amp;action=dictate',
      '/calendar?new=event&amp;contact=contact-synthetic',
      '/pipelines?new=deal&amp;contact=contact-synthetic',
      'mailto:synthetic@example.test',
    ])
      expect(html).toContain(`href="${href}"`);
    expect(html).toContain('id="contact-deeper-details"');
  });
  it('zakładka Aktywność używa istniejącej historii właściwego kontaktu', () => {
    fixture.tab = 'history';
    expect(render()).toContain('data-history="contact-synthetic"');
  });
  it('Notatki zachowują edytor, zapis i pusty stan', () => {
    fixture.tab = 'notes';
    const html = render();
    expect(html).toContain('textarea');
    expect(html).toContain('notesTab.save');
    expect(html).toContain('Brak danych');
  });
  it('Osoby pokazują pusty stan bez fikcyjnych rekordów', () => {
    fixture.tab = 'people';
    expect(render()).toMatch(/role="tabpanel"[^>]*>.*Brak danych/);
  });
  it('Relacje zachowują przypisywanie firmy i współmałżonka oraz opiekuna', () => {
    fixture.tab = 'relations';
    const html = render();
    for (const text of [
      'Przypisz firmę',
      'Wybierz współmałżonka',
      'Powiąż',
      'Opiekun',
    ])
      expect(html).toContain(text);
  });
  it('Dokumenty zachowują istniejącą akcję dodania dokumentu', () => {
    fixture.tab = 'documents';
    expect(render()).toContain(
      'href="/quick-call?contact=contact-synthetic&amp;action=document"'
    );
  });
});

describe('02A-2: zatwierdzony układ i wspólne dane', () => {
  it('umieszcza pięć kart między nagłówkiem a zakładkami, również bez powiązań', () => {
    const html = render();
    expect(
      [...html.matchAll(/data-contact-info-card="([^"]+)"/g)].map(
        (match) => match[1]
      )
    ).toEqual([
      'Firma',
      'Współmałżonek/Partner',
      'Źródło',
      'Segment',
      'Opiekun',
    ]);
    expect(html.indexOf('data-contact-info-cards')).toBeGreaterThan(
      html.indexOf('</header>')
    );
    expect(html.indexOf('data-contact-info-cards')).toBeLessThan(
      html.indexOf('role="tablist"')
    );
    expect(html).toContain('Miejscowość: Brak danych');
    expect(html).not.toContain('VIP: Brak danych');
    expect(html).not.toContain('Status: Brak danych');
  });
  it('wszystkie osiem liczników pokazuje zero przy pustych danych', () => {
    const html = render();
    const counts = [
      ...html.matchAll(/data-tab-count="([^"]+)"[^>]*>\(([^<]+)\)<\/span>/g),
    ];
    expect(counts).toHaveLength(8);
    expect(counts.map((match) => match[2])).toEqual(Array(8).fill('0'));
  });
  it('liczniki i listy korzystają z tych samych zadań, dokumentów i aktywności', () => {
    fixture.tasks = [
      {
        id: 'task-test',
        title: 'Zadanie syntetyczne',
        completed: false,
        activity_status: null,
        scheduled_at: '2026-11-02T10:00:00Z',
        next_action_date: null,
      },
    ];
    fixture.documents = [
      {
        id: 'doc-test',
        deal_id: 'deal-test',
        name: 'Dokument syntetyczny',
        status: 'brak',
        kind: 'document',
      },
    ];
    fixture.activities = [
      {
        id: 'activity-test',
        title: 'Rozmowa testowa',
        activity_type: 'telefon',
        description: null,
        activity_status: null,
        call_result: null,
        phone_number: null,
        next_action: 'Oddzwoń testowo',
        next_action_date: '2026-11-01T10:00:00Z',
        occurred_at: '2026-10-31T10:00:00Z',
      },
    ];
    const html = render();
    for (const tab of ['tasks', 'documents', 'history'])
      expect(html).toMatch(new RegExp(`data-tab-count="${tab}"[^>]*>\\(1\\)`));
    expect(html).toMatch(/data-tab-count="overview"[^>]*>\(3\)/);
    for (const text of [
      'Zadanie syntetyczne',
      'Dokument syntetyczny',
      'Oddzwoń testowo',
      'Priorytet: Brak danych',
      'Termin:',
    ])
      expect(html).toContain(text);
  });
  it('najbliższe zadania pomijają zakończone i zachowują licznik wszystkich zadań', () => {
    fixture.tasks = [
      {
        id: 'done',
        title: 'Już zakończone zadanie',
        completed: true,
        activity_status: null,
        scheduled_at: null,
        next_action_date: null,
      },
    ];
    const html = render();
    expect(html).not.toContain('Już zakończone zadanie');
    expect(html).toMatch(/data-tab-count="tasks"[^>]*>\(1\)/);
    fixture.tab = 'tasks';
    expect(render()).toContain('Już zakończone zadanie');
  });
  it('liczniki odróżniają ładowanie i błąd od pustego wyniku', () => {
    fixture.dataLoading = true;
    expect(render()).toMatch(/data-tab-count="tasks"[^>]*>\(…\)/);
    fixture.dataLoading = false;
    fixture.dataError = true;
    expect(render()).toMatch(/data-tab-count="tasks"[^>]*>\(—\)/);
    expect(render()).toContain('Nie udało się wczytać danych.');
  });
});

// Compile the classes actually rendered by the card with the installed Tailwind
// theme. Resolve these layout-only rules at the tested viewport widths; SSR by
// itself cannot apply CSS media queries. This is not a browser geometry test.
async function layoutStyles(html: string) {
  const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((match) =>
    match[1].split(/\s+/)
  );
  const require = createRequire(import.meta.url);
  const compiler = await compile(
    readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8') +
      '\n@tailwind utilities;'
  );
  const css = parse(compiler.build(classes));
  return (className: string, width: number) => {
    const result: Record<string, string> = {};
    css.walkRules((rule) => {
      if (
        !className
          .split(/\s+/)
          .some((name) => rule.selector.replace(/\\(.)/g, '$1') === `.${name}`)
      )
        return;
      let parent = rule.parent;
      while (parent) {
        if (parent.type === 'atrule' && parent.name === 'media') {
          const query = parent.params.match(/width (>=|<) ([\d.]+)rem/);
          if (!query)
            throw new Error(`Unsupported media query: ${parent.params}`);
          const breakpoint = Number(query[2]) * 16;
          if (query[1] === '>=' ? width < breakpoint : width >= breakpoint)
            return;
        }
        parent = parent.parent?.type === 'document' ? undefined : parent.parent;
      }
      rule.walkDecls((declaration) => {
        result[declaration.prop] = declaration.value;
      });
    });
    return result;
  };
}

const gridClasses = (html: string) =>
  html.match(/data-contact-columns="true" class="([^"]+)"/)![1];
const columnClasses = (html: string) =>
  [...html.matchAll(/data-contact-column="[^"]+"[^>]+class="([^"]+)"/g)].map(
    (match) => match[1]
  );

describe('K3/01-M: trzy obszary karty klienta', () => {
  it('renderuje trzy kolumny w stałej kolejności i umieszcza w nich właściwe sekcje', () => {
    const html = render();
    expect(
      [...html.matchAll(/data-contact-column="([^"]+)"/g)].map(
        (match) => match[1]
      )
    ).toEqual(['context', 'work', 'results']);
    const [context, work, results] = html
      .split(/data-contact-column="[^"]+"/)
      .slice(1);
    expect(context).toContain('Aktywne Deale');
    expect(context).toContain('Osoby powiązane');
    expect(context).not.toContain('Next action');
    expect(work).toContain('Next action');
    expect(work).toContain('Najbliższe zadania');
    expect(work).toContain('id="contact-overview-documents"');
    expect(work).toContain('Dodaj dokument');
    expect(work).not.toContain('Ostatnia aktywność');
    expect(results).toContain('Ostatnia aktywność');
    expect(results).toContain('id="contact-overview-notes"');
    expect(results).toContain('textarea');
    expect(results).toContain('notesTab.save');
    expect(results).toContain('id="contact-overview-relations"');
    expect(results).not.toContain('id="contact-overview-documents"');
    expect(html.indexOf('data-contact-full-details')).toBeGreaterThan(
      html.indexOf('data-contact-column="results"')
    );
    expect(html).toContain('Dane klienta');
    // Reused sections have only one mounted instance in the active panel.
    expect(html.match(/placeholder="notesTab.placeholder"/g)).toHaveLength(1);
    expect(html.match(/data-contact-info-card="Opiekun"/g)).toHaveLength(1);
  });

  it.each([1280, 1440, 1920])(
    'desktop %i px: wspólna geometria trzech kolumn i niezależny scroll',
    async (width) => {
      const html = render();
      const styles = await layoutStyles(html);
      expect(styles(gridClasses(html), width)).toMatchObject({
        overflow: 'hidden',
        flex: '1',
        'flex-shrink': '1',
        'padding-inline': 'var(--content-pad-x)',
        'padding-block': 'var(--content-pad-y)',
      });
      expect(styles(gridClasses(html), width)['max-height']).toBeUndefined();
      expect(
        styles(gridClasses(html), width)['grid-template-columns']
      ).toBeUndefined();
      expect(html).toMatch(
        /data-contact-columns="true"[^>]*style="grid-template-columns:var\(--columns-three\);gap:var\(--card-gap\)"/
      );
      expect(columnClasses(html)).toHaveLength(3);
      for (const className of columnClasses(html)) {
        expect(styles(className, width)).toMatchObject({
          'min-height': '0px',
          'min-width': '0px',
          'overflow-y': 'auto',
        });
      }
      expect(html).toContain('data-contact-detail-view');
    }
  );

  it.each([375, 768, 1024, 1279])(
    'wąski viewport %i px: jeden stos i trzy dostępne przełączniki obszarów',
    async (width) => {
      const html = render();
      const styles = await layoutStyles(html);
      expect(styles(gridClasses(html), width)).toMatchObject({
        'grid-template-columns': 'repeat(1, minmax(0, 1fr))',
        'overflow-y': 'auto',
      });
      for (const className of columnClasses(html)) {
        expect(styles(className, width)['overflow-y']).toBeUndefined();
      }
      const toggles = [
        ...html.matchAll(
          /<button[^>]+aria-expanded="true" aria-controls="([^"]+)"[^>]+class="([^"]+)"/g
        ),
      ];
      expect(toggles).toHaveLength(3);
      for (const [, id, className] of toggles) {
        expect(styles(className, width).display).toBe('flex');
        expect(html).toContain(`id="${id}"`);
        expect(styles(className, 1280).display).toBe('none');
      }
      expect(html.match(/role="tab" /g)).toHaveLength(8);
      expect(html).toContain('Źródło');
      expect(html).toContain('Opiekun');
      expect(html).toContain('mailto:synthetic@example.test');
    }
  );

  it('zwinięcie na mobile nie ukrywa treści po przejściu na desktop', async () => {
    fixture.expanded = false;
    const html = render();
    const styles = await layoutStyles(html);
    const contents = [...html.matchAll(/id="[^"]+-content" class="([^"]+)"/g)];
    expect(contents).toHaveLength(3);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(5);
    for (const [, className] of contents) {
      expect(styles(className, 375).display).toBe('none');
      expect(styles(className, 1279).display).toBe('none');
      expect(styles(className, 1280).display).toBe('block');
    }
  });
});

describe('02A-4: pełny widok klienta w obszarze aplikacji', () => {
  it('renderuje zwykłą sekcję bez dialogu, portalu i komponentów Sheet', async () => {
    const html = render();
    expect(html).toContain(
      '<section aria-label="Karta klienta" data-contact-detail-view'
    );
    expect(html).not.toMatch(
      /role="dialog"|aria-modal=|data-sheet|data-slot="sheet/
    );
    const source = readFileSync(
      'src/components/contacts/contact-detail-view.tsx',
      'utf8'
    );
    expect(source).not.toMatch(
      /\bSheet(?:Content|Header|Title|Description)?\b/
    );
    const classes = html.match(
      /data-contact-detail-view="true" class="([^"]+)"/
    )![1];
    expect(classes.split(' ')).toContain('w-full');
    expect(html).not.toContain('max-w-xl');
    const styles = await layoutStyles(html);
    expect(styles(classes, 1440)).toMatchObject({
      width: '100%',
      height: 'calc(100dvh - var(--app-header-height))',
      'min-height': '0px',
      overflow: 'hidden',
    });
    expect(classes).not.toMatch(/rounded|shadow|fixed|absolute/);
    expect(html).toMatch(/role="tabpanel" class="[^"]*overflow-y-auto/);
    expect(source).not.toContain('max-h-[60vh]');
  });

  it('przycisk Wróć do listy ma dostępną nazwę, strzałkę i zamyka widok', () => {
    const onOpenChange = vi.fn();
    const html = render({ onOpenChange });
    expect(html).toMatch(/<button[^>]*aria-label="Wróć do listy"/);
    expect(html).toContain('lucide-arrow-left');
    expect(fixture.backClick).toBeTypeOf('function');
    fixture.backClick!();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('zamknięty widok nie renderuje zawartości ani nie rejestruje klawiatury', () => {
    const onOpenChange = vi.fn();
    expect(render({ open: false, onOpenChange })).toBe('');
    const addEventListener = vi.fn();
    vi.stubGlobal('document', { addEventListener });
    fixture.effects.find(({ deps }) => deps?.includes(onOpenChange))!.effect();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('fokusuje nagłówek przy otwarciu, zamyka Escape i usuwa nasłuch po zamknięciu', () => {
    const onOpenChange = vi.fn();
    const html = render({ onOpenChange });
    expect(html).toMatch(
      /<header tabindex="-1" aria-label="Nagłówek karty klienta"/
    );
    const focus = vi.fn();
    fixture.refs[0].current = { focus };
    const document = new EventTarget();
    vi.stubGlobal('document', document);
    fixture.effects
      .find(
        ({ deps }) => deps?.[0] === true && deps?.[1] === fixture.contact.id
      )!
      .effect();
    const cleanup = fixture.effects
      .find(({ deps }) => deps?.includes(onOpenChange))!
      .effect();
    expect(focus).toHaveBeenCalledOnce();
    const keydown = (key: string, consumed = false) => {
      const event = new Event('keydown', { cancelable: true });
      Object.defineProperty(event, 'key', { value: key });
      if (consumed) event.preventDefault();
      document.dispatchEvent(event);
      return event;
    };
    keydown('Enter');
    keydown('Escape', true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(keydown('Escape').defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    if (cleanup) cleanup();
    keydown('Escape');
    expect(onOpenChange).toHaveBeenCalledOnce();
  });

  it('umożliwia powrót i fokus nagłówka również przed wczytaniem kontaktu', () => {
    const onOpenChange = vi.fn();
    const html = render({ contactId: 'pending-synthetic', onOpenChange });
    expect(html).toContain('aria-label="Ładowanie karty klienta"');
    expect(html).toContain('aria-label="Wróć do listy"');
    expect(html).not.toContain('Osoba syntetyczna');
    expect(fixture.refs[0]).toBeDefined();
    fixture.backClick!();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });
});

describe('K3-02A-6: zatwierdzone poprawki karty', () => {
  it('nagłówek zawiera breadcrumbs z linkiem do klientów i bieżącą nazwą bez linku', () => {
    const html = render();
    const nav = html.match(
      /<nav aria-label="Ścieżka nawigacji"[^>]*>(.*?)<\/nav>/
    )![1];
    expect(nav).toMatch(/<a href="\/contacts"[^>]*>Klienci<\/a>/);
    expect(nav).toContain(
      `<span aria-current="page">${fixture.contact.name}</span>`
    );
    expect(nav.match(/<a /g)).toHaveLength(1);
    expect(html.indexOf('Ścieżka nawigacji')).toBeLessThan(html.indexOf('<h1'));
    expect(html).not.toContain('Status: Brak danych');
    expect(html).not.toContain('VIP: Brak danych');
  });

  it('istniejący VIP jest chipem w nagłówku', () => {
    fixture.tags = [
      { id: 'vip-synthetic', name: 'VIP' },
    ] as import('@/types').Tag[];
    const header = render().split('</header>')[0];
    expect(header).toMatch(/data-contact-status="true".*lucide-star.*VIP/);
    expect(header).not.toContain('VIP: Brak danych');
    expect(header).not.toContain('Status: Brak danych');
  });

  it('kolumny zachowują etykiety i mobilne przyciski bez nagłówków h2', () => {
    const html = render();
    for (const label of [
      'Deale i osoby',
      'Działania i dokumenty',
      'Aktywność i relacje',
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).not.toMatch(new RegExp(`<h2[^>]*>.*${label}.*?</h2>`));
      expect(html).toMatch(
        new RegExp(`<button[^>]*aria-expanded="true"[^>]*>${label}<span`)
      );
    }
  });

  it.each(['overview', 'notes'])(
    'Notatki zachowują pełną ankietę w zakładce %s',
    (tab) => {
      const text = 'Ankieta syntetyczna\nOdpowiedź: pełna treść bez zmian';
      fixture.notes = [
        {
          id: 'note-synthetic',
          note_text: text,
          created_at: '2026-10-31T10:00:00Z',
        },
      ] as import('@/types').ContactNote[];
      fixture.tab = tab;
      const html = render();
      const notes =
        tab === 'overview'
          ? html.split('id="contact-overview-notes"')[1].split('</section>')[0]
          : html;
      expect(notes).toContain(text);
      expect(notes).toContain('whitespace-pre-wrap');
    }
  );

  it.each(['overview', 'history'])(
    'tylko karta kontaktu włącza kompaktowe notatki (%s)',
    (tab) => {
      fixture.tab = tab;
      expect(render()).toContain(
        'data-history="contact-synthetic" data-compact-notes="true"'
      );
    }
  );

  it.each([1280, 1440, 1920])(
    'pięć kart mieści się w jednym rzędzie przy %i px bez przewijania poziomego',
    async (width) => {
      const html = render();
      const classes = html.match(
        /data-contact-info-cards="true" class="([^"]+)"/
      )![1];
      const styles = await layoutStyles(html);
      expect(styles(classes, width)['grid-template-columns']).toBe(
        'repeat(5,minmax(0,1fr))'
      );
      expect(styles(classes, width)['overflow-x']).toBeUndefined();
      expect(styles(classes, 375)['grid-template-columns']).toBe(
        'repeat(5,minmax(160px,1fr))'
      );
      expect(styles(classes, 375)['overflow-x']).toBe('auto');
    }
  );
});

describe('K3-02A-8: stopki, Więcej, liczniki i akcje', () => {
  it('ma dokładnie siedem stopek we właściwych kartach i dwa filtrowane adresy', () => {
    const html = render();
    expect(html.match(/Zobacz wszystkie →/g)).toHaveLength(7);
    const sections = [
      'mobile-contact-deals',
      'contact-overview-people',
      'contact-overview-tasks',
      'contact-overview-documents',
      'mobile-contact-activities',
      'contact-overview-notes',
      'contact-overview-relations',
    ];
    for (const id of sections) {
      const card = html
        .split(`aria-labelledby="${id}"`)[1]
        .split('</section>')[0];
      expect(card).toContain('Zobacz wszystkie →');
      expect(card).toContain('min-h-11');
      expect(card).toContain(
        'text-xs font-semibold text-emerald-800 hover:underline'
      );
    }
    expect(html).toContain('href="/deals?contact=contact-synthetic"');
    expect(html).toContain('href="/tasks?contact=contact-synthetic"');
  });

  it.each(['people', 'documents', 'history', 'notes', 'relations'])(
    'stopka otwiera zakładkę %s',
    (tab) => {
      render();
      const index = [
        'people',
        'documents',
        'history',
        'notes',
        'relations',
      ].indexOf(tab);
      fixture.footerClicks[index]();
      expect(fixture.tab).toBe(tab);
      expect(render()).toContain('role="tabpanel"');
      expect(fixture.moreTabsOpen).toBe(false);
    }
  );

  const views = [
    ['overview', 'Podsumowanie'],
    ['deals', 'Aktywne Deale'],
    ['history', 'Aktywność'],
    ['tasks', 'Zadania'],
    ['notes', 'Notatki'],
    ['documents', 'Dokumenty'],
    ['people', 'Osoby'],
    ['relations', 'Relacje'],
  ];

  it('pasek ma osiem widocznych TabsTrigger, a Więcej tylko skróty do wszystkich widoków', async () => {
    const assertBar = (html: string) => {
      const bar = html.match(/<nav role="tablist"[^>]*>(.*?)<\/nav>/)![1];
      const triggers = [
        ...bar.matchAll(
          /<button role="tab" data-value="([^"]+)" data-slot="tabs-trigger">([^<]+)<span/g
        ),
      ];
      expect(triggers.map(([, value, label]) => [value, label])).toEqual(views);
      expect(bar.match(/data-slot="tabs-trigger"/g)).toHaveLength(8);
      expect(html.match(/data-slot="tabs-trigger"/g)).toHaveLength(8);
      expect(bar).not.toMatch(/hidden|contact-more-tabs/);
      expect(bar).not.toContain('role="menu"');
    };
    let html = render();
    assertBar(html);
    expect(html).toContain(
      'aria-expanded="false" aria-controls="contact-more-tabs"'
    );
    expect(html).not.toContain('id="contact-more-tabs"');
    expect(html).toContain('Więcej ⌄');
    const classes = html.match(/<nav role="tablist"[^>]*class="([^"]+)"/)![1];
    const styles = await layoutStyles(html);
    expect(styles(classes, 1440)).toMatchObject({
      'overflow-x': 'auto',
      'flex-wrap': 'nowrap',
    });
    fixture.moreClick!();
    html = render();
    assertBar(html);
    expect(html).toContain(
      'aria-expanded="true" aria-controls="contact-more-tabs"'
    );
    const menu = html.match(
      /<div role="menu" id="contact-more-tabs"[^>]*>(.*?)<\/div>/
    )![1];
    expect(html).toContain('aria-label="Wszystkie widoki"');
    expect(
      [...menu.matchAll(/role="menuitem">([^<]+)<\/button>/g)].map(
        ([, label]) => label
      )
    ).toEqual(views.map(([, label]) => label));
    expect(menu).not.toContain('data-slot="tabs-trigger"');
    fixture.moreClick!();
    html = render();
    assertBar(html);
    expect(html).not.toContain('id="contact-more-tabs"');
  });

  it.each(views)('skrót %s wybiera widok i zamyka menu', (value) => {
    fixture.moreTabsOpen = true;
    render();
    fixture.viewClicks[views.findIndex(([tab]) => tab === value)]();
    expect(fixture.tab).toBe(value);
    expect(fixture.moreTabsOpen).toBe(false);
    const html = render();
    expect(html).toContain('role="tabpanel"');
    expect(html).not.toContain('id="contact-more-tabs"');
  });

  it.each(['contact-more-actions', 'contact-more-tabs'])(
    'Escape zamyka %s i nie przekazuje zdarzenia do zamknięcia karty',
    (id) => {
      fixture.moreTabsOpen = id === 'contact-more-tabs';
      fixture.moreActionsOpen = id === 'contact-more-actions';
      render();
      const handler = fixture.menuKeyDowns[id];
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const key = (value: string) =>
        handler({
          key: value,
          preventDefault,
          stopPropagation,
        } as unknown as React.KeyboardEvent);
      key('ArrowDown');
      expect(fixture.moreTabsOpen || fixture.moreActionsOpen).toBe(true);
      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopPropagation).not.toHaveBeenCalled();
      key('Escape');
      expect(fixture.moreTabsOpen).toBe(false);
      expect(fixture.moreActionsOpen).toBe(false);
      expect(preventDefault).toHaveBeenCalledOnce();
      expect(stopPropagation).toHaveBeenCalledOnce();
      expect(render()).not.toContain(`id="${id}"`);
    }
  );

  it.each([
    ['deals', 'mobile-contact-deals'],
    ['people', 'contact-overview-people'],
    ['tasks', 'contact-overview-tasks'],
    ['documents', 'contact-overview-documents'],
    ['notes', 'contact-overview-notes'],
    ['relations', 'contact-overview-relations'],
  ])(
    'licznik karty %s jest zgodny z zakładką także przy ładowaniu i błędzie',
    (tab, id) => {
      fixture.tasks = [
        {
          id: 'task',
          title: 'Test',
          completed: true,
          activity_status: null,
          scheduled_at: null,
          next_action_date: null,
        },
      ];
      for (const state of ['ready', 'loading', 'error']) {
        fixture.dataLoading = state === 'loading';
        fixture.dataError = state === 'error';
        const html = render();
        const count = html.match(
          new RegExp(`data-tab-count="${tab}"[^>]*>\\(([^<]+)\\)`)
        )![1];
        expect(html.split(`id="${id}"`)[1].split('</h3>')[0]).toContain(
          `(${count})`
        );
        if (tab === 'tasks' || tab === 'documents') {
          expect(count).toBe(
            state === 'loading'
              ? '…'
              : state === 'error'
                ? '—'
                : tab === 'tasks'
                  ? '1'
                  : '0'
          );
        }
      }
    }
  );

  it('nagłówek pokazuje tylko przypisane tagi, bez pustych statusów', () => {
    expect(render()).not.toContain('data-contact-status');
    expect(render()).not.toContain('Status: Brak danych');
    fixture.tags = [
      { id: 'tag', name: 'Tag syntetyczny', color: '#006644' },
    ] as import('@/types').Tag[];
    const header = render().split('</header>')[0];
    expect(header).toContain('data-contact-status');
    expect(header).toContain('Tag syntetyczny</span>');
  });

  it('nagłówek filtruje katalog tagów po przypisaniach contact_tags', () => {
    fixture.tags = [
      { id: 'type-synthetic', name: 'Klient indywidualny' },
      { id: 'vip-synthetic', name: 'VIP' },
      { id: 'unassigned-synthetic', name: 'Nieprzypisany tag' },
    ] as import('@/types').Tag[];
    fixture.assignedTagIds = ['type-synthetic', 'vip-synthetic'];
    const header = render().split('</header>')[0];
    expect(header).toContain('Klient indywidualny</span>');
    expect(header).toContain('lucide-star');
    expect(header).toContain('VIP</span>');
    expect(header).not.toContain('Nieprzypisany tag');
    fixture.assignedTagIds = [];
    expect(render().split('</header>')[0]).not.toContain('data-contact-status');
  });

  it('pokazuje cztery główne akcje i udostępnia trzy dotychczasowe trasy pod WIĘCEJ', () => {
    const primary = ['ZADZWOŃ', 'WhatsApp', 'E-mail', 'WIĘCEJ'];
    let header = render().split('</header>')[0];
    for (const label of primary) expect(header).toContain(label);
    for (const label of ['+ NOWY DEAL', 'DYKTUJ', 'DODAJ TERMIN'])
      expect(header).not.toContain(label);
    expect(header).toContain(
      'aria-haspopup="menu" aria-expanded="false" aria-controls="contact-more-actions"'
    );
    fixture.moreActionsClick!();
    expect(fixture.moreActionsOpen).toBe(true);
    header = render().split('</header>')[0];
    expect(header).toContain(
      'aria-haspopup="menu" aria-expanded="true" aria-controls="contact-more-actions"'
    );
    const menu = header.match(
      /<div role="menu" id="contact-more-actions"[^>]*>(.*?)<\/div>/
    )![1];
    const links = [
      ...menu.matchAll(/<a href="([^"]+)" role="menuitem">(.*?)<\/a>/g),
    ];
    expect(links.map(([, href]) => href)).toEqual([
      '/pipelines?new=deal&amp;contact=contact-synthetic',
      '/quick-call?contact=contact-synthetic&amp;action=dictate',
      '/calendar?new=event&amp;contact=contact-synthetic',
    ]);
    for (const [index, label] of [
      '+ NOWY DEAL',
      'DYKTUJ',
      'DODAJ TERMIN',
    ].entries())
      expect(links[index][2]).toContain(label);
    for (const label of primary) expect(header).toContain(label);
    fixture.moreActionsClick!();
    expect(render().split('</header>')[0]).not.toContain(
      'id="contact-more-actions"'
    );
  });
});
