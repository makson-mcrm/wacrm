import { describe, expect, it } from 'vitest';
import {
  activityHistoryLabel,
  activityHistoryRelation,
} from './activity-history';

describe('activity history labels', () => {
  it('shows prepared SMS without claiming it was sent', () => {
    expect(activityHistoryLabel({ activity_type: 'wiadomosc', activity_status: 'PRZYGOTOWANO_SMS' }))
      .toBe('PRZYGOTOWANO SMS');
  });

  it('keeps calls and follow-ups in the same history', () => {
    expect(activityHistoryLabel({ activity_type: 'telefon', activity_status: 'WYKONANE' })).toBe('TELEFON');
    expect(activityHistoryLabel({ activity_type: 'follow_up', activity_status: 'PLANOWANE' })).toBe('FOLLOW-UP');
  });

  it('scopes Deal B history only by Deal B, never by Contact A', () => {
    expect(
      activityHistoryRelation({
        contactId: 'contact-a',
        companyId: 'company-a',
        dealId: 'deal-b',
      })
    ).toEqual(['deal_id', 'deal-b']);
  });
});
