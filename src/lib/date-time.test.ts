import { describe, expect, it } from 'vitest';
import { formatWarsawDateTime, toWarsawDateTimeInput, warsawDateTimeInputToIso } from './date-time';

describe('Europe/Warsaw date time', () => {
  it('converts summer Warsaw time to UTC and back', () => {
    expect(warsawDateTimeInputToIso('2026-08-31T21:46')).toBe('2026-08-31T19:46:00.000Z');
    expect(toWarsawDateTimeInput('2026-08-31T19:46:00.000Z')).toBe('2026-08-31T21:46');
  });

  it('uses the winter UTC+1 offset', () => {
    expect(warsawDateTimeInputToIso('2026-12-01T09:00')).toBe('2026-12-01T08:00:00.000Z');
  });

  it('formats with Polish date and Warsaw hour', () => {
    expect(formatWarsawDateTime('2026-08-31T19:46:00.000Z')).toContain('21:46');
  });
});

