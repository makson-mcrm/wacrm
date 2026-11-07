'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Pencil } from 'lucide-react';
import type { Company } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityHistory } from '@/components/sales/activity-history';
import { formatCrmDate } from '@/lib/crm/format';
import { geometryCssVars } from '@/lib/ui/layout-geometry';

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
    <section data-bigin-company-card style={geometryCssVars('cards')} className="min-h-full bg-white text-sm text-slate-900">
      <header data-slot="card-record-header" className="flex h-[var(--card-record-header-height)] items-center gap-4 border-b px-5">
        <Button variant="ghost" size="icon" aria-label="Wróć do firm" onClick={onBack}><ArrowLeft className="size-5" /></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{company.name}</h1>
          <p className="truncate text-xs text-slate-600">{ownerName || '—'}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Edytuj firmę" onClick={onEdit} disabled={!canEdit}><Pencil className="size-4" /></Button>
      </header>
      <div data-slot="card-content" className="grid min-h-full grid-cols-1 lg:grid-cols-[var(--card-left-panel-width)_minmax(0,1fr)]">
        <aside data-slot="card-fields" className="min-w-0 border-r px-5">
          <h2 className="flex h-[var(--card-field-row-height)] items-center font-semibold">Informacje Podstawowe</h2>
          <dl>{fields.map(([label, value]) => (
            <div data-slot="card-field-row" key={label} className="grid h-[var(--card-field-row-height)] grid-cols-2 items-center gap-3 border-b border-slate-100">
              <dt className="truncate text-slate-500">{label}</dt><dd className="truncate">{value}</dd>
            </div>
          ))}</dl>
          <h2 className="mt-5 font-semibold">Opis</h2>
          <p className="mt-2 whitespace-pre-wrap">{company.description || '—'}</p>
        </aside>
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="min-w-0 gap-0">
          <TabsList variant="line" aria-label="Sekcje firmy" className="h-[var(--card-field-row-height)]! w-full justify-start overflow-x-auto border-b p-0">
            {([['timeline', 'Oś czasu'], ['comments', 'Komentarze'], ['activities', 'Aktywności'], ['messages', 'Wiadomości']] as const).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-full flex-none rounded-none px-5 font-normal data-active:border-transparent data-active:bg-white">{label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="timeline" className="m-0 p-5">
            <h2 className="mb-5 font-semibold">Historia</h2>
            {company.updated_at && company.updated_at !== company.created_at && <article className="border-b py-3"><p>Ostatnia modyfikacja firmy</p><p className="text-xs text-slate-500">{formatCrmDate(company.updated_at)}</p></article>}
            {company.created_at ? <article className="border-b py-3"><p>Utworzono firmę</p><p className="text-xs text-slate-500">{formatCrmDate(company.created_at)}</p></article> : <p className="py-20 text-center text-slate-500">Ten rekord nie ma żadnej historii.</p>}
          </TabsContent>
          <TabsContent value="comments" className="m-0 space-y-4 p-5">
            <p className="whitespace-pre-wrap">{company.notes || 'Brak komentarzy.'}</p>
            <Button variant="outline" onClick={onEdit} disabled={!canEdit}>{company.notes ? 'Edytuj komentarz' : 'Dodaj komentarz'}</Button>
          </TabsContent>
          <TabsContent value="activities" className="m-0 p-5"><ActivityHistory companyId={company.id} /></TabsContent>
          <TabsContent value="messages" className="m-0 p-5">
            {company.email ? <a className="inline-flex items-center gap-2 text-emerald-700 hover:underline" href={`mailto:${company.email}`}><Mail className="size-4" />Wyślij wiadomość e-mail</a> : <p className="text-slate-500">Firma nie ma adresu e-mail.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
