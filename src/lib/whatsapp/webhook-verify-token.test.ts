import { describe, expect, it } from 'vitest';
import {
  hashWebhookVerifyToken,
  matchesWebhookVerifyToken,
} from './webhook-verify-token';

describe('WhatsApp webhook verify token', () => {
  const token = 'mcrm_0123456789abcdefghijklmnopqrstuvwxyzABCDEF';
  const hash = hashWebhookVerifyToken(token);

  it('accepts the configured token', () => {
    expect(matchesWebhookVerifyToken(token, [hash])).toBe(true);
  });

  it('rejects a wrong token and malformed hashes', () => {
    expect(matchesWebhookVerifyToken(`${token}x`, [hash])).toBe(false);
    expect(matchesWebhookVerifyToken(token, ['not-a-hash'])).toBe(false);
  });

  it('rejects short candidates before comparing them', () => {
    expect(matchesWebhookVerifyToken('short', [hash])).toBe(false);
  });
});
