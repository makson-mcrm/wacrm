import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pipelineSurfaceExtensions, surfaceFlags } from './surface-flags';
import ContactsPage from '@/app/(dashboard)/contacts/page';
import CompaniesPage from '@/app/(dashboard)/companies/page';
import { CompanyCard } from '@/components/companies/company-card';
import DealsPage from '@/app/(dashboard)/deals/page';
import DealPage from '@/app/(dashboard)/deals/[id]/page';
import CalendarPage from '@/app/(dashboard)/calendar/page';
import DashboardPage from '@/app/(dashboard)/dashboard/page';
import TasksPage from '@/app/(dashboard)/tasks/page';
import InboxPage from '@/app/(dashboard)/inbox/page';
import { createRecordLinkHandlers } from '@/app/(dashboard)/deals/kanban-card';
import { DealCard } from '@/components/pipelines/deal-card';
import type { Company, Deal } from '@/types';
import { AppShell } from '@/components/layout/app-shell';
import {
  BRAND_SIDEBAR_BG, BRAND_SIDEBAR_BG_ALT, BRAND_PAGE_BG_PIPELINE, BRAND_PAGE_BG,
  BRAND_ROW_BG, BRAND_BORDER, BRAND_HOVER, BRAND_LINK, BRAND_INFO_BANNER,
  geometryCssVars, LIST_SIDEBAR_WIDTH, LIST_BANNER_HEIGHT, LIST_HEADER_HEIGHT,
  LIST_TOOLBAR_HEIGHT, LIST_TABLE_TOP, LIST_ROW_HEIGHT, LIST_HEADER_BACKGROUND,
  LIST_CONTENT_BACKGROUND, LIST_ROW_BACKGROUND, LIST_BORDER_COLOR, LIST_TEXT_COLOR,
  LIST_FONT_SIZE, LIST_TABLE_HEADER_FONT_SIZE, PIPELINE_SIDEBAR_WIDTH,
  PIPELINE_CARD_HEIGHT, PIPELINE_COLUMN_WIDTH, PIPELINE_COLUMN_GAP, PIPELINE_CONTENT_BACKGROUND,
  CARD_SIDEBAR_WIDTH, CARD_HEADER_HEIGHT, CARD_LEFT_PANEL_WIDTH, CARD_CONTENT_TOP,
  CARD_FIELD_ROW_HEIGHT, CARD_RECORD_HEADER_HEIGHT, WEEK_GRID_HOUR_HEIGHT,
  WEEK_GRID_START_HOUR, WEEK_GRID_END_HOUR, WEEK_GRID_TIME_COLUMN_WIDTH,
} from './layout-geometry';

const harness = vi.hoisted(() => ({
  cursor: 0,
  states: new Map<number, unknown>(),
  extensions: undefined as boolean | undefined,
  pathname: '/contacts',
  captureEffects: false,
  effects: [] as (() => unknown)[],
  updates: new Map<number, unknown>(),
}));

vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  return {
    ...original,
    useEffect: (effect: () => unknown, deps: readonly unknown[]) => {
      if (harness.captureEffects) harness.effects.push(effect);
      else original.useEffect(effect as () => void, deps);
    },
    useState: (initial: unknown) => {
      const index = harness.cursor++;
      if (harness.captureEffects) return [harness.states.has(index) ? harness.states.get(index) : typeof initial === 'function' ? initial() : initial, (value: unknown) => harness.updates.set(index, value)];
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
      get pipelineExtensions() { return harness.extensions ?? original.surfaceFlags.pipelineExtensions; },
      get dealsListExtensions() { return harness.extensions ?? original.surfaceFlags.dealsListExtensions; },
      get cardExtensions() { return harness.extensions ?? original.surfaceFlags.cardExtensions; },
      get dashboardExtensions() { return harness.extensions ?? original.surfaceFlags.dashboardExtensions; },
      get tasksExtensions() { return harness.extensions ?? original.surfaceFlags.tasksExtensions; },
      get inboxExtensions() { return harness.extensions ?? original.surfaceFlags.inboxExtensions; },
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
vi.mock('next/navigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/navigation')>(),
  usePathname: () => harness.pathname,
  useParams: () => ({ id: 'deal-synthetic' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-realtime', () => ({ useRealtime: () => ({ connected: true }) }));
vi.mock('@/hooks/use-presence', () => ({ usePresence: () => ({ getPresence: () => 'offline', getRow: () => null, now: Date.now() }) }));
vi.mock('@/hooks/use-total-unread', () => ({ useTotalUnread: () => 0 }));
vi.mock('@/hooks/use-unread-notifications', () => ({ useUnreadNotifications: () => 0 }));
vi.mock('@/hooks/use-unhandled-submissions', () => ({ useUnhandledSubmissions: () => 0 }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({ mode: 'light', toggleMode: vi.fn() }) }));
vi.mock('@/components/contacts/contact-form', () => ({ ContactForm: () => null }));
vi.mock('@/components/contacts/import-modal', () => ({ ImportModal: () => null }));
vi.mock('@/components/contacts/custom-fields-manager', () => ({ CustomFieldsManager: () => createElement('div', null, 'CUSTOM_FIELDS_EXTENSION') }));
vi.mock('@/components/pipelines/deal-form', () => ({ DealForm: () => null }));
vi.mock('@/components/sales/activity-history', () => ({ ActivityHistory: ({ companyId }: { companyId?: string }) => createElement('div', { 'data-company-id': companyId }, 'ACTIVITY_HISTORY') }));
vi.mock('@/components/assistant/deal-assistant-actions', () => ({ DealAssistantActions: () => createElement('div', null, 'AI_EXTENSION') }));
vi.mock('@/components/banking-knowledge/deal-banking-knowledge', () => ({ DealBankingKnowledge: () => createElement('div', null, 'BANKING_EXTENSION') }));

const contact = {
  id: 'contact-synthetic', user_id: 'owner-synthetic', name: 'Kontakt syntetyczny',
  phone: '+48000000000', email: 'kontakt@example.invalid',
  companies: [{ id: 'company-synthetic', name: 'Firma syntetyczna' }],
  tags: [{ id: 'tag-synthetic', name: 'TAG_EXTENSION', color: '#006644' }],
};
const company = {
  id: 'company-synthetic', account_id: 'account-synthetic', user_id: 'owner-synthetic', name: 'Firma syntetyczna',
  phone: '+48000000000', email: 'firma@example.invalid', nip: 'NIP_EXTENSION',
  notes: 'Komentarz syntetyczny firmy', description: 'Opis syntetyczny firmy',
  created_at: '2026-11-02T09:00:00+01:00', updated_at: '2026-11-03T09:00:00+01:00',
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
function cardTabs(html: string) {
  return [...html.matchAll(/data-slot="tabs-trigger"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, ''));
}

beforeEach(() => {
  harness.cursor = 0;
  harness.states.clear();
  harness.extensions = undefined;
  harness.pathname = '/contacts';
  harness.captureEffects = false;
  harness.effects = [];
  harness.updates.clear();
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
    expect(html).toContain('>Firma syntetyczna</a>');
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

  it('pokazuje sześć kolumn firm z powiązaną osobą obok nazwy firmy', () => {
    const html = render(CompaniesPage, [[0, [company]], [1, false]]);
    expect(headings(html)).toEqual(['', 'Nazwa firmy', 'Osoba', 'Telefon', 'E-mail', 'Właściciel']);
    for (const text of ['Firma syntetyczna', 'firma@example.invalid', 'Właściciel syntetyczny', 'Zaznacz firmę']) expect(html).toContain(text);
    expect(html).toContain('>PRIMARY_CONTACT_EXTENSION</a>');
    expect(html).toContain('href="/contacts?open=contact-synthetic"');
    for (const text of ['NIP_EXTENSION', 'NEXT_ACTION_EXTENSION', 'Aktywne Deale', 'Kartoteka firm powiązana']) expect(html).not.toContain(text);
  });

  it('przywraca dotychczasowe kolumny firm po włączeniu flagi', () => {
    harness.extensions = true;
    const html = render(CompaniesPage, [[0, [company]], [1, false]]);
    for (const text of ['NIP_EXTENSION', 'PRIMARY_CONTACT_EXTENSION', 'NEXT_ACTION_EXTENSION', 'Aktywne Deale']) expect(html).toContain(text);
  });

  it('zachowuje sześć kolumn firm również podczas ładowania i przy pustej liście', () => {
    for (const html of [render(CompaniesPage, []), render(CompaniesPage, [[1, false]])]) {
      expect(headings(html)).toEqual(['', 'Nazwa firmy', 'Osoba', 'Telefon', 'E-mail', 'Właściciel']);
      expect(html).toContain('colSpan="6"');
    }
  });

  it('nie przypisuje bieżącemu użytkownikowi cudzego kontaktu ani firmy', () => {
    expect(render(ContactsPage, [[0, [{ ...contact, user_id: 'other-synthetic' }]], [2, false]])).not.toContain('Właściciel syntetyczny');
    expect(render(CompaniesPage, [[0, [{ ...company, user_id: 'other-synthetic' }]], [1, false]])).not.toContain('Właściciel syntetyczny');
  });

  it('przekierowuje /deals do /pipelines przed odczytem bazy', () => {
    expect(() => render(DealsPage, [])).toThrow('NEXT_REDIRECT');
    try {
      render(DealsPage, []);
    } catch (error) {
      expect(error).toHaveProperty('digest', 'NEXT_REDIRECT;replace;/pipelines;307;');
    }
    expect(harness.cursor).toBe(0);
  });

  it('zachowuje całą listę transakcji pod flagą rozszerzeń', () => {
    harness.extensions = true;
    const html = render(DealsPage, [[2, false]]);
    expect(html).toContain('Szukaj po sprawie lub kliencie');
    expect(headings(html)).toEqual(['Sprawa', 'Klient', 'Etap', 'Wartość', 'Następny krok', 'Termin', 'Ostatnia aktywność']);
    expect(html).toContain('Pojedyncze sprawy klientów.');
  });

  it('KM3.2.09-A2 — eksportuje zmierzone tokeny i początek tabeli y=138', () => {
    expect([LIST_SIDEBAR_WIDTH, LIST_BANNER_HEIGHT, LIST_HEADER_HEIGHT, LIST_TOOLBAR_HEIGHT, LIST_ROW_HEIGHT]).toEqual([65, 33, 49, 56, 32]);
    expect(LIST_BANNER_HEIGHT + LIST_HEADER_HEIGHT + LIST_TOOLBAR_HEIGHT).toBe(LIST_TABLE_TOP);
    expect(LIST_TABLE_TOP).toBe(138);
    expect([LIST_HEADER_BACKGROUND, LIST_CONTENT_BACKGROUND, LIST_ROW_BACKGROUND, LIST_BORDER_COLOR, LIST_TEXT_COLOR]).toEqual(['#093E52', '#FFFFFF', '#FCFDFD', '#E0E9EE', '#212129']);
    expect([LIST_FONT_SIZE, LIST_TABLE_HEADER_FONT_SIZE]).toEqual([14, 12]);
    expect(geometryCssVars('lists')).toMatchObject({
      '--app-sidebar-width': '65px', '--app-header-height': '49px',
      '--content-pad-x': '0px', '--content-pad-y': '0px',
      '--list-toolbar-height': '56px', '--list-row-height': '32px',
      '--list-header-background': '#093E52', '--list-content-background': '#FFFFFF',
      '--list-row-background': '#FCFDFD', '--list-border': '#E0E9EE', '--list-text': '#212129',
    });
  });

  it.each([ContactsPage, CompaniesPage])('stosuje tokeny do prawdziwej tabeli i paska narzędzi %s', (Page) => {
    const html = render(Page, []);
    expect(html).toContain('data-slot="list-toolbar"');
    expect(html).toContain('h-[var(--list-toolbar-height)]');
    expect(html).toContain('[&amp;_td]:h-[var(--list-row-height)]');
    expect(html).toContain('--list-row-background:#FCFDFD');
  });

  it.each(['/contacts', '/companies'])('ogranicza ramę Bigin do listy %s', (pathname) => {
    harness.pathname = pathname;
    const html = renderToStaticMarkup(createElement(AppShell, null, null));
    expect(html).toContain('data-bigin-list-shell="true"');
    expect(html).toContain('--app-sidebar-width:65px');
    expect(html).toContain('--app-header-height:49px');
    expect(html).toContain('data-slot="list-banner"');
  });

  it.each(['/deals', '/contacts/synthetic', '/inbox', '/tasks', '/settings', '/broadcasts', '/assistant'])('zachowuje dotychczasową ramę %s', (pathname) => {
    harness.pathname = pathname;
    const html = renderToStaticMarkup(createElement(AppShell, null, null));
    expect(html).not.toContain('data-bigin-list-shell');
    expect(html).not.toContain('data-slot="list-banner"');
    expect(html).toContain('--app-sidebar-width:160px');
    expect(html).toContain('--app-header-height:56px');
  });

  it('KM3.2.10 — stosuje tokeny Lejka 285/49/60/220/10 w ramie ekranu', () => {
    expect([PIPELINE_SIDEBAR_WIDTH, LIST_SIDEBAR_WIDTH, LIST_HEADER_HEIGHT, LIST_TABLE_TOP,
      LIST_ROW_HEIGHT, PIPELINE_CARD_HEIGHT, PIPELINE_COLUMN_WIDTH, PIPELINE_COLUMN_GAP])
      .toEqual([285, 65, 49, 138, 32, 60, 220, 10]);
    expect(PIPELINE_CONTENT_BACKGROUND).toBe('#F9FBFC');
    harness.pathname = '/pipelines';
    const html = renderToStaticMarkup(createElement(AppShell, null, null));
    for (const token of ['--app-sidebar-width:285px', '--app-header-height:49px',
      '--list-header-background:#093E52', '--pipeline-column-width:220px',
      '--pipeline-column-gap:10px', '--pipeline-card-height:60px',
      '--pipeline-content-background:#F9FBFC']) expect(html).toContain(token);
    expect(html).toContain('data-bigin-pipeline-shell="true"');
    expect(html).toContain('data-bigin-pipeline-cards="true"');
    expect(html).not.toContain('data-slot="list-banner"');
  });

  it('nie ogranicza wysokości rozszerzonych kart Lejka', () => {
    harness.pathname = '/pipelines';
    harness.extensions = true;
    const html = renderToStaticMarkup(createElement(AppShell, null, null));
    expect(html).not.toContain('data-bigin-pipeline-cards="true"');
  });

  it('pokazuje brak powiązanej osoby bez fikcyjnej nazwy', () => {
    const html = render(CompaniesPage, [[0, [{ ...company, primaryContact: null }]], [1, false]]);
    expect(headings(html)).toContain('Osoba');
    expect(html).not.toContain('/contacts?open=');
  });

  it('renderuje kafelki po wybraniu widoku i zachowuje czystą powierzchnię', () => {
    const html = render(ContactsPage, [[0, [contact]], [2, false], [26, true]]);
    expect(html).toContain('aria-label="Kontakty — kafelki"');
    expect(html).toContain('Kontakt syntetyczny');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('TAG_EXTENSION');
  });
});

const deal = {
  id: 'deal-synthetic', title: 'Transakcja syntetyczna', pipeline_id: 'pipeline-synthetic',
  stage_id: 'stage-synthetic', stage: { id: 'stage-synthetic', name: 'Rozmowa', position: 0 },
  contact_id: contact.id, contact, value: 1200, currency: 'PLN',
  created_at: '2026-11-02T09:00:00+01:00', status: 'open',
} as unknown as Deal;
const calendarItems = [
  { id: 'meeting-synthetic', source: 'calendar', sourceId: 'meeting', title: 'Spotkanie syntetyczne', type: 'spotkanie', startsAt: '2026-11-02T09:00:00+01:00' },
  { id: 'task-synthetic', source: 'activity', sourceId: 'task', title: 'Zadanie syntetyczne', type: 'zadanie', startsAt: '2026-11-03T10:00:00+01:00' },
  { id: 'weekend-synthetic', source: 'calendar', sourceId: 'weekend', title: 'Weekend syntetyczny', type: 'spotkanie', startsAt: '2026-11-07T09:00:00+01:00' },
];

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('KM3.2.11 — karta, wielokartowość i kalendarz', () => {
  it('eksportuje zmierzone tokeny karty oraz tygodnia', () => {
    expect([CARD_SIDEBAR_WIDTH, CARD_HEADER_HEIGHT, CARD_LEFT_PANEL_WIDTH, CARD_CONTENT_TOP, CARD_FIELD_ROW_HEIGHT,
      WEEK_GRID_HOUR_HEIGHT, WEEK_GRID_START_HOUR, WEEK_GRID_END_HOUR, WEEK_GRID_TIME_COLUMN_WIDTH]).toEqual([65, 49, 488, 148, 44, 56, 8, 18, 40]);
    expect(LIST_BANNER_HEIGHT + CARD_HEADER_HEIGHT + CARD_RECORD_HEADER_HEIGHT).toBe(CARD_CONTENT_TOP);
    expect(surfaceFlags.cardExtensions).toBe(false);
  });

  it.each(['/deals/deal-synthetic', '/calendar'])('stosuje ramę 65/49 i białą powierzchnię na %s', (pathname) => {
    harness.pathname = pathname;
    const html = render(AppShell as ComponentType, []);
    for (const value of ['--app-sidebar-width:65px', '--app-header-height:49px', '--list-header-background:#093E52', '--list-content-background:#FFFFFF']) expect(html).toContain(value);
  });

  it('pokazuje lewą kolumnę 488, wiersze 44 i dokładnie cztery zakładki', () => {
    const html = render(DealPage, [[0, deal]]);
    expect(html).toContain('--card-left-panel-width:488px');
    expect(html).toContain('--card-content-top:148px');
    expect(html).toContain('grid-cols-[var(--card-left-panel-width)_minmax(0,1fr)]');
    expect(html.match(/data-slot="card-field-row"/g)).toHaveLength(10);
    expect(html).toContain('h-[var(--card-field-row-height)]');
    expect(cardTabs(html)).toEqual(['Oś czasu', 'Komentarze', 'Aktywności', 'Wiadomości']);
    for (const label of ['Asystent AI', 'BANKING_EXTENSION', 'AI_EXTENSION', 'WhatsApp', 'Proces bankowy']) expect(html).not.toContain(label);
  });

  it('przywraca autorski widok karty po włączeniu rozszerzeń', () => {
    harness.extensions = true;
    const html = render(DealPage, [[0, deal]]);
    expect(html).not.toContain('data-bigin-deal-card');
    expect(html).toContain('Asystent AI');
    expect(html).toContain('Banki');
  });

  it.each([['comments', 'Komentarz'], ['activities', 'ACTIVITY_HISTORY'], ['messages', 'mailto:kontakt@example.invalid']] as const)('zakładka %s pokazuje powiązaną treść', (tab, content) => {
    const html = render(DealPage, [[0, deal], [28, tab]]);
    expect(html).toContain(content);
  });

  it('pokazuje pn–pt, 11 wierszy 8–18 po 56 px i trzy filtry', () => {
    const html = render(CalendarPage, [[0, calendarItems], [5, new Date(2026, 10, 2, 12)]]);
    expect(html.match(/data-slot="week-hour-row"/g)).toHaveLength(11);
    for (const value of ['pn', 'wt', 'śr', 'czw', 'pt', '08:00', '18:00', 'Wszystkie', 'Spotkania', 'Zadania', 'Poprzedni zakres', 'Następny zakres', 'Spotkanie syntetyczne', 'Zadanie syntetyczne']) expect(html).toContain(value);
    for (const value of ['Weekend syntetyczny', 'Najbliższe wydarzenie']) expect(html).not.toContain(value);
    expect(html).toContain('--week-grid-hour-height:56px');
    expect(html).toContain('h-[var(--week-grid-hour-height)]');
    expect(html).toContain('grid-template-columns:var(--week-grid-time-column-width) repeat(5, minmax(0, 1fr))');
    expect((1536 - CARD_SIDEBAR_WIDTH - WEEK_GRID_TIME_COLUMN_WIDTH) / 5).toBe(286.2);
    expect(html).toContain('6 lis 2026');
  });

  it.each([['meetings', 'Spotkanie syntetyczne', 'Zadanie syntetyczne'], ['tasks', 'Zadanie syntetyczne', 'Spotkanie syntetyczne']] as const)('filtr %s wybiera właściwe rekordy', (filter, present, absent) => {
    const html = render(CalendarPage, [[0, calendarItems], [5, new Date(2026, 10, 2, 12)], [17, filter]]);
    expect(html).toContain(present);
    expect(html).not.toContain(absent);
  });

  it.each(['/deals/deal-synthetic', '/contacts?open=contact-synthetic'])('dwuklik i Cmd/Ctrl+klik otwierają %s raz i zachowują bieżący widok', (href) => {
    vi.useFakeTimers();
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    const single = vi.fn();
    const handlers = createRecordLinkHandlers(href, single);
    const event = (detail = 1, metaKey = false, ctrlKey = false) => ({ detail, metaKey, ctrlKey, preventDefault: vi.fn(), stopPropagation: vi.fn() });
    const first = event();
    handlers.onClick(first);
    handlers.onClick(event(2));
    handlers.onDoubleClick(event(2));
    vi.runAllTimers();
    expect(single).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledExactlyOnceWith(href, '_blank', 'noopener');
    expect(first.preventDefault).toHaveBeenCalled();
    expect(first.stopPropagation).toHaveBeenCalled();
    for (const modified of [event(1, true), event(1, false, true)]) handlers.onClick(modified);
    vi.runAllTimers();
    expect(open).toHaveBeenCalledTimes(3);
    expect(single).not.toHaveBeenCalled();
    handlers.onClick(event());
    vi.runAllTimers();
    expect(single).toHaveBeenCalledTimes(1);
    handlers.onClick(event());
    handlers.cancel();
    vi.runAllTimers();
    expect(single).toHaveBeenCalledTimes(1);
  });

  it('tytuły deala i kontaktu mają linki do pełnych kart z noopener', () => {
    const card = renderToStaticMarkup(createElement(DealCard, { deal, stage: null, onEdit: vi.fn() }));
    expect(card).toMatch(/href="\/deals\/deal-synthetic"[^>]*target="_blank"[^>]*rel="noopener"/);
    const html = render(ContactsPage, [[0, [contact]], [2, false]]);
    expect(html).toMatch(/href="\/contacts\?open=contact-synthetic"[^>]*target="_blank"[^>]*rel="noopener"/);
  });
});

describe('KM3.2.12 — pełna karta firmy i cztery zakładki deala', () => {
  const labels = ['Oś czasu', 'Komentarze', 'Aktywności', 'Wiadomości'];

  it('odczytuje ?open=id, zachowuje deep link i reaguje na powrót do listy', () => {
    harness.captureEffects = true;
    const location = { search: '?open=company-synthetic' };
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const replaceState = vi.fn();
    vi.stubGlobal('window', { location, setTimeout: (fn: () => void) => { fn(); return 1; }, clearTimeout: vi.fn(), addEventListener, removeEventListener, history: { replaceState } });
    render(CompaniesPage, [[0, [company]], [1, false]]);
    // First effect loads the list; the second handles its location without a database call.
    const cleanup = harness.effects[1]() as () => void;
    expect(harness.updates.get(4)).toEqual(company);
    expect(harness.updates.get(3)).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    location.search = '';
    addEventListener.mock.calls[0][1]({ type: 'popstate' });
    expect(harness.updates.get(4)).toBeNull();
    expect(harness.updates.get(3)).toBe(false);
    cleanup();
    expect(removeEventListener).toHaveBeenCalledWith('popstate', addEventListener.mock.calls[0][1]);
  });

  it('doładowanie listy nie zamyka otwartego formularza nowej firmy', () => {
    harness.captureEffects = true;
    vi.stubGlobal('window', { location: { search: '' }, setTimeout: (fn: () => void) => { fn(); return 1; }, clearTimeout: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(CompaniesPage, [[0, [company]], [1, false], [3, true]]);
    harness.effects[1]();
    expect(harness.updates.has(3)).toBe(false);
    expect(harness.updates.has(4)).toBe(false);
  });

  it('otwarta firma zastępuje listę pełną kartą z tokenami 488/148/44', () => {
    const html = render(CompaniesPage, [[0, [company]], [1, false], [4, company]]);
    expect(html).toContain('data-bigin-company-card');
    for (const token of [`--card-left-panel-width:${CARD_LEFT_PANEL_WIDTH}px`, `--card-content-top:${CARD_CONTENT_TOP}px`, `--card-field-row-height:${CARD_FIELD_ROW_HEIGHT}px`]) expect(html).toContain(token);
    expect(html).toContain('lg:grid-cols-[var(--card-left-panel-width)_minmax(0,1fr)]');
    expect(html.match(/data-slot="card-field-row"/g)).toHaveLength(7);
    expect(cardTabs(html)).toEqual(labels);
    expect(html).toContain('href="/contacts?open=contact-synthetic"');
    expect(html).toContain('Właściciel syntetyczny');
    for (const absent of ['<table', 'role="dialog"', 'NIP_EXTENSION', 'NEXT_ACTION_EXTENSION', 'Asystent AI', 'Tagi firmy']) expect(html).not.toContain(absent);
  });

  it('odświeżona firma pokazuje aktualne dane, a nie kopię z chwili otwarcia', () => {
    const html = render(CompaniesPage, [[0, [{ ...company, name: 'Firma po edycji' }]], [1, false], [4, company]]);
    expect(html).toContain('Firma po edycji');
    expect(html).not.toContain('Firma syntetyczna');
  });

  it('rama firmy zachowuje panel 65 px i pasek 49 px', () => {
    harness.pathname = '/companies';
    const html = render(AppShell as ComponentType, []);
    expect(html).toContain(`--app-sidebar-width:${CARD_SIDEBAR_WIDTH}px`);
    expect(html).toContain(`--app-header-height:${CARD_HEADER_HEIGHT}px`);
    expect(html).toContain(`--list-banner-height:${LIST_BANNER_HEIGHT}px`);
    expect(LIST_BANNER_HEIGHT + CARD_HEADER_HEIGHT + CARD_RECORD_HEADER_HEIGHT).toBe(CARD_CONTENT_TOP);
  });

  it.each([
    ['timeline', 'Utworzono firmę'],
    ['comments', company.notes],
    ['activities', 'data-company-id="company-synthetic"'],
    ['messages', 'Wyślij wiadomość e-mail'],
  ])('zakładka firmy %s ma treść i cały pasek czterech zakładek', (tab, content) => {
    const props = { company, primaryContact: company.primaryContact, ownerName: 'Właściciel syntetyczny', canEdit: true, onBack: vi.fn(), onEdit: vi.fn() };
    const html = render(() => createElement(CompanyCard, props), [[0, tab]]);
    expect(cardTabs(html)).toEqual(labels);
    expect(html).toContain(content);
    expect(html).toContain('href="mailto:firma@example.invalid"');
  });

  it('brak danych firmy nie tworzy fikcyjnych komentarzy, historii ani skrzynki', () => {
    const empty: Company = { ...company, email: '', phone: '', created_at: '', updated_at: '', notes: '' };
    const props = { company: empty, ownerName: '', canEdit: false, onBack: vi.fn(), onEdit: vi.fn() };
    const component = () => createElement(CompanyCard, props);
    expect(render(component, [])).toContain('Ten rekord nie ma żadnej historii.');
    const comments = render(component, [[0, 'comments']]);
    expect(comments).toContain('Brak komentarzy.');
    expect(comments).toMatch(/disabled=""[^>]*>Dodaj komentarz/);
    const messages = render(component, [[0, 'messages']]);
    expect(messages).toContain('Firma nie ma adresu e-mail.');
    expect(messages).not.toContain('mailto:');
  });

  it.each(['timeline', 'comments', 'activities', 'messages'])('deal zachowuje dokładnie cztery zakładki przy aktywnej %s', (tab) => {
    expect(cardTabs(render(DealPage, [[0, deal], [28, tab]]))).toEqual(labels);
  });
});

describe('KM3.2.13 — Dzisiaj, Zadania i Inbox', () => {
  const task = {
    key: 'activity-synthetic',
    source: 'activity',
    id: 'activity-synthetic',
    title: 'Telefon syntetyczny',
    where: 'Kontakt syntetyczny',
    dueAt: '2026-11-07T09:00:00+01:00',
    contactId: 'contact-synthetic',
    companyId: null,
    dealId: null,
    ownerName: 'Właściciel syntetyczny',
  };

  it.each([
    'dashboardExtensions',
    'tasksExtensions',
    'inboxExtensions',
  ] as const)('%s jest domyślnie false', (flag) => {
    expect(surfaceFlags[flag]).toBe(false);
  });

  it('zachowuje kontrakt 65/49/148/32 i wiersz Dzisiaj 44', () => {
    expect([
      LIST_SIDEBAR_WIDTH,
      LIST_HEADER_HEIGHT,
      CARD_CONTENT_TOP,
      LIST_ROW_HEIGHT,
      CARD_FIELD_ROW_HEIGHT,
    ]).toEqual([65, 49, 148, 32, 44]);
    expect(
      LIST_BANNER_HEIGHT + LIST_HEADER_HEIGHT + CARD_RECORD_HEADER_HEIGHT
    ).toBe(148);
    expect(LIST_BANNER_HEIGHT + LIST_HEADER_HEIGHT + LIST_TOOLBAR_HEIGHT).toBe(
      LIST_TABLE_TOP
    );
  });

  it('Dzisiaj pokazuje listę 44 px od y=148, bez KPI i Asystenta', () => {
    const html = render(DashboardPage, [
      [0, new Date('2026-11-07T12:00:00+01:00').getTime()],
      [
        1,
        [
          {
            ...deal,
            next_action: 'Działanie syntetyczne',
            next_action_at: '2026-11-07T09:00:00+01:00',
          },
        ],
      ],
      [10, false],
    ]);
    for (const value of [
      'data-bigin-dashboard',
      '--today-content-top:148px',
      '--today-row-height:44px',
      'height:66px',
      'h-[var(--today-row-height)]',
      'Działanie syntetyczne',
      'background:#FFFFFF',
    ])
      expect(html).toContain(value);
    expect(html).toContain('data-slot="today-list-row"');
    for (const value of ['--today-row-bg:#FCFDFD', '--today-hover:#F0F7FB', '--today-link:#7EB5F4', 'border-color:#E0E9EE', 'hover:bg-[var(--today-hover)]', 'text-[var(--today-link)]']) expect(html).toContain(value);
    for (const value of [
      'Asystent',
      'Ivy Lee',
      'Do celu 10',
      'Przychód TERAZ',
      'KM1.2',
    ])
      expect(html).not.toContain(value);
  });

  it('Dzisiaj obsługuje pusty plan, wczytywanie i błąd', () => {
    expect(render(DashboardPage, [[10, false]])).toContain(
      'Brak działań na dziś.'
    );
    expect(render(DashboardPage, [])).toContain('Wczytywanie planu dnia');
    const html = render(DashboardPage, [
      [10, false],
      [11, 'SYNTHETIC_ERROR'],
    ]);
    expect(html).toContain('Spróbuj ponownie');
    expect(html).not.toContain('SYNTHETIC_ERROR');
  });

  it('Zadania pokazują pięć kolumn, rekord, właściciela i wiersz 32 px', () => {
    const html = render(TasksPage, [[0, [task]]]);
    expect(headings(html)).toEqual([
      'Wykonanie',
      'Temat',
      'Termin',
      'Powiązanie',
      'Właściciel',
    ]);
    for (const value of [
      '--list-row-height:32px',
      '--list-border:#E0E9EE',
      '--list-hover:#F0F7FB',
      '--list-link:#7EB5F4',
      'hover:bg-[var(--task-hover)]',
      'text-[var(--task-link)]',
      'h-[var(--list-row-height)]',
      'Telefon syntetyczny',
      'Właściciel syntetyczny',
      'href="/contacts?open=contact-synthetic"',
      'Oznacz jako zrobione: Telefon syntetyczny',
      'Zmień termin: Telefon syntetyczny',
    ])
      expect(html).toContain(value);
    for (const value of [
      'DZISIAJ',
      'ZALEGŁE',
      'NADCHODZĄCE',
      'KALENDARZ',
      'JUTRO',
    ])
      expect(html).not.toContain(value);
    expect(render(TasksPage, [])).toContain('colSpan="5"');
  });

  it('Zadania zachowują filtrowanie i edycję terminu w tabeli', () => {
    expect(
      render(TasksPage, [
        [0, [task]],
        [1, 'undated'],
      ])
    ).not.toContain('data-slot="task-list-row"');
    const html = render(TasksPage, [
      [0, [task]],
      [3, task.key],
      [4, '2026-11-09'],
    ]);
    for (const value of [
      'type="date"',
      'value="2026-11-09"',
      'Zapisz',
      'Anuluj zmianę terminu',
    ])
      expect(html).toContain(value);
  });

  it('Inbox pokazuje dwie szpalty i listę 360 px, bez panelu kontaktu i autorskich banerów', () => {
    const html = render(InboxPage, [[4, false]]);
    for (const value of [
      'data-bigin-inbox',
      '--inbox-list-width:360px',
      '--inbox-header-height:49px',
      '--inbox-border:#E0E9EE',
      '--inbox-row:#FCFDFD',
      '--inbox-hover:#F0F7FB',
      '--inbox-link:#7EB5F4',
      'lg:w-[var(--inbox-list-width)]',
      'data-slot="inbox-conversations"',
      'data-slot="inbox-thread"',
    ])
      expect(html).toContain(value);
    for (const value of [
      'Kanały Inbox:',
      'Gmail biuro',
      'whatsappNotConnected',
      'Poczta mFinanse',
    ])
      expect(html).not.toContain(value);
    expect(html).not.toContain('class="hidden lg:block"');
  });

  it('flagi przywracają dotychczasowe dodatki trzech ekranów', () => {
    harness.extensions = true;
    expect(render(DashboardPage, [])).toContain('KM1.2');
    expect(render(TasksPage, [[0, [task]]])).toContain('KALENDARZ');
    const inbox = render(InboxPage, []);
    expect(inbox).toContain('Kanały Inbox:');
    expect(inbox).not.toContain('data-bigin-inbox');
  });
});


describe('KM3.2.14 — paleta Bigin', () => {
  it.each([
    [BRAND_SIDEBAR_BG, '#093E52'],
    [BRAND_SIDEBAR_BG_ALT, '#0B4A63'],
    [BRAND_PAGE_BG_PIPELINE, '#F9FBFC'],
    [BRAND_PAGE_BG, '#FFFFFF'],
    [BRAND_ROW_BG, '#FCFDFD'],
    [BRAND_BORDER, '#E0E9EE'],
    [BRAND_HOVER, '#F0F7FB'],
    [BRAND_LINK, '#7EB5F4'],
    [BRAND_INFO_BANNER, '#DFF9F3'],
  ])('token %s = %s', (actual, expected) => expect(actual).toBe(expected));

  it.each(['/dashboard', '/tasks', '/inbox', '/contacts', '/pipelines'])('powłoka %s dziedziczy paletę', (pathname) => {
    harness.pathname = pathname;
    const html = render(AppShell as ComponentType, []);
    for (const value of ['--brand-sidebar:#093E52', '--brand-sidebar-alt:#0B4A63', '--border:#E0E9EE', '--brand-hover:#F0F7FB', '--brand-link:#7EB5F4', '--brand-info:#DFF9F3']) expect(html).toContain(value);
    expect(html).toContain(`--brand-page:${pathname === '/pipelines' ? '#F9FBFC' : '#FFFFFF'}`);
    expect(html).not.toContain('#20383d');
    const aside = html.match(/<aside[\s\S]*?<\/aside>/)?.[0] ?? '';
    expect(aside).toContain('background:#093E52');
    expect(aside).toContain('--sidebar-alt:#0B4A63');
    expect(aside).toContain('bg-[var(--sidebar-alt)] text-white');
    expect(aside).toContain('hover:bg-[var(--sidebar-alt)]');
    expect(html).not.toContain('text-slate-950');
  });
});
