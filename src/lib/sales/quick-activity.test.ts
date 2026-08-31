import { describe, expect, it } from 'vitest';
import { nextBusinessDay, phoneContains, phoneSearchStrength, suggestedRetryAt } from './quick-activity';
describe('quick activity helpers', () => {
  it('starts suggestions at three digits and strengthens at six', () => {
    expect(phoneSearchStrength('12')).toBe('none');
    expect(phoneSearchStrength('123')).toBe('suggest');
    expect(phoneSearchStrength('+48 123-456')).toBe('strong');
  });
  it('matches formatted phone numbers by digits', () => {
    expect(phoneContains('+48 508 202 166', '202166')).toBe(true);
    expect(phoneContains('+48 508 202 166', '999')).toBe(false);
  });
  it('moves Friday to the next business day', () => {
    expect(nextBusinessDay(new Date('2026-08-28T12:00:00')).getDay()).toBe(1);
  });
  it('stops automatic retries after the third missed attempt', () => {
    expect(suggestedRetryAt(3, new Date('2026-08-31T12:00:00'))).toBeNull();
  });
});

