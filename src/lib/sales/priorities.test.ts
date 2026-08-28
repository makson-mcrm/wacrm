import { describe, expect, it } from 'vitest';
import { buildPrioritySuggestions } from './priorities';

describe('buildPrioritySuggestions', () => {
  const now = new Date('2026-08-22T10:00:00+02:00');

  it('puts an overdue blocked deal before an ordinary deal', () => {
    const result = buildPrioritySuggestions(
      [
        { id: 'ordinary', title: 'Zwykły Deal' },
        {
          id: 'urgent',
          title: 'Pilny Deal',
          next_action: 'Zadzwoń do banku',
          next_action_at: '2026-08-21T09:00:00+02:00',
          blocker: 'Brak zaświadczenia',
        },
      ],
      now,
      10
    );
    expect(result[0].deal_id).toBe('urgent');
    expect(result[0].reason).toContain('termin minął');
    expect(result[0].reason).toContain('bloker');
  });

  it('prioritizes decisions, launches and missing documents', () => {
    const result = buildPrioritySuggestions(
      [
        {
          id: 'decision',
          title: 'Hipoteka',
          stage: { name: '5. WNIOSKI / DECYZJA' },
          document_requirements: [{ status: 'brak' }],
        },
      ],
      now,
      10
    );
    expect(result[0].deal_id).toBe('decision');
    expect(result[0].reason).toContain('wnioski lub decyzja');
    expect(result[0].reason).toContain('brakujących dokumentów');
  });

  it('adds the daily NOWE/KONTAKT block when fewer than ten calls exist', () => {
    const result = buildPrioritySuggestions([], now, 4);
    expect(result).toEqual([
      expect.objectContaining({
        title: 'Blok NOWE/KONTAKT — wykonaj 6 z 10 telefonów',
        deal_id: null,
      }),
    ]);
  });

  it('returns no more than six suggestions', () => {
    const deals = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      title: `Deal ${index}`,
    }));
    expect(buildPrioritySuggestions(deals, now, 0)).toHaveLength(6);
  });
});
