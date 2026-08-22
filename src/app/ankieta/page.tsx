import type { Metadata } from 'next';

import { FinancialQuestionnaireForm } from './questionnaire-form';

export const metadata: Metadata = {
  title: 'Ankieta przed spotkaniem — Makson',
  description:
    'Przygotuj najważniejsze informacje finansowe przed rozmową z ekspertem.',
};

export default function QuestionnairePage() {
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
            Wypełnij tyle, ile wiesz. Przy pozostałych informacjach zaznacz, że
            sprawdzisz je przed spotkaniem albo omówisz wspólnie z ekspertem.
          </p>
        </div>
        <FinancialQuestionnaireForm />
      </section>
    </main>
  );
}
