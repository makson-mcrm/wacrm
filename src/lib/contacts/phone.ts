export type CrmPhone =
  | { valid: true; canonical: string; digits: string; country: 'PL' | 'international' }
  | { valid: false; canonical: ''; digits: string; country: 'invalid'; reason: string };

/** Canonical CRM format is E.164 (`+` and digits). Bare numbers are Polish. */
export function parseCrmPhone(value: string): CrmPhone {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');
  const explicitInternational = raw.startsWith('+') || digits.startsWith('00');

  let canonicalDigits = digits;
  if (digits.startsWith('00')) canonicalDigits = digits.slice(2);

  if (!explicitInternational) {
    if (digits.length !== 9) {
      return { valid: false, canonical: '', digits, country: 'invalid', reason: 'Polski numer telefonu musi mieć dokładnie 9 cyfr.' };
    }
    canonicalDigits = `48${digits}`;
  }

  if (canonicalDigits.startsWith('48')) {
    if (canonicalDigits.length !== 11) {
      return { valid: false, canonical: '', digits, country: 'invalid', reason: 'Polski numer telefonu musi mieć dokładnie 9 cyfr po prefiksie +48.' };
    }
    return { valid: true, canonical: `+${canonicalDigits}`, digits: canonicalDigits, country: 'PL' };
  }

  if (!/^[1-9]\d{6,14}$/.test(canonicalDigits)) {
    return { valid: false, canonical: '', digits, country: 'invalid', reason: 'Podaj poprawny numer międzynarodowy z prefiksem + lub 00.' };
  }
  return { valid: true, canonical: `+${canonicalDigits}`, digits: canonicalDigits, country: 'international' };
}

export function canonicalPhone(value: string): string {
  const parsed = parseCrmPhone(value);
  return parsed.valid ? parsed.canonical : '';
}

export function phoneDigits(value: string): string {
  const parsed = parseCrmPhone(value);
  return parsed.valid ? parsed.digits : '';
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

export function isPossiblePhoneDuplicate(left: string, right: string): boolean {
  const a = left.replace(/\D/g, '');
  const b = right.replace(/\D/g, '');
  if (a.length < 7 || b.length < 7 || a === b) return false;
  return editDistance(a, b) <= 1 || ((a.includes(b) || b.includes(a)) && Math.abs(a.length - b.length) <= 3);
}

