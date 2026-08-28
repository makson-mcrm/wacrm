'use client';

import { useRef, useState } from 'react';
import type { FormEvent, InputHTMLAttributes } from 'react';

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function LeadForm() {
  const startedAt = useRef(Date.now());
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const leadContext = {
      name: String(data.get('name') ?? ''),
      phone: String(data.get('phone') ?? ''),
      email: String(data.get('email') ?? ''),
      company: String(data.get('company') ?? ''),
    };
    setState({ kind: 'sending' });
    try {
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          phone: data.get('phone'),
          email: data.get('email'),
          company: data.get('company'),
          inquiryType: data.get('inquiryType'),
          message: data.get('message'),
          callbackPreference: data.get('callbackPreference'),
          website: data.get('website'),
          consent: data.get('consent') === 'on',
          startedAt: startedAt.current,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || 'Nie udało się wysłać formularza.');
      window.sessionStorage.setItem(
        'mcrmLeadContext',
        JSON.stringify(leadContext)
      );
      form.reset();
      startedAt.current = Date.now();
      setState({
        kind: 'success',
        message: result.message || 'Zgłoszenie zostało zapisane.',
      });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Nie udało się wysłać formularza.',
      });
    }
  }

  if (state.kind === 'success') {
    return (
      <div
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6"
        role="status"
      >
        <h2 className="text-xl font-semibold">Zgłoszenie przyjęte</h2>
        <p className="text-muted-foreground mt-2 text-sm">{state.message}</p>
        <div className="mt-5">
          <QuestionnaireLink />
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Imię i nazwisko"
          name="name"
          autoComplete="name"
          required
        />
        <Field
          label="Telefon z kodem kraju"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+48 500 000 000"
          required
        />
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <Field label="Firma" name="company" autoComplete="organization" />
      </div>

      <label className="block space-y-2 text-sm font-medium">
        <span>
          Czego dotyczy rozmowa? <span aria-hidden="true">*</span>
        </span>
        <select
          name="inquiryType"
          required
          defaultValue=""
          className="border-input bg-background focus:border-ring focus:ring-ring/30 h-11 w-full rounded-xl border px-3 transition outline-none focus:ring-3"
        >
          <option value="" disabled>
            Wybierz temat
          </option>
          <option value="financial-audit">
            Audyt finansowy / sprawdzenie możliwości
          </option>
          <option value="mortgage">Kredyt hipoteczny</option>
          <option value="mortgage-refinancing">
            Refinansowanie kredytu hipotecznego
          </option>
          <option value="business-financing">Finansowanie firmy</option>
          <option value="cash-loan">Kredyt gotówkowy</option>
          <option value="leasing">Leasing</option>
          <option value="other-financial">Inna potrzeba finansowa</option>
        </select>
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>
          Opisz swoją potrzebę finansową <span aria-hidden="true">*</span>
        </span>
        <textarea
          name="message"
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          placeholder="Np. chcę sprawdzić możliwości finansowe, obniżyć ratę kredytu albo sfinansować rozwój firmy…"
          className="border-input bg-background focus:border-ring focus:ring-ring/30 w-full rounded-xl border px-3 py-2 transition outline-none focus:ring-3"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>
          Preferowana godzina kontaktu <span aria-hidden="true">*</span>
        </span>
        <select
          name="callbackPreference"
          required
          defaultValue=""
          className="border-input bg-background focus:border-ring focus:ring-ring/30 h-11 w-full rounded-xl border px-3 transition outline-none focus:ring-3"
        >
          <option value="" disabled>
            Wybierz przedział
          </option>
          <option value="09:00-12:00">9:00–12:00</option>
          <option value="12:00-15:00">12:00–15:00</option>
          <option value="after-15:00">Po 15:00</option>
          <option value="any-time">Bez znaczenia</option>
        </select>
      </label>

      <div
        className="absolute top-auto left-[-10000px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Strona internetowa
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="text-muted-foreground flex items-start gap-3 text-sm leading-6">
        <input
          name="consent"
          type="checkbox"
          required
          className="accent-primary mt-1 size-4"
        />
        <span>
          Wyrażam zgodę na kontakt w sprawie mojego zapytania. Zgoda jest
          dobrowolna i może zostać wycofana.
        </span>
      </label>

      {state.kind === 'error' && (
        <p
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={state.kind === 'sending'}
        className="bg-primary text-primary-foreground hover:bg-primary-hover h-11 w-full rounded-xl px-5 font-medium transition disabled:cursor-wait disabled:opacity-60"
      >
        {state.kind === 'sending' ? 'Zapisuję…' : 'Wyślij zgłoszenie'}
      </button>
      <QuestionnaireLink />
    </form>
  );
}

function QuestionnaireLink() {
  return (
    <div className="border-primary/20 bg-primary-soft rounded-xl border px-4 py-3 text-center">
      <p className="text-muted-foreground text-sm">
        Chcesz lepiej przygotować audyt przed spotkaniem?
      </p>
      <a
        href="/ankieta"
        className="text-primary mt-1 inline-block text-sm font-semibold underline underline-offset-4"
      >
        Przejdź do pełnej ankiety badania potrzeb
      </a>
      <span className="text-muted-foreground mx-2">lub</span>
      <a
        href="/rezerwacja"
        className="text-primary mt-1 inline-block text-sm font-semibold underline underline-offset-4"
      >
        zarezerwuj rozmowę
      </a>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        {...props}
        maxLength={
          props.name === 'email' ? 254 : props.name === 'phone' ? 40 : 160
        }
        className="border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 h-11 w-full rounded-xl border px-3 transition outline-none focus:ring-3"
      />
    </label>
  );
}
