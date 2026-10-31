'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { parseCrmPhone } from '@/lib/contacts/phone';
import {
  questionnaireFormPayload,
  type QuestionnaireContact,
} from '@/lib/questionnaires/contract';

type SubmitState =
  | { kind: 'idle' | 'sending' }
  | { kind: 'success'; message: string; missingItems: string[] }
  | { kind: 'error'; message: string };
const inputClass =
  'border-input bg-background focus:border-ring h-11 w-full rounded-xl border px-3 outline-none';

export function FinancialQuestionnaireForm({
  crmContext,
}: {
  crmContext?: { contactId: string; contact: QuestionnaireContact } | null;
} = {}) {
  const startedAt = useRef(Date.now());
  const [contact, setContact] = useState<QuestionnaireContact>(
    crmContext?.contact ?? {
      name: '',
      phone: '',
      email: '',
      company: '',
    }
  );
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  useEffect(() => {
    if (crmContext) return;
    try {
      const parsed = JSON.parse(
        window.sessionStorage.getItem('mcrmLeadContext') || 'null'
      );
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setContact({
          name: typeof parsed.name === 'string' ? parsed.name : '',
          phone: typeof parsed.phone === 'string' ? parsed.phone : '',
          email: typeof parsed.email === 'string' ? parsed.email : '',
          company: typeof parsed.company === 'string' ? parsed.company : '',
        });
      }
    } catch {
      // Missing or broken browser-only prefill must never block manual entry.
    }
  }, [crmContext]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contact.name.trim().length < 2) {
      setState({
        kind: 'error',
        message: 'Podaj imię i nazwisko.',
      });
      return;
    }
    const phone = parseCrmPhone(contact.phone);
    if (!phone.valid) {
      setState({
        kind: 'error',
        message: 'Podaj poprawny numer telefonu z kodem kraju (np. +48).',
      });
      return;
    }
    const body = questionnaireFormPayload(
      new FormData(event.currentTarget),
      { ...contact, name: contact.name.trim(), phone: phone.canonical },
      startedAt.current
    );
    setState({ kind: 'sending' });
    try {
      const response = await fetch(
        crmContext
          ? `/api/questionnaires?contact=${encodeURIComponent(crmContext.contactId)}`
          : '/api/public/questionnaires',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        missingItems?: string[];
      };
      if (!response.ok)
        throw new Error(result.error || 'Nie udało się zapisać ankiety.');
      setState({
        kind: 'success',
        message: result.message || 'Ankieta została zapisana.',
        missingItems: result.missingItems ?? [],
      });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Nie udało się zapisać ankiety.',
      });
    }
  }
  if (state.kind === 'success')
    return (
      <div
        className="border-border bg-card space-y-4 rounded-3xl border p-6"
        role="status"
      >
        <h2 className="text-xl font-semibold">Ankieta zapisana</h2>
        <p>{state.message}</p>
        {state.missingItems.length > 0 && (
          <>
            <p>Informacje do uzupełnienia na spotkaniu:</p>
            <ul className="list-inside list-disc">
              {state.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
        <p className="text-muted-foreground text-sm">
          Odpowiedzi i podsumowanie są zapisane przy kontakcie.
        </p>
      </div>
    );
  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <section className="border-border bg-card rounded-3xl border p-5 sm:p-8">
        <h2 className="text-xl font-semibold">Dane kontaktowe</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Jeżeli przechodzisz z formularza kontaktowego, dane są już
          uzupełnione.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <ControlledField
            label="Imię i nazwisko"
            value={contact.name}
            onChange={(value) => setContact({ ...contact, name: value })}
            autoComplete="name"
            required
          />
          <ControlledField
            label="Telefon z kodem kraju"
            type="tel"
            value={contact.phone}
            onChange={(value) => setContact({ ...contact, phone: value })}
            autoComplete="tel"
            required
          />
          <ControlledField
            label="E-mail"
            type="email"
            value={contact.email}
            onChange={(value) => setContact({ ...contact, email: value })}
            autoComplete="email"
          />
          <ControlledField
            label="Firma"
            value={contact.company}
            onChange={(value) => setContact({ ...contact, company: value })}
            autoComplete="organization"
          />
        </div>
      </section>
      <Section title="Cel, kwota i termin">
        <Select name="goal" label="Główny cel">
          <option value="">Jeszcze nie wiem</option>
          <option>Nowe środki</option>
          <option>Zakup lub budowa nieruchomości</option>
          <option>Refinansowanie lub konsolidacja</option>
          <option>Finansowanie firmy</option>
          <option>Leasing</option>
          <option>Audyt finansowy i bezpieczeństwo</option>
          <option>Inny cel</option>
        </Select>
        <Field name="amount" label="Potrzebna kwota lub przedział" />
        <Select name="timeline" label="Termin działania">
          <option value="">Jeszcze nie wiem</option>
          <option>Jak najszybciej</option>
          <option>Do 3 miesięcy</option>
          <option>3-6 miesięcy</option>
          <option>6-12 miesięcy</option>
          <option>Później niż za rok</option>
        </Select>
      </Section>
      <Section title="Gospodarstwo i zobowiązania">
        <Field name="adults" label="Liczba dorosłych" type="number" min="1" />
        <Field
          name="children"
          label="Liczba dzieci na utrzymaniu"
          type="number"
          min="0"
        />
        <Field name="city" label="Miejscowość" />
        <label className="block space-y-2 text-sm font-medium">
          <span>Kredyty, pożyczki, leasing, karty i limity</span>
          <textarea
            className={`${inputClass} h-auto py-2`}
            name="debts"
            rows={4}
          />
        </label>
      </Section>
      <Section title="Majątek i bezpieczeństwo">
        <Field name="savings" label="Oszczędności i środki własne" />
        <Field name="investments" label="Inwestycje" />
        <Select name="insurance" label="Zabezpieczenie rodziny i majątku">
          <option value="">Chcę sprawdzić</option>
          <option>Mam ubezpieczenie na życie</option>
          <option>Mam ubezpieczenie majątku</option>
          <option>Mam oba rodzaje</option>
          <option>Nie mam zabezpieczenia</option>
        </Select>
      </Section>
      <Section title="Dokumenty do przygotowania">
        <label className="block space-y-2 text-sm font-medium">
          <span>Dokumenty do analizy (możesz zaznaczyć kilka)</span>
          <select
            name="documents"
            multiple
            className={`${inputClass} h-36 py-2`}
          >
            <option>Dokumenty potwierdzające dochód</option>
            <option>Umowy lub harmonogramy kredytów</option>
            <option>Polisy do audytu</option>
            <option>Dokumenty firmy lub inwestycji</option>
          </select>
        </label>
        <p className="text-muted-foreground text-sm">
          Nie przesyłaj PESEL-u, numeru dowodu, haseł ani pełnych numerów
          rachunków. Wystarczy wskazać dostępne dokumenty.
        </p>
      </Section>
      <div
        className="absolute left-[-10000px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Strona internetowa
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <section className="border-border bg-card space-y-5 rounded-3xl border p-5 sm:p-8">
        <label className="flex items-start gap-3 text-sm">
          <input
            name="consent"
            type="checkbox"
            required
            className="accent-primary mt-1 size-4"
          />
          <span>
            Zgadzam się na wykorzystanie podanych informacji do przygotowania
            wstępnej analizy i spotkania. Dane mogą być niepełne i zostaną
            zweryfikowane wspólnie z ekspertem.
          </span>
        </label>
        {state.kind === 'error' && (
          <p className="text-destructive" role="alert">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={state.kind === 'sending'}
          className="bg-primary text-primary-foreground h-11 w-full rounded-xl px-5 font-medium disabled:opacity-60"
        >
          {state.kind === 'sending'
            ? 'Zapisuję…'
            : 'Zapisz ankietę i przygotuj listę na spotkanie'}
        </button>
      </section>
    </form>
  );
}
function ControlledField({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 h-11 w-full rounded-xl border px-3 transition outline-none focus:ring-3"
      />
    </label>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border bg-card space-y-5 rounded-3xl border p-5 sm:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input {...props} className={inputClass} />
    </label>
  );
}
function Select({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <select name={name} defaultValue="" className={inputClass}>
        {children}
      </select>
    </label>
  );
}
