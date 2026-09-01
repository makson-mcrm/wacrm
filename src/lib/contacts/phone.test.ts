import { describe, expect, it } from 'vitest';
import { canonicalPhone, isPossiblePhoneDuplicate, parseCrmPhone } from './phone';

describe('CRM phone integrity', () => {
  it.each(['502324024', '502 324 024', '+48 502 324 024', '0048 502 324 024'])(
    'normalizes %s to one Polish number', (value) => expect(canonicalPhone(value)).toBe('+48502324024')
  );
  it('rejects an overlong bare Polish number', () => expect(parseCrmPhone('502324024024').valid).toBe(false));
  it('accepts an explicit foreign number', () => expect(canonicalPhone('+44 20 7946 0958')).toBe('+442079460958'));
  it('spots a likely one-digit typo without equating it', () => expect(isPossiblePhoneDuplicate('+48502324024', '+48502324025')).toBe(true));
});

