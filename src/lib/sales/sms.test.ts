import { describe, expect, it } from 'vitest';
import { buildSmsHref, personalizeSms } from './sms';

describe('iPhone SMS handoff', () => {
  it('builds an sms link without sending anything', () => {
    expect(buildSmsHref('+48 502 324 024', 'Dzień dobry & do usłyszenia')).toBe(
      'sms:+48502324024?body=Dzie%C5%84%20dobry%20%26%20do%20us%C5%82yszenia'
    );
  });

  it('personalizes only the supported first-name placeholder', () => {
    expect(personalizeSms('Dzień dobry [IMIĘ_KLIENTA]', 'Jan Kowalski')).toBe('Dzień dobry Jan');
  });
});

