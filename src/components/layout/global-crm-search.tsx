"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Company, Contact, Deal } from "@/types";
import { Search } from "lucide-react";

type SearchResults = {
  deals: Deal[];
  contacts: Contact[];
  companies: Company[];
};

export function GlobalCrmSearch() {
  const supabase = createClient();
  const { accountId } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults>({ deals: [], contacts: [], companies: [] });
  const seq = useRef(0);
  const term = query.trim();

  useEffect(() => {
    if (!accountId || term.length < 3) {
      setResults({ deals: [], contacts: [], companies: [] });
      setOpen(false);
      return;
    }
    const current = ++seq.current;
    const timer = window.setTimeout(async () => {
      const like = `%${term}%`;
      const [dealsRes, contactsRes, companiesRes] = await Promise.all([
        supabase
          .from("deals")
          .select("id,title,value,company_id,contact_id,pipeline_id,stage_id,user_id,created_at")
          .eq("account_id", accountId)
          .ilike("title", like)
          .limit(8),
        supabase
          .from("contacts")
          .select("*")
          .eq("account_id", accountId)
          .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
          .limit(8),
        supabase
          .from("companies")
          .select("*")
          .eq("account_id", accountId)
          .or(`name.ilike.${like},nip.ilike.${like},description.ilike.${like}`)
          .limit(8),
      ]);
      if (current !== seq.current) return;
      setResults({
        deals: (dealsRes.data ?? []) as Deal[],
        contacts: (contactsRes.data ?? []) as Contact[],
        companies: (companiesRes.data ?? []) as Company[],
      });
      setOpen(true);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [accountId, supabase, term]);

  const count = useMemo(
    () => results.deals.length + results.contacts.length + results.companies.length,
    [results],
  );

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => term.length >= 3 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Szukaj Deal / Kontakt / Firma"
          className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-primary"
          aria-label="Globalna wyszukiwarka CRM"
        />
      </div>
      {open && term.length >= 3 ? (
        <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-full min-w-[320px] overflow-auto rounded-xl border bg-popover p-2 shadow-xl">
          {count === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Brak wyników dla „{term}”.</div>
          ) : (
            <>
              <ResultGroup title="Deale">
                {results.deals.map((d) => (
                  <Link key={d.id} href={`/deals/${d.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-muted">
                    <div className="text-sm font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">Deal</div>
                  </Link>
                ))}
              </ResultGroup>
              <ResultGroup title="Kontakty">
                {results.contacts.map((c) => (
                  <Link key={c.id} href={`/contacts?open=${c.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-muted">
                    <div className="text-sm font-medium">{c.name || c.phone}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                  </Link>
                ))}
              </ResultGroup>
              <ResultGroup title="Firmy">
                {results.companies.map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-muted">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.nip ? `NIP ${c.nip}` : "Firma"}</div>
                  </Link>
                ))}
              </ResultGroup>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2 last:mb-0">
      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </section>
  );
}
