export type CallAttempt = {
  id: string;
  occurred_at: string;
  phone_number?: string | null;
  call_result?: string | null;
  attempt_number?: number | null;
  expires_at?: string | null;
};

/**
 * Returns one current row per phone number. Input order is irrelevant.
 * A number leaves the retry queue after an answered/closed result,
 * three attempts, or expiry.
 */
export function buildCallRetryQueue<T extends CallAttempt>(
  history: T[],
  now = Date.now()
): T[] {
  const latestByNumber = new Map<string, T>();
  for (const row of [...history].sort(
    (a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)
  )) {
    const number = row.phone_number?.trim();
    if (number && !latestByNumber.has(number)) latestByNumber.set(number, row);
  }

  return [...latestByNumber.values()].filter(
    (row) =>
      ['nie_odebral', 'oddzwonic'].includes(row.call_result || '') &&
      Number(row.attempt_number || 0) < 3 &&
      (!row.expires_at || +new Date(row.expires_at) > now)
  );
}
