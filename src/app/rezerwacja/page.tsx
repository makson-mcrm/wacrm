import type { Metadata } from 'next';
import { BookingForm } from './booking-form';

export const metadata: Metadata = {
  title: 'Rezerwacja rozmowy — Makson',
  description: 'Zarezerwuj termin rozmowy finansowej.',
};

export default function BookingPage() {
  return (
    <main className="bg-background text-foreground min-h-screen px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            Makson
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Zarezerwuj rozmowę</h1>
          <p className="text-muted-foreground mt-3">
            Wybierz termin. Rezerwacja trafi do Kontaktu i kalendarza CRM, ale
            nie utworzy Deala bez kwalifikacji.
          </p>
        </header>
        <div className="border-border bg-card rounded-3xl border p-5 shadow-xl sm:p-8">
          <BookingForm />
        </div>
      </section>
    </main>
  );
}
