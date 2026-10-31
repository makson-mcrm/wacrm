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
});

describe('K3/01-L: karta klienta 02A', () => {
  it('renderuje dokładnie 8 zakładek we właściwej kolejności', () => {
    const html = render();
    expect(
      [
        ...html.matchAll(/role="tab" data-value="[^"]+">([^<]+)<\/button>/g),
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
      'Powiązania',
      'Firma (',
      'Współmałżonek (',
      'Osoby (',
      'Aktywne Deale',
      'Ostatnie aktywności',
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
    for (const text of [
      'Źródło',
      'Opiekun',
      'Powiązania',
      'Dane klienta',
      'Firma (',
      'Współmałżonek (',
      'Osoby (',
    ]) {
      expect(context).toContain(text);
      expect(work).not.toContain(text);
      expect(results).not.toContain(text);
    }
    expect(work).toContain('Aktywne Deale');
    expect(work).toContain('id="contact-overview-tasks"');
    expect(results).toContain('Ostatnie aktywności');
    expect(results).toContain('id="contact-overview-notes"');
    expect(results).toContain('textarea');
    expect(results).toContain('notesTab.save');
    expect(results).toContain('id="contact-overview-documents"');
    expect(results).toContain('Dodaj dokument');
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
