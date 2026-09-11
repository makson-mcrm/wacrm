'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  CalendarDays,
  Copy,
  FileText,
  Mail,
  Mic,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { SmsAction } from '@/components/sales/sms-action';
import { CallAction } from '@/components/sales/call-action';
import { ActivityHistory } from '@/components/sales/activity-history';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealForm } from '@/components/pipelines/deal-form';
import { DealProcessControl } from '@/components/pipelines/deal-process-control';
import { DealAssistantActions } from '@/components/assistant/deal-assistant-actions';
import { DealBankingKnowledge } from '@/components/banking-knowledge/deal-banking-knowledge';
import { EntityTagsEditor } from '@/components/tags/entity-tags-editor';
import { toast } from 'sonner';
import type { Deal, PipelineStage } from '@/types';
import { buildClientJourneyChecks } from '@/lib/mcrm/client-journey';
import { formatWarsawDateTime } from '@/lib/date-time';

type Note = {
  id: string;
  user_id: string;
  note_text: string;
  created_at: string;
  author_name?: string;
};
type Bank = {
  id?: string;
  position: number;
  bank_name?: string;
  status?: string;
  remote_process?: boolean;
  progress?: number;
  submitted_at?: string;
  decision?: string;
  decision_at?: string;
  conditions?: string;
  missing_documents?: string;
  final_amount?: number;
  contract_signed_at?: string;
  launched_at?: string;
  product_variant?: string;
  instruction_url?: string;
  instruction_version?: string;
  application_form_url?: string;
  application_form_version?: string;
};
type Doc = {
  id: string;
  name: string;
  storage_path: string;
  status: string;
  document_type?: string;
  received_at?: string;
  requirement_id?: string;
  created_at: string;
};
type Requirement = {
  id: string;
  name: string;
  status: string;
  required: boolean;
};
type DealPerson = {
  contact_id: string;
  role?: string;
  is_primary: boolean;
  contact: Deal['contact'];
};
type StageHistory = {
  id: string;
  changed_at: string;
  changed_by?: string | null;
  author_name?: string;
  from_stage?: { name?: string } | null;
  to_stage?: { name?: string } | null;
};
export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const { accountId } = useAuth();
  const db = useMemo(() => createClient(), []);
  const [deal, setDeal] = useState<Deal | null>(null),
    [people, setPeople] = useState<DealPerson[]>([]),
    [notes, setNotes] = useState<Note[]>([]),
    [note, setNote] = useState(''),
    [banks, setBanks] = useState<Bank[]>(
      [1, 2, 3].map((position) => ({ position, progress: 0 }))
    ),
    [docs, setDocs] = useState<Doc[]>([]),
    [requirements, setRequirements] = useState<Requirement[]>([]),
    [stageHistory, setStageHistory] = useState<StageHistory[]>([]),
    [missingRequiredDocuments, setMissingRequiredDocuments] = useState(0),
    [requiredDocumentsCount, setRequiredDocumentsCount] = useState(0),
    [stages, setStages] = useState<PipelineStage[]>([]),
    [edit, setEdit] = useState(false),
    [uploading, setUploading] = useState(false),
    [documentName, setDocumentName] = useState(''),
    [documentType, setDocumentType] = useState('Dokument klienta'),
    [documentStatus, setDocumentStatus] = useState('otrzymany'),
    [documentDate, setDocumentDate] = useState(
      new Date().toISOString().slice(0, 10)
    ),
    [documentRequirementId, setDocumentRequirementId] = useState(''),
    [creatingFolder, setCreatingFolder] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setActiveTab(
      new URLSearchParams(window.location.search).get('tab') === 'files'
        ? 'files'
        : 'overview'
    );
  }, [id]);
  const load = useCallback(async () => {
    setLoadError('');
    const [d, n, b, f, p, h, requirements, profileRows] = await Promise.all([
      db
        .from('deals')
        .select(
          '*,contact:contacts!deals_contact_id_fkey(*),company:companies!deals_company_id_fkey(*),stage:pipeline_stages(*)'
        )
        .eq('id', id)
        .single(),
      db
        .from('deal_notes')
        .select('*')
        .eq('deal_id', id)
        .order('created_at', { ascending: false }),
      db.from('bank_processes').select('*').eq('deal_id', id).order('position'),
      db
        .from('deal_documents')
        .select('*')
        .eq('deal_id', id)
        .order('created_at', { ascending: false }),
      db
        .from('deal_contacts')
        .select('contact_id,role,is_primary,contact:contacts(*)')
        .eq('deal_id', id)
        .order('is_primary', { ascending: false }),
      db
        .from('deal_stage_history')
        .select(
          'id,changed_at,changed_by,from_stage:pipeline_stages!deal_stage_history_from_stage_id_fkey(name),to_stage:pipeline_stages!deal_stage_history_to_stage_id_fkey(name)'
        )
        .eq('deal_id', id)
        .order('changed_at', { ascending: false }),
      db
        .from('deal_document_requirements')
        .select('id,name,status,required')
        .eq('deal_id', id)
        .eq('required', true),
      accountId
        ? db
            .from('profiles')
            .select('user_id,full_name')
            .eq('account_id', accountId)
        : Promise.resolve({ data: [] }),
    ]);
    if (d.error) {
      setLoadError(d.error.message);
      setDeal(null);
      return;
    }
    setDeal(d.data as Deal | null);
    setPeople((p.data ?? []) as unknown as DealPerson[]);
    const authorByUser = new Map(
      (profileRows.data ?? []).map((row) => [
        row.user_id,
        row.full_name || 'Użytkownik',
      ])
    );
    setNotes(
      ((n.data ?? []) as Note[]).map((row) => ({
        ...row,
        author_name: authorByUser.get(row.user_id) || 'Użytkownik',
      }))
    );
    const x = (b.data ?? []) as Bank[];
    setBanks(
      [1, 2, 3].map(
        (position) =>
          x.find((v) => v.position === position) ?? { position, progress: 0 }
      )
    );
    setDocs((f.data ?? []) as Doc[]);
    setRequirements((requirements.data ?? []) as Requirement[]);
    setStageHistory(
      ((h.data ?? []) as unknown as StageHistory[]).map((row) => ({
        ...row,
        author_name: row.changed_by
          ? authorByUser.get(row.changed_by) || 'Użytkownik'
          : 'Automatycznie',
      }))
    );
    setMissingRequiredDocuments(
      (requirements.data ?? []).filter((row) =>
        ['brak', 'poproszono', 'do_poprawy'].includes(row.status)
      ).length
    );
    setRequiredDocumentsCount((requirements.data ?? []).length);
    if (d.data?.pipeline_id) {
      const s = await db
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', d.data.pipeline_id)
        .order('position');
      setStages((s.data ?? []) as PipelineStage[]);
    }
  }, [db, id, accountId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function addNote() {
    if (!note.trim() || !accountId || !deal) return;
    const s = await db.auth.getSession();
    if (!s.data.session?.user) return;
    const r = await db.from('deal_notes').insert({
      account_id: accountId,
      deal_id: deal.id,
      user_id: s.data.session.user.id,
      note_text: note.trim(),
    });
    if (r.error) toast.error(r.error.message);
    else {
      setNote('');
      await load();
    }
  }
  async function saveBank(bank: Bank) {
    if (!deal || !accountId) return;
    const r = await db.from('bank_processes').upsert(
      {
        ...bank,
        id: bank.id || undefined,
        account_id: accountId,
        deal_id: deal.id,
      },
      { onConflict: 'deal_id,position' }
    );
    if (r.error) toast.error(r.error.message);
    else {
      toast.success(`Proces Bank ${bank.position} zapisany`);
      await load();
    }
  }
  async function upload(file: File) {
    if (!deal || !accountId) return;
    setUploading(true);
    const s = await db.auth.getSession();
    if (!s.data.session?.user) {
      setUploading(false);
      return;
    }
    const path = `${accountId}/${deal.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
    const u = await db.storage.from('deal-documents').upload(path, file);
    if (u.error) toast.error(u.error.message);
    else {
      const r = await db.from('deal_documents').insert({
        account_id: accountId,
        deal_id: deal.id,
        user_id: s.data.session.user.id,
        name: documentName.trim() || file.name,
        storage_path: path,
        status: documentStatus,
        document_type: documentType.trim() || null,
        received_at: new Date(`${documentDate}T12:00:00`).toISOString(),
        requirement_id: documentRequirementId || null,
        source_channel: 'Wgrany w CRM',
      });
      if (r.error) toast.error(r.error.message);
      else {
        if (documentRequirementId && documentStatus === 'otrzymany') {
          await db
            .from('deal_document_requirements')
            .update({
              status: 'otrzymany',
              received_at: new Date().toISOString(),
            })
            .eq('id', documentRequirementId);
        }
        setDocumentName('');
        setDocumentRequirementId('');
        toast.success('Dokument zapisany w prywatnej teczce');
      }
    }
    setUploading(false);
    await load();
  }
  async function createDriveFolder() {
    if (!deal) return;
    setCreatingFolder(true);
    const response = await fetch('/api/google-drive/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deal_id: deal.id }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    setCreatingFolder(false);
    if (!response.ok) {
      toast.error(result.error || 'Nie udało się utworzyć folderu.');
      return;
    }
    toast.success('Folder dokumentów jest powiązany z Dealem.');
    await load();
  }
  async function openDoc(d: Doc) {
    const r = await db.storage
      .from('deal-documents')
      .createSignedUrl(d.storage_path, 300);
    if (r.data?.signedUrl)
      window.open(r.data.signedUrl, '_blank', 'noopener,noreferrer');
    else toast.error('Nie udało się otworzyć dokumentu');
  }
  async function removeDoc(d: Doc) {
    await db.storage.from('deal-documents').remove([d.storage_path]);
    await db.from('deal_documents').delete().eq('id', d.id);
    await load();
  }
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success('Treść skopiowana');
  }
  async function changeStage(nextStageId: string) {
    if (!deal || !accountId || nextStageId === deal.stage_id) return;
    const { error } = await db
      .from('deals')
      .update({ stage_id: nextStageId })
      .eq('id', deal.id);
    if (error) {
      toast.error(`Nie zmieniono etapu: ${error.message}`);
      return;
    }
    toast.success('Deal został przesunięty do kolejnego etapu.');
    await load();
  }
  if (loadError)
    return (
      <div className="border-destructive/30 bg-destructive/5 m-6 rounded-xl border p-8">
        <h2 className="font-semibold">Nie udało się otworzyć karty Deal</h2>
        <p className="text-muted-foreground mt-2 text-sm">{loadError}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  if (!deal) return <div className="p-8">Wczytywanie karty Deal…</div>;
  const actionContact = deal.contact?.phone
    ? deal.contact
    : people.find((person) => person.contact?.phone)?.contact;
  const first = deal.contact?.name?.split(' ')[0] || 'Dzień dobry',
    meeting = deal.meeting_at ? dt(deal.meeting_at) : '[DATA SPOTKANIA]',
    link = deal.drive_folder_url || '[LINK DO DOKUMENTÓW]',
    reminder = `${first}, przypominam o spotkaniu: ${meeting}. Tomasz Makson`,
    documentMessage = `${first}, proszę wgrać uzgodnione dokumenty tutaj: ${link}. Tomasz Makson`,
    journeyChecks = buildClientJourneyChecks({
      contactId: deal.contact_id,
      companyId: deal.company_id,
      peopleCount: people.length,
      description: deal.description,
      nextAction: deal.next_action,
      nextActionAt: deal.next_action_at,
      analysisSummary: deal.analysis_summary,
      analysisRecommendation: deal.analysis_recommendation,
      bankCount: banks.filter((bank) => bank.bank_name?.trim()).length,
      requiredDocumentsCount,
      missingRequiredDocuments,
      launchedAmount: deal.launched_amount,
      launchedAt: deal.launched_at,
      invoiceNumber: deal.invoice_number,
      invoiceDate: deal.invoice_date,
      invoiceStatus: deal.invoice_status,
      settlementVerified: deal.settlement_verified,
    });
  return (
    <div className="space-y-3 sm:space-y-4">
      <Link
        href="/pipelines"
        className="text-muted-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do lejka
      </Link>
      <header className="rounded-xl border border-emerald-950/10 bg-white p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black">{deal.title}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {actionContact?.name} ·{' '}
              {deal.product_type || 'Kategoria nieustalona'}
            </p>
            {Number(deal.value) > 0 && (
              <p className="mt-1 text-sm font-bold">
                {money(deal.value)} {deal.currency || 'PLN'}
              </p>
            )}
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">
            {deal.status === 'open' ? 'AKTYWNY' : deal.status}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold">
            Etap
            <select
              value={deal.stage_id}
              onChange={(event) => void changeStage(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-white px-2 text-xs font-normal"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-xs font-bold">Następny krok</p>
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="mt-1 min-h-10 w-full rounded-md border px-2 py-2 text-left text-sm"
            >
              {deal.next_action || 'Ustal następny krok'}
            </button>
          </div>
          <div>
            <p className="text-xs font-bold">Termin</p>
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="mt-1 min-h-10 w-full rounded-md border px-2 py-2 text-left text-sm"
            >
              {deal.next_action_at ? dt(deal.next_action_at) : 'Nie ustalono'}
            </button>
          </div>
          <div>
            <p className="text-xs font-bold">Blocker (jeśli jest)</p>
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="mt-1 min-h-10 w-full rounded-md border px-2 py-2 text-left text-sm"
            >
              {deal.blocker || 'Brak'}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 [&_a]:h-11 [&_a]:text-xs [&_button]:h-11 [&_button]:w-full [&_button]:text-xs">
          {actionContact?.phone && (
            <>
              <CallAction
                phone={actionContact.phone}
                contactId={actionContact.id}
                companyId={deal.company_id}
                dealId={deal.id}
                className="w-full"
              />
              <SmsAction
                phone={actionContact.phone}
                contactName={actionContact.name}
                contactId={actionContact.id}
                companyId={deal.company_id}
                dealId={deal.id}
                label="WIADOMOŚĆ"
              />
            </>
          )}
          <Button
            variant="outline"
            render={
              <Link href={`/quick-call?deal=${deal.id}&action=dictate`} />
            }
          >
            <Mic className="size-4" /> DYKTUJ
          </Button>
          <Button
            variant="outline"
            render={
              <Link href={`/quick-call?deal=${deal.id}&action=document`} />
            }
          >
            <Upload className="size-4" /> DODAJ DOKUMENT
          </Button>
        </div>
        <Link
          href={`/assistant?deal=${deal.id}`}
          className="mt-3 flex min-h-14 flex-col items-center justify-center rounded-lg bg-[#123d2b] px-3 py-2 text-lime-300"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="size-4" /> ASYSTENT AI
          </span>
          <span className="mt-0.5 text-[11px]">
            Przygotuj, sprawdź, podpowiedz
          </span>
        </Link>
      </header>
      <div
        className={
          activeTab === 'case'
            ? 'grid gap-4 xl:grid-cols-[360px_1fr]'
            : 'grid gap-3'
        }
      >
        <aside
          className={
            activeTab === 'case' ? 'hidden space-y-4 xl:block' : 'hidden'
          }
        >
          <Panel title="Powiązane osoby">
            {people.map((person) => (
              <div key={person.contact_id} className="rounded-lg border p-3">
                <LinkRow
                  label={person.role || 'Osoba'}
                  value={
                    person.contact?.name || person.contact?.phone || 'Brak'
                  }
                  href={`/contacts?open=${person.contact_id}`}
                />
                <div className="mt-2 flex gap-2">
                  {person.contact?.phone && (
                    <a
                      className="text-primary text-xs"
                      href={`tel:${person.contact.phone}`}
                    >
                      {person.contact.phone}
                    </a>
                  )}
                  {person.contact?.email && (
                    <a
                      className="text-primary text-xs"
                      href={`mailto:${person.contact.email}`}
                    >
                      E-mail
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!people.length && (
              <p className="text-muted-foreground text-sm">
                Brak powiązanych osób.
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setEdit(true)}
            >
              <UserPlus className="h-4 w-4" />
              Dodaj lub powiąż osobę
            </Button>
          </Panel>
          <Panel title="Firma">
            <LinkRow
              label="Powiązana firma"
              value={deal.company?.name || 'Brak'}
              href={
                deal.company_id
                  ? `/companies?open=${deal.company_id}`
                  : undefined
              }
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setEdit(true)}
            >
              <UserPlus className="h-4 w-4" />
              Dodaj lub zmień firmę
            </Button>
          </Panel>
          {accountId && (
            <Panel title="Tagi Deala">
              <EntityTagsEditor
                accountId={accountId}
                entityType="deal"
                entityId={deal.id}
              />
            </Panel>
          )}
          <Panel title="Opis">
            <p className="text-sm whitespace-pre-wrap">
              {deal.description || 'Brak opisu ogólnego'}
            </p>
          </Panel>
          <Panel title="Podstawowe informacje">
            <Row label="Źródło" value={deal.source} />
            <Row label="Cel" value={deal.goal} />
            <Row label="Typ" value={deal.product_type} />
            <Row
              label="Prowizja oczekiwana"
              value={
                deal.expected_commission == null
                  ? undefined
                  : `${money(deal.expected_commission)} PLN`
              }
            />
          </Panel>
          <Panel title="Co dalej">
            <Row label="Następne działanie" value={deal.next_action} />
            <Row
              label="Termin"
              value={deal.next_action_at && dt(deal.next_action_at)}
            />
            <Row
              label="Ponowny kontakt"
              value={deal.follow_up_at && dt(deal.follow_up_at)}
            />
            <Row
              label="Spotkanie"
              value={
                deal.meeting_at &&
                `${dt(deal.meeting_at)} · ${deal.meeting_place || ''}`
              }
            />
          </Panel>
          <Panel title="Ścieżka obsługi klienta">
            {journeyChecks.map((check) => (
              <div key={check.key} className="flex items-start gap-2 text-sm">
                {check.complete ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{check.label}</p>
                  {!check.complete && (
                    <p className="text-muted-foreground text-xs">
                      {check.missing}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Panel>
        </aside>
        <main className="bg-card rounded-xl border p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-3 grid h-auto w-full grid-cols-3 rounded-xl bg-emerald-50 p-1">
              <TabsTrigger value="overview">Szczegóły</TabsTrigger>
              <TabsTrigger value="activity-history">Historia</TabsTrigger>
              <TabsTrigger value="files">Dokumenty</TabsTrigger>
            </TabsList>
            <details className="mb-4 rounded-xl border bg-slate-50">
              <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-500">
                WIĘCEJ DANYCH SPRAWY
              </summary>
              <TabsList className="flex h-auto flex-wrap justify-start border-t bg-transparent p-2">
                <TabsTrigger value="notes">Notatki</TabsTrigger>
                <TabsTrigger value="timeline">Oś czasu</TabsTrigger>
                <TabsTrigger value="activities">Działania</TabsTrigger>
                <TabsTrigger value="case">Dane sprawy</TabsTrigger>
                <TabsTrigger value="analysis">Asystent AI</TabsTrigger>
                <TabsTrigger value="banking-knowledge">
                  Wiedza Bankowa
                </TabsTrigger>
                <TabsTrigger value="control">Kontrola procesu</TabsTrigger>
                <TabsTrigger value="comm">Komunikacja</TabsTrigger>
                <TabsTrigger value="email">E-mail</TabsTrigger>
                <TabsTrigger value="banks">Proces bankowy</TabsTrigger>
                <TabsTrigger value="history">Etapy</TabsTrigger>
                <TabsTrigger value="settlement">Rozliczenie</TabsTrigger>
              </TabsList>
            </details>
            <TabsContent value="overview">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEdit(true)}
                >
                  <Pencil className="size-4" /> Edytuj Deal i powiązania
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/calendar?new=event&deal=${deal.id}`} />}
                >
                  <CalendarDays className="size-4" /> Dodaj termin
                </Button>
                {deal.contact?.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<a href={`mailto:${deal.contact.email}`} />}
                  >
                    <Mail className="size-4" /> E-mail
                  </Button>
                )}
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="space-y-3">
              <Section title="Aktualny stan">
                <Row label="Etap" value={deal.stage?.name} />
                <Row label="Utworzono" value={dt(deal.created_at)} />
                <Row
                  label="Ostatnia zmiana"
                  value={deal.updated_at && dt(deal.updated_at)}
                />
              </Section>
              {notes.map((n) => (
                <article key={n.id} className="rounded-lg border p-3">
                  <p className="text-sm whitespace-pre-wrap">{n.note_text}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {dt(n.created_at)} · {n.author_name || 'Użytkownik'}
                  </p>
                </article>
              ))}
            </TabsContent>
            <TabsContent value="activities" className="space-y-3">
              <Section title="Zaplanowane działania">
                <Row label="Następne działanie" value={deal.next_action} />
                <Row
                  label="Termin"
                  value={deal.next_action_at && dt(deal.next_action_at)}
                />
                <Row
                  label="Spotkanie"
                  value={deal.meeting_at && dt(deal.meeting_at)}
                />
                <Link
                  href={`/calendar?new=event&deal=${deal.id}`}
                  className="bg-primary text-primary-foreground mt-3 inline-flex rounded-md px-3 py-2 text-sm"
                >
                  Dodaj zadanie lub spotkanie
                </Link>
              </Section>
            </TabsContent>
            <TabsContent value="email">
              <Section title="Poczta">
                <p className="text-sm">
                  Skrzynka Gmail nie jest jeszcze podłączona. Wiadomości nie są
                  obecnie automatycznie pobierane do Deala.
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Integrację biuro@makson.space wykonamy razem z formularzem i
                  stroną. Skrzynka mFinanse pozostaje odseparowana.
                </p>
              </Section>
            </TabsContent>
            <TabsContent value="history">
              <Section title="Historia etapów">
                {!stageHistory.length && (
                  <p className="text-muted-foreground text-sm">
                    Brak wcześniejszych zmian etapu.
                  </p>
                )}
                <div className="space-y-2">
                  {stageHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <p>
                        {entry.from_stage?.name || 'Początek'} →{' '}
                        {entry.to_stage?.name || 'Nieznany etap'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {dt(entry.changed_at)} ·{' '}
                        {entry.author_name || 'Użytkownik'}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            </TabsContent>
            <TabsContent value="case" className="space-y-4">
              <Section title="Potrzeba klienta">
                <p className="text-sm whitespace-pre-wrap">
                  {deal.need_summary || deal.description || '—'}
                </p>
              </Section>
              <Section title="Źródło i kwalifikacja">
                <Grid>
                  <Row label="Źródło" value={deal.source} />
                  <Row label="Szczegóły źródła" value={deal.source_details} />
                  <Row label="Wynik" value={deal.qualification_status} />
                  <Row
                    label="Uzasadnienie / ryzyka"
                    value={deal.qualification_reason}
                  />
                  <Row label="Cel" value={deal.goal} />
                  <Row label="Produkt" value={deal.product_type} />
                  <Row label="Wnioskodawcy" value={deal.applicant_mode} />
                  <Row label="BIK" value={deal.bik_status} />
                </Grid>
              </Section>
              <Section title="Dochód i gospodarstwo">
                <Grid>
                  <Row label="Forma dochodu" value={deal.income_type} />
                  <MRow label="Dochód netto" value={deal.monthly_income} />
                  <MRow label="Koszty życia" value={deal.monthly_costs} />
                  <MRow label="Suma rat" value={deal.monthly_installments} />
                  <Row
                    label="Osób w gospodarstwie"
                    value={
                      deal.household_size
                        ? String(deal.household_size)
                        : undefined
                    }
                  />
                  <Row label="Stan cywilny" value={deal.marital_status} />
                  <Row label="Dochód od" value={deal.employment_from} />
                  <Row label="Umowa do" value={deal.contract_until} />
                </Grid>
                <p className="mt-3 text-sm">
                  Zobowiązania: {deal.liabilities || '—'}
                </p>
              </Section>
              <Section title="Finansowanie i nieruchomość">
                <Grid>
                  <MRow label="Kwota wnioskowana" value={deal.value} />
                  <MRow
                    label="Wartość nieruchomości"
                    value={deal.property_value}
                  />
                  <MRow label="Wkład własny" value={deal.own_contribution} />
                  <Row
                    label="Okres"
                    value={
                      deal.loan_term_months
                        ? `${deal.loan_term_months} miesięcy`
                        : undefined
                    }
                  />
                  <Row
                    label="Rodzaj nieruchomości"
                    value={deal.property_type}
                  />
                  <Row label="Lokalizacja" value={deal.property_location} />
                  <Row label="Obecny bank" value={deal.current_bank} />
                  <MRow label="Obecne saldo" value={deal.current_balance} />
                  <MRow label="Obecna rata" value={deal.current_installment} />
                  <MRow
                    label="Szacowana oszczędność"
                    value={deal.estimated_savings}
                  />
                </Grid>
              </Section>
              <Section title="Pełna ankieta">
                <p className="text-sm whitespace-pre-wrap">
                  {deal.questionnaire_text || 'Nie uzupełniono'}
                </p>
              </Section>
            </TabsContent>
            <TabsContent value="analysis">
              <DealAssistantActions dealId={deal.id} />
            </TabsContent>
            <TabsContent value="banking-knowledge">
              <DealBankingKnowledge dealId={deal.id} />
            </TabsContent>
            <TabsContent value="control">
              {accountId && (
                <DealProcessControl
                  deal={deal}
                  accountId={accountId}
                  onSaved={() => void load()}
                />
              )}
            </TabsContent>
            <TabsContent value="notes">
              <div className="mb-4 space-y-2">
                <VoiceTextarea
                  value={note}
                  onChange={setNote}
                  placeholder="Wpisz albo podyktuj notatkę ze spotkania lub rozmowy"
                  className="min-h-32"
                />
                <Button onClick={addNote}>Zapisz notatkę</Button>
              </div>
              {notes.map((n) => (
                <article key={n.id} className="mb-2 rounded-lg border p-3">
                  <p className="text-sm whitespace-pre-wrap">{n.note_text}</p>
                  <p className="text-muted-foreground text-xs">
                    {dt(n.created_at)} · {n.author_name || 'Użytkownik'}
                  </p>
                </article>
              ))}
            </TabsContent>
            <TabsContent value="banks" className="grid gap-4 2xl:grid-cols-3">
              {banks.map((b, i) => (
                <BankCard
                  key={b.position}
                  bank={b}
                  change={(next) =>
                    setBanks((x) => x.map((v, j) => (j === i ? next : v)))
                  }
                  save={() => saveBank(b)}
                />
              ))}
            </TabsContent>
            <TabsContent value="files" className="space-y-4">
              <Section title="Prywatna teczka dokumentów">
                <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <Input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Nazwa dokumentu (domyślnie nazwa pliku)"
                  />
                  <Input
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="Typ dokumentu"
                  />
                  <select
                    className="bg-muted h-10 rounded-md border px-3 text-sm"
                    value={documentStatus}
                    onChange={(e) => setDocumentStatus(e.target.value)}
                  >
                    <option value="otrzymany">Otrzymany</option>
                    <option value="do_weryfikacji">Do weryfikacji</option>
                    <option value="zaakceptowany">Zaakceptowany</option>
                  </select>
                  <Input
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                  />
                  <select
                    className="bg-muted h-10 rounded-md border px-3 text-sm md:col-span-2"
                    value={documentRequirementId}
                    onChange={(e) => setDocumentRequirementId(e.target.value)}
                  >
                    <option value="">Bez powiązania z wymaganiem</option>
                    {requirements.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Wysyłanie…' : 'Dodaj dokument'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <div className="mt-4 space-y-2">
                  {docs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {d.document_type || 'Dokument'} · {d.status} ·{' '}
                          {dt(d.received_at || d.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDoc(d)}
                        >
                          Otwórz
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeDoc(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!docs.length && (
                    <p className="text-muted-foreground text-sm">
                      Brak dokumentów.
                    </p>
                  )}
                </div>
              </Section>
              {deal.drive_folder_url && (
                <a
                  href={deal.drive_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Otwórz folder Google Drive
                </a>
              )}
              {!deal.drive_folder_url && (
                <Button
                  variant="outline"
                  disabled={creatingFolder}
                  onClick={() => void createDriveFolder()}
                >
                  <FileText className="h-4 w-4" />
                  {creatingFolder
                    ? 'Tworzę folder…'
                    : 'Utwórz folder na Dysku Google'}
                </Button>
              )}
            </TabsContent>
            <TabsContent value="comm" className="space-y-4">
              <Template
                title="Przypomnienie o spotkaniu"
                text={reminder}
                copy={copy}
              />
              <Template
                title="Prośba o dokumenty"
                text={documentMessage}
                copy={copy}
              />
              <p className="text-muted-foreground text-xs">
                CRM przygotowuje treść. Niczego nie wysyła bez Twojej decyzji.
              </p>
            </TabsContent>
            <TabsContent value="settlement" className="space-y-4">
              <Section title="Uruchomienie i prowizja">
                <Grid>
                  <MRow
                    label="Kwota uruchomiona"
                    value={deal.launched_amount}
                  />
                  <Row label="Data uruchomienia" value={deal.launched_at} />
                  <Row
                    label="Stawka prowizji"
                    value={
                      deal.commission_rate
                        ? `${deal.commission_rate}%`
                        : undefined
                    }
                  />
                  <MRow
                    label="Prowizja oczekiwana"
                    value={deal.expected_commission}
                  />
                  <MRow
                    label="Prowizja rzeczywista"
                    value={deal.actual_commission}
                  />
                </Grid>
              </Section>
              <Section title="Faktura i archiwum">
                <Grid>
                  <Row label="Numer faktury" value={deal.invoice_number} />
                  <Row label="Data faktury" value={deal.invoice_date} />
                  <Row label="Status" value={deal.invoice_status} />
                  <Row
                    label="Sprawdzone"
                    value={deal.settlement_verified ? 'Tak' : 'Nie'}
                  />
                  <Row label="Numer przesyłki" value={deal.tracking_number} />
                </Grid>
                <p className="mt-3 text-sm">
                  {deal.settlement_notes || 'Brak uwag'}
                </p>
              </Section>
            </TabsContent>
            <TabsContent value="activity-history">
              <ActivityHistory dealId={deal.id} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <DealForm
        open={edit}
        onOpenChange={setEdit}
        deal={deal}
        pipelineId={deal.pipeline_id}
        stages={stages}
        onSaved={() => {
          setEdit(false);
          void load();
        }}
      />
    </div>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] uppercase">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  );
}
function MRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <Row
      label={label}
      value={value == null ? undefined : `${money(value)} PLN`}
    />
  );
}
function LinkRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const c = (
    <div>
      <p className="text-muted-foreground text-[11px] uppercase">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
  return href ? (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block min-h-10 rounded px-1 py-1 hover:bg-emerald-50 hover:text-emerald-800 hover:underline"
    >
      {c}
    </Link>
  ) : (
    c
  );
}
function Template({
  title,
  text,
  copy,
}: {
  title: string;
  text: string;
  copy: (x: string) => Promise<void>;
}) {
  return (
    <Section title={title}>
      <p className="mb-3 text-sm whitespace-pre-wrap">{text}</p>
      <Button size="sm" onClick={() => copy(text)}>
        <Copy className="h-4 w-4" />
        Kopiuj wiadomość
      </Button>
    </Section>
  );
}
function money(v?: number | null) {
  return Number(v || 0).toLocaleString('pl-PL', { maximumFractionDigits: 2 });
}
function dt(v: string) {
  return formatWarsawDateTime(v);
}
function BankCard({
  bank,
  change,
  save,
}: {
  bank: Bank;
  change: (b: Bank) => void;
  save: () => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border p-3">
      <h3 className="font-semibold">Bank {bank.position}</h3>
      <Input
        value={bank.bank_name || ''}
        onChange={(e) => change({ ...bank, bank_name: e.target.value })}
        placeholder="Nazwa banku"
      />
      <Input
        value={bank.product_variant || ''}
        onChange={(e) => change({ ...bank, product_variant: e.target.value })}
        placeholder="Wariant produktu"
      />
      <Input
        value={bank.status || ''}
        onChange={(e) => change({ ...bank, status: e.target.value })}
        placeholder="Status procesu"
      />
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={bank.remote_process || false}
          onChange={(e) =>
            change({ ...bank, remote_process: e.target.checked })
          }
        />
        Proces zdalny
      </label>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Źródła analizy i druki
        </summary>
        <div className="mt-3 space-y-2">
          <Input
            type="url"
            value={bank.instruction_url || ''}
            onChange={(e) =>
              change({ ...bank, instruction_url: e.target.value })
            }
            placeholder="Link do instrukcji bankowej"
          />
          <Input
            value={bank.instruction_version || ''}
            onChange={(e) =>
              change({ ...bank, instruction_version: e.target.value })
            }
            placeholder="Wersja / data instrukcji"
          />
          <Input
            type="url"
            value={bank.application_form_url || ''}
            onChange={(e) =>
              change({ ...bank, application_form_url: e.target.value })
            }
            placeholder="Link do druku wniosku"
          />
          <Input
            value={bank.application_form_version || ''}
            onChange={(e) =>
              change({ ...bank, application_form_version: e.target.value })
            }
            placeholder="Wersja / data druku"
          />
        </div>
      </details>
      <label className="text-xs">
        Postęp {bank.progress || 0}%
        <Input
          type="range"
          min="0"
          max="100"
          step="5"
          value={bank.progress || 0}
          onChange={(e) =>
            change({ ...bank, progress: Number(e.target.value) })
          }
        />
      </label>
      <D
        label="Data złożenia"
        value={bank.submitted_at}
        set={(v) => change({ ...bank, submitted_at: v })}
      />
      <Textarea
        value={bank.conditions || ''}
        onChange={(e) => change({ ...bank, conditions: e.target.value })}
        placeholder="Warunki banku"
      />
      <Textarea
        value={bank.missing_documents || ''}
        onChange={(e) => change({ ...bank, missing_documents: e.target.value })}
        placeholder="Braki dokumentacyjne"
      />
      <Input
        value={bank.decision || ''}
        onChange={(e) => change({ ...bank, decision: e.target.value })}
        placeholder="Decyzja"
      />
      <D
        label="Data decyzji"
        value={bank.decision_at}
        set={(v) => change({ ...bank, decision_at: v })}
      />
      <Input
        type="number"
        value={bank.final_amount ?? ''}
        onChange={(e) =>
          change({ ...bank, final_amount: Number(e.target.value) || undefined })
        }
        placeholder="Kwota końcowa"
      />
      <D
        label="Podpisanie umowy"
        value={bank.contract_signed_at}
        set={(v) => change({ ...bank, contract_signed_at: v })}
      />
      <D
        label="Uruchomienie"
        value={bank.launched_at}
        set={(v) => change({ ...bank, launched_at: v })}
      />
      <Button size="sm" className="w-full" onClick={save}>
        Zapisz proces
      </Button>
    </section>
  );
}
function D({
  label,
  value,
  set,
}: {
  label: string;
  value?: string;
  set: (v: string) => void;
}) {
  return (
    <label className="text-muted-foreground grid gap-1 text-xs">
      {label}
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
