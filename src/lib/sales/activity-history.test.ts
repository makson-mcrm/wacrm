import { describe, expect, it } from 'vitest';
import { activityHistoryLabel } from './activity-history';

describe('activity history labels', () => {
  it('shows prepared SMS without claiming it was sent', () => {
    expect(activityHistoryLabel({ activity_type: 'wiadomosc', activity_status: 'PRZYGOTOWANO_SMS' }))
      .toBe('PRZYGOTOWANO SMS');
  });

  it('keeps calls and follow-ups in the same history', () => {
    expect(activityHistoryLabel({ activity_type: 'telefon', activity_status: 'WYKONANE' })).toBe('TELEFON');
    expect(activityHistoryLabel({ activity_type: 'follow_up', activity_status: 'PLANOWANE' })).toBe('FOLLOW-UP');
  });
});

