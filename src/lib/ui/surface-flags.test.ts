import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pipelineSurfaceExtensions, surfaceFlags } from './surface-flags';
import ContactsPage from '@/app/(dashboard)/contacts/page';
import CompaniesPage from '@/app/(dashboard)/companies/page';
import DealsPage from '@/app/(dashboard)/deals/page';

const harness = vi.hoisted(() => ({
  cursor: 0,
  states: new Map<number, unknown>(),
  extensions: undefined as boolean | undefined,
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
  useAuth: () => ({ accountId: 'account-synthetic', user: { id: 'owner-synthetic' }, profile: { full_name: 'Właściciel syntetyczny' } }),
}));
vi.mock('@/hooks/use-can', () => ({ useCan: () => true }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
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

  it('pokazuje tylko sześć kolumn kontaktów i ukrywa dodatki nawet przy zaznaczeniu', () => {
    const html = render(ContactsPage, [[0, [contact]], [2, false], [6, 1], [22, new Set([contact.id])]]);
    expect(headings(html)).toEqual(['', 'Nazwa kontaktu', 'Firma', 'E-mail', 'Telefon', 'Właściciel']);
    for (const text of ['Wszystkie kontakty', 'Przełącznik widoku kontaktów', 'Kontakt syntetyczny', 'kontakt@example.invalid', 'Właściciel syntetyczny']) expect(html).toContain(text);
    for (const text of ['TAG_EXTENSION', 'CUSTOM_FIELDS_EXTENSION', 'Eksportuj', 'Nowy kontakt / nieznany numer', 'Współmałżonek', 'Kluczowi', 'deleteSelected']) expect(html).not.toContain(text);
    expect(html).toContain('href="/companies?open=company-synthetic"');
    expect(html).not.toContain('hidden lg:block');
  });

  it('kontakty zachowują poprawny colspan podczas ładowania i przy pustej liście', () => {
    expect(render(ContactsPage, [])).toContain('colSpan="6"');
    expect(render(ContactsPage, [[2, false]])).toContain('colSpan="6"');
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
});
