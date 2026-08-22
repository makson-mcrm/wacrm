import type { Metadata } from 'next';

import { LeadForm } from './lead-form';

export const metadata: Metadata = {
  title: 'Zapytanie o finansowanie — Makson',
  description:
    'Opisz potrzebę kredytową lub finansową. Oddzwonimy w wybranym przedziale.',
};

export default function PublicLeadFormPage() {
  return (
    <main className="bg-background text-foreground min-h-screen px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            Makson
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Porozmawiajmy o Twoich finansach
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl">
            Audyt finansowy, kredyt, refinansowanie lub finansowanie firmy.
            Opisz potrzebę, a oddzwonimy w wybranym przedziale godzin.
          </p>
        </div>
        <div className="border-border bg-card rounded-3xl border p-5 shadow-2xl shadow-black/10 sm:p-8">
          <LeadForm />
        </div>
      </section>
    </main>
  );
}
