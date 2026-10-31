import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Contact, Deal } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  ContactInfoCards,
  ContactEmailAction,
  ContactTaskList,
  ContactDocumentList,
  loadContactOwner,
  loadContactTasks,
  loadContactDocuments,
} from './contact-detail-sections';

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
const contact = {
  id: 'contact-test',
  user_id: 'auth-user-test',
  account_id: 'account-test',
  source: 'formularz',
  source_details: 'utm_source=synthetic',
} as Contact;

function database(
  rows: Record<string, Record<string, unknown>[]>,
  errorTable = ''
) {
  const queries: { table: string; filters: [string, unknown][] }[] = [];
  const from = vi.fn((table: string) => {
    const filters: [string, unknown][] = [];
    queries.push({ table, filters });
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return query;
      },
      in: (key: string, value: unknown[]) => {
        filters.push([key, value]);
        return query;
      },
      order: () => query,
      maybeSingle: () => query,
      then: (resolve: (value: unknown) => unknown) => {
        const data = (rows[table] ?? []).filter((row) =>
          filters.every(([key, value]) =>
            Array.isArray(value) ? value.includes(row[key]) : row[key] === value
          )
        );
        return Promise.resolve({
          data: table === 'profiles' ? (data[0] ?? null) : data,
          error: table === errorTable ? { message: 'synthetic failure' } : null,
        }).then(resolve);
      },
    };
    return query;
  });
  return {
    db: { from } as unknown as ReturnType<typeof createClient>,
    queries,
    from,
  };
}

describe('K3/01-L: dane istniejących sekcji', () => {
  it('karty renderują źródło, szczegóły i imię opiekuna', () => {
    const html = renderToStaticMarkup(
      <ContactInfoCards contact={contact} owner="Opiekun syntetyczny" />
    );
    for (const value of [
      'Źródło',
      'formularz',
      'utm_source=synthetic',
      'Opiekun syntetyczny',
    ])
      expect(html).toContain(value);
  });
  it('puste źródło i opiekun mają jawny pusty stan', () => {
    const html = renderToStaticMarkup(
      <ContactInfoCards
        contact={{ ...contact, source: ' ', source_details: '' }}
        owner=""
      />
    );
    expect(html.match(/Brak danych/g)).toHaveLength(2);
  });
  it('pokazuje source_details również gdy brak głównego źródła', () => {
    expect(
      renderToStaticMarkup(
        <ContactInfoCards contact={{ ...contact, source: '' }} owner="" />
      )
    ).toContain('utm_source=synthetic');
  });
  it('nie przedstawia awarii odczytu opiekuna jako braku danych', () => {
    expect(
      renderToStaticMarkup(
        <ContactInfoCards contact={contact} owner="" ownerError />
      )
    ).toContain('Nie udało się wczytać opiekuna.');
  });
  it.each([
    ['synthetic@example.test', 'mailto:synthetic@example.test'],
    ['  synthetic+crm@example.test ', 'mailto:synthetic%2Bcrm@example.test'],
    [
      'synthetic?subject=x@example.test',
      'mailto:synthetic%3Fsubject%3Dx@example.test',
    ],
  ])('E-mail buduje bezpieczny mailto dla %s', (email, href) => {
    expect(
      renderToStaticMarkup(<ContactEmailAction email={email} />)
    ).toContain(`href="${href}"`);
  });
  it.each([undefined, '', ' '])('brak e-maila wyłącza akcję (%s)', (email) => {
    const html = renderToStaticMarkup(<ContactEmailAction email={email} />);
    expect(html).toContain('disabled');
    expect(html).not.toContain('mailto:');
  });
  it('opiekun jest odczytywany po user_id kontaktu i właściwym koncie', async () => {
    const { db, queries } = database({
      profiles: [
        {
          user_id: 'auth-user-test',
          account_id: 'other-account',
          full_name: 'Inne konto',
        },
        {
          user_id: 'auth-user-test',
          account_id: 'account-test',
          full_name: 'Właściwy opiekun',
        },
      ],
    });
    expect(await loadContactOwner(db, contact)).toBe('Właściwy opiekun');
    expect(queries[0].filters).toEqual([
      ['user_id', 'auth-user-test'],
      ['account_id', 'account-test'],
    ]);
  });
  it('brak rekordu opiekuna daje pustą wartość', async () => {
    expect(await loadContactOwner(database({}).db, contact)).toBe('');
  });
  it('Zadania pobierają tylko istniejące zadania właściwego kontaktu i konta', async () => {
    const { db } = database({
      sales_activities: [
        {
          id: 'task',
          contact_id: contact.id,
          account_id: contact.account_id,
          activity_type: 'zadanie',
          title: 'Zadanie syntetyczne',
          completed: false,
          activity_status: 'PLANOWANE',
          scheduled_at: '2026-10-31T10:00:00Z',
        },
        {
          id: 'call',
          contact_id: contact.id,
          account_id: contact.account_id,
          activity_type: 'telefon',
        },
        {
          id: 'other',
          contact_id: 'other-contact',
          account_id: contact.account_id,
          activity_type: 'zadanie',
        },
        {
          id: 'other-account',
          contact_id: contact.id,
          account_id: 'other-account',
          activity_type: 'zadanie',
        },
      ],
    });
    const tasks = await loadContactTasks(db, contact);
    expect(tasks.map((task) => task.id)).toEqual(['task']);
    const html = renderToStaticMarkup(<ContactTaskList tasks={tasks} />);
    for (const text of ['Zadanie syntetyczne', 'PLANOWANE', 'Termin:'])
      expect(html).toContain(text);
  });
  it('Dokumenty łączą pliki i wymagania wyłącznie z powiązanych Deali i konta', async () => {
    const row = {
      deal_id: 'deal-test',
      account_id: contact.account_id,
      status: 'otrzymany',
    };
    const { db } = database({
      deal_documents: [
        { ...row, id: 'file', name: 'Plik syntetyczny' },
        { ...row, id: 'unrelated', deal_id: 'other', name: 'Inny dokument' },
      ],
      deal_document_requirements: [
        {
          ...row,
          id: 'required',
          name: 'Wymaganie syntetyczne',
          status: 'brak',
        },
        { ...row, account_id: 'other-account', id: 'other-account' },
      ],
    });
    const documents = await loadContactDocuments(db, contact.account_id, [
      'deal-test',
    ]);
    expect(documents.map(({ id, kind }) => [id, kind])).toEqual([
      ['file', 'document'],
      ['required', 'requirement'],
    ]);
    const html = renderToStaticMarkup(
      <ContactDocumentList
        documents={documents}
        deals={[{ id: 'deal-test', title: 'Deal syntetyczny' } as Deal]}
      />
    );
    for (const text of [
      'Plik syntetyczny',
      'Wymaganie syntetyczne',
      'Deal syntetyczny',
      'href="/deals/deal-test?tab=files"',
    ])
      expect(html).toContain(text);
    expect(html).not.toContain('Inny dokument');
  });
  it('brak Deali pomija zapytania do dokumentów, brak rekordów pokazuje Brak danych', async () => {
    const { db, from } = database({});
    expect(await loadContactDocuments(db, contact.account_id, [])).toEqual([]);
    expect(from).not.toHaveBeenCalled();
    expect(
      await loadContactDocuments(db, contact.account_id, ['empty-deal'])
    ).toEqual([]);
    expect(
      renderToStaticMarkup(<ContactDocumentList documents={[]} deals={[]} />)
    ).toContain('Brak danych');
    expect(renderToStaticMarkup(<ContactTaskList tasks={[]} />)).toContain(
      'Brak danych'
    );
  });
  it('błędy bazy nie są zamieniane w pusty sukces ani ujawniane', async () => {
    await expect(
      loadContactOwner(database({}, 'profiles').db, contact)
    ).rejects.toThrow('CONTACT_OWNER_UNAVAILABLE');
    await expect(
      loadContactTasks(database({}, 'sales_activities').db, contact)
    ).rejects.toThrow('CONTACT_TASKS_UNAVAILABLE');
    for (const table of ['deal_documents', 'deal_document_requirements']) {
      await expect(
        loadContactDocuments(database({}, table).db, contact.account_id, [
          'deal-test',
        ])
      ).rejects.toThrow('CONTACT_DOCUMENTS_UNAVAILABLE');
    }
  });
});
