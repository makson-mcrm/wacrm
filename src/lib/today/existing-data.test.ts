import { describe, expect, it } from 'vitest';
import { buildTodayInputs, currentWorkContext } from './existing-data';

describe('M3 Today existing data adapter', () => {
  const now = new Date('2026-09-08T08:30:00Z');

  it('merges queue, planned activity and Ivy Lee priority into one Deal matter', () => {
    const result = buildTodayInputs({
      now,
      deals: [
        {
          id: 'd1',
          title: 'Hipoteka',
          next_action: 'Telefon do banku',
          stage: { name: '5. WNIOSKI / DECYZJA', position: 5 },
        },
      ],
      queue: [
        {
          id: 'q1',
          source_type: 'ALERT_CRM',
          status: 'NOWE',
          deal_id: 'd1',
          manual_priority: 2,
        },
      ],
      activities: [
        {
          id: 'a1',
          title: 'Sprawdź decyzję',
          deal_id: 'd1',
          scheduled_at: '2026-09-08T09:00:00Z',
        },
      ],
      priorities: [
        {
          id: 'p1',
          position: 1,
          title: 'Doprowadź decyzję do końca',
          completed: false,
          deal_id: 'd1',
        },
      ],
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      id: 'deal:d1',
      action: 'Telefon do banku',
      dueAt: undefined,
      manualPriority: 6,
    });
  });

  it('keeps Deal next action, deadline and blocker as the source of truth for DZISIAJ', () => {
    const result = buildTodayInputs({
      now,
      deals: [
        {
          id: 'deal-a',
          title: 'Hipoteka A',
          contact_id: 'contact-a',
          next_action: 'Dosłać dokument do banku',
          next_action_at: '2026-09-08T10:00:00Z',
          blocker: 'Brak zaświadczenia',
        },
      ],
      activities: [
        {
          id: 'old-activity',
          title: 'Stary follow-up, którego nie wolno pokazać zamiast Deala',
          deal_id: 'deal-a',
          contact_id: 'contact-a',
          scheduled_at: '2026-09-07T09:00:00Z',
          completed: false,
        },
      ],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      id: 'deal:deal-a',
      source: 'deal',
      action: 'Dosłać dokument do banku',
      dueAt: '2026-09-08T10:00:00Z',
      blocker: 'Brak zaświadczenia',
      href: '/quick-call?deal=deal-a&contact=contact-a',
    });
  });

  it('does not restore a cleared Deal deadline from stale related records', () => {
    const result = buildTodayInputs({
      now,
      deals: [{ id: 'd1', title: 'Hipoteka', next_action_at: null }],
      queue: [
        {
          id: 'q1',
          source_type: 'ALERT_CRM',
          status: 'NOWE',
          deal_id: 'd1',
          snoozed_until: '2026-09-09T09:00:00Z',
        },
      ],
      activities: [
        {
          id: 'a1',
          title: 'Stary termin',
          deal_id: 'd1',
          scheduled_at: '2026-09-07T09:00:00Z',
        },
      ],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].dueAt).toBeNull();
  });

  it('uses existing queue sources for future-revenue signals', () => {
    const result = buildTodayInputs({
      deals: [],
      queue: [
        { id: 'new', source_type: 'STRONA', status: 'NOWE' },
        { id: 'follow', source_type: 'FOLLOW_UP', status: 'W_TOKU' },
      ],
    });
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'queue:new',
          signal: 'NOWY_REALNY_TEMAT',
        }),
        expect.objectContaining({
          id: 'queue:follow',
          signal: 'WARTOSCIOWY_KONTAKT',
        }),
      ])
    );
  });

  it('keeps Contact and Firma selected when DZISIAJ opens an activity without a Deal', () => {
    const result = buildTodayInputs({
      deals: [],
      activities: [
        {
          id: 'a-contact',
          title: 'Telefon do klienta',
          contact_id: 'contact-1',
          company_id: 'company-1',
        },
      ],
    });

    expect(result.candidates[0].href).toBe(
      '/quick-call?contact=contact-1&company=company-1'
    );
  });

  it('turns calendar text into work context and keeps private rhythm visible', () => {
    const result = buildTodayInputs({
      deals: [],
      calendar: [
        {
          id: 'c1',
          title: 'PRYWATNE: trening',
          starts_at: '2026-09-08T08:00:00Z',
          ends_at: '2026-09-08T09:00:00Z',
          location: 'Rzeszów',
        },
      ],
    });
    expect(result.candidates[0]).toMatchObject({
      source: 'calendar',
      privateRhythm: true,
      context: 'RZESZOW_BIURO',
    });
    expect(currentWorkContext(result.calendarBlocks, now)).toBe(
      'RZESZOW_BIURO'
    );
  });
});
