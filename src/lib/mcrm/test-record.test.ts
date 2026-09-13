import { describe, expect, it } from 'vitest';
import { isOperationalTestRecord } from './test-record';

describe('isOperationalTestRecord', () => {
  it.each([
    'LIVE_TEST klient',
    'MOBILE_TEST DRUGI DEAL',
    'P0_TEST Deal Trwalosc',
    'TEST: oddzwonić',
    'Yyy',
  ])('odseparowuje rekord testowy %s', (label) => {
    expect(isOperationalTestRecord(label)).toBe(true);
  });

  it.each([
    'Mój Hipo Grzegorz Wilewski',
    'Testament klienta',
    'ATEST Sp. z o.o.',
    '',
  ])('nie ukrywa prawdziwego rekordu %s', (label) => {
    expect(isOperationalTestRecord(label)).toBe(false);
  });
});
