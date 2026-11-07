'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  bankKnowledge,
  type BankKnowledge,
  type QualificationLabel,
} from '@/lib/banking/knowledge';
import {
  analyzeDealLocally,
  qualifyDeal,
  type QualificationDeal,
  type QualificationItem,
} from '@/lib/banking/qualify';

const labelStyles: Record<QualificationLabel, string> = {
  FAKT: 'bg-emerald-100 text-emerald-900',
  'WNIOSEK AI': 'bg-sky-100 text-sky-900',
  'BRAK DANYCH': 'bg-amber-100 text-amber-900',
};

export function BankQualification({ deal }: { deal: QualificationDeal }) {
  const [bankId, setBankId] = useState(bankKnowledge[0].id);
  const knowledge = bankKnowledge.find((bank) => bank.id === bankId)!;
  // Replacing the context unmounts and aborts any analysis of the old deal/bank.
  const contextKey = JSON.stringify([
    bankId,
    deal.product_type,
    deal.stage?.name,
    deal.next_action,
  ]);
  return (
    <section
      aria-label="Kwalifikacja bankowa"
      data-bank-qualification
      className="border-t border-slate-200 bg-white p-5 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Kwalifikacja bankowa</h2>
        <label className="flex items-center gap-2">
          <span>Bank</span>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={bankId}
            onChange={(event) => setBankId(event.target.value)}
          >
            {bankKnowledge.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Fakty dotyczą źródła i kompletności kontekstu. Nie potwierdzają
        zdolności kredytowej. Data przy źródle oznacza odczyt dokumentu w
        repozytorium.
      </p>
      <QualificationContent
        key={contextKey}
        deal={deal}
        knowledge={knowledge}
      />
    </section>
  );
}

function QualificationContent({
  deal,
  knowledge,
}: {
  deal: QualificationDeal;
  knowledge: BankKnowledge;
}) {
  const [analysis, setAnalysis] = useState<QualificationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function analyze() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setAnalysis(null);
    setLoading(true);
    const result = await analyzeDealLocally(deal, knowledge, controller.signal);
    if (controller.signal.aborted) return;
    setAnalysis(result);
    setLoading(false);
  }

  return (
    <>
      <ul className="mt-4 space-y-3">
        {qualifyDeal(deal, knowledge).map((item) => (
          <Requirement key={item.id} item={item} />
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        className="mt-4"
        onClick={() => void analyze()}
      >
        {loading ? 'Analizuję lokalnie…' : 'Analiza AI (lokalnie)'}
      </Button>
      <p className="mt-2 text-xs text-slate-500">
        Bielik na tym komputerze. Wymaga działającego lokalnego modelu i zgody
        przeglądarki na połączenie lokalne. Wynik nie jest zapisywany.
      </p>
      <div role="status" aria-live="polite" className="mt-3">
        {analysis && (
          <ul>
            <Requirement item={analysis} />
          </ul>
        )}
      </div>
    </>
  );
}

function Requirement({ item }: { item: QualificationItem }) {
  return (
    <li className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium">{item.title}</h3>
        <span
          className={`rounded px-2 py-1 text-[11px] font-semibold ${labelStyles[item.label]}`}
        >
          {item.label}
        </span>
      </div>
      {item.value && <p className="mt-1 break-words">{item.value}</p>}
      <p className="mt-1 break-words whitespace-pre-wrap text-slate-600">
        {item.explanation}
      </p>
      <p className="mt-2 text-[11px] break-words text-slate-500">
        Źródło: {item.source} · Odczyt: {item.checkedAt}
      </p>
    </li>
  );
}
