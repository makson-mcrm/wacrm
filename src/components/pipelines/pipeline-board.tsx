'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Deal, Pipeline, PipelineStage } from '@/types';
import { DealCard } from './deal-card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { surfaceFlags } from '@/lib/ui/surface-flags';

import { GatedButton } from '@/components/ui/gated-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PipelineToolbarProps {
  pipelines: Pipeline[];
  selectedPipelineId: string;
  onSelectPipeline: (pipelineId: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  canAddDeal: boolean;
  onAddDeal: () => void;
  children?: ReactNode;
}

export function PipelineToolbar({ pipelines, selectedPipelineId, onSelectPipeline, sortBy, onSortChange, canAddDeal, onAddDeal, children }: PipelineToolbarProps) {
  return (
    <section data-pipeline-toolbar aria-label="Narzędzia tablicy transakcji" className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto bg-[var(--bigin-surface)] px-3 text-sm text-[var(--bigin-text)]">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Wybierz lejek" className="inline-flex shrink-0 items-center gap-2 rounded border border-[var(--bigin-border)] px-3 text-sm" disabled={!pipelines.length}>
          Wszystkie Transakcje <ChevronDown aria-hidden="true" className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {pipelines.map((pipeline) => (
            <DropdownMenuItem key={pipeline.id} aria-current={pipeline.id === selectedPipelineId ? 'true' : undefined} onClick={() => onSelectPipeline(pipeline.id)}>{pipeline.name}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <label className="shrink-0">
        <span className="sr-only">Sortuj według</span>
        <select aria-label="Sortuj według" value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="rounded border border-[var(--bigin-border)] bg-white px-2 text-sm">
          <option value="created-desc">Czas Utworzenia</option>
          <option value="created-asc">Czas utworzenia: najstarsze</option>
          <option value="title">Nazwa transakcji</option>
          <option value="value-desc">Kwota: malejąco</option>
        </select>
      </label>
      {children}
      <GatedButton canAct={canAddDeal} gateReason="create deals" onClick={onAddDeal} className="shrink-0 rounded" aria-label="Dodaj transakcję" title="Dodaj transakcję">
        <Plus aria-hidden="true" className="size-4" /><span>Transakcja</span>
      </GatedButton>
    </section>
  );
}

const STAGE_COLORS: Record<string, string> = {
  klasyfikacja: '#64748b',
  'wymagana analiza': '#0ea5e9',
  propozycja: '#8b5cf6',
  wycena: '#8b5cf6',
  'propozycja/wycena': '#8b5cf6',
  'propozycja cenowa': '#8b5cf6',
  negocjacje: '#f59e0b',
  'negocjacje/rewizja': '#f59e0b',
  'zamknięty zdobyty': '#0f7b3f',
  'zamknięty utracony': '#b3261e',
};

function stageColor(name: string): string {
  const normalized = name
    .toLocaleLowerCase('pl-PL')
    .trim()
    .replace(/,/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
  return Object.hasOwn(STAGE_COLORS, normalized)
    ? STAGE_COLORS[normalized]
    : '#94a3b8';
}

interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
}

export function PipelineBoard({
  stages,
  deals,
  onDealMoved,
  onAddDeal,
  onEditDeal,
}: PipelineBoardProps) {
  const { defaultCurrency } = useAuth();
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages]
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of sortedStages) map.set(stage.id, []);
    for (const deal of deals) {
      const bucket = map.get(deal.stage_id);
      if (bucket) bucket.push(deal);
    }
    return map;
  }, [sortedStages, deals]);

  const sensors = useSensors(
    // Keep mouse drag activation; native touch panning stays available.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard drag support: focus a card, Space to pick up, arrows to move,
    // Space to drop, Escape to cancel.
    useSensor(KeyboardSensor)
  );

  const activeDeal = activeDealId
    ? (deals.find((d) => d.id === activeDealId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;
    if (!sortedStages.some((s) => s.id === targetStageId)) return;

    onDealMoved(dealId, targetStageId);
  }

  function handleDragCancel() {
    setActiveDealId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {!surfaceFlags.pipelineExtensions ? (
        <div className="sr-only">
          <h1>Transakcje</h1>
          <span aria-label="Liczba transakcji">{deals.length}</span>
        </div>
      ) : null}
      <div className="pipeline-scroll flex min-w-0 gap-[0px] overflow-x-auto bg-[var(--bigin-bg)] pb-2 text-[var(--bigin-text)]" aria-label="Tablica transakcji" tabIndex={0}>
        {sortedStages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const totalValue = stageDeals.reduce(
            (s, d) => s + Number(d.value || 0),
            0
          );
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totalValue={totalValue}
              currency={defaultCurrency}
              onAddDeal={onAddDeal}
              onEditDeal={onEditDeal}
            />
          );
        })}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {activeDeal ? (
          <div className="opacity-90">
            <PipelineDealCard
              deal={activeDeal}
              stage={
                sortedStages.find((s) => s.id === activeDeal.stage_id) ?? null
              }
              onEdit={() => {}}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>

      <style jsx>{`
        .pipeline-scroll {
          scroll-behavior: smooth;
        }
        .pipeline-stage-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .pipeline-stage-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .pipeline-stage-scroll::-webkit-scrollbar-thumb {
          border-radius: 9999px;
          background: var(--border);
        }
        /* On touch devices the peek/snap layout already signals there's
           more to swipe, so the scrollbar is hidden for a clean look.
           On desktop (mouse) the board can overflow with many stages
           and there is no peek hint, so keep a thin, themed scrollbar
           visible to make the overflow discoverable and usable. */
        @media (hover: none), (pointer: coarse) {
          .pipeline-scroll::-webkit-scrollbar {
            height: 0;
            display: none;
          }
          .pipeline-scroll {
            scrollbar-width: none;
          }
        }
        @media (hover: hover) and (pointer: fine) {
          .pipeline-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--border) transparent;
          }
          .pipeline-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .pipeline-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb {
            background-color: var(--border);
            border-radius: 9999px;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb:hover {
            background-color: var(--muted-foreground);
          }
        }
      `}</style>
    </DndContext>
  );
}

function StageSummary({
  count,
  totalValue,
  currency,
}: {
  count: number;
  totalValue: number;
  currency: string;
}) {
  const noun =
    count === 1
      ? 'transakcja'
      : count % 10 >= 2 &&
          count % 10 <= 4 &&
          (count % 100 < 12 || count % 100 > 14)
        ? 'transakcje'
        : 'transakcji';
  // The shared formatter follows the browser locale. Keep the requested Polish
  // PLN spelling and grouping stable, including four-digit amounts and zero.
  const amount =
    currency === 'PLN'
      ? `${totalValue.toLocaleString('pl-PL', { useGrouping: true, maximumFractionDigits: 0 })} zł`
      : formatCurrency(totalValue, currency);

  return (
    <span className="contents text-xs font-normal text-slate-600">
      <span className="min-w-0 break-words min-[1440px]:shrink-0 min-[1440px]:whitespace-nowrap">
        · {amount}
      </span>
      <span className="shrink-0 whitespace-nowrap">
        · {count} {noun}
      </span>
    </span>
  );
}

function StageColumn({
  stage,
  deals,
  totalValue,
  currency,
  onAddDeal,
  onEditDeal,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  currency: string;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    // Keep Bigin's column width at every desktop size; overflow stays on board.
    <div
      data-pipeline-column={stage.id}
      data-stage-color={stageColor(stage.name)}
      className="flex h-full min-h-0 w-[230px] flex-none flex-col overflow-hidden px-[5px] text-[var(--bigin-text)]"
    >
      {/* 3px colored top border — sits above the column's padding */}
      <div
        aria-hidden="true"
        className="h-[3px] shrink-0 rounded-t"
        style={{
          backgroundColor: stageColor(stage.name),
        }}
      />
      <div
        data-stage-header
        className="z-10 h-[49px] shrink-0 overflow-hidden rounded-b border border-t-0 border-[var(--bigin-border)] bg-[var(--bigin-surface)] px-3 py-1"
      >
        <span className="block text-[11px] font-normal text-slate-600">Transakcja</span>
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs font-bold">
          <span
            className="inline-flex w-full min-w-0 items-center gap-1"
            title={stage.name}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: stageColor(stage.name) }}
            />
            <span className="truncate">{stage.name}</span>
          </span>
          <StageSummary
            count={deals.length}
            totalValue={totalValue}
            currency={currency}
          />
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className={`pipeline-stage-scroll mt-1.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded bg-[var(--bigin-row)] transition-all ${
          isOver
            ? 'bg-primary/5 outline-primary outline outline-2 outline-dashed'
            : ''
        }`}
      >
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10 text-xs text-slate-600">
            Ten etap jest pusty
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onEdit={onEditDeal}
            />
          ))
        )}
      </div>

      {surfaceFlags.pipelineExtensions ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddDeal(stage.id)}
          className="mt-1 h-7 w-full justify-start border border-dashed border-[#e3e7ec] bg-transparent px-2 text-xs text-slate-600 hover:border-slate-400 hover:bg-white hover:text-slate-900"
        >
          <Plus className="mr-1 h-3 w-3" />
          Dodaj deal
        </Button>
      ) : null}
    </div>
  );
}

function DraggableDealCard({
  deal,
  stage,
  onEdit,
}: {
  deal: Deal;
  stage: PipelineStage;
  onEdit: (deal: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'pan-x pan-y' }}
    >
      <PipelineDealCard deal={deal} stage={stage} onEdit={onEdit} />
    </div>
  );
}

// Board presentation owns its surfaces and stage stripe directly. Keep the
// existing card interactions and shared actions without descendant overrides.
function PipelineDealCard({
  deal,
  stage,
  onEdit,
  isOverlay,
}: {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}) {
  return (
    <DealCard
      deal={deal}
      stage={stage}
      onEdit={onEdit}
      isOverlay={isOverlay}
      accentColor={stage ? stageColor(stage.name) : '#94a3b8'}
    />
  );
}
