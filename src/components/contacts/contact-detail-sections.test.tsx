import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Contact, Deal } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  ActivityHistory,
  ActivityHistoryList,
} from '@/components/sales/activity-history';
import { WhatsAppAction } from '@/components/sales/whatsapp-action';
import {
  ContactInfoCards,
  ContactCardFooter,
  ContactEmailAction,
  ContactTaskList,
  ContactDocumentList,
  loadContactOwner,
  loadContactTasks,
  loadContactDocuments,
  loadContactHistory,
  loadContactOwnerProfile,
  ContactNextAction,
  ContactStatusTags,
  ContactDetailColumn,
} from './contact-detail-sections';

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ accountId: 'account-test' }),
}));
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
    expect(html.match(/data-contact-info-card=/g)).toHaveLength(5);
    for (const card of html.split('data-contact-info-card=').slice(1))
      expect(card).toContain('Brak danych');
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

describe('02A-2: dane kart i Next action', () => {
  it('Firma wybiera główne powiązanie, małżonek ma telefon, a Segment łączy typy produktów bez duplikatów', () => {
    const html = renderToStaticMarkup(
      <ContactInfoCards
        contact={{ ...contact, product_category: 'Hipoteka' }}
        owner="Opiekun testowy"
        ownerRole="agent"
        companies={
          [
            {
              company_id: 'other',
              is_primary: false,
              company: { id: 'other', name: 'Inna firma' },
            },
            {
              company_id: 'primary',
              is_primary: true,
              company: {
                id: 'primary',
                name: 'Firma syntetyczna',
                nip: '0000000000',
              },
            },
          ] as import('@/types').ContactCompany[]
        }
        spouses={[
          {
            contactId: contact.id,
            spouse: {
              id: 'spouse-test',
              name: 'Partner syntetyczny',
              phone: '+48000000001',
            },
          },
        ]}
        deals={
          [{ product_type: 'Hipoteka' }, { product_type: 'Leasing' }] as Deal[]
        }
      />
    );
    for (const text of [
      'Firma syntetyczna',
      'NIP: 0000000000',
      'Partner syntetyczny',
      '+48000000001',
      'Hipoteka · Leasing',
      'Rola: agent',
      '/companies?open=primary',
      '/contacts?open=spouse-test',
    ])
      expect(html).toContain(text);
    expect(html).not.toContain('Inna firma');
  });
  it('pokazuje istniejące tagi i VIP, bez wymyślania aktywności kontaktu', () => {
    const html = renderToStaticMarkup(
      <ContactStatusTags
        tags={
          [
            { id: 'type', name: 'Klient indywidualny' },
            { id: 'active', name: 'Aktywny' },
            { id: 'vip', name: 'VIP' },
          ] as import('@/types').Tag[]
        }
      />
    );
    for (const text of ['Klient indywidualny', 'Aktywny', 'VIP'])
      expect(html).toContain(text);
    expect(renderToStaticMarkup(<ContactStatusTags tags={[]} />)).toBe('');
  });
  it('Next action wybiera jedno najwcześniejsze działanie z kontaktu, otwartych Deali i aktywności', () => {
    const html = renderToStaticMarkup(
      <ContactNextAction
        contact={{
          ...contact,
          next_step: 'Krok kontaktu',
          follow_up_at: '2026-11-03T10:00:00Z',
        }}
        deals={
          [
            {
              status: 'lost',
              next_action: 'Krok zamkniętego Deala',
              next_action_at: '2026-10-01T10:00:00Z',
            },
            {
              status: 'open',
              next_action: 'Krok aktywnego Deala',
              next_action_at: '2026-11-02T10:00:00Z',
            },
          ] as Deal[]
        }
        activities={
          [
            {
              next_action: 'Najbliższy krok',
              next_action_date: '2026-11-01T10:00:00Z',
              activity_status: null,
            },
          ] as import('@/lib/sales/activity-history').ActivityHistoryRow[]
        }
      />
    );
    expect(html).toContain('Najbliższy krok');
    expect(html).not.toContain('Krok kontaktu');
    expect(html).not.toContain('Krok aktywnego Deala');
    expect(html).not.toContain('Krok zamkniętego Deala');
    expect(
      renderToStaticMarkup(<ContactNextAction contact={contact} deals={[]} />)
    ).toContain('Brak danych — ustal następne działanie.');
  });
  it('Next action zachowuje ustalenie z zakończonej rozmowy i pomija anulowane działania', () => {
    const html = renderToStaticMarkup(
      <ContactNextAction
        contact={contact}
        deals={[]}
        activities={
          [
            {
              activity_type: 'telefon',
              activity_status: 'WYKONANE',
              next_action: 'Ustalenie z rozmowy',
              next_action_date: '2026-11-02T10:00:00Z',
            },
            {
              activity_type: 'telefon',
              activity_status: 'ANULOWANE',
              next_action: 'Anulowane ustalenie',
              next_action_date: '2026-11-01T10:00:00Z',
            },
          ] as import('@/lib/sales/activity-history').ActivityHistoryRow[]
        }
      />
    );
    expect(html).toContain('Ustalenie z rozmowy');
    expect(html).not.toContain('Anulowane ustalenie');
  });
  it('data dodania do CRM ma odrębny podpis od nieznanej daty pozyskania źródła', () => {
    const html = renderToStaticMarkup(
      <ContactInfoCards
        contact={{ ...contact, created_at: '2026-10-31T10:00:00Z' }}
        owner=""
      />
    );
    expect(html).toContain('Dodano do CRM:');
    expect(html).not.toContain('Data pozyskania:');
  });
  it('historia ogranicza odczyt do kontaktu i konta oraz odróżnia awarie', async () => {
    const row = { contact_id: contact.id, account_id: contact.account_id };
    const { db, queries } = database({
      sales_activities: [
        { ...row, id: 'activity' },
        { ...row, account_id: 'other', id: 'other-account' },
      ],
      work_queue_events: [
        { ...row, id: 'event' },
        { ...row, contact_id: 'other', id: 'other-contact' },
      ],
    });
    const result = await loadContactHistory(db, contact);
    expect(result.activities.map(({ id }) => id)).toEqual(['activity']);
    expect(result.queueEvents.map(({ id }) => id)).toEqual(['event']);
    for (const query of queries)
      expect(query.filters).toEqual([
        ['contact_id', contact.id],
        ['account_id', contact.account_id],
      ]);
    for (const table of ['sales_activities', 'work_queue_events'])
      await expect(
        loadContactHistory(database({}, table).db, contact)
      ).rejects.toThrow('CONTACT_HISTORY_UNAVAILABLE');
  });
  it('rola i nazwa opiekuna pochodzą z profilu właściciela kontaktu', async () => {
    const { db } = database({
      profiles: [
        {
          user_id: contact.user_id,
          account_id: contact.account_id,
          full_name: 'Opiekun testowy',
          account_role: 'agent',
        },
      ],
    });
    expect(await loadContactOwnerProfile(db, contact)).toMatchObject({
      full_name: 'Opiekun testowy',
      account_role: 'agent',
    });
    await expect(
      loadContactOwnerProfile(database({}, 'profiles').db, contact)
    ).rejects.toThrow('CONTACT_OWNER_UNAVAILABLE');
  });
});

describe('02A-2: wspólne komponenty zachowują dotychczasowe zachowanie', () => {
  it('historia renderuje typ i datę aktywności z przekazanego odczytu oraz puste stany i błąd', () => {
    const empty = {
      activities: [],
      queueEvents: [],
      notes: [],
      loading: false,
    };
    expect(renderToStaticMarkup(<ActivityHistoryList {...empty} />)).toContain(
      'Brak zapisanych aktywności.'
    );
    expect(
      renderToStaticMarkup(<ActivityHistoryList {...empty} error />)
    ).toContain('Nie udało się wczytać aktywności.');
    expect(
      renderToStaticMarkup(<ActivityHistoryList {...empty} loading />)
    ).toContain('animate-spin');
    const html = renderToStaticMarkup(
      <ActivityHistoryList
        {...empty}
        activities={[
          {
            id: 'call-synthetic',
            title: 'Rozmowa syntetyczna',
            activity_type: 'telefon',
            activity_status: 'WYKONANE',
            occurred_at: '2026-10-31T10:00:00Z',
            description: null,
            call_result: null,
            next_action: null,
            next_action_date: null,
            phone_number: null,
          },
        ]}
      />
    );
    for (const text of ['TELEFON', 'Rozmowa syntetyczna', '31.10.2026'])
      expect(html).toContain(text);
  });
  it('etykieta WhatsApp zmienia się tylko na karcie 02A, a adres akcji pozostaje ten sam', () => {
    const previous = renderToStaticMarkup(
      <WhatsAppAction contactId="contact-test" phone="+48000000000" />
    );
    const current = renderToStaticMarkup(
      <WhatsAppAction
        contactId="contact-test"
        phone="+48000000000"
        label="WhatsApp"
      />
    );
    expect(previous).toContain('WIADOMOŚĆ');
    expect(current).toContain('WhatsApp');
    for (const html of [previous, current])
      expect(html).toContain(
        '/quick-call?contact=contact-test&amp;action=message'
      );
  });
});

describe('K3-02A-6: prezentacja kart, oznaczeń i ankiety', () => {
  it('pięć kart zawiera po jednej ikonie size-4 i datę drugorzędną tylko gdy istnieje', () => {
    const html = renderToStaticMarkup(
      <ContactInfoCards
        contact={{ ...contact, created_at: '2026-10-31T10:00:00Z' }}
        owner=""
      />
    );
    const cards = html.split('data-contact-info-card=').slice(1);
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(card.match(/<svg /g)).toHaveLength(1);
      expect(card).toMatch(/<svg[^>]*class="[^"]*size-4/);
      expect(card).toContain('aria-hidden="true"');
    }
    const date = html.match(
      /<dd class="([^"]*text-\[11px\][^"]*)"[^>]*>(.*?)<\/dd>/
    )!;
    expect(date[1]).toContain('text-slate-600');
    expect(date[1]).toContain('mt-auto');
    expect(date[1]).toContain('truncate');
    expect(date[2]).toContain('Dodano do CRM:');
    expect(date[2]).not.toContain('Brak danych');
    expect(
      renderToStaticMarkup(<ContactInfoCards contact={contact} owner="" />)
    ).not.toContain('text-[11px]');
  });

  it('oznaczenia zawierają tylko istniejące tagi i opcjonalny chip VIP', () => {
    expect(renderToStaticMarkup(<ContactStatusTags tags={[]} />)).toBe('');
    const status = renderToStaticMarkup(
      <ContactStatusTags
        tags={[{ id: 'active', name: 'Aktywny' }] as import('@/types').Tag[]}
      />
    );
    expect(status).toContain('Aktywny');
    expect(status).not.toContain('VIP');
    expect(status).not.toContain('Brak danych');
    const vip = renderToStaticMarkup(
      <ContactStatusTags
        tags={[{ id: 'vip', name: 'VIP' }] as import('@/types').Tag[]}
      />
    );
    expect(vip).toContain('lucide-star');
    expect(vip).toContain('VIP');
    expect(vip).not.toContain('Brak danych');
  });

  it('dwa przypisane tagi tworzą dokładnie dwa chipsy, a VIP ma gwiazdkę', () => {
    const html = renderToStaticMarkup(
      <ContactStatusTags
        tags={
          [
            { id: 'type-synthetic', name: 'Klient indywidualny' },
            { id: 'vip-synthetic', name: 'VIP' },
          ] as import('@/types').Tag[]
        }
      />
    );
    expect(html.match(/data-contact-status="true"/g)).toHaveLength(1);
    const chips = [...html.matchAll(/<span[^>]*>(.*?)<\/span>/g)];
    expect(chips).toHaveLength(2);
    expect(chips[0][1]).toBe('Klient indywidualny');
    expect(chips[1][1]).toContain('lucide-star');
    expect(chips[1][1]).toContain('VIP');
    expect(html).not.toContain('Brak danych');
  });

  it('brak przypisanych tagów nie renderuje nawet kontenera chipsów', () => {
    expect(renderToStaticMarkup(<ContactStatusTags tags={[]} />)).toBe('');
  });

  it('tytuł kolumny jest opcjonalny, etykieta i mobilny przycisk pozostają', () => {
    const html = renderToStaticMarkup(
      <ContactDetailColumn area="context" label="Deale i osoby">
        <p>Treść</p>
      </ContactDetailColumn>
    );
    expect(html).toContain('aria-label="Deale i osoby"');
    expect(html).not.toContain('<h2');
    expect(html).toMatch(
      /<button[^>]*aria-expanded="true"[^>]*class="[^"]*xl:hidden[^>]*>Deale i osoby/
    );
    expect(
      renderToStaticMarkup(
        <ContactDetailColumn
          area="context"
          label="Deale i osoby"
          title="Tytuł opcjonalny"
        >
          <p>Treść</p>
        </ContactDetailColumn>
      )
    ).toMatch(/<h2[^>]*>Tytuł opcjonalny<\/h2>/);
  });

  const text =
    'Ankieta syntetyczna\nOdpowiedź 1: pełna treść\nOdpowiedź 2: bez zmian';
  const snapshot = {
    activities: [],
    queueEvents: [],
    loading: false,
    notes: [
      {
        id: 'survey-synthetic',
        note_text: text,
        created_at: '2026-10-31T10:00:00Z',
        user_id: 'user-synthetic',
      },
    ],
  };

  it('kompaktowa ankieta ma jeden zamknięty details z wierszem podsumowania i pełną treścią do rozwinięcia', () => {
    const html = renderToStaticMarkup(
      <ActivityHistoryList {...snapshot} compactNotes />
    );
    expect(html.match(/<details[ >]/g)).toHaveLength(1);
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    const summary = html.match(/<summary[^>]*>(.*?)<\/summary>/)![1];
    expect(summary).toContain('Ankieta — otrzymana');
    expect(summary).toContain('31.10.2026');
    expect(summary).toContain('Szczegóły');
    expect(summary).not.toContain(text);
    // Native details/summary exposes this unchanged child when opened, without a fetch.
    expect(html).toContain(
      `</summary><p class="mt-1 text-sm whitespace-pre-wrap">${text}</p></details>`
    );
    expect(html.match(/<summary/g)).toHaveLength(1);
    expect(html.match(/Ankieta — otrzymana/g)).toHaveLength(1);
  });

  it('ActivityHistory przekazuje compactNotes do istniejącego snapshotu', () => {
    const compact = renderToStaticMarkup(
      <ActivityHistory
        contactId={contact.id}
        snapshot={snapshot}
        compactNotes
      />
    );
    expect(compact).toBe(
      renderToStaticMarkup(<ActivityHistoryList {...snapshot} compactNotes />)
    );
    expect(compact).toContain('Ankieta — otrzymana');
    expect(compact).toContain(text);
    for (const relation of [
      { dealId: 'deal-synthetic' },
      { companyId: 'company-synthetic' },
    ]) {
      expect(
        renderToStaticMarkup(
          <ActivityHistory {...relation} snapshot={snapshot} />
        )
      ).toBe(renderToStaticMarkup(<ActivityHistoryList {...snapshot} />));
    }
  });

  it('domyślny tryb i jawne false zachowują poprzednią prezentację ankiety', () => {
    const original = renderToStaticMarkup(
      <ActivityHistoryList {...snapshot} />
    );
    expect(original).toBe(
      renderToStaticMarkup(
        <ActivityHistoryList {...snapshot} compactNotes={false} />
      )
    );
    expect(original).toContain('Notatka');
    expect(original).toContain(text);
    expect(original).not.toContain('<details');
    expect(original).not.toContain('Szczegóły');
  });

  it('compactNotes nie zmienia pozostałych notatek, aktywności ani zdarzeń', () => {
    const data = {
      ...snapshot,
      notes: [
        {
          ...snapshot.notes[0],
          note_text: 'Zwykła notatka\nAnkieta w środku treści',
        },
      ],
      activities: [
        {
          id: 'activity-synthetic',
          activity_type: 'telefon',
          title: 'Rozmowa syntetyczna',
          occurred_at: '2026-10-31T10:00:00Z',
          deal_id: 'deal-synthetic',
        },
      ] as import('@/lib/sales/activity-history').ActivityHistoryRow[],
      queueEvents: [
        {
          id: 'event-synthetic',
          event_type: 'next_action',
          occurred_at: '2026-10-31T10:00:00Z',
          deal_id: 'deal-synthetic',
        },
      ],
    };
    expect(
      renderToStaticMarkup(<ActivityHistoryList {...data} compactNotes />)
    ).toBe(renderToStaticMarkup(<ActivityHistoryList {...data} />));
  });
});

describe('K3-02A-8: stopka karty', () => {
  it('przekazuje kliknięcie do istniejącego przełącznika widoku', () => {
    const onClick = vi.fn();
    const footer = ContactCardFooter({ onClick });
    expect(footer.type).toBe('button');
    footer.props.onClick();
    expect(onClick).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(footer)).toContain('Zobacz wszystkie →');
  });
  it('renderuje adres listy jako link o wymaganej wysokości', () => {
    const html = renderToStaticMarkup(
      <ContactCardFooter href="/tasks?contact=contact-test" />
    );
    expect(html).toContain('href="/tasks?contact=contact-test"');
    expect(html).toContain('min-h-11');
    expect(html).toContain(
      'text-xs font-semibold text-emerald-800 hover:underline'
    );
  });
});
