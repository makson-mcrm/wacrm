'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Pipeline, PipelineStage, Deal } from '@/types';
import { PipelineBoard } from '@/components/pipelines/pipeline-board';
import { PipelineSettings } from '@/components/pipelines/pipeline-settings';
import { DealForm } from '@/components/pipelines/deal-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch, Plus, ChevronDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { GatedButton } from '@/components/ui/gated-button';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { isOperationalTestRecord } from '@/lib/mcrm/test-record';

type DealSort = 'recent' | 'oldest' | 'value' | 'next_action';

// Pipeline creation is admin-class (settings-tier write under
// the new RLS); deal creation is operational and only requires
// agent+. The two CTAs gate on different `useCan` capabilities,
// not on different copy.

// Spec-defined seed — name and color per the product spec.
const SPEC_DEFAULT_STAGES = [
  { name: '1. KONTAKT POZYSKOWY', color: '#173A52', position: 0 },
  { name: '2. SPOTKANIE / AUDYT', color: '#245247', position: 1 },
  { name: '3. POCZEKALNIA', color: '#B7D84B', position: 2 },
  { name: '4. KOMPLETACJA / OFERTA', color: '#173A52', position: 3 },
  { name: '5. WNIOSKI / DECYZJA', color: '#245247', position: 4 },
  { name: '6. URUCHOMIENIE / FV', color: '#B7D84B', position: 5 },
  { name: '7. ARCHIWUM', color: '#1B2730', position: 6 },
];

export default function PipelinesPage() {
  const t = useTranslations('Pipelines.page');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const canEditSettings = useCan('edit-settings');
  const canCreateDeals = useCan('send-messages');
  const { accountId } = useAuth();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<DealSort>('recent');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [includeArchive, setIncludeArchive] = useState(false);
  const filterPipelineRef = useRef('');

  // Dialog / sheet state
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Deal form state is lifted here so both the top-bar "Add Deal" and
  // the per-column "+" trigger the same Sheet.
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string>('');
  const [defaultCompanyId, setDefaultCompanyId] = useState<string>('');
  const [defaultContactId, setDefaultContactId] = useState<string>('');
  const [defaultQuestionnaireId, setDefaultQuestionnaireId] =
    useState<string>('');

  // Guard against double-seeding (React StrictMode double-effect in dev).
  const seedAttempted = useRef(false);

  const loadPipelines = useCallback(async () => {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .order('created_at');
    if (error) {
      console.error('Failed to load pipelines:', error.message);
      return [];
    }
    return data ?? [];
  }, [supabase]);

  const loadStages = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');
      return data ?? [];
    },
    [supabase]
  );

  const loadDeals = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from('deals')
        .select(
          '*, contact:contacts!deals_contact_id_fkey(*), company:companies!deals_company_id_fkey(*), assignee:profiles!deals_assigned_to_fkey(*)'
        )
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false });
      if (data === null) {
        console.error('Failed to load deals for pipeline:', pipelineId);
      }
      return (data ?? []) as Deal[];
    },
    [supabase]
  );

  const seedDefaultPipeline =
    useCallback(async (): Promise<Pipeline | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return null;
      // pipelines.account_id is NOT NULL post-017 with no DB default.
      if (!accountId) return null;

      const { data: pipeline, error } = await supabase
        .from('pipelines')
        .insert({ user_id: user.id, account_id: accountId, name: 'mFinanse' })
        .select()
        .single();

      if (error || !pipeline) {
        console.error('Failed to seed pipeline:', error?.message);
        return null;
      }

      const stagesPayload = SPEC_DEFAULT_STAGES.map((s) => ({
        pipeline_id: pipeline.id,
        name: s.name,
        color: s.color,
        position: s.position,
      }));
      await supabase.from('pipeline_stages').insert(stagesPayload);

      return pipeline as Pipeline;
    }, [supabase, accountId]);

  // Initial load + seed-if-empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let list = await loadPipelines();

      if (list.length === 0 && !seedAttempted.current) {
        seedAttempted.current = true;
        const seeded = await seedDefaultPipeline();
        if (seeded) list = await loadPipelines();
      }

      if (cancelled) return;
      setPipelines(list);
      if (list.length > 0) {
        setSelectedPipelineId((prev) =>
          prev && list.some((p) => p.id === prev) ? prev : list[0].id
        );
      } else {
        setSelectedPipelineId('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPipelines, seedDefaultPipeline]);

  // Load stages + deals whenever selected pipeline changes.
  // Clearing on no-selection is a legitimate sync with URL/prop
  // state; the load completion uses async setters inside promise
  // callbacks (not synchronous in the effect body).
  useEffect(() => {
    if (!selectedPipelineId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStages([]);
      setDeals([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [s, d] = await Promise.all([
        loadStages(selectedPipelineId),
        loadDeals(selectedPipelineId),
      ]);
      if (cancelled) return;
      setStages(s);
      setDeals(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPipelineId, loadStages, loadDeals]);

  const refreshPipelines = useCallback(async () => {
    const list = await loadPipelines();
    setPipelines(list);
    if (list.length === 0) setSelectedPipelineId('');
    else if (!list.some((p) => p.id === selectedPipelineId))
      setSelectedPipelineId(list[0].id);
  }, [loadPipelines, selectedPipelineId]);

  const refreshStages = useCallback(async () => {
    if (!selectedPipelineId) return;
    setStages(await loadStages(selectedPipelineId));
  }, [loadStages, selectedPipelineId]);

  const refreshDeals = useCallback(async () => {
    if (!selectedPipelineId) return;
    setDeals(await loadDeals(selectedPipelineId));
  }, [loadDeals, selectedPipelineId]);

  const handleDealMoved = useCallback(
    async (dealId: string, newStageId: string) => {
      const targetStage = stages.find((stage) => stage.id === newStageId);
      const movedDeal = deals.find((deal) => deal.id === dealId);
      if (
        targetStage?.name.includes('POCZEKALNIA') &&
        !movedDeal?.follow_up_at
      ) {
        toast.error('Najpierw otwórz Deal i ustaw termin ponownego kontaktu.');
        return;
      }
      // Optimistic update — board already animated; just persist.
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d))
      );
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId);
      if (error) {
        toast.error(t('toastFailedMoveDeal'));
        refreshDeals();
      }
    },
    [supabase, refreshDeals, t, stages, deals]
  );

  const handleAddDeal = useCallback(
    (
      stageId?: string,
      companyId?: string,
      contactId?: string,
      questionnaireId?: string
    ) => {
      setEditingDeal(null);
      setDefaultStageId(stageId ?? stages[0]?.id ?? '');
      setDefaultCompanyId(companyId ?? '');
      setDefaultContactId(contactId ?? '');
      setDefaultQuestionnaireId(questionnaireId ?? '');
      setDealFormOpen(true);
    },
    [stages]
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const timer = window.setTimeout(() => {
      if (query.get('new') === 'deal' && stages.length) {
        handleAddDeal(
          undefined,
          query.get('company') ?? undefined,
          query.get('contact') ?? undefined,
          query.get('questionnaire') ?? undefined
        );
        window.history.replaceState({}, '', '/pipelines');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [stages, handleAddDeal]);

  const handleEditDeal = useCallback(
    (deal: Deal) => {
      router.push(`/deals/${deal.id}`);
    },
    [router]
  );

  async function handleCreatePipeline() {
    const name = newPipelineName.trim();
    if (!name) return;
    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setCreating(false);
      return;
    }
    // pipelines.account_id is NOT NULL post-017 with no DB default.
    if (!accountId) {
      toast.error(t('toastNotLinkedToAccount'));
      setCreating(false);
      return;
    }

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .insert({ user_id: user.id, account_id: accountId, name })
      .select()
      .single();

    if (error || !pipeline) {
      toast.error(t('toastFailedCreatePipeline'));
      setCreating(false);
      return;
    }

    const stagesPayload = SPEC_DEFAULT_STAGES.map((s) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      color: s.color,
      position: s.position,
    }));
    await supabase.from('pipeline_stages').insert(stagesPayload);

    setNewPipelineName('');
    setNewPipelineOpen(false);
    setSelectedPipelineId(pipeline.id);
    await refreshPipelines();
    setCreating(false);
    toast.success(t('toastPipelineCreated'));
  }

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const operationalStages = useMemo(
    () =>
      stages.filter(
        (stage) =>
          includeArchive || !stage.name.toUpperCase().includes('ARCHIWUM')
      ),
    [includeArchive, stages]
  );
  const operationalDeals = useMemo(
    () => deals.filter((deal) => !isOperationalTestRecord(deal.title)),
    [deals]
  );
  const filterOptions = useMemo(
    () => ({
      products: [
        ...new Set(
          operationalDeals.map((deal) => deal.product_type).filter(Boolean)
        ),
      ] as string[],
      owners: [
        ...new Set(
          operationalDeals
            .map((deal) => deal.assignee?.full_name)
            .filter(Boolean)
        ),
      ] as string[],
      sources: [
        ...new Set(operationalDeals.map((deal) => deal.source).filter(Boolean)),
      ] as string[],
    }),
    [operationalDeals]
  );
  const visibleDeals = useMemo(() => {
    const rows = operationalDeals.filter((deal) => {
      if (productFilter !== 'all' && deal.product_type !== productFilter)
        return false;
      if (ownerFilter !== 'all' && deal.assignee?.full_name !== ownerFilter)
        return false;
      if (sourceFilter !== 'all' && deal.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && deal.status !== statusFilter) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sortBy === 'oldest')
        return (
          +new Date(a.updated_at || a.created_at) -
          +new Date(b.updated_at || b.created_at)
        );
      if (sortBy === 'value')
        return Number(b.value || 0) - Number(a.value || 0);
      if (sortBy === 'next_action') {
        const av = a.next_action_at
          ? +new Date(a.next_action_at)
          : Number.MAX_SAFE_INTEGER;
        const bv = b.next_action_at
          ? +new Date(b.next_action_at)
          : Number.MAX_SAFE_INTEGER;
        return av - bv;
      }
      return (
        +new Date(b.updated_at || b.created_at) -
        +new Date(a.updated_at || a.created_at)
      );
    });
  }, [
    operationalDeals,
    ownerFilter,
    productFilter,
    sortBy,
    sourceFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (!selectedPipelineId) return;
    const saved = window.localStorage.getItem(
      `mcrm:pipeline-view:${selectedPipelineId}`
    );
    if (!saved) {
      filterPipelineRef.current = selectedPipelineId;
      return;
    }
    try {
      const value = JSON.parse(saved) as Partial<{
        product: string;
        owner: string;
        source: string;
        status: string;
        sort: DealSort;
      }>;
      setProductFilter(value.product || 'all');
      setOwnerFilter(value.owner || 'all');
      setSourceFilter(value.source || 'all');
      setStatusFilter(value.status || 'all');
      setSortBy(value.sort || 'recent');
    } catch {
      window.localStorage.removeItem(
        `mcrm:pipeline-view:${selectedPipelineId}`
      );
    }
    filterPipelineRef.current = selectedPipelineId;
  }, [selectedPipelineId]);

  useEffect(() => {
    if (!selectedPipelineId || filterPipelineRef.current !== selectedPipelineId)
      return;
    window.localStorage.setItem(
      `mcrm:pipeline-view:${selectedPipelineId}`,
      JSON.stringify({
        product: productFilter,
        owner: ownerFilter,
        source: sourceFilter,
        status: statusFilter,
        sort: sortBy,
      })
    );
  }, [
    ownerFilter,
    productFilter,
    selectedPipelineId,
    sortBy,
    sourceFilter,
    statusFilter,
  ]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-muted/50 h-96 w-72 animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mr-2 text-2xl font-black tracking-tight text-slate-950">
            LEJEK SPRZEDAŻY
          </h1>
          {/* Pipeline selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="border-border bg-card text-foreground hover:bg-muted data-[popup-open]:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors">
              <GitBranch className="text-primary h-4 w-4" />
              <span className="font-semibold">
                {selectedPipeline?.name ?? t('selectPipeline')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="border-border bg-popover text-popover-foreground w-64"
            >
              {pipelines.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {t('noPipelinesYet')}
                </DropdownMenuItem>
              )}
              {pipelines.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={
                    p.id === selectedPipelineId
                      ? 'text-primary'
                      : 'text-popover-foreground'
                  }
                >
                  <GitBranch className="mr-2 h-3.5 w-3.5" />
                  {p.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-border" />
              {selectedPipeline && (
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="text-popover-foreground"
                >
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  {t('managePipelines')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <GatedButton
            variant="outline"
            canAct={canEditSettings}
            gateReason="create pipelines"
            onClick={() => setNewPipelineOpen(true)}
            className="border-border bg-card text-foreground hover:bg-muted hidden"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('addPipeline')}
          </GatedButton>
          <GatedButton
            canAct={canCreateDeals}
            gateReason="create deals"
            disabled={!selectedPipelineId || stages.length === 0}
            onClick={() => handleAddDeal()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('addDeal')}
          </GatedButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3 lg:grid-cols-7">
        <FilterSelect
          label="Produkt"
          value={productFilter}
          onChange={setProductFilter}
          options={filterOptions.products}
        />
        <FilterSelect
          label="Opiekun"
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={filterOptions.owners}
        />
        <FilterSelect
          label="Źródło"
          value={sourceFilter}
          onChange={setSourceFilter}
          options={filterOptions.sources}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={['open', 'won', 'lost']}
        />
        <label className="col-span-2 min-w-0 text-[10px] font-black tracking-wide text-slate-500 uppercase lg:col-span-2">
          Sortowanie
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as DealSort)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800"
          >
            <option value="recent">Ostatnia aktywność — najnowsze</option>
            <option value="oldest">Ostatnia aktywność — najstarsze</option>
            <option value="value">Największa kwota</option>
            <option value="next_action">Najbliższy next action</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setShowMoreFilters((value) => !value)}
          className="mt-4 h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
        >
          Więcej filtrów
        </button>
        {showMoreFilters ? (
          <div className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={includeArchive}
                onChange={(event) => setIncludeArchive(event.target.checked)}
              />
              Pokaż widok archiwalny
            </label>
            <button
              type="button"
              onClick={() => {
                setProductFilter('all');
                setOwnerFilter('all');
                setSourceFilter('all');
                setStatusFilter('all');
                setSortBy('recent');
                setIncludeArchive(false);
              }}
              className="font-bold text-emerald-800 hover:underline"
            >
              Wyczyść filtry
            </button>
          </div>
        ) : null}
      </div>

      {/* Board */}
      {pipelines.length === 0 ? (
        <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
          <GitBranch className="text-muted-foreground h-12 w-12" />
          <h3 className="text-foreground mt-4 text-lg font-medium">
            {t('noPipelinesYet')}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('createToStartTracking')}
          </p>
          <GatedButton
            canAct={canEditSettings}
            gateReason="create pipelines"
            onClick={() => setNewPipelineOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('createPipeline')}
          </GatedButton>
        </div>
      ) : (
        <>
          <PipelineBoard
            stages={operationalStages}
            deals={visibleDeals}
            onDealMoved={handleDealMoved}
            onAddDeal={handleAddDeal}
            onEditDeal={handleEditDeal}
          />
        </>
      )}

      {/* New Pipeline Dialog */}
      <Dialog open={newPipelineOpen} onOpenChange={setNewPipelineOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {t('newPipeline')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground">{t('pipelineName')}</Label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder={t('pipelineNamePlaceholder')}
              className="bg-muted border-border text-foreground mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePipeline();
              }}
            />
            <p className="text-muted-foreground mt-2 text-xs">
              {t('defaultStagesDesc')}
            </p>
          </div>
          <DialogFooter className="bg-popover/50 border-border">
            <Button
              variant="outline"
              onClick={() => setNewPipelineOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreatePipeline}
              disabled={creating || !newPipelineName.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? t('creating') : t('createPipelineBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Settings */}
      {selectedPipeline && (
        <PipelineSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          pipeline={selectedPipeline}
          stages={stages}
          onPipelinesChanged={refreshPipelines}
          onStagesChanged={refreshStages}
          onCreateNewPipeline={() => {
            setSettingsOpen(false);
            setNewPipelineOpen(true);
          }}
        />
      )}

      {/* Deal Form (Sheet) */}
      <DealForm
        open={dealFormOpen}
        onOpenChange={setDealFormOpen}
        deal={editingDeal}
        pipelineId={selectedPipelineId}
        stages={stages}
        defaultStageId={defaultStageId}
        defaultCompanyId={defaultCompanyId}
        defaultContactId={defaultContactId}
        defaultQuestionnaireId={defaultQuestionnaireId}
        onSaved={refreshDeals}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="min-w-0 text-[10px] font-black tracking-wide text-slate-500 uppercase">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800"
      >
        <option value="all">Wszystkie</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
