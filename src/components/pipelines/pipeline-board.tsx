'use client';

import { useMemo, useState } from 'react';
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
import type { Deal, PipelineStage } from '@/types';
import { DealCard } from './deal-card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { useTranslations } from 'next-intl';

const BRAND_STAGE_COLORS = [
  '#173A52',
  '#245247',
  '#B7D84B',
  '#173A52',
  '#245247',
  '#B7D84B',
  '#1B2730',
];

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
  const [openStageId, setOpenStageId] = useState('');

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
    // 5px activation distance avoids clicks being interpreted as drags.
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
      <div className="space-y-2 lg:hidden">
        {sortedStages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const totalValue = stageDeals.reduce(
            (sum, deal) => sum + Number(deal.value || 0),
            0
          );
          const open = openStageId
            ? openStageId === stage.id
            : stage.id === sortedStages[0]?.id;
          return (
            <section
              key={stage.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenStageId(open ? '__none__' : stage.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <span
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      BRAND_STAGE_COLORS[
                        stage.position % BRAND_STAGE_COLORS.length
                      ],
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-slate-900">
                    {stage.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {formatCurrency(totalValue, defaultCurrency)}
                  </span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                  {stageDeals.length}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open ? (
                <div className="border-t border-slate-100 p-2">
                  <div className="pipeline-stage-scroll max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                    {stageDeals.length ? (
                      stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          stage={stage}
                          onEdit={onEditDeal}
                        />
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-500">
                        Brak Dealów na tym etapie.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddDeal(stage.id)}
                    className="mt-2 h-9 w-full justify-start border border-dashed border-slate-200 text-xs"
                  >
                    <Plus className="mr-1 size-3" /> Dodaj Deal
                  </Button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="pipeline-scroll hidden min-w-0 gap-2 overflow-x-auto pb-2 lg:flex">
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
            <DealCard
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
  const t = useTranslations('Pipelines.board');
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    // On mobile each column is `w-[85vw]` (with a reasonable min/max)
    // so the next column's edge peeks in — a "there's more here" hint.
    // snap-start lands each column cleanly when swiping. On lg+ we
    // restore the flex-1 share-the-row behavior. The droppable ref is
    // on the inner messages region below — intentionally NOT here, so
    // a drag over the column header doesn't highlight the whole column.
    <div className="border-border bg-card/60 flex h-[calc(100vh-245px)] min-h-[480px] w-[264px] min-w-[264px] shrink-0 flex-col overflow-hidden rounded-lg border p-1.5">
      {/* 3px colored top border — sits above the column's padding */}
      <div
        className="-mx-1.5 -mt-1.5 h-[3px]"
        style={{
          backgroundColor:
            BRAND_STAGE_COLORS[stage.position % BRAND_STAGE_COLORS.length],
        }}
      />
      <div className="bg-card/95 sticky top-0 z-10 flex items-center justify-between pt-1.5 backdrop-blur">
        <h3 className="text-foreground truncate text-[11px] font-bold">
          {stage.name}
        </h3>
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0 text-[10px] font-medium">
          {deals.length}
        </span>
      </div>
      <p className="text-muted-foreground text-[10px]">
        {formatCurrency(totalValue, currency)}
      </p>

      <div
        ref={setNodeRef}
        className={`pipeline-stage-scroll mt-1.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5 transition-all ${
          isOver
            ? 'bg-primary/5 outline-primary outline outline-2 outline-dashed'
            : ''
        }`}
      >
        {deals.length === 0 ? (
          <div className="border-border text-muted-foreground flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-10 text-xs">
            {t('dropDealHere')}
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

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAddDeal(stage.id)}
        className="border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground mt-1 h-7 w-full justify-start border border-dashed bg-transparent px-2 text-xs"
      >
        <Plus className="mr-1 h-3 w-3" />
        {t('addDeal')}
      </Button>
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
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'none' }}
    >
      <DealCard deal={deal} stage={stage} onEdit={onEdit} />
    </div>
  );
}

