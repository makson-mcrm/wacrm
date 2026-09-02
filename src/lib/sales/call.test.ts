import { describe, expect, it } from 'vitest';
import { buildAfterCallUrl, buildTelHref } from './call';

describe('iPhone call handoff', () => {
  it('uses the exact phone in the tel link', () => {
    expect(buildTelHref('+48502324024')).toBe('tel:+48502324024');
  });

  it('returns to the existing quick activity with entity context', () => {
    expect(buildAfterCallUrl({ contactId: 'c 1', companyId: 'co-1', dealId: 'd-1' }))
      .toBe('/quick-call?afterCall=1&contact=c+1&company=co-1&deal=d-1');
  });
});

