'use client';

import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Pencil } from 'lucide-react';
import type { Company } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityHistory } from '@/components/sales/activity-history';
import { formatCrmDate } from '@/lib/crm/format';
import { geometryCssVars, BRAND_ROW_BG, BRAND_PAGE_BG, LIST_TEXT_COLOR } from '@/lib/ui/layout-geometry';
import { createClient } from '@/lib/supabase/client';
import { surfaceFlags } from '@/lib/ui/surface-flags';

interface CompanyCardProps {
  company: Company;
  ownerName: string;
  primaryContact?: { id: string; name: string } | null;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function CompanyCard({ company, ownerName, primaryContact, canEdit, onBack, onEdit }: CompanyCardProps) {
  const [tab, setTab] = useState('timeline');
  const db = useMemo(() => createClient(), []);
  const [activities, setActivities] = useState<{ id: string; title: string; occurred_at: string }[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (tab !== 'activities' || surfaceFlags.companiesExtensions) return;
    let active = true;
    setActivitiesLoading(true);
    setActivitiesError(false);
    setActivities([]);
    void (async () => {
      try {
        const { data, error } = await db.from('sales_activities').select('id,title,occurred_at')
          .eq('account_id', company.account_id).eq('company_id', company.id).order('occurred_at', { ascending: false });
        if (!active) return;
        if (error) setActivitiesError(true);
        else setActivities(data ?? []);
      } catch {
        if (active) setActivitiesError(true);
      } finally {
        if (active) setActivitiesLoading(false);
      }
    })();
    return () => { active = false; };
  }, [company.account_id, company.id, db, tab, reload]);
  const fields: [string, ReactNode][] = [
    ['Nazwa firmy', company.name],
    ['Telefon', company.phone ? <a href={`tel:${company.phone}`}>{company.phone}</a> : '—'],
    ['E-mail', company.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : '—'],
    ['Strona internetowa', company.website || '—'],
    ['Osoba', primaryContact ? <Link href={`/contacts?open=${primaryContact.id}`}>{primaryContact.name}</Link> : '—'],
    ['Właściciel', ownerName || '—'],
    ['Adres', [company.address, [company.postal_code, company.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'],
  ];

  return (
    <section data-bigin-company-card style={{ ...geometryCssVars('cards'), background: BRAND_PAGE_BG, color: LIST_TEXT_COLOR, '--brand-row': BRAND_ROW_BG } as CSSProperties} className="min-h-full text-sm [&_a]:text-[var(--brand-link)]">
      <header data-slot="card-record-header" className="flex h-[var(--card-record-header-height)] items-center gap-4 border-b px-5">
        <Button variant="ghost" size="icon" aria-label="Wróć do firm" onClick={onBack}><ArrowLeft className="size-5" /></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{company.name}</h1>
          <p className="truncate text-xs text-[var(--foreground)]">{ownerName || '—'}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Edytuj firmę" onClick={onEdit} disabled={!canEdit}><Pencil className="size-4" /></Button>
      </header>
      <div data-slot="card-content" className="grid min-h-full grid-cols-1 lg:grid-cols-[var(--card-left-panel-width)_minmax(0,1fr)]">
        <aside data-slot="card-fields" className="min-w-0 border-r px-5">
          <h2 className="flex h-[var(--card-field-row-height)] items-center font-semibold">Informacje Podstawowe</h2>
          <dl>{fields.map(([label, value]) => (
            <div data-slot="card-field-row" key={label} className="grid h-[var(--card-field-row-height)] grid-cols-2 items-center gap-3 border-b border-[var(--border)]">
              <dt className="truncate text-[var(--foreground)]">{label}</dt><dd className="truncate">{value}</dd>
            </div>
          ))}</dl>
          <h2 className="mt-5 font-semibold">Opis</h2>
          <p className="mt-2 whitespace-pre-wrap">{company.description || '—'}</p>
        </aside>
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="min-w-0 gap-0">
          <TabsList variant="line" aria-label="Sekcje firmy" className="h-[var(--card-field-row-height)]! w-full justify-start overflow-x-auto border-b p-0 text-[var(--list-text)] dark:text-[var(--list-text)]">
            {([['timeline', 'Oś czasu'], ['comments', 'Komentarze'], ['activities', 'Aktywności'], ['messages', 'Wiadomości']] as const).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-full flex-none rounded-none px-5 font-normal data-active:border-transparent data-active:bg-white text-[var(--list-text)] hover:bg-[var(--brand-hover)] hover:text-[var(--list-text)] data-active:text-[var(--list-text)] dark:text-[var(--list-text)] dark:hover:bg-[var(--brand-hover)] dark:hover:text-[var(--list-text)] dark:data-active:border-[var(--border)] dark:data-active:bg-[var(--list-content-background)] dark:data-active:text-[var(--list-text)]">{label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="timeline" className="m-0 p-5">
            <h2 className="mb-5 font-semibold">Historia</h2>
            {company.updated_at && company.updated_at !== company.created_at && <article className="border-b py-3"><p>Ostatnia modyfikacja firmy</p><p className="text-xs text-[var(--foreground)]">{formatCrmDate(company.updated_at)}</p></article>}
            {company.created_at ? <article className="border-b py-3"><p>Utworzono firmę</p><p className="text-xs text-[var(--foreground)]">{formatCrmDate(company.created_at)}</p></article> : <p className="py-20 text-center text-[var(--foreground)]">Ten rekord nie ma żadnej historii.</p>}
          </TabsContent>
          <TabsContent value="comments" className="m-0 space-y-4 p-5">
            <p className="whitespace-pre-wrap">{company.notes || 'Brak komentarzy.'}</p>
            <Button variant="outline" onClick={onEdit} disabled={!canEdit}>{company.notes ? 'Edytuj komentarz' : 'Dodaj komentarz'}</Button>
          </TabsContent>
          <TabsContent value="activities" className="m-0 p-5">
            {surfaceFlags.companiesExtensions ? <ActivityHistory companyId={company.id} /> : <div data-company-id={company.id}>
              {activitiesLoading ? <p role="status">Wczytywanie aktywności…</p> : activitiesError ? <div role="alert">Nie udało się wczytać aktywności. <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Spróbuj ponownie</Button></div> : activities.length ? activities.map((activity) => <article key={activity.id} className="border-b bg-[var(--brand-row)] py-3"><p>{activity.title}</p><time dateTime={activity.occurred_at} className="text-xs">{formatCrmDate(activity.occurred_at)}</time></article>) : <p>Brak aktywności.</p>}
            </div>}
          </TabsContent>
          <TabsContent value="messages" className="m-0 p-5">
            {company.email ? <a className="inline-flex items-center gap-2 text-[var(--brand-link)] hover:underline" href={`mailto:${company.email}`}><Mail className="size-4" />Wyślij wiadomość e-mail</a> : <p className="text-[var(--foreground)]">Firma nie ma adresu e-mail.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
