import { describe, expect, it } from 'vitest';
import { chooseSyncDirection, googleEventBody } from './sync-helpers';

describe('Google Calendar sync helpers', () => {
  it('detects an ambiguous two-sided edit', () => {
    expect(
      chooseSyncDirection({
        localUpdatedAt: '2026-09-02T11:00:00Z',
        googleUpdatedAt: '2026-09-02T12:00:00Z',
        lastSyncedAt: '2026-09-02T10:00:00Z',
        differs: true,
      }),
    ).toBe('conflict');
  });

  it('lets the only newer side win', () => {
    expect(
      chooseSyncDirection({
        localUpdatedAt: '2026-09-02T09:00:00Z',
        googleUpdatedAt: '2026-09-02T12:00:00Z',
        lastSyncedAt: '2026-09-02T10:00:00Z',
        differs: true,
      }),
    ).toBe('google');
  });

  it('sends only scheduling fields, never CRM relations or sensitive notes', () => {
    const body = googleEventBody({
      title: 'Spotkanie',
      starts_at: '2026-09-03T08:00:00Z',
    });
    expect(body).toEqual({
      summary: 'Spotkanie',
      start: { dateTime: '2026-09-03T08:00:00Z', timeZone: 'Europe/Warsaw' },
      end: { dateTime: '2026-09-03T09:00:00.000Z', timeZone: 'Europe/Warsaw' },
    });
    expect(JSON.stringify(body)).not.toMatch(/description|contact|company|deal|pesel/i);
  });
});

