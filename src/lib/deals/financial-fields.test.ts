import { describe, expect, it } from 'vitest';

import {
  BANK_STATUS_OPTIONS,
  DEAL_TYPE_OPTIONS,
  EMPTY_DEAL_FINANCIAL_VALUES,
  PRODUCT_OPTIONS,
  questionnaireStatusLabel,
} from './financial-fields';

describe('mCRM financial Deal fields', () => {
  it('keeps the confirmed Bigin product codes available', () => {
    expect(PRODUCT_OPTIONS).toEqual([
      '1_HIPO_OF_ML',
      '2_FIRMA_BC_ML',
      '3_FIRMA_BC_NML',
      '4_GOTOWKA_OF_NML',
      '5_LEASING_BC_ML',
    ]);
  });

  it('contains the Bigin deal type and positive bank decision', () => {
    expect(DEAL_TYPE_OPTIONS).toContain('NML OF');
    expect(BANK_STATUS_OPTIONS).toContain('Decyzja pozytywna');
  });

  it('starts without inventing questionnaire answers', () => {
    expect(EMPTY_DEAL_FINANCIAL_VALUES.questionnaireStatus).toBe('not_started');
    expect(EMPTY_DEAL_FINANCIAL_VALUES.questionnaireData).toEqual({});
    expect(EMPTY_DEAL_FINANCIAL_VALUES.missingItems).toEqual([]);
  });

  it('uses clear Polish questionnaire labels', () => {
    expect(questionnaireStatusLabel('partial')).toBe('Częściowo wypełniona');
  });
});
