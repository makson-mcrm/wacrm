'use client';

import type { Deal, PipelineStage } from '@/types';
import { Building2, ExternalLink } from 'lucide-react';
import { Calendar, Check, X } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useTranslations } from 'next-intl';

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

const BRAND_STAGE_COLORS = [
  '#173A52',
  '#245247',
  '#B7D84B',
  '#173A52',
  '#245247',
  '#B7D84B',
  '#1B2730',
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || '?').trim();
  if (!source) return '?';
  return source.charAt(0).toUpperCase();
}

export function DealCard({ deal, stage, onEdit, isOverlay }: DealCardProps) {
  const t = useTranslations('Pipelines.card');
  const contactLabel =
    deal.contact?.name || deal.contact?.phone || t('noContact');
  const assigneeLabel = deal.assignee?.full_name || null;
  const probability = [10, 25, 40, 60, 80, 95][stage?.position ?? 0] ?? 10;
  const activityDate = deal.updated_at || deal.created_at;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // `onClick` still fires after a non-drag tap because the PointerSensor
        // requires 5px movement before it counts as a drag.
        if (isOverlay) return;
        e.stopPropagation();
        onEdit(deal);
      }}
      onKeyDown={(event) => {
        if (isOverlay) return;
        if (event.key === 'Enter' || event.key === ' ') onEdit(deal);
      }}
      className={`group border-border/60 relative w-full cursor-pointer rounded-lg border bg-white py-2 pr-2 pl-3 text-left shadow-sm transition-all ${
        isOverlay
          ? 'shadow-xl'
          : 'hover:border-border hover:bg-muted hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      {/* 4px left accent bar using stage color */}
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-0.5"
        style={{
          backgroundColor:
            stage == null
              ? '#173A52'
              : BRAND_STAGE_COLORS[stage.position % BRAND_STAGE_COLORS.length],
        }}
      />

      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-600">
          {probability}%
        </span>
        {!isOverlay && (
          <a
            href={`/deals/${deal.id}`}
            target="_blank"
            rel="noreferrer"
            title="Otwórz Deal w nowej karcie"
            aria-label="Otwórz Deal w nowej karcie"
            className="text-muted-foreground hover:bg-background hover:text-foreground rounded p-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="size-3" />
          </a>
        )}
        {deal.status === 'won' && (
          <span className="bg-primary/15 text-primary inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
            <Check className="h-3 w-3" />
            {t('won')}
          </span>
        )}
        {deal.status === 'lost' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            <X className="h-3 w-3" />
            {t('lost')}
          </span>
        )}
      </div>

      <a
        href={`/deals/${deal.id}`}
        onClick={(event) => event.stopPropagation()}
        className="block truncate text-xs leading-tight font-black text-slate-950 hover:underline"
      >
        {deal.title}
      </a>

      {/* Contact row */}
      <div className="mt-1 flex items-center gap-1">
        <span className="bg-muted text-foreground flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold">
          {initials(deal.contact?.name, deal.contact?.phone)}
        </span>
        {deal.contact_id ? (
          <a
            href={`/contacts?open=${deal.contact_id}`}
            onClick={(event) => event.stopPropagation()}
            className="truncate text-xs text-slate-600 hover:underline"
          >
            {contactLabel}
          </a>
        ) : (
          <span className="truncate text-xs text-slate-600">
            {contactLabel}
          </span>
        )}
      </div>

      {deal.company ? (
        <a
          href={`/companies?open=${deal.company.id}`}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500 hover:underline"
        >
          <Building2 className="size-3 shrink-0" /> {deal.company.name}
        </a>
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-primary text-[11px] font-bold">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        {deal.expected_close_date && (
          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Calendar className="h-3 w-3" />
            {formatDate(deal.expected_close_date)}
          </span>
        )}
      </div>

      <p className="mt-1 text-[10px] text-slate-400">
        Ostatnia aktywność: {formatDate(activityDate)}
      </p>

      {deal.product_type && (
        <span className="bg-primary/10 text-primary mt-1 inline-flex rounded-full px-1.5 py-0 text-[9px] font-semibold">
          {deal.product_type}
        </span>
      )}

      {deal.next_action && (
        <div className="border-border/60 mt-1 border-t pt-1">
          <p className="truncate text-[11px] font-medium">
            Następnie: {deal.next_action}
          </p>
          {deal.next_action_at && (
            <p className="text-muted-foreground text-[10px]">
              {new Date(deal.next_action_at).toLocaleString('pl-PL')}
            </p>
          )}
        </div>
      )}

      {assigneeLabel && (
        <div className="mt-1 flex items-center justify-end">
          <span
            title={assigneeLabel}
            className="bg-primary/15 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
          >
            {initials(assigneeLabel)}
          </span>
        </div>
      )}
    </div>
  );
}
