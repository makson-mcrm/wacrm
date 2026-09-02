import { describe, expect, it } from 'vitest';
import {
  calculateWorkQueuePriority,
  compareWorkQueuePriority,
} from './priority';
const now = new Date('2026-09-02T10:00:00Z');
describe('work queue priority', () => {
  it('puts close-to-money blockers above new submissions', () => {
    expect(
      calculateWorkQueuePriority({
        sourceType: 'ALERT_CRM',
        blocker: 'Dokument',
        stagePosition: 5,
        now,
      }).score
    ).toBeGreaterThan(
      calculateWorkQueuePriority({ sourceType: 'STRONA', now }).score
    );
  });
  it('raises overdue and today deadlines', () => {
    expect(
      calculateWorkQueuePriority({
        sourceType: 'FOLLOW_UP',
        deadline: '2026-09-01T10:00:00Z',
        now,
      }).reason
    ).toBe('Zaległe');
    expect(
      calculateWorkQueuePriority({
        sourceType: 'FOLLOW_UP',
        deadline: '2026-09-02T15:00:00Z',
        now,
      }).reason
    ).toBe('Termin dziś');
  });
  it('marks a deal without next action', () => {
    expect(
      calculateWorkQueuePriority({ sourceType: 'ALERT_CRM', now }).reason
    ).toBe('Brak następnego kroku');
  });
  it('manual override wins over automatic score', () => {
    const base = { deadline: null, created_at: '2026-09-02T10:00:00Z' };
    expect(
      compareWorkQueuePriority(
        { ...base, manual_priority: 1, priorityScore: 100 },
        { ...base, manual_priority: 0, priorityScore: 700 }
      )
    ).toBeLessThan(0);
  });
});

