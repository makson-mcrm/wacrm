import type { Metadata } from 'next';

import { FinancialQuestionnaireForm } from './questionnaire-form';
import { loadCrmQuestionnaireContext } from '@/lib/questionnaires/crm-context';

export const metadata: Metadata = {
  title: 'Ankieta przed spotkaniem — Makson',
  description:
    'Przygotuj najważniejsze informacje finansowe przed rozmową z ekspertem.',
};

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams?: Promise<{ contact?: string | string[] }>;
}) {
  const params = await searchParams;
  const crmContext = await loadCrmQuestionnaireContext(params?.contact);
  return (
    <main className="bg-background text-foreground min-h-screen px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            Makson
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Przygotujmy spotkanie do konkretnych decyzji
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
            Wypełnij tyle, ile wiesz. Pozostałe informacje uzupełnisz przed
            spotkaniem albo omówisz wspólnie z ekspertem.
          </p>
        </div>
        <FinancialQuestionnaireForm
          key={crmContext?.contactId ?? 'public'}
          crmContext={crmContext}
        />
      </section>
    </main>
  );
}
