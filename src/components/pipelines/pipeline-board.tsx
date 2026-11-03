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
import { CallAction } from '@/components/sales/call-action';
import { WhatsAppAction } from '@/components/sales/whatsapp-action';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';

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
  const mobileStage =
    sortedStages.find((stage) => stage.id === openStageId) ?? sortedStages[0];

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
        <nav
          className="flex gap-2 overflow-x-auto pb-1"
          aria-label="Etapy lejka 1–6"
        >
          {sortedStages.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => setOpenStageId(stage.id)}
              className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-black ${mobileStage?.id === stage.id ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
              aria-current={mobileStage?.id === stage.id ? 'step' : undefined}
            >
              {index + 1}
            </button>
          ))}
        </nav>
        {sortedStages
          .filter((stage) => stage.id === mobileStage?.id)
          .map((stage) => {
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
                data-stage-color={stageColor(stage.name)}
                className="overflow-hidden rounded-xl border border-[#e3e7ec] bg-[#f1f3f6] text-slate-900 shadow-sm"
              >
                <div
                  aria-hidden="true"
                  className="h-[3px] shrink-0"
                  style={{ backgroundColor: stageColor(stage.name) }}
                />
                <button
                  type="button"
                  onClick={() => setOpenStageId(open ? '__none__' : stage.id)}
                  aria-expanded={open}
                  className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: stageColor(stage.name) }}
                  />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-xs">
                    <span
                      className="min-w-0 truncate font-black text-slate-900"
                      title={stage.name}
                    >
                      {stage.name}
                    </span>
                    <StageSummary
                      count={stageDeals.length}
                      totalValue={totalValue}
                      currency={defaultCurrency}
                    />
                  </span>
                  <ChevronDown
                    className={`size-4 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open ? (
                  <div className="border-t border-slate-100 p-2">
                    <div className="pipeline-stage-scroll max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                      {stageDeals.length ? (
                        stageDeals.map((deal) => (
                          <PipelineDealCard
                            key={deal.id}
                            deal={deal}
                            stage={stage}
                            onEdit={onEditDeal}
                          />
                        ))
                      ) : (
                        <p className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-600">
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
                      <Plus className="mr-1 size-3" /> Dodaj deal
                    </Button>
                  </div>
                ) : null}
              </section>
            );
          })}
      </div>

      <div className="pipeline-scroll hidden min-w-0 gap-2 pb-2 lg:flex">
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
  const t = useTranslations('Pipelines.board');
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    // On mobile each column is `w-[85vw]` (with a reasonable min/max)
    // so the next column's edge peeks in — a "there's more here" hint.
    // snap-start lands each column cleanly when swiping. On lg+ we
    // restore the flex-1 share-the-row behavior. The droppable ref is
    // on the inner messages region below — intentionally NOT here, so
    // a drag over the column header doesn't highlight the whole column.
    <div
      data-stage-color={stageColor(stage.name)}
      className="flex h-[calc(100dvh-245px)] min-h-[480px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#e3e7ec] bg-[#f1f3f6] p-1.5 text-slate-900"
    >
      {/* 3px colored top border — sits above the column's padding */}
      <div
        aria-hidden="true"
        className="-mx-1.5 -mt-1.5 h-[3px] shrink-0"
        style={{
          backgroundColor: stageColor(stage.name),
        }}
      />
      <div
        data-stage-header
        className="sticky top-0 z-10 bg-[#f1f3f6] pt-1.5"
      >
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs font-bold min-[1440px]:flex-nowrap">
          <span
            className="inline-flex min-w-0 items-center gap-1"
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
        className={`pipeline-stage-scroll mt-1.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5 transition-all ${
          isOver
            ? 'bg-primary/5 outline-primary outline outline-2 outline-dashed'
            : ''
        }`}
      >
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-[#e3e7ec] py-10 text-xs text-slate-600">
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
        className="mt-1 h-7 w-full justify-start border border-dashed border-[#e3e7ec] bg-transparent px-2 text-xs text-slate-600 hover:border-slate-400 hover:bg-white hover:text-slate-900"
      >
        <Plus className="mr-1 h-3 w-3" />
        Dodaj deal
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
  const activityDate = deal.updated_at || deal.created_at;
  return (
    <article
      data-pipeline-deal
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (isOverlay) return;
        event.stopPropagation();
        onEdit(deal);
      }}
      onKeyDown={(event) => {
        if (!isOverlay && (event.key === 'Enter' || event.key === ' '))
          onEdit(deal);
      }}
      className={`relative w-full cursor-pointer rounded-[10px] border border-[#e3e7ec] bg-white p-3 text-left text-slate-900 shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] transition ${isOverlay ? 'opacity-90' : 'hover:border-emerald-700 hover:shadow-md'}`}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-1 rounded-l-[10px]"
        style={{ backgroundColor: stage ? stageColor(stage.name) : '#94a3b8' }}
      />
      <a
        data-stage={stage?.id}
        href={`/deals/${deal.id}`}
        onClick={(event) => event.stopPropagation()}
        className="line-clamp-2 text-sm font-black hover:underline"
      >
        {deal.title}
      </a>
      <p className="mt-2 text-sm font-bold">
        {formatCurrency(deal.value, deal.currency)}
      </p>
      <p className="mt-1 text-xs text-[#475569]">
        Ostatnia aktywność:{' '}
        {new Date(activityDate).toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </p>
      <div
        className="mt-3 grid grid-cols-2 gap-2 [&_a]:h-9 [&_a]:px-2 [&_a]:text-xs [&_button]:h-9 [&_button]:w-full [&_button]:px-2 [&_button]:text-xs"
        onClick={(event) => event.stopPropagation()}
      >
        {deal.contact?.phone ? (
          <CallAction
            phone={deal.contact.phone}
            contactId={deal.contact_id}
            dealId={deal.id}
            className="bg-emerald-800 text-white"
          />
        ) : null}
        <WhatsAppAction
          phone={deal.contact?.phone}
          contactId={deal.contact_id}
          dealId={deal.id}
        />
      </div>
    </article>
  );
}
