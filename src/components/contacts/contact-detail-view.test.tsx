import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compile } from 'tailwindcss';
import { parse } from 'postcss';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactDetailView } from './contact-detail-view';

const fixture = vi.hoisted(() => ({
  tab: 'overview',
  expanded: true,
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
    useState: (initial: unknown) =>
      react.useState(
        initial === null
          ? fixture.contact
          : initial === 'overview'
            ? fixture.tab
            : initial === true
              ? fixture.expanded
              : initial
      ),
  };
});
vi.mock('./contact-detail-sections', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('./contact-detail-sections')>();
  return {
    ...actual,
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
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: ReactNode }) => children,
  SheetContent: ({
    children,
    className,
  }: {
    children: ReactNode;
    className: string;
  }) => (
    <div data-sheet className={className}>
      {children}
    </div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  SheetTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  SheetDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => (
    <nav role="tablist">{children}</nav>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => (
    <button role="tab" data-value={value}>
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
      disabled,
    }: {
      children: ReactNode;
      render?: React.ReactElement;
      disabled?: boolean;
    }) =>
      render ? (
        cloneElement(render, {}, children)
      ) : (
        <button disabled={disabled}>{children}</button>
      ),
  };
});
vi.mock('@/components/inbox/template-picker', () => ({
  TemplatePicker: () => null,
}));
vi.mock('@/components/tags/entity-tags-editor', () => ({
  EntityTagsEditor: () => <div>Edytor tagów</div>,
}));
vi.mock('@/components/sales/activity-history', () => ({
  ActivityHistory: ({ contactId }: { contactId: string }) => (
    <div data-history={contactId}>Historia aktywności</div>
  ),
}));
vi.mock('@/components/sales/call-action', () => ({
  CallAction: () => <button>ZADZWOŃ</button>,
}));
vi.mock('@/components/sales/whatsapp-action', () => ({
  WhatsAppAction: () => <button>WIADOMOŚĆ</button>,
}));

const render = () =>
  renderToStaticMarkup(
    <ContactDetailView
      open
      contactId={fixture.contact.id}
      onOpenChange={vi.fn()}
      onUpdated={vi.fn()}
    />
  );
beforeEach(() => {
  fixture.tab = 'overview';
  fixture.expanded = true;
  fixture.tasks = [];
  fixture.documents = [];
  fixture.activities = [];
  fixture.dataLoading = false;
  fixture.dataError = false;
});

describe('K3/01-L: karta klienta 02A', () => {
  it('renderuje dokładnie 8 zakładek we właściwej kolejności', () => {
    const html = render();
    expect(
      [
        ...html.matchAll(
          /role="tab" data-value="[^"]+">([^<]+)<span[^>]*>[^<]*<\/span><\/button>/g
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
    expect(html).toContain('VIP: Brak danych');
    expect(html).toContain('Status: Brak danych');
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
          const minWidth = parent.params.match(/width >= ([\d.]+)rem/);
          if (!minWidth)
            throw new Error(`Unsupported media query: ${parent.params}`);
          if (width < Number(minWidth[1]) * 16) return;
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
    expect(html.match(/<dt[^>]*>Opiekun/g)).toHaveLength(1);
  });

  it.each([1280, 1440, 1920])(
    'desktop %i px: proporcje 1:1.2:1 i niezależny scroll kolumn',
    async (width) => {
      const html = render();
      const styles = await layoutStyles(html);
      expect(styles(gridClasses(html), width)).toMatchObject({
        'grid-template-columns': 'minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr)',
        overflow: 'hidden',
      });
      expect(columnClasses(html)).toHaveLength(3);
      for (const className of columnClasses(html)) {
        expect(styles(className, width)).toMatchObject({
          'min-height': '0px',
          'min-width': '0px',
          'overflow-y': 'auto',
        });
      }
      expect(html).toContain('xl:data-[side=right]:w-[calc(100vw-2rem)]');
      expect(html).toContain('xl:data-[side=right]:max-w-[1440px]');
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
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3);
    for (const [, className] of contents) {
      expect(styles(className, 375).display).toBe('none');
      expect(styles(className, 1279).display).toBe('none');
      expect(styles(className, 1280).display).toBe('block');
    }
  });
});
