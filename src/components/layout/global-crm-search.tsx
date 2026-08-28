'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { Company, Contact, Deal } from '@/types';

type Results = {
  deals: Deal[];
  contacts: Contact[];
  companies: Company[];
};

export function GlobalCrmSearch() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results>({
    deals: [],
    contacts: [],
    companies: [],
  });
  const requestSeq = useRef(0);
  const term = query.trim();

  useEffect(() => {
    if (!accountId || term.length < 3) {
      setResults({ deals: [], contacts: [], companies: [] });
      setOpen(false);
      return;
    }

    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      const like = `%${term}%`;
      const [deals, contacts, companies] = await Promise.all([
        db
          .from('deals')
          .select('id,user_id,title,value,currency,contact_id,company_id,pipeline_id,stage_id,status,created_at,account_id')
          .eq('account_id', accountId)
          .ilike('title', like)
          .limit(8),
        db
          .from('contacts')
          .select('*')
          .eq('account_id', accountId)
          .or(`name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
          .limit(8),
        db
          .from('companies')
          .select('*')
          .eq('account_id', accountId)
          .or(`name.ilike.${like},nip.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
          .limit(8),
      ]);

      if (seq !== requestSeq.current) return;
      setResults({
        deals: (deals.data ?? []) as Deal[],
        contacts: (contacts.data ?? []) as Contact[],
        companies: (companies.data ?? []) as Company[],
      });
      setOpen(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [accountId, db, term]);

  const total =
    results.deals.length + results.contacts.length + results.companies.length;

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => term.length >= 3 && setOpen(true)}
          onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
          placeholder="Szukaj Deal / Kontakt / Firma"
          aria-label="Globalna wyszukiwarka CRM"
          className="border-border bg-muted/40 h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus:border-primary"
        />
      </div>

      {open && term.length >= 3 && (
        <div className="bg-popover border-border absolute top-11 right-0 z-50 max-h-[70vh] w-full min-w-[340px] overflow-auto rounded-xl border p-2 shadow-xl">
          {total === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-sm">
              Brak wyników dla „{term}”.
            </p>
          ) : (
            <>
              <Group title="Deale">
                {results.deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    onClick={() => setOpen(false)}
                    className="hover:bg-muted block rounded-lg px-3 py-2"
                  >
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="text-muted-foreground text-xs">Deal</p>
                  </Link>
                ))}
              </Group>

              <Group title="Kontakty">
                {results.contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/contacts?open=${contact.id}`}
                    onClick={() => setOpen(false)}
                    className="hover:bg-muted block rounded-lg px-3 py-2"
                  >
                    <p className="text-sm font-medium">
                      {contact.name ||
                        [contact.first_name, contact.last_name]
                          .filter(Boolean)
                          .join(' ') ||
                        contact.phone}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {contact.phone}
                      {contact.email ? ` · ${contact.email}` : ''}
                    </p>
                  </Link>
                ))}
              </Group>

              <Group title="Firmy">
                {results.companies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/companies?open=${company.id}`}
                    onClick={() => setOpen(false)}
                    className="hover:bg-muted block rounded-lg px-3 py-2"
                  >
                    <p className="text-sm font-medium">{company.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {company.nip ? `NIP ${company.nip}` : 'Firma'}
                    </p>
                  </Link>
                ))}
              </Group>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-2 last:mb-0">
      <p className="text-muted-foreground px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </p>
      {children}
    </section>
  );
}
