// The questionnaire has 12 business fields and one anti-spam field.
// Identity is entered in the questionnaire, optionally prefilled by /formularz,
// and sent separately from these answers.
export const QUESTIONNAIRE_FIELDS = [
  'adults',
  'amount',
  'children',
  'city',
  'consent',
  'debts',
  'documents',
  'goal',
  'insurance',
  'investments',
  'savings',
  'timeline',
  'website',
] as const;
export const QUESTIONNAIRE_TEXT_FIELDS = [
  'adults',
  'amount',
  'children',
  'city',
  'debts',
  'goal',
  'insurance',
  'investments',
  'savings',
  'timeline',
] as const;
export type QuestionnaireAnswers = Record<
  (typeof QUESTIONNAIRE_TEXT_FIELDS)[number],
  string
> & {
  documents: string[];
  consent: true;
};
export type QuestionnaireContact = {
  name: string;
  phone: string;
  email: string;
  company: string;
};

export function questionnaireFormPayload(
  data: FormData,
  contact: QuestionnaireContact,
  startedAt: number
) {
  return {
    ...Object.fromEntries(
      QUESTIONNAIRE_FIELDS.map((field) => [field, data.get(field) ?? ''])
    ),
    documents: data.getAll('documents'),
    consent: data.get('consent') === 'on',
    contact,
    startedAt,
  };
}
