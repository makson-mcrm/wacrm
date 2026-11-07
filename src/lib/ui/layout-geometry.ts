import type { CSSProperties } from 'react';

// KM3.2.14 — measured Bigin palette; geometry remains unchanged.
export const BRAND_SIDEBAR_BG = '#093E52';
export const BRAND_SIDEBAR_BG_ALT = '#0B4A63';
export const BRAND_PAGE_BG_PIPELINE = '#F9FBFC';
export const BRAND_PAGE_BG = '#FFFFFF';
export const BRAND_ROW_BG = '#FCFDFD';
export const BRAND_BORDER = '#E0E9EE';
export const BRAND_HOVER = '#F0F7FB';
export const BRAND_LINK = '#7EB5F4';
export const BRAND_INFO_BANNER = '#DFF9F3';

export const APP_SIDEBAR_WIDTH = 160;
// Bigin demo, 1536×1024, 05.11.2026. Apply only to the pipeline frame.
export const PIPELINE_SIDEBAR_WIDTH = 285;
export const PIPELINE_CONTENT_PADDING_X = 10;
export const PIPELINE_COLUMN_WIDTH = 220;
export const PIPELINE_COLUMN_GAP = 10;
export const PIPELINE_CARD_HEIGHT = 60;
export const PIPELINE_CONTENT_BACKGROUND = BRAND_PAGE_BG_PIPELINE;
export const APP_HEADER_HEIGHT = 56;
// Bigin contacts, 1536×1024. Shared header tokens also apply to the pipeline.
export const LIST_SIDEBAR_WIDTH = 65;
export const LIST_BANNER_HEIGHT = 33;
export const LIST_HEADER_HEIGHT = 49;
export const LIST_TOOLBAR_HEIGHT = 56;
export const LIST_TABLE_TOP = 138;
export const LIST_ROW_HEIGHT = 32;
export const LIST_HEADER_BACKGROUND = BRAND_SIDEBAR_BG;
export const LIST_CONTENT_BACKGROUND = BRAND_PAGE_BG;
export const LIST_ROW_BACKGROUND = BRAND_ROW_BG;
export const LIST_BORDER_COLOR = BRAND_BORDER;
export const LIST_TEXT_COLOR = '#212129';
export const LIST_FONT_SIZE = 14;
export const LIST_TABLE_HEADER_FONT_SIZE = 12;
// KM3.2.11 — card and work-week measurements, Bigin 1536×1024.
export const CARD_SIDEBAR_WIDTH = 65;
export const CARD_HEADER_HEIGHT = 49;
export const CARD_LEFT_PANEL_WIDTH = 488;
export const CARD_CONTENT_TOP = 148;
export const CARD_FIELD_ROW_HEIGHT = 44;
export const CARD_RECORD_HEADER_HEIGHT = CARD_CONTENT_TOP - LIST_BANNER_HEIGHT - CARD_HEADER_HEIGHT;
export const WEEK_GRID_HOUR_HEIGHT = 56;
export const WEEK_GRID_START_HOUR = 8;
export const WEEK_GRID_END_HOUR = 18;
export const WEEK_GRID_TIME_COLUMN_WIDTH = 40;

export const listTableClassName = [
  'table-fixed',
  '[&_tr]:h-[var(--list-row-height)] [&_tr]:border-[var(--list-border)]',
  '[&_th]:h-[var(--list-row-height)] [&_th]:border-r [&_th]:border-[var(--list-border)]',
  '[&_th]:px-4 [&_th]:py-0 [&_th]:text-[length:var(--list-header-font-size)]',
  '[&_th]:font-normal [&_th]:text-[var(--list-text)]',
  '[&_td]:h-[var(--list-row-height)] [&_td]:truncate [&_td]:px-4 [&_td]:py-0',
  '[&_td]:text-[length:var(--list-font-size)] [&_td]:text-[var(--list-text)] [&_td]:leading-5',
  '[&_tbody_tr]:bg-[var(--list-row-background)] [&_thead_tr]:bg-[var(--list-row-background)]',
  '[&_tbody_tr:hover]:bg-[var(--list-hover)] [&_a]:text-[var(--list-link)]',
].join(' ');
export const listToolbarClassName = [
  'flex h-[var(--list-toolbar-height)] items-center justify-between gap-3',
  'bg-[var(--list-content-background)] px-5',
].join(' ');
export const CONTENT_PADDING_X = 24;
export const CONTENT_PADDING_Y = 24;
export const SECTION_GAP = 16;
export const CARD_GAP = 12;
export const CARD_RADIUS = 12;
export const COLUMNS_THREE = 'minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr)';

export type GeometryCssVars = CSSProperties & {
  '--app-sidebar-width': string;
  '--app-header-height': string;
  '--content-pad-x': string;
  '--content-pad-y': string;
  '--section-gap': string;
  '--card-gap': string;
  '--card-radius': string;
  '--columns-three': string;
};

/** Inherited once from AppShell by the shell and its screens. */
export function geometryCssVars(
  surface: 'default' | 'pipelines' | 'lists' | 'cards' | 'calendar' = 'default'
): GeometryCssVars {
  return {
    '--app-sidebar-width': `${surface === 'pipelines' ? PIPELINE_SIDEBAR_WIDTH : APP_SIDEBAR_WIDTH}px`,
    '--app-header-height': `${APP_HEADER_HEIGHT}px`,
    '--content-pad-x': `${surface === 'pipelines' ? PIPELINE_CONTENT_PADDING_X : CONTENT_PADDING_X}px`,
    '--content-pad-y': `${CONTENT_PADDING_Y}px`,
    '--section-gap': `${SECTION_GAP}px`,
    '--card-gap': `${CARD_GAP}px`,
    '--card-radius': `${CARD_RADIUS}px`,
    '--columns-three': COLUMNS_THREE,
    ...(surface === 'lists' ? {
      '--app-sidebar-width': `${LIST_SIDEBAR_WIDTH}px`,
      '--app-header-height': `${LIST_HEADER_HEIGHT}px`,
      '--content-pad-x': '0px',
      '--content-pad-y': '0px',
      '--list-banner-height': `${LIST_BANNER_HEIGHT}px`,
      '--list-toolbar-height': `${LIST_TOOLBAR_HEIGHT}px`,
      '--list-row-height': `${LIST_ROW_HEIGHT}px`,
      '--list-header-background': LIST_HEADER_BACKGROUND,
      '--list-content-background': LIST_CONTENT_BACKGROUND,
      '--list-row-background': LIST_ROW_BACKGROUND,
      '--list-border': LIST_BORDER_COLOR,
      '--list-hover': BRAND_HOVER,
      '--list-link': BRAND_LINK,
      '--list-text': LIST_TEXT_COLOR,
      '--list-font-size': `${LIST_FONT_SIZE}px`,
      '--list-header-font-size': `${LIST_TABLE_HEADER_FONT_SIZE}px`,
    } : {}),
    ...(surface === 'cards' || surface === 'calendar' ? {
      '--app-sidebar-width': `${CARD_SIDEBAR_WIDTH}px`,
      '--app-header-height': `${CARD_HEADER_HEIGHT}px`,
      '--content-pad-x': '0px',
      '--content-pad-y': '0px',
      '--list-banner-height': `${LIST_BANNER_HEIGHT}px`,
      '--list-header-background': LIST_HEADER_BACKGROUND,
      '--list-content-background': LIST_CONTENT_BACKGROUND,
      '--list-text': LIST_TEXT_COLOR,
      '--card-left-panel-width': `${CARD_LEFT_PANEL_WIDTH}px`,
      '--card-content-top': `${CARD_CONTENT_TOP}px`,
      '--card-record-header-height': `${CARD_RECORD_HEADER_HEIGHT}px`,
      '--card-field-row-height': `${CARD_FIELD_ROW_HEIGHT}px`,
      '--week-grid-hour-height': `${WEEK_GRID_HOUR_HEIGHT}px`,
      '--week-grid-time-column-width': `${WEEK_GRID_TIME_COLUMN_WIDTH}px`,
    } : {}),
  };
}
