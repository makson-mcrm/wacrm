"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Company } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function CompaniesPage() {
  const supabase = createClient();
  const { accountId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Nie udało się pobrać firm");
    setCompanies((data ?? []) as Company[]);
    setLoading(false);
  }, [accountId, supabase]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 3) return companies;
    return companies.filter((c) =>
      [c.name, c.nip ?? "", c.description ?? ""].some((v) => v.toLowerCase().includes(q))
    );
  }, [companies, search]);

  async function createCompany() {
    if (!accountId || !name.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setSaving(false);
      toast.error("Brak aktywnej sesji");
      return;
    }
    const { error } = await supabase.from("companies").insert({
      account_id: accountId,
      user_id: user.id,
      name: name.trim(),
      nip: nip.trim() || null,
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Nie udało się zapisać firmy");
      return;
    }
    toast.success("Firma zapisana");
    setOpen(false);
    setName(""); setNip(""); setDescription("");
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firmy</h1>
          <p className="text-sm text-muted-foreground">Firmy powiązane z Kontaktami i Dealami.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Dodaj firmę</Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj firmy, NIP lub opisu — od 3 znaków"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Ładowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Brak firm.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`} className="rounded-xl border bg-card p-4 transition hover:bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><Building2 className="size-4" /></div>
                <div className="min-w-0">
                  <div className="font-semibold">{company.name}</div>
                  {company.nip ? <div className="text-xs text-muted-foreground">NIP: {company.nip}</div> : null}
                  {company.description ? <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{company.description}</div> : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nowa firma</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa firmy *" />
            <Input value={nip} onChange={(e) => setNip(e.target.value)} placeholder="NIP" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krótki opis" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button onClick={createCompany} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />} Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
