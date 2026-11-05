import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deal, PipelineStage } from '@/types';
import { PipelineBoard } from './pipeline-board';

const flags = vi.hoisted(() => ({ extensions: undefined as boolean | undefined }));
vi.mock('@/lib/ui/surface-flags', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/ui/surface-flags')>();
  return {
    ...original,
    surfaceFlags: {
      get pipelineExtensions() {
        return flags.extensions ?? original.surfaceFlags.pipelineExtensions;
      },
    },
  };
});
beforeEach(() => { flags.extensions = undefined; });

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ defaultCurrency: 'PLN' }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
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

const names = [
  ...readFileSync('src/app/(dashboard)/pipelines/page.tsx', 'utf8').matchAll(
    /name: '([^']+)', color:/g
  ),
].map((match) => match[1]).slice(0, 6);
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
      created_at: '2026-11-05T12:00:00Z',
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
      created_at: '2026-11-05T12:00:00Z',
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

describe('KM3.2.08-BIGIN-CORE: rdzeń tablicy', () => {
  function desktop(html: string) {
    return html.slice(html.indexOf('<div class="pipeline-scroll hidden'));
  }

  it('pokazuje sześć stałych kolumn 220 px i odstęp 10 px z przewijaniem', () => {
    const html = desktop(render([]));
    expect(html.match(/data-pipeline-column=/g)).toHaveLength(6);
    expect(html.match(/w-\[220px\] flex-none/g)).toHaveLength(6);
    expect(html).toContain('gap-[10px] overflow-x-auto');
    expect(html.match(/>Transakcja<\/span>/g)).toHaveLength(6);
    expect(html.match(/Ten etap jest pusty/g)).toHaveLength(6);
    for (const name of names) expect(html).toContain(name);
  });

  it.each([false, true])('karta zachowuje rdzeń, a dodatki zależą od przełącznika: %s', (enabled) => {
    flags.extensions = enabled;
    const html = desktop(render([{
      id: 'deal-core',
      title: 'Sprawa syntetyczna Bigin',
      stage_id: 'stage-0',
      contact_id: 'contact-synthetic',
      contact: { name: 'Kontakt syntetyczny', phone: '+48000000000' },
      value: 25000,
      currency: 'PLN',
      created_at: '2026-11-01T12:00:00Z',
      updated_at: '2026-11-03T12:00:00Z',
      expected_close_date: '2026-11-20',
    } as Deal]));
    const card = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/)?.[0];
    expect(card).toContain('Sprawa syntetyczna Bigin');
    expect(card).toContain('Kontakt syntetyczny');
    expect(card).toContain('href="/deals/deal-core"');
    const amount = card!.match(/<p class="mt-2 text-sm font-bold">([^<]+)<\/p>/)?.[1];
    expect(amount?.replace(/\D/g, '')).toBe('25000');
    expect(card).toContain('dateTime="2026-11-20"');
    expect(card).toContain('20.11.2026');
    for (const label of ['Ostatnia aktywność: 03.11.2026', 'ZADZWOŃ', 'WIADOMOŚĆ']) {
      expect(card?.includes(label)).toBe(enabled);
    }
    expect(card?.includes('href="tel:+48000000000"')).toBe(enabled);
    expect(card?.includes('/quick-call?contact=contact-synthetic&amp;action=message&amp;deal=deal-core')).toBe(enabled);
    expect(html.includes('Dodaj deal')).toBe(enabled);
  });

  it('domyślnie ukrywa dodatki także na mobile, zachowując sześć kolumn i dane kart', () => {
    const html = render([{
      id: 'deal-default',
      title: 'Sprawa syntetyczna',
      stage_id: 'stage-0',
      contact_id: 'contact-synthetic',
      contact: { name: 'Kontakt syntetyczny', phone: '+48000000000' },
      value: 25000,
      currency: 'PLN',
      created_at: '2026-11-01T12:00:00Z',
    } as Deal]);
    expect(desktop(html).match(/data-pipeline-column=/g)).toHaveLength(6);
    const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(2); // rzeczywiste karty desktop i mobile
    for (const card of cards) {
      expect(card).toContain('Sprawa syntetyczna');
      expect(card).toContain('Kontakt syntetyczny');
      expect(card).toContain('01.11.2026');
      expect(card).toContain('bg-white');
    }
    for (const label of ['Ostatnia aktywność', 'ZADZWOŃ', 'WIADOMOŚĆ', 'Dodaj deal'])
      expect(html).not.toContain(label);
  });
});
