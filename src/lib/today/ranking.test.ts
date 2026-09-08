import { describe, expect, it } from 'vitest';
import {
  buildTodayPlan,
  inferWorkContext,
  type TodayCandidate,
} from './ranking';

const now = new Date('2026-09-08T08:00:00Z'); // 10:00 Europe/Warsaw

function candidate(overrides: Partial<TodayCandidate>): TodayCandidate {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    source: 'deal',
    title: 'Sprawa',
    ...overrides,
  };
}

describe('M3 Today ranking', () => {
  it('answers TERAZ with one highest revenue action and a transparent reason', () => {
    const plan = buildTodayPlan({
      now,
      currentContext: 'DOM_KOMPUTER',
      candidates: [
        candidate({
          id: 'lead',
          signal: 'NOWY_TELEFON',
          title: 'Nowy telefon',
        }),
        candidate({
          id: 'blocked',
          title: 'Hipoteka Kowalscy',
          blocker: 'Brakuje decyzji banku',
          stagePosition: 5,
        }),
      ],
    });
    expect(plan.now).toHaveLength(1);
    expect(plan.now[0]).toMatchObject({
      id: 'blocked',
      lane: 'PRZYCHOD_TERAZ',
      reason: 'bloker na zaawansowanej sprawie',
    });
    expect(plan.nextBlock[0].id).toBe('lead');
  });

  it('orders launch, decision and application before future revenue', () => {
    const plan = buildTodayPlan({
      now,
      candidates: [
        candidate({ id: 'later', signal: 'WARTOSCIOWY_KONTAKT' }),
        candidate({
          id: 'application',
          stageName: '5. WNIOSKI',
          signal: 'WNIOSEK',
        }),
        candidate({ id: 'decision', signal: 'DECYZJA' }),
        candidate({ id: 'launch', stageName: '6. URUCHOMIENIE / FV' }),
      ],
    });
    expect([plan.now[0].id, ...plan.nextBlock.map((item) => item.id)]).toEqual([
      'launch',
      'decision',
      'application',
      'later',
    ]);
  });

  it('caps main work at six and never lets T12 displace revenue', () => {
    const revenue = Array.from({ length: 7 }, (_, index) =>
      candidate({ id: `r${index}`, signal: 'BRAK_RUCHU' })
    );
    const plan = buildTodayPlan({
      now,
      candidates: [
        ...revenue,
        candidate({ id: 't12', source: 'priority', title: 'T12: porządek' }),
      ],
    });
    const all = [...plan.now, ...plan.nextBlock, ...plan.laterToday];
    expect(plan.mainCount).toBe(6);
    expect(all.some((item) => item.id === 't12')).toBe(false);
  });

  it('normally selects one T12 and allows a second only when short and related', () => {
    const plan = buildTodayPlan({
      now,
      candidates: [
        candidate({ id: 'revenue', dealId: 'deal-1', signal: 'DECYZJA' }),
        candidate({
          id: 't1',
          source: 'priority',
          title: 'T12: pierwsze',
          manualPriority: 1,
        }),
        candidate({
          id: 't2',
          source: 'priority',
          title: 'T12: dokumenty tej sprawy',
          dealId: 'deal-1',
          durationMinutes: 15,
        }),
        candidate({ id: 't3', source: 'priority', title: 'T12: inne' }),
      ],
    });
    const t12 = [...plan.now, ...plan.nextBlock, ...plan.laterToday].filter(
      (item) => item.lane === 'T12'
    );
    expect(t12.map((item) => item.id)).toEqual(['t1', 't2']);
  });

  it('respects the current and next calendar context', () => {
    const plan = buildTodayPlan({
      now,
      currentContext: 'DOM_KOMPUTER',
      calendarBlocks: [
        {
          id: 'office',
          title: 'Rzeszów',
          startsAt: '2026-09-08T11:00:00Z',
          context: 'RZESZOW_BIURO',
        },
      ],
      candidates: [
        candidate({
          id: 'home',
          context: 'DOM_KOMPUTER',
          signal: 'NOWY_TELEFON',
        }),
        candidate({
          id: 'office-task',
          context: 'RZESZOW_BIURO',
          signal: 'BRAK_RUCHU',
        }),
      ],
    });
    expect(plan.now[0].id).toBe('home');
    expect(plan.nextBlock.some((item) => item.id === 'office-task')).toBe(true);
  });

  it('keeps private rhythm visible without counting it into Ivy Lee six', () => {
    const plan = buildTodayPlan({
      now,
      candidates: [
        candidate({ id: 'revenue', signal: 'NOWY_TELEFON' }),
        candidate({
          id: 'private',
          source: 'priority',
          title: 'PRYWATNE: trening',
        }),
      ],
    });
    expect(plan.mainCount).toBe(1);
    expect([...plan.now, ...plan.nextBlock, ...plan.laterToday]).toContainEqual(
      expect.objectContaining({ id: 'private', lane: 'PRYWATNE', main: false })
    );
  });

  it('infers DOM/BIURO context from existing calendar text', () => {
    expect(inferWorkContext('Spotkanie — Rzeszów, biuro')).toBe(
      'RZESZOW_BIURO'
    );
    expect(inferWorkContext('Analiza online przy komputerze')).toBe(
      'DOM_KOMPUTER'
    );
    expect(inferWorkContext('Telefon')).toBe('DOWOLNY');
  });
});

