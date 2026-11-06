import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pipelineSurfaceExtensions, surfaceFlags } from './surface-flags';
import ContactsPage from '@/app/(dashboard)/contacts/page';
import CompaniesPage from '@/app/(dashboard)/companies/page';
import DealsPage from '@/app/(dashboard)/deals/page';
import { AppShell } from '@/components/layout/app-shell';
import {
  geometryCssVars, LIST_SIDEBAR_WIDTH, LIST_BANNER_HEIGHT, LIST_HEADER_HEIGHT,
  LIST_TOOLBAR_HEIGHT, LIST_TABLE_TOP, LIST_ROW_HEIGHT, LIST_HEADER_BACKGROUND,
  LIST_CONTENT_BACKGROUND, LIST_ROW_BACKGROUND, LIST_BORDER_COLOR, LIST_TEXT_COLOR,
  LIST_FONT_SIZE, LIST_TABLE_HEADER_FONT_SIZE,
} from './layout-geometry';

const harness = vi.hoisted(() => ({
  cursor: 0,
  states: new Map<number, unknown>(),
  extensions: undefined as boolean | undefined,
  pathname: '/contacts',
}));

vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  return {
    ...original,
    useState: (initial: unknown) => {
      const index = harness.cursor++;
      return original.useState(harness.states.has(index) ? harness.states.get(index) : initial);
    },
  };
});
vi.mock('./surface-flags', async (importOriginal) => {
  const original = await importOriginal<typeof import('./surface-flags')>();
  return {
    ...original,
    surfaceFlags: {
      ...original.surfaceFlags,
      get contactsExtensions() { return harness.extensions ?? original.surfaceFlags.contactsExtensions; },
      get companiesExtensions() { return harness.extensions ?? original.surfaceFlags.companiesExtensions; },
      get dealsListExtensions() { return harness.extensions ?? original.surfaceFlags.dealsListExtensions; },
    },
  };
});
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => { throw new Error('Database forbidden in surface tests'); } }),
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ accountId: 'account-synthetic', user: { id: 'owner-synthetic' }, loading: false, accountStatus: 'ready', profile: { full_name: 'Właściciel syntetyczny' } }),
}));
vi.mock('@/hooks/use-can', () => ({ useCan: () => true }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({
  usePathname: () => harness.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/hooks/use-total-unread', () => ({ useTotalUnread: () => 0 }));
vi.mock('@/hooks/use-unread-notifications', () => ({ useUnreadNotifications: () => 0 }));
vi.mock('@/hooks/use-unhandled-submissions', () => ({ useUnhandledSubmissions: () => 0 }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({ mode: 'light', toggleMode: vi.fn() }) }));
vi.mock('@/components/contacts/contact-form', () => ({ ContactForm: () => null }));
vi.mock('@/components/contacts/import-modal', () => ({ ImportModal: () => null }));
vi.mock('@/components/contacts/custom-fields-manager', () => ({ CustomFieldsManager: () => createElement('div', null, 'CUSTOM_FIELDS_EXTENSION') }));

const contact = {
  id: 'contact-synthetic', user_id: 'owner-synthetic', name: 'Kontakt syntetyczny',
  phone: '+48000000000', email: 'kontakt@example.invalid',
  companies: [{ id: 'company-synthetic', name: 'Firma syntetyczna' }],
  tags: [{ id: 'tag-synthetic', name: 'TAG_EXTENSION', color: '#006644' }],
};
const company = {
  id: 'company-synthetic', user_id: 'owner-synthetic', name: 'Firma syntetyczna',
  phone: '+48000000000', email: 'firma@example.invalid', nip: 'NIP_EXTENSION',
  primaryContact: { id: 'contact-synthetic', name: 'PRIMARY_CONTACT_EXTENSION' },
  activeDealCount: 2, nextAction: 'NEXT_ACTION_EXTENSION',
};

function render(Page: ComponentType, states: [number, unknown][]) {
  harness.cursor = 0;
  harness.states = new Map(states);
  return renderToStaticMarkup(createElement(Page));
}
function headings(html: string) {
  return [...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)]
    .map((match) => match[1].replace(/<[^>]*>/g, ''));
}

beforeEach(() => {
  harness.cursor = 0;
  harness.states.clear();
  harness.extensions = undefined;
  harness.pathname = '/contacts';
});

describe('KM3.2.09-A — flagi i rzeczywista powierzchnia list', () => {
  it.each(['contactsExtensions', 'companiesExtensions', 'dealsListExtensions'] as const)(
    '%s jest domyślnie false', (flag) => expect(surfaceFlags[flag]).toBe(false)
  );

  it('zachowuje flagę Lejka i inwentarz rozszerzeń list', () => {
    expect(surfaceFlags.pipelineExtensions).toBe(false);
    for (const label of ['Kontakty:', 'Firmy:', 'Lista transakcji:']) {
      expect(pipelineSurfaceExtensions.some((entry) => entry.startsWith(label))).toBe(true);
    }
  });

  it('pokazuje siedem kolumn kontaktów Bigin i ukrywa dodatki nawet przy zaznaczeniu', () => {
    const html = render(ContactsPage, [[0, [contact]], [2, false], [6, 1], [22, new Set([contact.id])]]);
    expect(headings(html)).toEqual(['', 'Nazwa kontaktu', 'Firma', 'Adres Email', 'Telefon', 'Kontakt właściciel', 'Utwórz pole']);
    for (const text of ['Wszystkie kontakty', 'Przełącznik widoku kontaktów', 'Kontakt syntetyczny', 'kontakt@example.invalid', 'Właściciel syntetyczny']) expect(html).toContain(text);
    for (const text of ['TAG_EXTENSION', 'CUSTOM_FIELDS_EXTENSION', 'Eksportuj', 'Nowy kontakt / nieznany numer', 'Współmałżonek', 'Kluczowi', 'deleteSelected']) expect(html).not.toContain(text);
    expect(html).toContain('href="/companies?open=company-synthetic"');
    expect(html).not.toContain('hidden lg:block');
  });

  it('kontakty zachowują poprawny colspan podczas ładowania i przy pustej liście', () => {
    expect(render(ContactsPage, [])).toContain('colSpan="7"');
    expect(render(ContactsPage, [[2, false]])).toContain('colSpan="7"');
  });

  it('przywraca dodatki kontaktów po świadomym włączeniu flagi', () => {
    harness.extensions = true;
    const html = render(ContactsPage, [[0, [contact]], [2, false]]);
    for (const text of ['TAG_EXTENSION', 'CUSTOM_FIELDS_EXTENSION', 'Eksportuj', 'Nowy kontakt / nieznany numer', 'Kluczowi']) expect(html).toContain(text);
  });

  it('pokazuje tylko pięć kolumn firm, bez NIP i powiązań na liście', () => {
    const html = render(CompaniesPage, [[0, [company]], [1, false]]);
    expect(headings(html)).toEqual(['', 'Nazwa firmy', 'Telefon', 'E-mail', 'Właściciel']);
    for (const text of ['Firma syntetyczna', 'firma@example.invalid', 'Właściciel syntetyczny', 'Zaznacz firmę']) expect(html).toContain(text);
    for (const text of ['NIP_EXTENSION', 'PRIMARY_CONTACT_EXTENSION', 'NEXT_ACTION_EXTENSION', 'Aktywne Deale', 'Kartoteka firm powiązana']) expect(html).not.toContain(text);
  });

  it('przywraca dotychczasowe kolumny firm po włączeniu flagi', () => {
    harness.extensions = true;
    const html = render(CompaniesPage, [[0, [company]], [1, false]]);
    for (const text of ['NIP_EXTENSION', 'PRIMARY_CONTACT_EXTENSION', 'NEXT_ACTION_EXTENSION', 'Aktywne Deale']) expect(html).toContain(text);
  });

  it('zachowuje pięć kolumn firm również podczas ładowania i przy pustej liście', () => {
    for (const html of [render(CompaniesPage, []), render(CompaniesPage, [[1, false]])]) {
      expect(headings(html)).toEqual(['', 'Nazwa firmy', 'Telefon', 'E-mail', 'Właściciel']);
      expect(html).toContain('colSpan="5"');
    }
  });

  it('nie przypisuje bieżącemu użytkownikowi cudzego kontaktu ani firmy', () => {
    expect(render(ContactsPage, [[0, [{ ...contact, user_id: 'other-synthetic' }]], [2, false]])).not.toContain('Właściciel syntetyczny');
    expect(render(CompaniesPage, [[0, [{ ...company, user_id: 'other-synthetic' }]], [1, false]])).not.toContain('Właściciel syntetyczny');
  });

  it('zachowuje wyszukiwarkę i tabelę transakcji, a nagłówek ukrywa pod flagą', () => {
    const html = render(DealsPage, [[2, false]]);
    expect(html).toContain('Szukaj po sprawie lub kliencie');
    expect(headings(html)).toEqual(['Sprawa', 'Klient', 'Etap', 'Wartość', 'Następny krok', 'Termin', 'Ostatnia aktywność']);
    expect(html).not.toContain('Pojedyncze sprawy klientów.');
    harness.extensions = true;
    expect(render(DealsPage, [[2, false]])).toContain('Pojedyncze sprawy klientów.');
  });

  it('KM3.2.09-A2 — eksportuje zmierzone tokeny i początek tabeli y=138', () => {
    expect([LIST_SIDEBAR_WIDTH, LIST_BANNER_HEIGHT, LIST_HEADER_HEIGHT, LIST_TOOLBAR_HEIGHT, LIST_ROW_HEIGHT]).toEqual([65, 33, 49, 56, 32]);
    expect(LIST_BANNER_HEIGHT + LIST_HEADER_HEIGHT + LIST_TOOLBAR_HEIGHT).toBe(LIST_TABLE_TOP);
    expect(LIST_TABLE_TOP).toBe(138);
    expect([LIST_HEADER_BACKGROUND, LIST_CONTENT_BACKGROUND, LIST_ROW_BACKGROUND, LIST_BORDER_COLOR, LIST_TEXT_COLOR]).toEqual(['#093E52', '#FFFFFF', '#FCFDFD', '#E8ECEF', '#212129']);
    expect([LIST_FONT_SIZE, LIST_TABLE_HEADER_FONT_SIZE]).toEqual([14, 12]);
    expect(geometryCssVars('lists')).toMatchObject({
      '--app-sidebar-width': '65px', '--app-header-height': '49px',
      '--content-pad-x': '0px', '--content-pad-y': '0px',
      '--list-toolbar-height': '56px', '--list-row-height': '32px',
      '--list-header-background': '#093E52', '--list-content-background': '#FFFFFF',
      '--list-row-background': '#FCFDFD', '--list-border': '#E8ECEF', '--list-text': '#212129',
    });
  });

  it.each([ContactsPage, CompaniesPage, DealsPage])('stosuje tokeny do prawdziwej tabeli i paska narzędzi %s', (Page) => {
    const html = render(Page, []);
    expect(html).toContain('data-slot="list-toolbar"');
    expect(html).toContain('h-[var(--list-toolbar-height)]');
    expect(html).toContain('[&amp;_td]:h-[var(--list-row-height)]');
    expect(html).toContain('--list-row-background:#FCFDFD');
  });

  it.each(['/contacts', '/companies', '/deals'])('ogranicza ramę Bigin do listy %s', (pathname) => {
    harness.pathname = pathname;
    const html = renderToStaticMarkup(createElement(AppShell, null, null));
    expect(html).toContain('data-bigin-list-shell="true"');
    expect(html).toContain('--app-sidebar-width:65px');
    expect(html).toContain('--app-header-height:49px');
    expect(html).toContain('data-slot="list-banner"');
  });

  it.each(['/pipelines', '/inbox', '/tasks', '/calendar', '/settings', '/broadcasts', '/assistant'])('zachowuje dotychczasową ramę %s', (pathname) => {
    harness.pathname = pathname;
    const html = renderToStaticMarkup(createElement(AppShell, null, null));
    expect(html).not.toContain('data-bigin-list-shell');
    expect(html).not.toContain('data-slot="list-banner"');
    expect(html).toContain(`--app-sidebar-width:${pathname === '/pipelines' ? 285 : 160}px`);
    expect(html).toContain('--app-header-height:56px');
  });

  it('renderuje kafelki po wybraniu widoku i zachowuje czystą powierzchnię', () => {
    const html = render(ContactsPage, [[0, [contact]], [2, false], [26, true]]);
    expect(html).toContain('aria-label="Kontakty — kafelki"');
    expect(html).toContain('Kontakt syntetyczny');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('TAG_EXTENSION');
  });
});
