import { describe, expect, it } from 'vitest';
import { buildCallRetryQueue, type CallAttempt } from './call-queue';

const now = +new Date('2026-08-22T12:00:00Z');
const row = (input: Partial<CallAttempt>): CallAttempt => ({
  id: input.id ?? crypto.randomUUID(),
  occurred_at: input.occurred_at ?? '2026-08-22T10:00:00Z',
  phone_number: input.phone_number ?? '500600700',
  call_result: input.call_result ?? 'nie_odebral',
  attempt_number: input.attempt_number ?? 1,
  expires_at: input.expires_at ?? '2026-09-22T10:00:00Z',
  next_contact_at: input.next_contact_at,
  completed: input.completed,
});

describe('buildCallRetryQueue', () => {
  it('keeps an unanswered number before the third attempt', () => {
    expect(buildCallRetryQueue([row({})], now)).toHaveLength(1);
  });

  it('removes the number after the third attempt', () => {
    expect(buildCallRetryQueue([row({ attempt_number: 3 })], now)).toEqual([]);
  });

  it('uses the latest result and removes an answered number', () => {
    const history = [
      row({ id: 'old', occurred_at: '2026-08-21T10:00:00Z' }),
      row({
        id: 'new',
        occurred_at: '2026-08-22T10:00:00Z',
        call_result: 'odebral',
        attempt_number: 2,
      }),
    ];
    expect(buildCallRetryQueue(history, now)).toEqual([]);
  });

  it('removes an expired number', () => {
    expect(
      buildCallRetryQueue([row({ expires_at: '2026-08-01T10:00:00Z' })], now)
    ).toEqual([]);
  });

  it('keeps a planned follow-up and orders planned calls by deadline', () => {
    const later = row({
      id: 'later',
      phone_number: '500600701',
      call_result: 'follow_up',
      completed: false,
      next_contact_at: '2026-08-24T10:00:00Z',
    });
    const sooner = row({
      id: 'sooner',
      phone_number: '500600702',
      call_result: 'follow_up',
      completed: false,
      next_contact_at: '2026-08-23T10:00:00Z',
    });
    expect(
      buildCallRetryQueue([later, sooner], now).map((item) => item.id)
    ).toEqual(['sooner', 'later']);
  });
});

