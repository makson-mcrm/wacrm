'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import type { Deal } from '@/types';

type Requirement = {
  id: string;
  name: string;
  status: string;
  notes?: string;
  required: boolean;
};

const DOCUMENT_STATUSES = [
  ['brak', 'Brak'],
  ['poproszono', 'Poproszono klienta'],
  ['otrzymany', 'Otrzymany'],
  ['do_poprawy', 'Do poprawy'],
  ['zaakceptowany', 'Zaakceptowany'],
  ['wyslany', 'Wysłany do banku'],
] as const;

export function DealProcessControl({
  deal,
  accountId,
  onSaved,
}: {
  deal: Deal;
  accountId: string;
  onSaved: () => void;
}) {
  const db = useMemo(() => createClient(), []);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirement, setNewRequirement] = useState('');
  const [mfinanseStatus, setMfinanseStatus] = useState(
    deal.mfinanse_status ?? 'do_sprawdzenia'
  );
  const [blocker, setBlocker] = useState(deal.blocker ?? '');
  const [analysisStatus, setAnalysisStatus] = useState(
    deal.analysis_status ?? 'nie_rozpoczeta'
  );
  const [analysisSummary, setAnalysisSummary] = useState(
    deal.analysis_summary ?? ''
  );
  const [analysisRecommendation, setAnalysisRecommendation] = useState(
    deal.analysis_recommendation ?? ''
  );
  const [analysisSourceUrl, setAnalysisSourceUrl] = useState(
    deal.analysis_source_url ?? ''
  );
  const [analysisSourceVersion, setAnalysisSourceVersion] = useState(
    deal.analysis_source_version ?? ''
  );
  const [postConsultationReport, setPostConsultationReport] = useState(
    deal.post_consultation_report ?? ''
  );
  const [benefitReport, setBenefitReport] = useState(deal.benefit_report ?? '');
  const [measuredBenefit, setMeasuredBenefit] = useState(
    deal.measured_benefit == null ? '' : String(deal.measured_benefit)
  );
  const [analyzing, setAnalyzing] = useState(false);

  const loadRequirements = useCallback(async () => {
    const { data, error } = await db
      .from('deal_document_requirements')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at');
    if (!error) setRequirements((data ?? []) as Requirement[]);
  }, [db, deal.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequirements(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequirements]);

  async function saveControl(approve = false) {
    const session = await db.auth.getSession();
    const payload = {
      mfinanse_status: mfinanseStatus,
      blocker: blocker.trim() || null,
      blocker_since: blocker.trim()
        ? deal.blocker_since || new Date().toISOString()
        : null,
      analysis_status: approve ? 'zatwierdzona' : analysisStatus,
      analysis_summary: analysisSummary.trim() || null,
      analysis_recommendation: analysisRecommendation.trim() || null,
      analysis_source_url: analysisSourceUrl.trim() || null,
      analysis_source_version: analysisSourceVersion.trim() || null,
      analysis_approved_at: approve ? new Date().toISOString() : null,
      analysis_approved_by: approve
        ? (session.data.session?.user.id ?? null)
        : null,
      post_consultation_report: postConsultationReport.trim() || null,
      benefit_report: benefitReport.trim() || null,
      measured_benefit: measuredBenefit.trim() ? Number(measuredBenefit) : null,
    };
    if (
      approve &&
      (!analysisSourceUrl.trim() || !analysisSourceVersion.trim())
    ) {
      toast.error(
        'Przed zatwierdzeniem wskaż link i wersję instrukcji bankowej.'
      );
      return;
    }
    const { error } = await db.from('deals').update(payload).eq('id', deal.id);
    if (error) toast.error(`Nie zapisano kontroli procesu: ${error.message}`);
    else {
      toast.success(
        approve ? 'Analiza zatwierdzona.' : 'Kontrola procesu zapisana.'
      );
      onSaved();
    }
  }

  async function runBankAnalysis() {
    setAnalyzing(true);
    const response = await fetch('/api/ai/deal-analysis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deal_id: deal.id }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      summary?: string;
      recommendation?: string;
      missing_documents?: string[];
      error?: string;
    };
    setAnalyzing(false);
    if (!response.ok) {
      toast.error(result.error || 'Nie udało się wykonać analizy.');
      return;
    }
    setAnalysisSummary(result.summary || '');
    setAnalysisRecommendation(result.recommendation || '');
    setAnalysisStatus('do_zatwierdzenia');
    const newMissing = (result.missing_documents ?? []).filter(
      (name) =>
        name.trim() &&
        !requirements.some(
          (row) => row.name.trim().toLowerCase() === name.trim().toLowerCase()
        )
    );
    if (newMissing.length) {
      await db.from('deal_document_requirements').insert(
        newMissing.map((name) => ({
          account_id: accountId,
          deal_id: deal.id,
          name: name.trim(),
          status: 'brak',
          required: true,
          notes:
            'Wskazane przez analizę roboczą AI — wymaga weryfikacji eksperta.',
        }))
      );
      await loadRequirements();
    }
    toast.success(
      `Agent przygotował analizę roboczą${result.missing_documents?.length ? ` i wskazał ${result.missing_documents.length} braków` : ''}. Sprawdź ją przed zatwierdzeniem.`
    );
  }

  async function addRequirement() {
    if (!newRequirement.trim()) return;
    const { error } = await db.from('deal_document_requirements').insert({
      account_id: accountId,
      deal_id: deal.id,
      name: newRequirement.trim(),
      status: 'brak',
      required: true,
    });
    if (error) toast.error(`Nie dodano dokumentu: ${error.message}`);
    else {
      setNewRequirement('');
      await loadRequirements();
    }
  }

  async function changeRequirement(row: Requirement, status: string) {
    const now = new Date().toISOString();
    const dates = {
      requested_at: status === 'poproszono' ? now : undefined,
      received_at: status === 'otrzymany' ? now : undefined,
      accepted_at: status === 'zaakceptowany' ? now : undefined,
    };
    const { error } = await db
      .from('deal_document_requirements')
      .update({ status, updated_at: now, ...dates })
      .eq('id', row.id);
    if (error) toast.error(error.message);
    else await loadRequirements();
  }

  async function removeRequirement(id: string) {
    const { error } = await db
      .from('deal_document_requirements')
      .delete()
      .eq('id', id);
    if (error) toast.error(error.message);
    else await loadRequirements();
  }

  const missing = requirements.filter((row) =>
    ['brak', 'poproszono', 'do_poprawy'].includes(row.status)
  );
  const firstName =
    deal.contact?.first_name || deal.contact?.name?.split(' ')[0];
  const missingMessage = `${firstName ? `${firstName}, p` : 'P'}roszę o uzupełnienie dokumentów:\n${missing
    .map(
      (row) =>
        `• ${row.name}${row.status === 'do_poprawy' ? ' — do poprawy' : ''}`
    )
    .join('\n')}\n\nTomasz Makson`;
  const clientPhone = deal.contact?.phone?.replace(/\D/g, '') || '';
  const clientEmail = deal.contact?.email || '';

  return (
    <div className="space-y-4">
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">Tablica sterowania sprawą</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Status mFinanse
            <select
              className="bg-muted h-10 rounded-md border px-3"
              value={mfinanseStatus}
              onChange={(event) => setMfinanseStatus(event.target.value)}
            >
              <option value="do_sprawdzenia">Do sprawdzenia</option>
              <option value="zarejestrowany">Zarejestrowany</option>
              <option value="zajety">Zajęty</option>
              <option value="nie_dotyczy">Nie dotyczy</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Bloker
            <Input
              value={blocker}
              onChange={(event) => setBlocker(event.target.value)}
              placeholder="Co blokuje kolejny krok?"
            />
          </label>
        </div>
        <Button className="mt-3" onClick={() => void saveControl()}>
          Zapisz stan sprawy
        </Button>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Kompletacja dokumentów</h3>
        <p className="text-muted-foreground mb-3 text-xs">
          CRM zapisuje status i braki. Dokument może pozostać na komputerze
          firmowym albo w prywatnej teczce.
        </p>
        <div className="flex gap-2">
          <Input
            value={newRequirement}
            onChange={(event) => setNewRequirement(event.target.value)}
            placeholder="Nazwa wymaganego dokumentu"
          />
          <Button onClick={() => void addRequirement()}>
            <Plus className="size-4" /> Dodaj
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {requirements.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_210px_40px]"
            >
              <span className="self-center text-sm">{row.name}</span>
              <select
                className="bg-muted h-9 rounded-md border px-2 text-sm"
                value={row.status}
                onChange={(event) =>
                  void changeRequirement(row, event.target.value)
                }
              >
                {DOCUMENT_STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => void removeRequirement(row.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {!requirements.length && (
            <p className="text-muted-foreground text-sm">
              Brak pozycji checklisty.
            </p>
          )}
        </div>
        {!!missing.length && (
          <div className="bg-muted mt-4 rounded-md p-3">
            <p className="text-sm whitespace-pre-wrap">{missingMessage}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(missingMessage);
                  toast.success('Lista braków skopiowana do wysłania.');
                }}
              >
                <Copy className="size-4" /> Kopiuj
              </Button>
              {clientPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${clientPhone}?text=${encodeURIComponent(missingMessage)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </Button>
              )}
              {clientEmail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(`Brakujące dokumenty — ${deal.title}`)}&body=${encodeURIComponent(missingMessage)}`;
                  }}
                >
                  <Mail className="size-4" /> E-mail
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Analiza bankowa</h3>
          <p className="text-muted-foreground text-xs">
            Analiza może być zatwierdzona wyłącznie z linkiem i wersją aktualnej
            instrukcji lub druku bankowego.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Status analizy
            <select
              className="bg-muted h-10 rounded-md border px-3"
              value={analysisStatus}
              onChange={(event) => setAnalysisStatus(event.target.value)}
            >
              <option value="nie_rozpoczeta">Nie rozpoczęta</option>
              <option value="w_toku">W toku</option>
              <option value="do_zatwierdzenia">Do zatwierdzenia</option>
              <option value="zatwierdzona">Zatwierdzona</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            Link do instrukcji / druku na Dysku Google
            <Input
              type="url"
              value={analysisSourceUrl}
              onChange={(event) => setAnalysisSourceUrl(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Wersja / data obowiązywania
            <Input
              value={analysisSourceVersion}
              onChange={(event) => setAnalysisSourceVersion(event.target.value)}
              placeholder="np. 2026-08-01"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          Wynik analizy
          <VoiceTextarea
            className="min-h-28"
            value={analysisSummary}
            onChange={setAnalysisSummary}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Rekomendacja / produkt
          <VoiceTextarea
            value={analysisRecommendation}
            onChange={setAnalysisRecommendation}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={analyzing}
            onClick={() => void runBankAnalysis()}
          >
            <Bot className="size-4" />
            {analyzing
              ? 'Analizuję instrukcje…'
              : 'Uruchom analizę z instrukcji'}
          </Button>
          <Button variant="outline" onClick={() => void saveControl()}>
            Zapisz roboczo
          </Button>
          <Button onClick={() => void saveControl(true)}>
            <Check className="size-4" /> Zatwierdź analizę
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">Raporty dla klienta</h3>
        <label className="grid gap-1 text-sm">
          Raport po konsultacji
          <VoiceTextarea
            className="min-h-28"
            value={postConsultationReport}
            onChange={setPostConsultationReport}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Raport korzyści po sprzedaży
          <VoiceTextarea
            className="min-h-28"
            value={benefitReport}
            onChange={setBenefitReport}
          />
        </label>
        <label className="grid max-w-xs gap-1 text-sm">
          Policzalna korzyść (zł)
          <Input
            type="number"
            value={measuredBenefit}
            onChange={(event) => setMeasuredBenefit(event.target.value)}
          />
        </label>
        <Button onClick={() => void saveControl()}>Zapisz raporty</Button>
      </section>
    </div>
  );
}
