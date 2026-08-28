"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Company, Contact, CrmActivity, Deal, DealNote, PipelineStage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

type DealFull = Deal & {
  contact?: Contact | null;
  company?: Company | null;
  stage?: PipelineStage | null;
};

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const { accountId } = useAuth();
  const [deal, setDeal] = useState<DealFull | null>(null);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDue, setActivityDue] = useState("");

  const load = useCallback(async () => {
    if (!accountId) return;
    const [dealRes, notesRes, activitiesRes, contactsRes, companiesRes] = await Promise.all([
      supabase.from("deals").select("*, contact:contacts(*), company:companies(*), stage:pipeline_stages(*)").eq("id", id).single(),
      supabase.from("deal_notes").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
      supabase.from("crm_activities").select("*").eq("deal_id", id).order("due_at", { ascending: true }),
      supabase.from("contacts").select("*").eq("account_id", accountId).order("name"),
      supabase.from("companies").select("*").eq("account_id", accountId).order("name"),
    ]);
    if (dealRes.error || !dealRes.data) {
      toast.error("Nie udało się otworzyć Deala");
      return;
    }
    const row = dealRes.data as DealFull;
    setDeal(row);
    setNotes((notesRes.data ?? []) as DealNote[]);
    setActivities((activitiesRes.data ?? []) as CrmActivity[]);
    setContacts((contactsRes.data ?? []) as Contact[]);
    setCompanies((companiesRes.data ?? []) as Company[]);
    const { data: stageRows } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("pipeline_id", row.pipeline_id)
      .order("position");
    setStages((stageRows ?? []) as PipelineStage[]);
  }, [accountId, id, supabase]);

  useEffect(() => { void load(); }, [load]);

  const nextOpenActivity = useMemo(
    () => activities.find((a) => !a.completed_at) ?? null,
    [activities],
  );

  async function saveDeal(patch?: Partial<Deal>) {
    if (!deal) return;
    setSaving(true);
    const payload = patch ?? {
      title: deal.title,
      description: deal.description || null,
      value: Number(deal.value || 0),
      contact_id: deal.contact_id || null,
      company_id: deal.company_id || null,
      stage_id: deal.stage_id,
      source: deal.source || null,
      deal_type: deal.deal_type || null,
      next_action: deal.next_action || null,
      next_action_at: deal.next_action_at || null,
      blocker: deal.blocker || null,
      blocker_since: deal.blocker ? deal.blocker_since || new Date().toISOString() : null,
    };
    const { error } = await supabase.from("deals").update(payload).eq("id", deal.id);
    setSaving(false);
    if (error) toast.error("Nie udało się zapisać Deala");
    else {
      toast.success("Deal zapisany");
      await load();
    }
  }

  async function addNote() {
    if (!deal || !accountId || !newNote.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase.from("deal_notes").insert({
      account_id: accountId,
      deal_id: deal.id,
      user_id: session.user.id,
      note_text: newNote.trim(),
    });
    if (error) toast.error("Nie udało się zapisać notatki");
    else {
      setNewNote("");
      await load();
    }
  }

  async function addActivity() {
    if (!deal || !accountId || !activityTitle.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase.from("crm_activities").insert({
      account_id: accountId,
      user_id: session.user.id,
      activity_type: "follow_up",
      title: activityTitle.trim(),
      due_at: activityDue || null,
      deal_id: deal.id,
      contact_id: deal.contact_id || null,
      company_id: deal.company_id || null,
    });
    if (error) toast.error("Nie udało się zapisać działania");
    else {
      setActivityTitle("");
      setActivityDue("");
      await load();
    }
  }

  async function completeActivity(activity: CrmActivity) {
    const { error } = await supabase
      .from("crm_activities")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", activity.id);
    if (!error) await load();
  }

  if (!deal) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Ładowanie Deala...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <p className="text-sm text-muted-foreground">Deal jest centrum tej sprawy.</p>
        </div>
        <Button onClick={() => saveDeal()} disabled={saving}><Save className="size-4" /> Zapisz</Button>
      </div>

      {nextOpenActivity ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Następne działanie</div>
          <div className="font-semibold">{nextOpenActivity.title}</div>
          {nextOpenActivity.due_at ? <div className="text-sm text-muted-foreground">{new Date(nextOpenActivity.due_at).toLocaleString("pl-PL")}</div> : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Sprawa</h2>
          <Input value={deal.title} onChange={(e) => setDeal({ ...deal, title: e.target.value })} placeholder="Nazwa Deala" />
          <Textarea value={deal.description ?? ""} onChange={(e) => setDeal({ ...deal, description: e.target.value })} placeholder="Krótki opis" />
          <Input type="number" value={String(deal.value ?? 0)} onChange={(e) => setDeal({ ...deal, value: Number(e.target.value) })} placeholder="Kwota" />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={deal.stage_id} onChange={(e) => setDeal({ ...deal, stage_id: e.target.value })}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Input value={deal.deal_type ?? ""} onChange={(e) => setDeal({ ...deal, deal_type: e.target.value })} placeholder="Typ Deala" />
          </div>
          <Input value={deal.source ?? ""} onChange={(e) => setDeal({ ...deal, source: e.target.value })} placeholder="Źródło" />
          <Textarea value={deal.next_action ?? ""} onChange={(e) => setDeal({ ...deal, next_action: e.target.value })} placeholder="Następny krok" />
          <Input type="datetime-local" value={deal.next_action_at ? deal.next_action_at.slice(0,16) : ""} onChange={(e) => setDeal({ ...deal, next_action_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
          <Textarea value={deal.blocker ?? ""} onChange={(e) => setDeal({ ...deal, blocker: e.target.value })} placeholder="Bloker — jeśli występuje" />
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Kontakt i Firma</h2></div>
          <div className="flex gap-2">
            <select className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={deal.contact_id ?? ""} onChange={(e) => setDeal({ ...deal, contact_id: e.target.value || null })}>
              <option value="">Wybierz Kontakt</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} — {c.phone}</option>)}
            </select>
            <Button variant="outline" render={<Link href="/contacts" />}><Plus className="size-4" /> Kontakt</Button>
          </div>
          <div className="flex gap-2">
            <select className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={deal.company_id ?? ""} onChange={(e) => setDeal({ ...deal, company_id: e.target.value || null })}>
              <option value="">Firma opcjonalna</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.nip ? ` — ${c.nip}` : ""}</option>)}
            </select>
            <Button variant="outline" render={<Link href="/companies" />}><Plus className="size-4" /> Firma</Button>
          </div>
          {deal.contact_id ? <Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/contacts?open=${deal.contact_id}`}>Otwórz Kontakt</Link> : null}
          {deal.company_id ? <Link className="ml-3 text-sm text-primary underline-offset-4 hover:underline" href={`/companies/${deal.company_id}`}>Otwórz Firmę</Link> : null}
        </section>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Działania / follow-up</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <Input value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder="Co mam zrobić?" />
          <Input type="datetime-local" value={activityDue} onChange={(e) => setActivityDue(e.target.value)} />
          <Button onClick={addActivity} disabled={!activityTitle.trim()}><CalendarPlus className="size-4" /> Dodaj</Button>
        </div>
        <div className="grid gap-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className={a.completed_at ? "text-sm line-through opacity-60" : "text-sm font-medium"}>{a.title}</div>
                {a.due_at ? <div className="text-xs text-muted-foreground">{new Date(a.due_at).toLocaleString("pl-PL")}</div> : null}
              </div>
              {!a.completed_at ? <Button size="sm" variant="outline" onClick={() => completeActivity(a)}>Gotowe</Button> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Notatki i historia</h2>
        <div className="flex gap-2">
          <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Notatka — możesz użyć dyktowania systemowego" />
          <Button onClick={addNote} disabled={!newNote.trim()}><Plus className="size-4" /> Dodaj</Button>
        </div>
        <div className="grid gap-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border p-3">
              <div className="text-sm whitespace-pre-wrap">{n.note_text}</div>
              <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pl-PL")}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
