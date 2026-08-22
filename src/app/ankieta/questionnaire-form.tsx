'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';

type ContactContext = {
  name: string;
  phone: string;
  email: string;
  company: string;
};

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | {
      kind: 'success';
      message: string;
      missingItems: string[];
      preparationItems: string[];
    }
  | { kind: 'error'; message: string };

const selectClass =
  'border-input bg-background focus:border-ring focus:ring-ring/30 h-11 w-full rounded-xl border px-3 transition outline-none focus:ring-3';
const inputClass =
  'border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 h-11 w-full rounded-xl border px-3 transition outline-none focus:ring-3';
const textareaClass =
  'border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 w-full rounded-xl border px-3 py-2 transition outline-none focus:ring-3';

export function FinancialQuestionnaireForm() {
  const startedAt = useRef(Date.now());
  const [contact, setContact] = useState<ContactContext>({
    name: '',
    phone: '',
    email: '',
    company: '',
  });
  const [applicationMode, setApplicationMode] = useState('single');
  const [incomeSource1, setIncomeSource1] = useState('');
  const [incomeSource2, setIncomeSource2] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem('mcrmLeadContext');
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<ContactContext>;
      setContact({
        name: parsed.name ?? '',
        phone: parsed.phone ?? '',
        email: parsed.email ?? '',
        company: parsed.company ?? '',
      });
    } catch {
      // A broken browser-only prefill must never block the questionnaire.
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: 'sending' });
    const body = Object.fromEntries(data.entries()) as Record<string, unknown>;
    body.documents = data.getAll('documents');
    body.name = contact.name;
    body.phone = contact.phone;
    body.email = contact.email;
    body.company = contact.company;
    body.consent = data.get('consent') === 'on';
    body.startedAt = startedAt.current;

    try {
      const response = await fetch('/api/public/questionnaires', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        missingItems?: string[];
        preparationItems?: string[];
      };
      if (!response.ok)
        throw new Error(result.error || 'Nie udało się zapisać ankiety.');
      window.sessionStorage.removeItem('mcrmLeadContext');
      setState({
        kind: 'success',
        message: result.message || 'Ankieta została zapisana.',
        missingItems: result.missingItems ?? [],
        preparationItems: result.preparationItems ?? [],
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

  if (state.kind === 'success') {
    return (
      <div className="border-border bg-card space-y-5 rounded-3xl border p-6 sm:p-8">
        <div
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
          role="status"
        >
          <h2 className="text-xl font-semibold">Ankieta zapisana</h2>
          <p className="text-muted-foreground mt-2 text-sm">{state.message}</p>
        </div>
        {state.preparationItems.length > 0 && (
          <ResultList
            title="Przygotuj przed spotkaniem"
            items={state.preparationItems}
          />
        )}
        {state.missingItems.length > 0 && (
          <ResultList
            title="Te informacje uzupełnimy przed spotkaniem lub podczas niego"
            items={state.missingItems}
          />
        )}
        <p className="text-muted-foreground text-sm">
          Ekspert zobaczy odpowiedzi, wstępne podsumowanie oraz tę samą listę
          braków przy prowadzonej sprawie.
        </p>
      </div>
    );
  }

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

      <SurveySection number="1" title="Cel, kwota i termin">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="goal" label="Główny cel">
            <option value="">Jeszcze nie wiem</option>
            <option>Nowe środki</option>
            <option>Zakup lub budowa nieruchomości</option>
            <option>Refinansowanie lub konsolidacja</option>
            <option>Finansowanie firmy</option>
            <option>Leasing</option>
            <option>Audyt finansowy i bezpieczeństwo</option>
            <option>Inny cel</option>
          </SelectField>
          <Field name="amount" label="Potrzebna kwota lub przedział" />
          <SelectField name="timeline" label="Termin działania">
            <option value="">Jeszcze nie wiem</option>
            <option>Jak najszybciej</option>
            <option>Do 3 miesięcy</option>
            <option>3-6 miesięcy</option>
            <option>6-12 miesięcy</option>
            <option>Później niż za rok</option>
          </SelectField>
          <Field
            name="financialGoal"
            label="Inny ważny cel finansowy w najbliższych 3 latach"
          />
        </div>
        <TextAreaField
          name="expectedOutcome"
          label="Jaki konkretny rezultat ma dać spotkanie?"
        />
      </SurveySection>

      <SurveySection
        number="2"
        title="Gospodarstwo i dochody"
        preparationNames={['incomePreparation']}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            name="applicationMode"
            label="Do analizy przystępujesz"
            value={applicationMode}
            onChange={setApplicationMode}
          >
            <option value="single">Samodzielnie</option>
            <option value="joint">Z małżonkiem lub drugą osobą</option>
          </SelectField>
          <Field name="adults" label="Liczba dorosłych" type="number" min="1" />
          <Field
            name="children"
            label="Liczba dzieci na utrzymaniu"
            type="number"
            min="0"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="city" label="Miejscowość" />
          <SelectField name="propertyRegime" label="Sytuacja majątkowa">
            <option value="">Nie wiem / nie dotyczy</option>
            <option>Osoba samotna</option>
            <option>Małżeństwo - wspólność majątkowa</option>
            <option>Małżeństwo - rozdzielność majątkowa</option>
            <option>Związek nieformalny</option>
          </SelectField>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            name="incomeSource1"
            label="Źródło dochodu - osoba 1"
            value={incomeSource1}
            onChange={setIncomeSource1}
          >
            <IncomeOptions />
          </SelectField>
          <Field name="incomeNet1" label="Średni dochód netto" />
          <Field
            name="incomeSince1"
            label="Dochód uzyskiwany od"
            type="month"
          />
        </div>
        {incomeSource1 === 'Działalność gospodarcza' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              name="businessTaxation1"
              label="Forma opodatkowania / księgowości"
            />
            <Field name="businessSince1" label="Firma działa od" type="month" />
          </div>
        )}
        {applicationMode === 'joint' && (
          <div className="border-border space-y-5 border-l-2 pl-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                name="secondPersonName"
                label="Imię i nazwisko drugiej osoby"
              />
              <Field name="secondPersonPhone" label="Telefon drugiej osoby" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <SelectField
                name="incomeSource2"
                label="Źródło dochodu - osoba 2"
                value={incomeSource2}
                onChange={setIncomeSource2}
              >
                <IncomeOptions />
              </SelectField>
              <Field name="incomeNet2" label="Średni dochód netto" />
              <Field
                name="incomeSince2"
                label="Dochód uzyskiwany od"
                type="month"
              />
            </div>
            {incomeSource2 === 'Działalność gospodarcza' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  name="businessTaxation2"
                  label="Forma opodatkowania / księgowości"
                />
                <Field
                  name="businessSince2"
                  label="Firma działa od"
                  type="month"
                />
              </div>
            )}
          </div>
        )}
        <Field name="otherIncome" label="Pozostałe stałe dochody miesięcznie" />
      </SurveySection>

      <SurveySection
        number="3"
        title="Wydatki i zobowiązania"
        preparationNames={['costsPreparation', 'debtsPreparation']}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="livingCosts" label="Miesięczne koszty życia bez rat" />
          <Field
            name="monthlyBalance"
            label="Ile średnio zostaje po wszystkich wydatkach?"
          />
        </div>
        <TextAreaField
          name="debts"
          label="Kredyty, pożyczki, leasing, karty i limity"
          helper="Dla każdego wpisz orientacyjnie: rodzaj, bank, saldo lub limit oraz ratę. Jeżeli nie znasz danych, zaznacz poniżej, kiedy je sprawdzisz."
        />
        <TextAreaField
          name="debtPlan"
          label="Co chcesz spłacić, przenieść lub skonsolidować?"
        />
      </SurveySection>

      <SurveySection
        number="4"
        title="Majątek i bezpieczeństwo"
        preparationNames={['assetsPreparation']}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field name="savings" label="Oszczędności i środki własne" />
          <Field name="investments" label="Inwestycje" />
          <Field name="realEstate" label="Wartość nieruchomości" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="reserveMonths" label="Rezerwa finansowa">
            <option value="">Nie wiem</option>
            <option>Brak rezerwy</option>
            <option>Mniej niż 1 miesiąc kosztów</option>
            <option>1-3 miesiące kosztów</option>
            <option>3-6 miesięcy kosztów</option>
            <option>Powyżej 6 miesięcy kosztów</option>
          </SelectField>
          <SelectField
            name="insurance"
            label="Zabezpieczenie rodziny i majątku"
          >
            <option value="">Chcę sprawdzić</option>
            <option>Mam ubezpieczenie na życie</option>
            <option>Mam ubezpieczenie majątku</option>
            <option>Mam oba rodzaje</option>
            <option>Nie mam zabezpieczenia</option>
          </SelectField>
        </div>
      </SurveySection>

      <SurveySection
        number="5"
        title="Dokumenty do przygotowania"
        preparationNames={['documentsPreparation']}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Check name="documents" value="Dokumenty potwierdzające dochód">
            Dokumenty potwierdzające dochód
          </Check>
          <Check name="documents" value="Umowy lub harmonogramy kredytów">
            Umowy lub harmonogramy kredytów
          </Check>
          <Check name="documents" value="Polisy do audytu">
            Polisy do audytu
          </Check>
          <Check name="documents" value="Dokumenty firmy lub inwestycji">
            Dokumenty firmy lub inwestycji
          </Check>
        </div>
        <p className="text-muted-foreground text-sm">
          Nie przesyłaj PESEL-u, numeru dowodu, haseł ani pełnych numerów
          rachunków. Na tym etapie wystarczy wiedzieć, które dokumenty masz.
        </p>
      </SurveySection>

      <div
        className="absolute top-auto left-[-10000px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Strona internetowa
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <section className="border-border bg-card space-y-5 rounded-3xl border p-5 sm:p-8">
        <label className="text-muted-foreground flex items-start gap-3 text-sm leading-6">
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
          {state.kind === 'sending'
            ? 'Zapisuję…'
            : 'Zapisz ankietę i przygotuj listę na spotkanie'}
        </button>
      </section>
    </form>
  );
}

function SurveySection({
  number,
  title,
  preparationNames = [],
  children,
}: {
  number: string;
  title: string;
  preparationNames?: string[];
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-card space-y-5 rounded-3xl border p-5 sm:p-8">
      <div>
        <p className="text-primary text-sm font-semibold">Krok {number}</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      </div>
      {children}
      {preparationNames.map((name) => (
        <PreparationChoice key={name} name={name} />
      ))}
    </section>
  );
}

function PreparationChoice({ name }: { name: string }) {
  return (
    <label className="border-primary/20 bg-primary-soft block space-y-2 rounded-xl border p-4 text-sm font-medium">
      <span>Jak przygotujesz te informacje?</span>
      <select name={name} defaultValue="provided" className={selectClass}>
        <option value="provided">Podaję je teraz</option>
        <option value="check_before_meeting">Sprawdzę przed spotkaniem</option>
        <option value="discuss_at_meeting">
          Omówię z ekspertem na spotkaniu
        </option>
        <option value="not_applicable">Nie dotyczy</option>
      </select>
    </label>
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
        className={inputClass}
      />
    </label>
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

function SelectField({
  label,
  children,
  value,
  onChange,
  ...props
}: {
  label: string;
  children: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  name: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <select
        {...props}
        value={value}
        defaultValue={value === undefined ? '' : undefined}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className={selectClass}
      >
        {children}
      </select>
    </label>
  );
}

function TextAreaField({
  name,
  label,
  helper,
}: {
  name: string;
  label: string;
  helper?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <textarea name={name} rows={4} className={textareaClass} />
      {helper && (
        <span className="text-muted-foreground block font-normal">
          {helper}
        </span>
      )}
    </label>
  );
}

function Check({
  name,
  value,
  children,
}: {
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <label className="text-muted-foreground flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        value={value}
        className="accent-primary mt-0.5 size-4"
      />
      <span>{children}</span>
    </label>
  );
}

function IncomeOptions() {
  return (
    <>
      <option value="">Jeszcze nie wiem</option>
      <option>Umowa o pracę</option>
      <option>Umowa cywilnoprawna</option>
      <option>Działalność gospodarcza</option>
      <option>Emerytura lub renta</option>
      <option>Najem</option>
      <option>Inne</option>
    </>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
