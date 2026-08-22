'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

export function BookingForm() {
  const startedAt = useRef(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch('/api/public/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        phone: data.get('phone'),
        email: data.get('email'),
        company: data.get('company'),
        topic: data.get('topic'),
        startsAt: data.get('startsAt'),
        note: data.get('note'),
        website: data.get('website'),
        consent: data.get('consent') === 'on',
        startedAt: startedAt.current,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    setSending(false);
    setMessage(
      result.message || result.error || 'Nie udało się zapisać rezerwacji.'
    );
    if (response.ok) form.reset();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Imię i nazwisko" required />
        <Field name="phone" label="Telefon" type="tel" required />
        <Field name="email" label="E-mail" type="email" />
        <Field name="company" label="Firma (opcjonalnie)" />
      </div>
      <label className="block space-y-2 text-sm font-medium">
        <span>Temat rozmowy</span>
        <select
          name="topic"
          required
          defaultValue=""
          className="border-input bg-background h-11 w-full rounded-xl border px-3"
        >
          <option value="" disabled>
            Wybierz temat
          </option>
          <option>Analiza sytuacji finansowej</option>
          <option>Kredyt hipoteczny</option>
          <option>Finansowanie firmy</option>
          <option>Refinansowanie</option>
          <option>Inny temat</option>
        </select>
      </label>
      <Field name="startsAt" label="Termin" type="datetime-local" required />
      <label className="block space-y-2 text-sm font-medium">
        <span>Krótka informacja przed rozmową</span>
        <textarea
          name="note"
          rows={4}
          className="border-input bg-background w-full rounded-xl border px-3 py-2"
        />
      </label>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />
      <label className="text-muted-foreground flex items-start gap-3 text-sm">
        <input name="consent" type="checkbox" required className="mt-1" />
        Zgadzam się na kontakt i obsługę tej rezerwacji.
      </label>
      {message && (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {message}
        </p>
      )}
      <button
        disabled={sending}
        className="bg-primary text-primary-foreground h-11 w-full rounded-xl font-medium disabled:opacity-60"
      >
        {sending ? 'Zapisuję…' : 'Zarezerwuj termin'}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="border-input bg-background h-11 w-full rounded-xl border px-3"
      />
    </label>
  );
}
