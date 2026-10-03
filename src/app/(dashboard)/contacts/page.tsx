'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CallAction } from '@/components/sales/call-action';
import { SmsAction } from '@/components/sales/sms-action';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Plus,
  Upload,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Filter,
  X,
} from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactDetailView } from '@/components/contacts/contact-detail-view';
import { ImportModal } from '@/components/contacts/import-modal';
import { CustomFieldsManager } from '@/components/contacts/custom-fields-manager';
import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { GatedButton } from '@/components/ui/gated-button';
import { useTranslations } from 'next-intl';
import { formatCrmDate } from '@/lib/crm/format';
import { isOperationalTestRecord } from '@/lib/mcrm/test-record';
import { parseCrmPhone } from '@/lib/contacts/phone';

const PAGE_SIZE = 20;

interface ContactWithTags extends Contact {
  tags?: Tag[];
  companies?: { id: string; name: string; isPrimary: boolean }[];
  lastActivityAt?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  dealCount?: number;
  activeDeal?: {
    id: string;
    title: string;
    stage?: { name: string } | null;
  } | null;
}

interface ContactCompanyRow {
  contact_id: string;
  company_id: string;
  is_primary: boolean;
  company: { id: string; name: string } | null;
}

interface ContactActivityRow {
  contact_id: string;
  occurred_at: string;
}

interface ContactDealRow {
  id: string;
  title: string;
  contact_id: string | null;
  next_action: string | null;
  next_action_at: string | null;
  follow_up_at: string | null;
  status: string | null;
  stage: { name: string } | null;
}

export default function ContactsPage() {
  const t = useTranslations('Contacts.page');
  const supabase = useMemo(() => createClient(), []);
  const canEdit = useCan('send-messages');
  const canEditSettings = useCan('edit-settings');
  const { accountId } = useAuth();

  const [contacts, setContacts] = useState<ContactWithTags[]>([]);
  const [exportRows, setExportRows] = useState<ContactWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [desktopSegment, setDesktopSegment] = useState<
    'all' | 'active' | 'key' | 'companies' | 'people'
  >('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [segmentCounts, setSegmentCounts] = useState<Record<DesktopContactSegment, number>>({
    all: 0,
    people: 0,
    companies: 0,
    key: 0,
    active: 0,
  });
  // Tag filter — contacts shown must have ANY of these tags (OR).
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editContactTags, setEditContactTags] = useState<ContactTag[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContactId, setDetailContactId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unknownPhone, setUnknownPhone] = useState('');
  const [unknownContactId, setUnknownContactId] = useState<string | null>(null);
  const [resolvingUnknownPhone, setResolvingUnknownPhone] = useState(false);

  // Bulk selection (page-scoped — only the loaded rows are selectable)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // All tags for display
  const [tagsMap, setTagsMap] = useState<Record<string, Tag>>({});

  // Guards against out-of-order fetch responses: each fetchContacts run
  // claims a sequence number and only the latest is allowed to commit its
  // results. Without this, rapidly toggling tag filters could let a slower
  // earlier request resolve last and render stale rows.
  const fetchSeq = useRef(0);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*');
    if (data) {
      const map: Record<string, Tag> = {};
      data.forEach((t) => (map[t.id] = t));
      setTagsMap(map);
      // Drop any filter selections whose tag no longer exists (e.g. a tag
      // deleted elsewhere) so it can't linger invisibly in the query.
      setSelectedTagIds((prev) => {
        const pruned = prev.filter((id) => map[id]);
        return pruned.length === prev.length ? prev : pruned;
      });
    }
  }, [supabase]);

  const fetchContacts = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    // The visible rows are about to change — drop any selection that
    // referred to the old page/search results so the bulk bar can't
    // act on rows the user can no longer see.
    setSelected(new Set());

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const term = search.trim();

    let contactRows: Contact[];
    if (selectedTagIds.length > 0) {
      // Tag filter active — resolve it server-side (join + distinct +
      // windowed total count + pagination) so a tag covering many
      // contacts can't silently truncate the result or overflow an IN
      // clause. See migration 025_filter_contacts_by_tags.
      const { data, error } = await supabase.rpc('filter_contacts_by_tags', {
        p_tag_ids: selectedTagIds,
        p_search: term || null,
        p_limit: 1000,
        p_offset: 0,
      });
      if (seq !== fetchSeq.current) return; // superseded by a newer fetch
      if (error) {
        toast.error(t('toastFailedLoad'));
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as { contact: Contact; total_count: number }[];
      contactRows = rows.map((r) => r.contact);
    } else {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (term) {
        const like = `%${term}%`;
        query = query.or(
          `name.ilike.${like},phone.ilike.${like},email.ilike.${like}`
        );
      }

      const { data, error } = await query;
      if (seq !== fetchSeq.current) return; // superseded by a newer fetch
      if (error) {
        toast.error(t('toastFailedLoad'));
        setLoading(false);
        return;
      }
      contactRows = data ?? [];
    }

    if (contactRows.length === 0) {
      setTotalCount(0);
      setSegmentCounts({ all: 0, people: 0, companies: 0, key: 0, active: 0 });
      setContacts([]);
      setExportRows([]);
      setLoading(false);
      return;
    }

    // Fetch tags and the canonical Contact↔Company links for these contacts.
    // The legacy contacts.company text is not a relationship source.
    const contactIds = contactRows.map((c) => c.id);
    const [
      { data: contactTags },
      { data: companyLinks },
      { data: activityRows },
      { data: dealRows },
    ] = await Promise.all([
      supabase
        .from('contact_tags')
        .select('contact_id, tag_id')
        .in('contact_id', contactIds),
      supabase
        .from('contact_companies')
        .select(
          'contact_id,company_id,is_primary,company:companies!contact_companies_company_id_fkey(id,name)'
        )
        .in('contact_id', contactIds)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('sales_activities')
        .select('contact_id,occurred_at')
        .in('contact_id', contactIds)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('deals')
        .select(
          'id,title,contact_id,next_action,next_action_at,follow_up_at,status,stage:pipeline_stages(name)'
        )
        .in('contact_id', contactIds),
    ]);
    if (seq !== fetchSeq.current) return; // superseded by a newer fetch

    const tagsByContact: Record<string, string[]> = {};
    contactTags?.forEach((ct) => {
      if (!tagsByContact[ct.contact_id]) tagsByContact[ct.contact_id] = [];
      tagsByContact[ct.contact_id].push(ct.tag_id);
    });

    const companiesByContact: Record<
      string,
      { id: string; name: string; isPrimary: boolean }[]
    > = {};
    (companyLinks as unknown as ContactCompanyRow[] | null)?.forEach((link) => {
      if (!link.company?.name) return;
      if (!companiesByContact[link.contact_id])
        companiesByContact[link.contact_id] = [];
      companiesByContact[link.contact_id].push({
        id: link.company_id,
        name: link.company.name,
        isPrimary: link.is_primary,
      });
    });

    const lastActivityByContact: Record<string, string> = {};
    (activityRows as ContactActivityRow[] | null)?.forEach((activity) => {
      if (!lastActivityByContact[activity.contact_id])
        lastActivityByContact[activity.contact_id] = activity.occurred_at;
    });

    const nextDealByContact: Record<string, ContactDealRow> = {};
    const dealCountByContact: Record<string, number> = {};
    (dealRows as ContactDealRow[] | null)?.forEach((deal) => {
      if (!deal.contact_id) return;
      dealCountByContact[deal.contact_id] =
        (dealCountByContact[deal.contact_id] ?? 0) + 1;
      if (deal.status !== 'open') return;
      const current = nextDealByContact[deal.contact_id];
      const dealDate = deal.next_action_at || deal.follow_up_at;
      const currentDate = current?.next_action_at || current?.follow_up_at;
      if (
        !current ||
        (!currentDate && dealDate) ||
        (dealDate &&
          currentDate &&
          +new Date(dealDate) < +new Date(currentDate))
      ) {
        nextDealByContact[deal.contact_id] = deal;
      }
    });

    const enriched: ContactWithTags[] = contactRows.map((c) => ({
      ...c,
      company: companiesByContact[c.id]?.[0]?.name ?? null,
      companies: companiesByContact[c.id] ?? [],
      lastActivityAt: lastActivityByContact[c.id] ?? null,
      nextAction: c.next_step || nextDealByContact[c.id]?.next_action || null,
      nextActionAt:
        c.follow_up_at ||
        nextDealByContact[c.id]?.next_action_at ||
        nextDealByContact[c.id]?.follow_up_at ||
        null,
      dealCount: dealCountByContact[c.id] ?? 0,
      activeDeal: nextDealByContact[c.id]
        ? {
            id: nextDealByContact[c.id].id,
            title: nextDealByContact[c.id].title,
            stage: nextDealByContact[c.id].stage,
          }
        : null,
      tags: (tagsByContact[c.id] ?? [])
        .map((tid) => tagsMap[tid])
        .filter(Boolean),
    }));

    const counts: Record<DesktopContactSegment, number> = {
      all: enriched.filter((contact) => contactMatchesSegment(contact, 'all')).length,
      people: enriched.filter((contact) => contactMatchesSegment(contact, 'people')).length,
      companies: enriched.filter((contact) => contactMatchesSegment(contact, 'companies')).length,
      key: enriched.filter((contact) => contactMatchesSegment(contact, 'key')).length,
      active: enriched.filter((contact) => contactMatchesSegment(contact, 'active')).length,
    };
    const segmented = enriched.filter((contact) =>
      contactMatchesSegment(contact, desktopSegment)
    );
    setSegmentCounts(counts);
    setTotalCount(segmented.length);
    setExportRows(segmented);
    setContacts(segmented.slice(from, to + 1));
    setLoading(false);
  }, [supabase, page, search, selectedTagIds, tagsMap, t, desktopSegment]);

  // Load-once-on-mount-ish data fetches. Each setter inside runs
  // inside an async promise completion (Supabase await), not
  // synchronously in the effect body, so the cascade the lint rule
  // warns about doesn't apply here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContacts();
  }, [fetchContacts]);

  function openAddForm() {
    setEditContact(null);
    setEditContactTags([]);
    setFormOpen(true);
  }

  async function openEditForm(contact: Contact) {
    const { data } = await supabase
      .from('contact_tags')
      .select('*')
      .eq('contact_id', contact.id);
    setEditContact(contact);
    setEditContactTags(data ?? []);
    setFormOpen(true);
  }

  function openDetail(contactId: string) {
    setDetailContactId(contactId);
    setDetailOpen(true);
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const timer = window.setTimeout(() => {
      if (query.get('new') === 'contact') {
        openAddForm();
        window.history.replaceState({}, '', '/contacts');
      } else {
        const contactId = query.get('open');
        if (contactId) openDetail(contactId);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open);
    if (!open && new URLSearchParams(window.location.search).has('open')) {
      window.history.replaceState({}, '', '/contacts');
    }
  }

  function confirmDelete(contact: Contact) {
    setDeleteTarget(contact);
    setDeleteConfirmOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error(t('toastFailedDelete'));
    } else {
      toast.success(t('toastDeleted'));
      fetchContacts();
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  const allOnPageSelected =
    contacts.length > 0 && contacts.every((c) => selected.has(c.id));
  const someOnPageSelected = contacts.some((c) => selected.has(c.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        contacts.forEach((c) => next.delete(c.id));
      } else {
        contacts.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDeleting(true);

    const { error } = await supabase.from('contacts').delete().in('id', ids);

    if (error) {
      toast.error(t('toastBulkFailedDelete'));
    } else {
      toast.success(t('toastBulkDeleted', { count: ids.length }));
      setSelected(new Set());
      fetchContacts();
    }

    setDeleting(false);
    setBulkDeleteOpen(false);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  // Tag filter helpers. Every change resets to page 0 — the result set
  // shrinks/grows so page N may no longer be valid (mirrors the search box).
  const allTags = Object.values(tagsMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const hasActiveFilters =
    search.trim().length > 0 || selectedTagIds.length > 0;

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
    setPage(0);
  }

  function clearTagFilters() {
    setSelectedTagIds([]);
    setPage(0);
  }

  async function exportContactsCsv() {
    const visible = exportRows;
    const headers = ['klient', 'telefon', 'firmy', 'aktywna_sprawa', 'etap', 'ostatnia_aktywnosc', 'tagi'];
    const quote = (value: unknown) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = visible.map((row) =>
      [
        row.name,
        row.phone,
        row.companies?.map((company) => company.name).join(' | '),
        row.activeDeal?.title,
        row.activeDeal?.stage?.name,
        row.lastActivityAt,
        row.tags?.map((tag) => tag.name).join(' | '),
      ]
        .map(quote)
        .join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kontakty-${new Date().toLocaleDateString('sv-SE')}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(
      `Wyeksportowano klientów: ${visible.length}`
    );
  }

  async function resolveUnknownPhone() {
    const parsed = parseCrmPhone(unknownPhone);
    if (!parsed.valid) {
      toast.error(parsed.reason);
      return;
    }
    setResolvingUnknownPhone(true);
    const existing = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_normalized', parsed.digits)
      .maybeSingle();
    if (existing.data?.id) {
      setUnknownContactId(existing.data.id);
      setUnknownPhone(parsed.canonical);
      setResolvingUnknownPhone(false);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !accountId) {
      toast.error('Nie można utworzyć kontaktu bez aktywnego konta.');
      setResolvingUnknownPhone(false);
      return;
    }
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: auth.user.id,
        account_id: accountId,
        phone: parsed.canonical,
        name: `Nowy kontakt ${parsed.canonical}`,
        source: 'telefon',
      })
      .select('id')
      .single();
    setResolvingUnknownPhone(false);
    if (error || !data) {
      toast.error('Nie udało się utworzyć kontaktu dla tego numeru.');
      return;
    }
    setUnknownContactId(data.id);
    setUnknownPhone(parsed.canonical);
    await fetchContacts();
    toast.success('Kontakt utworzony. Możesz rozpocząć połączenie.');
  }

  return (
    <div className="space-y-6">
      <MobileContactsView
        contacts={contacts}
        loading={loading}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        segment={desktopSegment}
        segmentCounts={segmentCounts}
        onSegmentChange={(value) => {
          setDesktopSegment(value);
          setPage(0);
        }}
        onOpen={openDetail}
        onAdd={openAddForm}
      />
      <DesktopContactsView
        contacts={contacts}
        loading={loading}
        totalCount={totalCount}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        segment={desktopSegment}
        segmentCounts={segmentCounts}
        onSegmentChange={(value) => {
          setDesktopSegment(value);
          setPage(0);
        }}
        onAdd={openAddForm}
        canEdit={canEdit}
        onOpen={openDetail}
        page={page}
        onPageChange={setPage}
        selected={selected}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onExport={() => void exportContactsCsv()}
        unknownPhone={unknownPhone}
        unknownContactId={unknownContactId}
        resolvingUnknownPhone={resolvingUnknownPhone}
        onUnknownPhoneChange={(value) => {
          setUnknownPhone(value);
          setUnknownContactId(null);
        }}
        onResolveUnknownPhone={() => void resolveUnknownPhone()}
      />
      <div className="hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {totalCount > 0
                ? t('subtitle', { count: totalCount })
                : t('subtitleZero')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEditSettings && (
              <Button
                variant="outline"
                onClick={() => setCustomFieldsOpen(true)}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                <SlidersHorizontal className="size-4" />
                {t('customFieldsBtn')}
              </Button>
            )}
            {canEditSettings && (
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                <Upload className="size-4" />
                {t('importBtn')}
              </Button>
            )}
            {canEditSettings && (
              <Button
                variant="outline"
                onClick={() => void exportContactsCsv()}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                <Download className="size-4" />
                Eksport CSV
              </Button>
            )}
            <GatedButton
              canAct={canEdit}
              gateReason="add or import contacts"
              onClick={openAddForm}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="size-4" />
              {t('addContactBtn')}
            </GatedButton>
          </div>
        </div>

        {/* Search + tag filter */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full max-w-sm">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // Reset pagination when the query changes — the result
                  // set shrinks/grows, page N may no longer be valid.
                  setPage(0);
                }}
                placeholder={t('searchPlaceholder')}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground pl-8"
              />
            </div>

            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted shrink-0"
                  />
                }
              >
                <Filter className="size-4" />
                {t('filterByTags')}
                {selectedTagIds.length > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                    {selectedTagIds.length}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0">
                <div className="border-border flex items-center justify-between border-b px-3 py-2">
                  <span className="text-popover-foreground text-sm font-medium">
                    {t('filterByTags')}
                  </span>
                  {selectedTagIds.length > 0 && (
                    <button
                      onClick={clearTagFilters}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      {t('clearAll')}
                    </button>
                  )}
                </div>
                {allTags.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                    {t('noTagsYet')}
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto py-1">
                    {allTags.map((tag) => (
                      <label
                        key={tag.id}
                        className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 px-3 py-1.5"
                      >
                        <Checkbox
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={() => toggleTagFilter(tag.id)}
                          aria-label={`Filter by ${tag.name}`}
                        />
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-popover-foreground truncate text-sm">
                          {tag.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Active tag-filter chips */}
          {selectedTagIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTagIds.map((id) => {
                const tag = tagsMap[id];
                if (!tag) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => toggleTagFilter(id)}
                      aria-label={`Remove ${tag.name} filter`}
                      className="hover:opacity-70"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              <button
                onClick={clearTagFilters}
                className="text-muted-foreground hover:text-foreground px-1 text-xs"
              >
                {t('clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-lg border px-4 py-2">
            <p className="text-foreground text-sm">
              {t('selectedCount', { count: selected.size })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('clearSelection')}
              </Button>
              <GatedButton
                variant="destructive"
                size="sm"
                canAct={canEdit}
                gateReason="delete contacts"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                {t('deleteSelected')}
              </GatedButton>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border-border overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={!allOnPageSelected && someOnPageSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={contacts.length === 0}
                    aria-label="Select all contacts on this page"
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  {t('tableColumns.name')}
                </TableHead>
                <TableHead className="text-muted-foreground">
                  {t('tableColumns.phone')}
                </TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">
                  {t('tableColumns.email')}
                </TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">
                  Firma / Firmy
                </TableHead>
                <TableHead className="text-muted-foreground hidden xl:table-cell">
                  Źródło
                </TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">
                  Ostatnia aktywność
                </TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">
                  Następne działanie / termin
                </TableHead>
                <TableHead className="text-muted-foreground w-52" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-border">
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="text-primary size-6 animate-spin" />
                      <p className="text-muted-foreground text-sm">
                        {t('loading')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="text-muted-foreground size-8" />
                      <p className="text-muted-foreground text-sm">
                        {hasActiveFilters
                          ? t('noContactsMatch')
                          : t('noContactsYet')}
                      </p>
                      {!hasActiveFilters && (
                        <GatedButton
                          canAct={canEdit}
                          gateReason="add or import contacts"
                          variant="outline"
                          size="sm"
                          onClick={openAddForm}
                          className="border-border text-muted-foreground hover:bg-muted mt-2"
                        >
                          <Plus className="size-3.5" />
                          {t('addFirstContact')}
                        </GatedButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="border-border hover:bg-muted/50 h-14"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(contact.id)}
                        onCheckedChange={() => toggleSelect(contact.id)}
                        aria-label={`Select ${contact.name || contact.phone}`}
                      />
                    </TableCell>
                    <TableCell className="min-w-44 py-2">
                      <Link
                        href={`/contacts?open=${contact.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary block min-h-6 truncate text-sm font-semibold hover:underline"
                      >
                        {contact.name || t('unnamed')}
                      </Link>
                      <p className="text-muted-foreground max-w-48 truncate text-xs md:hidden">
                        {contact.email || contact.source || 'Brak e-maila'}
                      </p>
                      {contact.companies?.[0] && (
                        <Link
                          href={`/companies?open=${contact.companies[0].id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary block max-w-48 truncate text-xs hover:underline lg:hidden"
                        >
                          {contact.companies[0].name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {contact.phone}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {contact.email || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden min-w-44 py-2 text-sm lg:table-cell">
                      <div className="flex max-w-56 flex-wrap gap-x-2 gap-y-0.5">
                        {contact.companies?.length ? (
                          contact.companies.map((company) => (
                            <Link
                              key={company.id}
                              href={`/companies?open=${company.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary max-w-44 truncate font-medium hover:underline"
                            >
                              {company.name}
                            </Link>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-40 truncate text-xs xl:table-cell">
                      {contact.source || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs whitespace-nowrap lg:table-cell">
                      {contact.lastActivityAt
                        ? formatCrmDate(contact.lastActivityAt)
                        : '-'}
                    </TableCell>
                    <TableCell className="hidden min-w-48 py-2 md:table-cell">
                      <p className="max-w-56 truncate text-xs font-medium">
                        {contact.nextAction || 'Brak następnego działania'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {contact.nextActionAt
                          ? formatCrmDate(contact.nextActionAt)
                          : '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <CallAction
                          phone={contact.phone}
                          contactId={contact.id}
                          variant="outline"
                          size="sm"
                          className="text-xs whitespace-nowrap"
                        />
                        <SmsAction
                          phone={contact.phone}
                          contactId={contact.id}
                          contactName={contact.name}
                          variant="outline"
                          size="sm"
                          label="Wiadomość"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-popover border-border"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(contact);
                              }}
                              className="text-popover-foreground focus:bg-muted focus:text-foreground"
                            >
                              <Pencil className="size-4" />
                              {t('editAction')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(contact);
                              }}
                            >
                              <Trash2 className="size-4" />
                              {t('deleteAction')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {t('showingPagination', {
                start: page * PAGE_SIZE + 1,
                end: Math.min((page + 1) * PAGE_SIZE, totalCount),
                total: totalCount,
              })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasPrev}
                onClick={() => setPage((p) => p - 1)}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-muted-foreground px-2 text-xs">
                {t('pageCount', { page: page + 1, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Form Dialog */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editContact}
        contactTags={editContactTags}
        onSaved={() => {
          fetchContacts();
          fetchTags();
        }}
        onViewExisting={(id) => {
          setFormOpen(false);
          openDetail(id);
        }}
      />

      {/* Contact Detail Sheet */}
      <ContactDetailView
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        contactId={detailContactId}
        onUpdated={fetchContacts}
      />

      {/* Import Modal */}
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchContacts}
      />

      {/* Custom Fields Manager (admin+) */}
      {canEditSettings && (
        <CustomFieldsManager
          open={customFieldsOpen}
          onOpenChange={setCustomFieldsOpen}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {t('deleteContactTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('deleteContactDesc', {
                name: deleteTarget?.name || deleteTarget?.phone || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {t('deleteBulkTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('deleteBulkDesc', { count: selected.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DesktopContactSegment =
  'all' | 'active' | 'key' | 'companies' | 'people';

function contactMatchesSegment(
  contact: ContactWithTags,
  segment: DesktopContactSegment
) {
  if (isOperationalTestRecord(contact.name)) return false;
  if (segment === 'active') return (contact.dealCount ?? 0) > 0;
  if (segment === 'key')
    return Boolean(
      contact.tags?.some((tag) => /klucz|vip|key/i.test(tag.name))
    );
  if (segment === 'companies') return Boolean(contact.companies?.length);
  if (segment === 'people') return !contact.companies?.length;
  return true;
}

function MobileContactsView({
  contacts,
  loading,
  search,
  onSearchChange,
  segment,
  segmentCounts,
  onSegmentChange,
  onOpen,
  onAdd,
}: {
  contacts: ContactWithTags[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  segment: DesktopContactSegment;
  segmentCounts: Record<DesktopContactSegment, number>;
  onSegmentChange: (segment: DesktopContactSegment) => void;
  onOpen: (contactId: string) => void;
  onAdd: () => void;
}) {
  const filtered = contacts.filter((contact) =>
    contactMatchesSegment(contact, segment)
  );
  const segments: Array<[DesktopContactSegment, string]> = [
    ['all', 'Wszyscy'],
    ['people', 'Osoby'],
    ['companies', 'Firmy'],
    ['key', 'Kluczowi'],
    ['active', 'Aktywni'],
  ];

  return (
    <section className="space-y-3 lg:hidden" aria-label="Klienci">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-slate-950">
          KLIENCI
        </h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex size-11 items-center justify-center rounded-full bg-emerald-800 text-white"
          aria-label="Dodaj klienta"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <label className="relative block">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Szukaj klientów, firm, NIP…"
          className="h-11 rounded-xl border-slate-200 bg-white pl-9"
        />
      </label>
      <div className="grid w-full grid-cols-5 gap-1 overflow-hidden rounded-xl bg-slate-50 p-1 md:max-w-xl">
        {segments.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onSegmentChange(value)}
            className={`min-h-11 min-w-0 truncate rounded-lg px-1 py-2 text-xs font-bold transition-colors ${
              segment === value
                ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500'
            }`}
          >
            {label} {segmentCounts[value]}
          </button>
        ))}
      </div>
      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Ładowanie…
          </p>
        ) : null}
        {!loading &&
          filtered.map((contact) => {
            const isCompany = Boolean(contact.companies?.length);
            const status = isCompany
              ? 'Firma'
              : (contact.dealCount ?? 0) > 0
                ? 'Klient'
                : 'Prospekt';
            const statusClass =
              status === 'Prospekt'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800';
            return (
              <article
                key={contact.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onOpen(contact.id)}
                  className="flex min-h-16 w-full items-center gap-3 text-left"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                    {(contact.name || 'K')
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-950">
                      {contact.name || 'Kontakt bez nazwy'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-600">
                      {contact.companies?.[0]?.name ||
                        contact.phone ||
                        'Klient'}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                      <span
                        className={`rounded-full px-2 py-0.5 ${statusClass}`}
                      >
                        {status}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                        {contact.dealCount ?? 0}{' '}
                        {(contact.dealCount ?? 0) === 1 ? 'Deal' : 'Deale'}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-slate-600" />
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                  <CallAction
                    phone={contact.phone}
                    className="h-11 w-full bg-emerald-800 text-white"
                  />
                  <SmsAction phone={contact.phone} className="h-11 w-full" />
                </div>
                {contact.lastActivityAt ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Ostatni kontakt: {formatCrmDate(contact.lastActivityAt)}
                  </p>
                ) : null}
              </article>
            );
          })}
        {!loading && !filtered.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
            Brak klientów.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DesktopContactsView({
  contacts,
  loading,
  totalCount,
  search,
  onSearchChange,
  segment,
  segmentCounts,
  onSegmentChange,
  onAdd,
  canEdit,
  onOpen,
  page,
  onPageChange,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onExport,
  unknownPhone,
  unknownContactId,
  resolvingUnknownPhone,
  onUnknownPhoneChange,
  onResolveUnknownPhone,
}: {
  contacts: ContactWithTags[];
  loading: boolean;
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  segment: DesktopContactSegment;
  segmentCounts: Record<DesktopContactSegment, number>;
  onSegmentChange: (segment: DesktopContactSegment) => void;
  onAdd: () => void;
  canEdit: boolean;
  onOpen: (contactId: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onExport: () => void;
  unknownPhone: string;
  unknownContactId: string | null;
  resolvingUnknownPhone: boolean;
  onUnknownPhoneChange: (value: string) => void;
  onResolveUnknownPhone: () => void;
}) {
  const filtered = contacts.filter((contact) =>
    contactMatchesSegment(contact, segment)
  );
  const segments: Array<[DesktopContactSegment, string]> = [
    ['all', 'Wszyscy'],
    ['people', 'Osoby'],
    ['companies', 'Firmy'],
    ['key', 'Kluczowi'],
    ['active', 'Aktywni'],
  ];

  return (
    <section className="hidden lg:block" aria-label="Klienci — pełna lista">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Klienci
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Osoby, firmy i powiązania.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download className="size-4" /> Eksportuj
          </Button>
          <GatedButton
            canAct={canEdit}
            gateReason="add contacts"
            onClick={onAdd}
            className="bg-emerald-800 text-white hover:bg-emerald-900"
          >
            <Plus className="size-4" /> Dodaj klienta
          </GatedButton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {segments.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onSegmentChange(value)}
                className={`rounded-lg border px-4 py-2 text-xs font-bold transition-colors ${
                  segment === value
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label} <span className="opacity-75">{segmentCounts[value]}</span>
              </button>
            ))}
          </div>
          <label className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Szukaj klienta…"
              className="border-slate-200 bg-white pl-9"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-10">
                  <Checkbox checked={filtered.length > 0 && filtered.every((contact) => selected.has(contact.id))} onCheckedChange={onToggleSelectAll} aria-label="Zaznacz wszystkie widoczne kontakty" />
                </TableHead>
                <TableHead>Firma / Osoba</TableHead>
                <TableHead>Powiązania</TableHead>
                <TableHead>Aktywna sprawa / etap</TableHead>
                <TableHead>Ostatnia aktywność</TableHead>
                <TableHead>Tagi</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-48 text-center text-slate-500"
                  >
                    <Loader2 className="mx-auto mb-2 size-5 animate-spin" />{' '}
                    Ładowanie klientów…
                  </TableCell>
                </TableRow>
              ) : filtered.length ? (
                filtered.map((contact) => {
                  return (
                    <TableRow
                      key={contact.id}
                      className="h-16 cursor-pointer border-slate-200 hover:bg-emerald-50/40"
                      tabIndex={0}
                      aria-label={`Otwórz kartę klienta ${contact.name || contact.phone}`}
                      onClick={(event) => {
                        if (isInteractiveContactRowTarget(event.target)) return;
                        onOpen(contact.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen(contact.id);
                        }
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(contact.id)}
                          onCheckedChange={() => onToggleSelect(contact.id)}
                          aria-label={`Zaznacz ${contact.name || 'kontakt'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => onOpen(contact.id)}
                          className="block text-left"
                        >
                          <span className="block font-bold text-slate-900">
                            {contact.name || 'Kontakt bez nazwy'}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {contact.companies
                              ?.map((company) => company.name)
                              .join(', ') || 'Klient indywidualny'}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        {contact.companies?.length ? (
                          <div className="space-y-1">
                            {contact.companies.map((company) => (
                              <Link key={company.id} href={`/companies?open=${company.id}`} className="block text-xs font-semibold text-emerald-800 hover:underline">
                                {company.name}
                              </Link>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-500">Osoba indywidualna</span>}
                      </TableCell>
                      <TableCell className="max-w-52">
                        {contact.activeDeal ? (
                          <Link href={`/deals/${contact.activeDeal.id}`} className="block text-xs font-semibold text-slate-900 hover:underline">
                            <span className="block truncate">{contact.activeDeal.title}</span>
                            <span className="text-slate-500">{contact.activeDeal.stage?.name || 'Etap nieustalony'}</span>
                          </Link>
                        ) : <span className="text-xs text-slate-500">Brak aktywnej sprawy</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {contact.lastActivityAt
                          ? formatCrmDate(contact.lastActivityAt)
                          : 'Brak'}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-44 flex-wrap gap-1">
                          {contact.tags?.length ? contact.tags.map((tag) => (
                            <span key={tag.id} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>{tag.name}</span>
                          )) : <span className="text-xs text-slate-500">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <CallAction phone={contact.phone} contactId={contact.id} className="bg-emerald-800 text-white" />
                          <SmsAction phone={contact.phone} contactId={contact.id} contactName={contact.name} label="Wiadomość" />
                          <Button variant="ghost" size="icon-sm" onClick={() => onOpen(contact.id)} aria-label={`Więcej akcji: ${contact.name || 'kontakt'}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-48 text-center text-slate-500"
                  >
                    Brak klientów w tym widoku.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-black text-slate-900">Nowy kontakt / nieznany numer</p>
            <div className="mt-2 flex max-w-xl gap-2">
              <Input value={unknownPhone} onChange={(event) => onUnknownPhoneChange(event.target.value)} placeholder="Wpisz numer telefonu…" />
              {unknownContactId ? (
                <CallAction phone={unknownPhone} contactId={unknownContactId} className="bg-emerald-800 text-white" />
              ) : (
                <Button onClick={onResolveUnknownPhone} disabled={resolvingUnknownPhone || !unknownPhone.trim()}>
                  {resolvingUnknownPhone ? <Loader2 className="size-4 animate-spin" /> : null} Zadzwoń
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-end text-xs text-slate-500">Kontakt jest odnajdywany lub tworzony przed połączeniem.</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Zaznaczono {selected.size} z {totalCount} · Na stronie: {PAGE_SIZE}</span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => onPageChange(Math.max(0, page - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 font-bold text-slate-700">{page + 1} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function isInteractiveContactRowTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('a, button, input, select, textarea, [role="button"]') !==
      null
  );
}
