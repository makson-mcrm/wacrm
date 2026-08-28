"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Company, Contact, Deal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

type CompanyWithLinks = Company & {
  contacts?: { contact: Contact }[];
  deals?: Deal[];
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [company, setCompany] = useState<CompanyWithLinks | null>(null);
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*, contacts:contact_companies(contact:contacts(*)), deals(*)")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast.error("Nie udało się otworzyć firmy");
      return;
    }
    const row = data as CompanyWithLinks;
    setCompany(row);
    setName(row.name);
    setNip(row.nip ?? "");
    setDescription(row.description ?? "");
  }, [id, supabase]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!company || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update({
      name: name.trim(),
      nip: nip.trim() || null,
      description: description.trim() || null,
    }).eq("id", company.id);
    setSaving(false);
    if (error) toast.error("Nie udało się zapisać firmy");
    else {
      toast.success("Firma zapisana");
      await load();
    }
  }

  if (!company) return <div className="text-sm text-muted-foreground">Ładowanie firmy...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">Karta Firmy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href={`/contacts?company=${company.id}`}><Plus className="size-4" /> Kontakt</Link></Button>
          <Button asChild><Link href={`/pipelines?company=${company.id}`}><Plus className="size-4" /> Deal</Link></Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa firmy" />
        <Input value={nip} onChange={(e) => setNip(e.target.value)} placeholder="NIP" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opis" />
        <div><Button onClick={save} disabled={saving}><Save className="size-4" /> Zapisz</Button></div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Kontakty</h2></div>
        <div className="grid gap-2">
          {(company.contacts ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Brak powiązanych Kontaktów.</p> :
            company.contacts?.map((row) => (
              <Link key={row.contact.id} href={`/contacts?open=${row.contact.id}`} className="rounded-lg border p-3 hover:bg-muted/50">
                <div className="font-medium">{row.contact.name || row.contact.phone}</div>
                <div className="text-xs text-muted-foreground">{row.contact.phone}</div>
              </Link>
            ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Deale</h2>
        <div className="grid gap-2">
          {(company.deals ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Brak powiązanych Deali.</p> :
            company.deals?.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="rounded-lg border p-3 hover:bg-muted/50">
                <div className="font-medium">{deal.title}</div>
                {deal.next_action ? <div className="text-xs text-muted-foreground">Następny krok: {deal.next_action}</div> : null}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
