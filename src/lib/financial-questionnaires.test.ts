import { describe, expect, it } from 'vitest';

import {
  buildPreliminaryAnalysis,
  parseFinancialQuestionnaire,
  questionnaireMissingItems,
  questionnairePreparationItems,
} from './financial-questionnaires';

const base = {
  name: 'Jan Kowalski',
  phone: '+48500100200',
  email: '',
  company: '',
  consent: true,
  startedAt: Date.now() - 5000,
  goal: 'Refinansowanie',
  amount: '350000',
  timeline: 'Do 3 miesięcy',
  incomeSource1: 'Umowa o pracę',
  incomeNet1: '9000',
  livingCosts: '4500',
  debts: 'Hipoteka: saldo 330000, rata 2600',
  savings: '30000',
  documents: ['Umowa kredytowa'],
  incomePreparation: 'provided',
  costsPreparation: 'provided',
  debtsPreparation: 'provided',
  assetsPreparation: 'provided',
  documentsPreparation: 'provided',
};

describe('financial questionnaire', () => {
  it('requires only identity and consent, not every financial field', () => {
    const parsed = parseFinancialQuestionnaire({
      name: 'Jan Kowalski',
      phone: '+48500100200',
      consent: true,
    });
    expect(parsed.responses.goal).toBe('');
    expect(questionnaireMissingItems(parsed)).toContain('Cel sprawy');
  });

  it('marks a fully supplied core questionnaire without missing items', () => {
    const parsed = parseFinancialQuestionnaire(base);
    expect(questionnaireMissingItems(parsed)).toEqual([]);
  });

  it('turns client choices into a preparation list', () => {
    const parsed = parseFinancialQuestionnaire({
      ...base,
      incomePreparation: 'check_before_meeting',
      debtsPreparation: 'discuss_at_meeting',
    });
    expect(questionnairePreparationItems(parsed.preparationPlan)).toEqual([
      'Sprawdź przed spotkaniem: dochody gospodarstwa.',
      'Przygotuj informacje, omówimy na spotkaniu: raty, salda kredytów i dostępne limity.',
    ]);
  });

  it('builds a readable preliminary analysis for the Deal', () => {
    const parsed = parseFinancialQuestionnaire(base);
    const analysis = buildPreliminaryAnalysis(parsed, []);
    expect(analysis).toContain('CEL I POTRZEBA: Refinansowanie');
    expect(analysis).toContain('ZOBOWIĄZANIA: Hipoteka');
    expect(analysis).toContain('nie decyzja kredytowa');
  });
});
