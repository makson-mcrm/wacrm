import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FinancialQuestionnaireForm } from './questionnaire-form';
import { QUESTIONNAIRE_FIELDS } from '@/lib/questionnaires/contract';

describe('K3/01-E: kontrakt istniejącego formularza ankiety', () => {
  it.each([false, true])(
    'renderuje 13 dotychczasowych pól i 4 kontrolowane pola tożsamości (CRM=%s)',
    (crm) => {
      const html = renderToStaticMarkup(
        <FinancialQuestionnaireForm
          crmContext={
            crm
              ? {
                  contactId: '00000000-0000-4000-8000-000000000001',
                  contact: {
                    name: 'Osoba Syntetyczna',
                    phone: '+48500100200',
                    email: '',
                    company: '',
                  },
                }
              : null
          }
        />
      );
      const names = [
        ...html.matchAll(/<(?:input|textarea|select)\b[^>]*\bname="([^"]+)"/g),
      ].map((match) => match[1]);
      expect(names).toHaveLength(13);
      expect(names.sort()).toEqual([...QUESTIONNAIRE_FIELDS].sort());
      expect([...html.matchAll(/<(?:input|textarea|select)\b/g)]).toHaveLength(
        17
      );
      const identity = [
        ...html.matchAll(/<input\b[^>]*autocomplete="([^"]+)"[^>]*>/gi),
      ]
        .map((match) => match[0])
        .filter((input) => !input.includes('name='));
      expect(identity).toHaveLength(4);
      expect(
        identity.map((input) => /autocomplete="([^"]+)"/i.exec(input)?.[1])
      ).toEqual(['name', 'tel', 'email', 'organization']);
      expect(
        identity.slice(0, 2).every((input) => input.includes('required'))
      ).toBe(true);
      expect(
        identity.slice(2).every((input) => !input.includes('required'))
      ).toBe(true);
      for (const label of [
        'Imię i nazwisko',
        'Telefon z kodem kraju',
        'E-mail',
        'Firma',
      ])
        expect(html).toContain(`<span>${label}</span>`);
      expect(html).toContain('mt-5 grid gap-5 sm:grid-cols-2');
      expect(html).not.toMatch(/<button[^>]*\sdisabled=/);
    }
  );
});
