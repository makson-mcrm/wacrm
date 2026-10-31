import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Deal, PipelineStage } from '@/types';
import { PipelineBoard } from './pipeline-board';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ defaultCurrency: 'PLN' }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => children,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  KeyboardSensor: {},
  PointerSensor: {},
  closestCorners: vi.fn(),
  useSensor: () => ({}),
  useSensors: () => [],
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({
    setNodeRef: vi.fn(),
    attributes: {},
    listeners: {},
    isDragging: false,
  }),
}));
vi.mock('./deal-card', () => ({
  DealCard: ({ deal, stage }: { deal: Deal; stage: PipelineStage }) => (
    <a data-stage={stage.id} href={`/deals/${deal.id}`}>
      {deal.title}
    </a>
  ),
}));

const names = [
  ...readFileSync('src/app/(dashboard)/pipelines/page.tsx', 'utf8').matchAll(
    /name: '([^']+)', color:/g
  ),
].map((match) => match[1]);
const stages = names.map((name, position) => ({
  id: `stage-${position}`,
  name,
  position,
  pipeline_id: 'pipeline-synthetic',
})) as PipelineStage[];
const render = (deals: Deal[]) =>
  renderToStaticMarkup(
    <PipelineBoard
      stages={stages}
      deals={deals}
      onDealMoved={vi.fn()}
      onAddDeal={vi.fn()}
      onEditDeal={vi.fn()}
    />
  );

describe('K3: Lejek po odświeżeniu danych', () => {
  it('pokazuje dwa Deale jednego kontaktu jako oddzielne karty właściwego etapu', () => {
    const deals = ['deal-alpha', 'deal-beta'].map((id) => ({
      id,
      title: id,
      contact_id: 'contact-synthetic',
      stage_id: 'stage-1',
      value: 100000,
      currency: 'PLN',
    })) as Deal[];
    const html = render(deals);
    expect(html).toContain('data-stage="stage-1" href="/deals/deal-alpha"');
    expect(html).toContain('data-stage="stage-1" href="/deals/deal-beta"');
    for (const name of names) expect(html).toContain(name);
  });
  it('ponowny render po odczycie zapisanego etapu przenosi kartę do nowej kolumny', () => {
    const deal = {
      id: 'deal-alpha',
      title: 'Sprawa syntetyczna',
      contact_id: 'contact-synthetic',
      stage_id: 'stage-0',
      value: 100000,
      currency: 'PLN',
    } as Deal;
    expect(render([deal])).toContain(
      'data-stage="stage-0" href="/deals/deal-alpha"'
    );
    const refreshed = { ...deal, stage_id: 'stage-4' };
    const html = render([refreshed]);
    expect(html).toContain('data-stage="stage-4" href="/deals/deal-alpha"');
    expect(html).not.toContain('data-stage="stage-0" href="/deals/deal-alpha"');
  });
});
