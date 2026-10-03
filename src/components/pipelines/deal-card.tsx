'use client';

import type { Deal, PipelineStage } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { CallAction } from '@/components/sales/call-action';
import { WhatsAppAction } from '@/components/sales/whatsapp-action';

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

const BRAND_STAGE_COLORS = ['#173A52', '#245247', '#B7D84B', '#173A52', '#245247', '#B7D84B', '#1B2730'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function DealCard({ deal, stage, onEdit, isOverlay }: DealCardProps) {
  const activityDate = deal.updated_at || deal.created_at;
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (isOverlay) return;
        event.stopPropagation();
        onEdit(deal);
      }}
      onKeyDown={(event) => {
        if (!isOverlay && (event.key === 'Enter' || event.key === ' ')) onEdit(deal);
      }}
      className={`relative w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition ${isOverlay ? 'opacity-90 shadow-xl' : 'hover:border-emerald-700 hover:shadow-md'}`}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-1 rounded-l-lg"
        style={{ backgroundColor: stage == null ? '#173A52' : BRAND_STAGE_COLORS[stage.position % BRAND_STAGE_COLORS.length] }}
      />
      <a href={`/deals/${deal.id}`} onClick={(event) => event.stopPropagation()} className="line-clamp-2 text-sm font-black text-slate-950 hover:underline">
        {deal.title}
      </a>
      <p className="mt-2 text-sm font-bold text-emerald-800">{formatCurrency(deal.value, deal.currency)}</p>
      <p className="mt-1 text-xs text-slate-600">Ostatnia aktywność: {formatDate(activityDate)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 [&_a]:h-9 [&_a]:px-2 [&_a]:text-xs [&_button]:h-9 [&_button]:w-full [&_button]:px-2 [&_button]:text-xs" onClick={(event) => event.stopPropagation()}>
        <CallAction phone={deal.contact?.phone} contactId={deal.contact_id} dealId={deal.id} className="bg-emerald-800 text-white" />
        <WhatsAppAction phone={deal.contact?.phone} contactId={deal.contact_id} dealId={deal.id} />
      </div>
    </article>
  );
}
