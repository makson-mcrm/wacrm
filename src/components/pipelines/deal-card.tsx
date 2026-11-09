'use client';

import type { Deal, PipelineStage } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { CallAction } from '@/components/sales/call-action';
import { WhatsAppAction } from '@/components/sales/whatsapp-action';
import { surfaceFlags } from '@/lib/ui/surface-flags';

interface DealCardProps {
  deal: Deal & { company_name?: string | null };
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
  accentColor?: string;
}

const BRAND_STAGE_COLORS = ['#173A52', '#245247', '#B7D84B', '#173A52', '#245247', '#B7D84B', '#1B2730'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function DealCard({ deal, stage, onEdit, isOverlay, accentColor }: DealCardProps) {
  const activityDate = deal.updated_at || deal.created_at;
  const cardDate = deal.expected_close_date || deal.created_at;
  const companyName = deal.company_name?.trim() || deal.company?.name?.trim();
  const contactName =
    deal.contact?.name?.trim() ||
    [deal.contact?.first_name?.trim(), deal.contact?.last_name?.trim()]
      .filter(Boolean)
      .join(' ');
  return (
    <article
      data-pipeline-deal
      style={{ color: 'var(--bigin-text)' }}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (isOverlay) return;
        event.stopPropagation();
        onEdit(deal);
      }}
      onKeyDown={(event) => {
        if (!isOverlay && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onEdit(deal);
        }
      }}
      className={`relative w-full cursor-pointer rounded border border-[var(--bigin-border)] bg-white px-3 py-1 text-left text-slate-900 shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] transition ${isOverlay ? 'opacity-90' : 'hover:border-emerald-700 hover:shadow-md'}`}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-1 rounded-l-[10px]"
        style={{ backgroundColor: accentColor ?? (stage == null ? '#173A52' : BRAND_STAGE_COLORS[stage.position % BRAND_STAGE_COLORS.length]) }}
      />
      <a data-stage={stage?.id} href={`/deals/${deal.id}`} target="_blank" rel="noopener" onClick={(event) => event.stopPropagation()} className="line-clamp-2 text-sm font-semibold text-slate-950 hover:underline">
        {companyName || deal.title}
      </a>
      {companyName ? (
        <p className="truncate text-xs text-[#475569]" title={deal.title}>
          {deal.title}
        </p>
      ) : null}
      {contactName ? (
        <p className="truncate text-xs text-slate-600" title={contactName}>
          {contactName}{companyName ? ' · kontakt' : ''}
        </p>
      ) : null}
      <p className="mt-2 text-sm font-bold">{formatCurrency(deal.value, deal.currency)}</p>
      <time className="mt-1 block text-xs text-slate-600" dateTime={cardDate} title={deal.expected_close_date ? 'Planowana data zamknięcia' : 'Data utworzenia'}>
        {formatDate(cardDate)}
      </time>
      {surfaceFlags.pipelineExtensions ? (
        <>
          <p className="mt-1 text-xs text-[#475569]">Ostatnia aktywność: {formatDate(activityDate)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 [&_a]:h-9 [&_a]:px-2 [&_a]:text-xs [&_button]:h-9 [&_button]:w-full [&_button]:px-2 [&_button]:text-xs" onClick={(event) => event.stopPropagation()}>
            {deal.contact?.phone ? <CallAction phone={deal.contact.phone} contactId={deal.contact_id} dealId={deal.id} className="bg-emerald-800 text-white" /> : null}
            <WhatsAppAction phone={deal.contact?.phone} contactId={deal.contact_id} dealId={deal.id} />
          </div>
        </>
      ) : null}
    </article>
  );
}
