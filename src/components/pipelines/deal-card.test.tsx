import { readFileSync } from 'node:fs';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { describe, expect, it, vi } from 'vitest';
import type { Deal } from '@/types';
import { formatCurrency } from '@/lib/currency';
import {
  PIPELINE_CARD_HEIGHT,
  PIPELINE_PANEL_NARROW_MAX_WIDTH,
  PIPELINE_TEAM_PANEL_NARROW_WIDTH,
  SHELL_CSS_VARS,
  biginGeometryCssVars,
} from '@/lib/ui/layout-geometry';
import { DealCard } from './deal-card';

const sheet = postcss.parse(readFileSync('src/app/globals.css', 'utf8'));
const workspaceSelector = '[data-bigin-pipeline-shell] [data-pipeline-workspace]';
const collapsedSelector = `${workspaceSelector}[data-pipeline-team-collapsed='true']`;

// Resolve the actual responsive declarations and inherited tokens. These are
// CSS contract checks; browser scrollWidth/DOM measurements remain separate.
function rules(selector: string, viewport: number) {
  const values: Record<string, string> = {};
  sheet.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'media') {
      const maximum = Number(rule.parent.params.match(/max-width: (\d+)px/)?.[1]);
      if (!maximum || viewport > maximum) return;
    }
    rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
  });
  return values;
}

describe('KM3.5.1H D1: panel i ograniczenie przewijania do tablicy', () => {
  it.each([
    [1536, 220, 295], [1281, 220, 295], [1280, 198, 272], [1024, 198, 272], [390, 198, 272],
  ])('szerokość %i: panel %i px, początek kolumny x=%i', (viewport, panel, columnX) => {
    const variables = {
      ...SHELL_CSS_VARS,
      ...biginGeometryCssVars('pipelines'),
      ...rules("[data-slot='app-shell']", viewport),
      ...rules(workspaceSelector, viewport),
    } as Record<string, string>;
    const pixels = (name: string): number => {
      const value = variables[name];
      const reference = /^var\((--[^)]+)\)$/.exec(value);
      return reference ? pixels(reference[1]) : Number.parseFloat(value);
    };
    expect(pixels('--pipeline-team-panel-width') - 1).toBe(panel);
    expect(pixels('--app-sidebar-width') + pixels('--pipeline-team-panel-width') + pixels('--content-pad-x')).toBe(columnX);
    expect(rules('[data-pipeline-team-panel]', viewport).width).toBe('calc(var(--pipeline-team-panel-width) - 1px)');
    expect(rules('[data-pipeline-workspace]', viewport)).toMatchObject({ 'min-width': '0', overflow: 'hidden' });
    expect(rules('[data-pipeline-content]', viewport)).toMatchObject({ 'min-width': '0', overflow: 'hidden' });
    expect(rules('[data-bigin-pipeline-shell] .pipeline-scroll', viewport)).toMatchObject({ 'min-width': '0', 'overflow-x': 'auto' });
    // The higher-specificity collapsed state must keep the panel at zero.
    expect(rules(collapsedSelector, viewport)).toMatchObject({ '--pipeline-team-panel-width': '0px', 'padding-left': '41px' });
  });

  it('wiąże zmierzony próg i szerokość z tokenami używanymi przez CSS', () => {
    expect(PIPELINE_PANEL_NARROW_MAX_WIDTH).toBe(1280);
    expect(PIPELINE_TEAM_PANEL_NARROW_WIDTH).toBe(199);
    expect(biginGeometryCssVars('pipelines')).toHaveProperty('--pipeline-mobile-team-panel-width', '199px');
    const queries: string[] = [];
    sheet.walkRules(workspaceSelector, (rule) => {
      if (rule.nodes.some((node) => node.type === 'decl' && node.prop === '--pipeline-team-panel-width')) {
        if (rule.parent?.type === 'atrule') queries.push(rule.parent.params);
      }
    });
    expect(queries).toEqual([`(max-width: ${PIPELINE_PANEL_NARROW_MAX_WIDTH}px)`]);
  });
});

const deal = {
  id: 'deal-km351h', title: 'Transakcja testowa', value: 25000, currency: 'PLN',
  created_at: '2026-11-10T12:00:00Z', contact: { name: 'Kontakt testowy' },
} as Deal;

function children(node: ReactNode): ReactElement<{ className?: string; children?: ReactNode }>[] {
  if (Array.isArray(node)) return node.flatMap(children);
  return isValidElement<{ className?: string; children?: ReactNode }>(node) ? [node] : [];
}

describe('KM3.5.1H D2–D3: geometria i warunkowy wiersz kwoty', () => {
  it.each([25000, 0])('karta z wartością %i ma minimum 79 px i promień 4 px', (value) => {
    const card = DealCard({ deal: { ...deal, value }, stage: null, onEdit: vi.fn() });
    expect(PIPELINE_CARD_HEIGHT).toBeGreaterThanOrEqual(78);
    expect(PIPELINE_CARD_HEIGHT).toBeLessThanOrEqual(80);
    expect(biginGeometryCssVars('pipelines')).toHaveProperty('--pipeline-card-height', '79px');
    expect(rules('[data-bigin-pipeline-cards] [data-pipeline-deal]', 1536)).toMatchObject({
      height: 'var(--pipeline-card-height)', 'min-height': 'var(--pipeline-card-height)',
      'box-sizing': 'border-box', 'border-color': '#e5ebef', 'border-radius': '4px',
    });
    expect(card.props.className).toContain('bg-white');
  });

  it.each([25000, 1, 0.5, 0, -1, null, undefined])('renderuje kwotę wyłącznie dla dodatniej wartości %s', (value) => {
    const card = DealCard({ deal: { ...deal, value } as Deal, stage: null, onEdit: vi.fn() });
    const amounts = children(card.props.children).filter((child) => child.props.className?.includes('font-bold'));
    const hasAmount = typeof value === 'number' && value > 0;
    expect(amounts).toHaveLength(hasAmount ? 1 : 0);
    if (hasAmount) {
      expect(amounts[0].props.children).toBe(formatCurrency(value, deal.currency));
      expect(rules('[data-bigin-pipeline-cards] [data-pipeline-deal] > p.font-bold', 1536)['grid-area']).toBe('3 / 1 / 4 / 2');
    }
    const html = renderToStaticMarkup(card);
    expect(html).toContain('data-pipeline-deal');
    expect(html).toContain('Transakcja testowa');
    expect(html).toContain('Kontakt testowy');
  });
});
