'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, ExternalLink, FileText, Mail, Pencil, Phone, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealForm } from '@/components/pipelines/deal-form';
import type { Deal, PipelineStage } from '@/types';

type DealNote = { id: string; note_text: string; created_at: string };
type BankProcess = { id?: string; position: number; bank_name?: string; status?: string; missing_documents?: string; decision?: string };

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const { accountId } = useAuth();
  const db = useMemo(() => createClient(), []);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [banks, setBanks] = useState<BankProcess[]>([1, 2, 3].map((position) => ({ position })));
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [dealRes, notesRes, banksRes] = await Promise.all([
      db.from('deals').select('*, contact:contacts(*), company:companies(*), stage:pipeline_stages(*), assignee:profiles!deals_assigned_to_fkey(*)').eq('id', id).single(),
      db.from('deal_notes').select('*').eq('deal_id', id).order('created_at', { ascending: false }),
      db.from('bank_processes').select('*').eq('deal_id', id).order('position'),
    ]);
    setDeal(dealRes.data as Deal | null);
    setNotes((notesRes.data ?? []) as DealNote[]);
    const existing = (banksRes.data ?? []) as BankProcess[];
    setBanks([1, 2, 3].map((position) => existing.find((bank) => bank.position === position) ?? { position }));
    if (dealRes.data?.pipeline_id) {
      const { data: stageRows } = await db.from('pipeline_stages').select('*').eq('pipeline_id', dealRes.data.pipeline_id).order('position');
      setStages((stageRows ?? []) as PipelineStage[]);
    }
  }, [db, id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function addNote() {
    if (!newNote.trim() || !deal || !accountId) return;
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session?.user) return;
    await db.from('deal_notes').insert({ account_id: accountId, deal_id: deal.id, user_id: sessionData.session.user.id, note_text: newNote.trim() });
    setNewNote('');
    await load();
  }

  async function saveBank(bank: BankProcess) {
    if (!deal || !accountId) return;
    await db.from('bank_processes').upsert({ account_id: accountId, deal_id: deal.id, position: bank.position, bank_name: bank.bank_name || null, status: bank.status || null, missing_documents: bank.missing_documents || null, decision: bank.decision || null }, { onConflict: 'deal_id,position' });
    await load();
  }

  if (!deal) return <div className="p-8 text-muted-foreground">Wczytywanie karty Deal…</div>;

  return (
    <div className="space-y-4">
      <Link href="/pipelines" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Wróć do lejka</Link>
      <header className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase text-primary">{deal.stage?.name}</p><h1 className="mt-1 text-2xl font-bold">{deal.title}</h1><p className="mt-1 text-sm text-muted-foreground">{deal.description || 'Brak opisu ogólnego Deala'}</p></div>
          <div className="text-right"><p className="text-2xl font-bold text-primary">{Number(deal.value || 0).toLocaleString('pl-PL')} {deal.currency || 'PLN'}</p><p className="text-xs text-muted-foreground">Oczekiwana prowizja: {Number(deal.expected_commission || 0).toLocaleString('pl-PL')} PLN</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edytuj Deal</Button>
          {deal.contact?.phone && <a href={`tel:${deal.contact.phone}`}><Button size="sm"><Phone className="h-4 w-4" /> Zadzwoń</Button></a>}
          {deal.contact?.email && <a href={`mailto:${deal.contact.email}`}><Button size="sm" variant="outline"><Mail className="h-4 w-4" /> E-mail</Button></a>}
          {deal.drive_folder_url && <a href={deal.drive_folder_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><FileText className="h-4 w-4" /> Dokumenty <ExternalLink className="h-3 w-3" /></Button></a>}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <Panel title="Powiązania">
            <Info icon={UserRound} label="Kontakt" value={deal.contact?.name || deal.contact?.phone || 'Brak'} href={deal.contact_id ? `/contacts?open=${deal.contact_id}` : undefined} />
            <Info icon={Building2} label="Firma" value={deal.company?.name || 'Brak'} href={deal.company_id ? `/companies?open=${deal.company_id}` : undefined} />
          </Panel>
          <Panel title="Najważniejsze dane">
            <Row label="Źródło" value={deal.source} /><Row label="Cel" value={deal.goal} /><Row label="Typ" value={deal.product_type} /><Row label="Wnioskodawcy" value={deal.applicant_mode} /><Row label="Dochód" value={deal.income_type} /><Row label="NIP" value={deal.company_nip} /><Row label="Księgowość" value={deal.accounting_type} /><Row label="BIK" value={deal.bik_status} />
          </Panel>
          <Panel title="Następne działanie">
            <p className="text-sm font-medium">{deal.next_action || 'Nie ustalono'}</p>{deal.next_action_at && <p className="mt-1 text-xs text-muted-foreground">{new Date(deal.next_action_at).toLocaleString('pl-PL')}</p>}
            {deal.meeting_at && <p className="mt-3 flex items-center gap-2 text-xs"><CalendarDays className="h-4 w-4" /> {new Date(deal.meeting_at).toLocaleString('pl-PL')} · {deal.meeting_place}</p>}
          </Panel>
        </aside>

        <main className="rounded-xl border bg-card p-4">
          <Tabs defaultValue="case">
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start"><TabsTrigger value="case">Dane sprawy i ankieta</TabsTrigger><TabsTrigger value="notes">Notatki i działania</TabsTrigger><TabsTrigger value="banks">Proces bankowy</TabsTrigger><TabsTrigger value="files">Dokumenty</TabsTrigger></TabsList>
            <TabsContent value="case" className="space-y-4">
              <Section title="Opis ogólny"><p className="whitespace-pre-wrap text-sm">{deal.description || 'Brak opisu.'}</p></Section>
              <Section title="Dane z formularza"><div className="grid gap-3 sm:grid-cols-2"><Row label="Kwota finansowania" value={`${Number(deal.value || 0).toLocaleString('pl-PL')} ${deal.currency || 'PLN'}`} /><Row label="Źródło" value={deal.source} /><Row label="Cel" value={deal.goal} /><Row label="Rodzaj sprawy" value={deal.product_type} /><Row label="Osoba / para" value={deal.applicant_mode} /><Row label="Forma dochodu" value={deal.income_type} /></div></Section>
              <Section title="Dane z pełnej ankiety"><p className="whitespace-pre-wrap text-sm">{deal.questionnaire_text || 'Ankieta nie została jeszcze przesłana.'}</p></Section>
              <Section title="Zobowiązania i sytuacja"><p className="whitespace-pre-wrap text-sm">{deal.liabilities || 'Brak danych.'}</p></Section>
            </TabsContent>
            <TabsContent value="notes"><div className="mb-4 flex gap-2"><Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Podyktuj lub wpisz notatkę ze spotkania albo rozmowy…" /><Button onClick={addNote}>Dodaj</Button></div><div className="space-y-3">{notes.map((note) => <article key={note.id} className="rounded-lg border bg-muted/40 p-3"><p className="whitespace-pre-wrap text-sm">{note.note_text}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString('pl-PL')}</p></article>)}{notes.length === 0 && <p className="text-sm text-muted-foreground">Brak notatek.</p>}</div></TabsContent>
            <TabsContent value="banks" className="grid gap-4 lg:grid-cols-3">{banks.map((bank, index) => <BankCard key={bank.position} bank={bank} onChange={(next) => setBanks((current) => current.map((item, i) => i === index ? next : item))} onSave={() => saveBank(bank)} />)}</TabsContent>
            <TabsContent value="files"><Section title="Teczka klienta"><p className="text-sm text-muted-foreground">{deal.drive_folder_url ? 'Folder Google Drive jest przypisany do tego Deala.' : 'Folder nie został jeszcze przypisany.'}</p>{deal.drive_folder_url && <a href={deal.drive_folder_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm text-primary">Otwórz folder dokumentów</a>}<p className="mt-4 text-sm"><strong>Lista braków:</strong><br />{deal.missing_documents || 'Brak wpisanej listy.'}</p></Section></TabsContent>
          </Tabs>
        </main>
      </div>
      <DealForm open={editOpen} onOpenChange={setEditOpen} deal={deal} pipelineId={deal.pipeline_id} stages={stages} onSaved={() => { setEditOpen(false); void load(); }} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">{title}</h2><div className="space-y-3">{children}</div></section>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">{title}</h3>{children}</section>; }
function Row({ label, value }: { label: string; value?: string | null }) { return <div><p className="text-[11px] uppercase text-muted-foreground">{label}</p><p className="text-sm">{value || '—'}</p></div>; }
function Info({ icon: Icon, label, value, href }: { icon: typeof UserRound; label: string; value: string; href?: string }) { const content = <div className="flex items-center gap-3"><Icon className="h-4 w-4 text-primary" /><div><p className="text-[11px] uppercase text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div></div>; return href ? <Link href={href}>{content}</Link> : content; }
function BankCard({ bank, onChange, onSave }: { bank: BankProcess; onChange: (bank: BankProcess) => void; onSave: () => void }) { return <section className="space-y-3 rounded-xl border p-3"><h3 className="font-semibold">Bank {bank.position}</h3><Input value={bank.bank_name || ''} onChange={(e) => onChange({ ...bank, bank_name: e.target.value })} placeholder="Nazwa banku" /><Input value={bank.status || ''} onChange={(e) => onChange({ ...bank, status: e.target.value })} placeholder="Status procesu" /><Textarea value={bank.missing_documents || ''} onChange={(e) => onChange({ ...bank, missing_documents: e.target.value })} placeholder="Braki dokumentacyjne" /><Input value={bank.decision || ''} onChange={(e) => onChange({ ...bank, decision: e.target.value })} placeholder="Decyzja" /><Button onClick={onSave} size="sm" className="w-full">Zapisz proces</Button></section>; }
