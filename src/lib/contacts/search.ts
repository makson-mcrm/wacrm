/** PostgREST filter text: punctuation cannot introduce extra OR clauses. */
export function contactSearchTerm(value: string): string {
  const term = value.trim();
  if (term.length < 3) return '';
  if (/^[+\d\s().-]+$/.test(term)) {
    const digits = term.replace(/\D/g, '');
    return digits.length >= 3 ? digits : '';
  }
  return term.replace(/[,()%_*\\"]/g, ' ').trim();
}

export function contactSearchFilter(value: string): string {
  const term = contactSearchTerm(value);
  return term
    ? `name.ilike.%${term}%,phone_normalized.ilike.%${term}%,email.ilike.%${term}%`
    : '';
}
