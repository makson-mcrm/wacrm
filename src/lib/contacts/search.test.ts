import { describe, expect, it } from 'vitest';
import { contactSearchFilter, contactSearchTerm } from './search';

describe('wyszukiwanie kontaktów K3', () => {
  it('filtruje od trzech znaków i nie wysyła krótszych zapytań', () => {
    expect(contactSearchFilter(' Al ')).toBe('');
    expect(contactSearchFilter(' Ala ')).toContain('name.ilike.%Ala%');
  });
  it('szuka sformatowanego telefonu w znormalizowanej kolumnie', () => {
    expect(contactSearchFilter('+48 (500) 111-222')).toContain(
      'phone_normalized.ilike.%48500111222%'
    );
    expect(contactSearchTerm('500-111')).toBe('500111');
    expect(contactSearchTerm('+ 5')).toBe('');
  });
  it('nie pozwala interpunkcji dopisać dodatkowego filtra PostgREST', () => {
    expect(contactSearchFilter('Ala,(name.eq.*)')).toBe(
      'name.ilike.%Ala  name.eq.%,phone_normalized.ilike.%Ala  name.eq.%,email.ilike.%Ala  name.eq.%'
    );
  });
});
