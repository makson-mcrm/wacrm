import { describe, expect, it } from 'vitest';
import { isValidNip, normalizeNip } from './nip';

describe('NIP duplicate key', () => {
  it('normalizes common separators to one key', () => {
    expect(normalizeNip('123-456-78-90')).toBe('1234567890');
    expect(normalizeNip('123 456 78 90')).toBe('1234567890');
  });

  it('accepts an empty optional NIP or exactly ten digits', () => {
    expect(isValidNip('')).toBe(true);
    expect(isValidNip('123-456-78-90')).toBe(true);
    expect(isValidNip('123')).toBe(false);
  });
});

