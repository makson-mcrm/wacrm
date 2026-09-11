import crypto from 'node:crypto';

export function hashWebhookVerifyToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function matchesWebhookVerifyToken(
  candidate: string,
  expectedHashes: Array<string | null | undefined>
): boolean {
  if (candidate.length < 32 || candidate.length > 256) return false;

  const candidateHash = Buffer.from(hashWebhookVerifyToken(candidate), 'hex');
  return expectedHashes.some((hash) => {
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return false;
    const expected = Buffer.from(hash, 'hex');
    return (
      expected.length === candidateHash.length &&
      crypto.timingSafeEqual(candidateHash, expected)
    );
  });
}
