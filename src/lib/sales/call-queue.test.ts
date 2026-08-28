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
});
