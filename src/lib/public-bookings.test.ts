import { describe, expect, it, vi } from 'vitest';
import { parsePublicBooking } from './public-bookings';

describe('parsePublicBooking', () => {
  it('accepts a valid future booking', () => {
    vi.setSystemTime(new Date('2026-08-22T10:00:00Z'));
    const result = parsePublicBooking({
      name: 'Grzegorz Wilecki',
      phone: '+48500600700',
      email: 'grzegorz@example.pl',
      company: 'Firma Grzegorza',
      topic: 'Kredyt hipoteczny',
      startsAt: '2026-08-25T10:00:00Z',
      note: 'Rozmowa z żoną',
      consent: true,
    });
    expect(result.startsAt).toBe('2026-08-25T10:00:00.000Z');
    expect(result.company).toBe('Firma Grzegorza');
  });

  it('rejects a past date', () => {
    vi.setSystemTime(new Date('2026-08-22T10:00:00Z'));
    expect(() =>
      parsePublicBooking({
        name: 'Grzegorz Wilecki',
        phone: '+48500600700',
        topic: 'Analiza',
        startsAt: '2026-08-20T10:00:00Z',
        consent: true,
      })
    ).toThrow('Wybierz przyszły termin spotkania.');
  });
});
