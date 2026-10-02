import { describe, expect, it } from 'vitest';
import {
  activityHistoryLabel,
  activityHistoryRelation,
} from './activity-history';
import { mergeActivityHistory } from '../../components/sales/activity-history';

describe('activity history labels', () => {
  it('shows prepared SMS without claiming it was sent', () => {
    expect(
      activityHistoryLabel({
        activity_type: 'wiadomosc',
        activity_status: 'PRZYGOTOWANO_SMS',
      })
    ).toBe('PRZYGOTOWANO SMS');
  });

  it('keeps calls and follow-ups in the same history', () => {
    expect(
      activityHistoryLabel({
        activity_type: 'telefon',
        activity_status: 'WYKONANE',
      })
    ).toBe('TELEFON');
    expect(
      activityHistoryLabel({
        activity_type: 'follow_up',
        activity_status: 'PLANOWANE',
      })
    ).toBe('FOLLOW-UP');
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

  it('includes a contact note in the history in descending date order', () => {
    const history = mergeActivityHistory(
      [
        {
          id: 'activity-1',
          title: 'Telefon',
          description: null,
          activity_type: 'telefon',
          activity_status: null,
          call_result: null,
          phone_number: null,
          next_action: null,
          next_action_date: null,
          occurred_at: '2026-10-01T10:00:00.000Z',
        },
      ],
      [
        {
          id: 'note-1',
          user_id: 'user-1',
          note_text: 'Notatka klienta',
          created_at: '2026-10-02T10:00:00.000Z',
        },
      ]
    );

    expect(history.map((item) => item.kind)).toEqual(['note', 'activity']);
    expect(history[0]).toMatchObject({
      kind: 'note',
      note: { note_text: 'Notatka klienta' },
    });
  });
});
