import { describe, expect, it } from 'vitest';
import { canonicalSpousePair, normalizeSpouseLinks } from './spouse-relations';

describe('spouse relations', () => {
  it('stores an undirected pair in canonical order', () => {
    expect(canonicalSpousePair('b', 'a')).toEqual({
      contact_a_id: 'a',
      contact_b_id: 'b',
    });
  });

  it('resolves the spouse from either side of the relationship', () => {
    const rows = [
      {
        contact_a_id: 'a',
        contact_b_id: 'b',
        contact_a: { id: 'a', name: 'Anna', phone: '111' },
        contact_b: { id: 'b', name: 'Bartek', phone: '222' },
      },
    ];
    expect(normalizeSpouseLinks(rows, ['a', 'b'])).toEqual([
      { contactId: 'a', spouse: rows[0].contact_b },
      { contactId: 'b', spouse: rows[0].contact_a },
    ]);
  });
});
