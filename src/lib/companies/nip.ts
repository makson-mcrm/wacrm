/** Canonical digits-only representation used for NIP duplicate control. */
export function normalizeNip(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export function isValidNip(value: string | null | undefined): boolean {
  const normalized = normalizeNip(value);
  return normalized.length === 0 || normalized.length === 10;
}

