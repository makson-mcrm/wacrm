"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Company, Contact } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export function DealRelationsField({
  contactId,
  companyId,
  onContactChange,
  onCompanyChange,
}: {
  contactId: string;
  companyId: string;
  onContactChange: (id: string) => void;
  onCompanyChange: (id: string) => void;
}) {
  const supabase = createClient();
  const { accountId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyNip, setCompanyNip] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const load = useCallback(async () => {
    if (!accountId) return;
    const [contactsRes, companiesRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("account_id", accountId).order("name"),
      supabase.from("companies").select("*").eq("account_id", accountId).order("name"),
    ]);
    setContacts((contactsRes.data ?? []) as Contact[]);
    setCompanies((companiesRes.data ?? []) as Company[]);
  }, [accountId, supabase]);

  useEffect(() => { void load(); }, [load]);

  async function link(contact: string, company: string) {
    if (!accountId || !contact || !company) return;
    await supabase.from("contact_companies").upsert({
      account_id: accountId,
      contact_id: contact,
      company_id: company,
      is_primary: true,
    }, { onConflict: "contact_id,company_id" });
  }

  async function selectContact(id: string) {
    onContactChange(id);
    if (id && companyId) await link(id, companyId);
  }

  async function selectCompany(id: string) {
    onCompanyChange(id);
    if (id && contactId) await link(contactId, id);
  }

  async function createContact() {
    if (!accountId || !contactPhone.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.from("contacts").insert({
      account_id: accountId,
      user_id: session.user.id,
      name: contactName.trim() || null,
      phone: contactPhone.trim(),
      email: contactEmail.trim() || null,
    }).select("*").single();
    setSaving(false);
    if (error || !data) {
      toast.error("Nie udało się utworzyć Kontaktu");
      return;
    }
    await load();
    onContactChange(data.id);
    if (companyId) await link(data.id, companyId);
    setContactOpen(false);
    setContactName(""); setContactPhone(""); setContactEmail("");
    toast.success("Kontakt dodany do Deala");
  }

  async function createCompany() {
    if (!accountId || !companyName.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.from("companies").insert({
      account_id: accountId,
      user_id: session.user.id,
      name: companyName.trim(),
      nip: companyNip.trim() || null,
      description: companyDescription.trim() || null,
    }).select("*").single();
    setSaving(false);
    if (error || !data) {
      toast.error("Nie udało się utworzyć Firmy");
      return;
    }
    await load();
    onCompanyChange(data.id);
    if (contactId) await link(contactId, data.id);
    setCompanyOpen(false);
    setCompanyName(""); setCompanyNip(""); setCompanyDescription("");
    toast.success("Firma dodana do Deala");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm text-muted-foreground">Kontakt *</label>
        <div className="flex gap-2">
          <select
            value={contactId}
            onChange={(e) => void selectContact(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-muted px-2.5 text-sm"
          >
            <option value="">Wybierz Kontakt</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} — {c.phone}</option>)}
          </select>
          <Button type="button" variant="outline" onClick={() => setContactOpen(true)} aria-label="Dodaj Kontakt">
            <Plus className="size-4" /> Kontakt
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-muted-foreground">Firma — opcjonalnie</label>
        <div className="flex gap-2">
          <select
            value={companyId}
            onChange={(e) => void selectCompany(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-muted px-2.5 text-sm"
          >
            <option value="">Bez Firmy</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.nip ? ` — ${c.nip}` : ""}</option>)}
          </select>
          <Button type="button" variant="outline" onClick={() => setCompanyOpen(true)} aria-label="Dodaj Firmę">
            <Plus className="size-4" /> Firma
          </Button>
        </div>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nowy Kontakt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Imię i nazwisko" />
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Telefon *" />
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="E-mail" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContactOpen(false)}>Anuluj</Button>
            <Button type="button" onClick={createContact} disabled={saving || !contactPhone.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />} Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={companyOpen} onOpenChange={setCompanyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nowa Firma</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nazwa firmy *" />
            <Input value={companyNip} onChange={(e) => setCompanyNip(e.target.value)} placeholder="NIP" />
            <Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="Krótki opis" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompanyOpen(false)}>Anuluj</Button>
            <Button type="button" onClick={createCompany} disabled={saving || !companyName.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />} Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
