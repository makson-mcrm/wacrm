import type { CSSProperties } from 'react';

// KM3.2.23 — canonical palette. globals.css provides matching pre-hydration defaults.
export const BIGIN_TOKENS = {
  bg: '#F9FBFC',
  panel: '#093E52',
  accent: '#0B4A63',
  border: '#E0E9EE',
  row: '#FCFDFD',
  hover: '#F0F7FB',
  link: '#7EB5F4',
  surface: '#FFFFFF',
  text: '#212129',
  info: '#DFF9F3',
  panelText: '#ffffff',
  panelMuted: '#e6eef2',
} as const;

/** Applied once by RootLayout; standalone renders must include that layout. */
export const BIGIN_CSS_VARS = Object.fromEntries(
  Object.entries(BIGIN_TOKENS).map(([name, value]) => [
    `--bigin-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    value,
  ])
) as Record<`--bigin-${string}`, string>;

// Compatibility exports for existing screens; the palette has one TypeScript source.
export const BRAND_SIDEBAR_BG = BIGIN_TOKENS.panel;
export const BRAND_SIDEBAR_BG_ALT = BIGIN_TOKENS.accent;
export const BRAND_HEADER_BG = BIGIN_TOKENS.panel;
export const BRAND_SIDEBAR_ACTIVE = BIGIN_TOKENS.accent;
export const BRAND_PAGE_BG_PIPELINE = BIGIN_TOKENS.bg;
export const BRAND_PAGE_BG = BIGIN_TOKENS.surface;
export const BRAND_ROW_BG = BIGIN_TOKENS.row;
export const BRAND_BORDER = BIGIN_TOKENS.border;
export const BRAND_HOVER = BIGIN_TOKENS.hover;
export const BRAND_LINK = BIGIN_TOKENS.link;
export const BRAND_INFO_BANNER = BIGIN_TOKENS.info;

// KM3.2.25 — the shell dimensions are inherited only from <html>.
export const SIDEBAR_WIDTH = 285;
export const SIDEBAR_WIDTH_COLLAPSED = 65;
export const TOPBAR_HEIGHT = 56;
export const TOPBAR_HEIGHT_LIST = 49;
export const SHELL_CSS_VARS = {
  '--app-sidebar-width': `${SIDEBAR_WIDTH}px`,
  '--app-sidebar-width-collapsed': `${SIDEBAR_WIDTH_COLLAPSED}px`,
  '--app-topbar-height': `${TOPBAR_HEIGHT}px`,
  '--app-header-height': 'var(--app-topbar-height)',
  '--list-banner-height': '0px',
} as const satisfies CSSProperties & Record<`--${string}`, string>;

export const APP_SIDEBAR_WIDTH = SIDEBAR_WIDTH;
export const MOBILE_BREAKPOINT = 768;
export const MOBILE_STAGE_TAB_HEIGHT = 44;
// Bigin demo, 1536×1024, 05.11.2026. Content measurements remain unchanged.
export const PIPELINE_SIDEBAR_WIDTH = SIDEBAR_WIDTH;
export const PIPELINE_CONTENT_PADDING_X = 10;
export const PIPELINE_COLUMN_WIDTH = 220;
export const PIPELINE_COLUMN_GAP = 10;
export const PIPELINE_CARD_HEIGHT = 60;
export const PIPELINE_CONTENT_BACKGROUND = BRAND_PAGE_BG_PIPELINE;
export const APP_HEADER_HEIGHT = TOPBAR_HEIGHT;
// Historical Bigin list measurements, retained for existing content calculations.
export const LIST_SIDEBAR_WIDTH = SIDEBAR_WIDTH_COLLAPSED;
export const LIST_BANNER_HEIGHT = 33;
export const LIST_HEADER_HEIGHT = TOPBAR_HEIGHT_LIST;
export const LIST_TOOLBAR_HEIGHT = 56;
export const LIST_TABLE_TOP = 138;
export const LIST_ROW_HEIGHT = 32;
export const LIST_HEADER_BACKGROUND = BRAND_SIDEBAR_BG;
export const LIST_CONTENT_BACKGROUND = BRAND_PAGE_BG;
export const LIST_ROW_BACKGROUND = BRAND_ROW_BG;
export const LIST_BORDER_COLOR = BRAND_BORDER;
export const LIST_TEXT_COLOR = BIGIN_TOKENS.text;
export const LIST_FONT_SIZE = 14;
export const LIST_TABLE_HEADER_FONT_SIZE = 12;
// KM3.2.11 — card and work-week measurements, Bigin 1536×1024.
export const CARD_SIDEBAR_WIDTH = SIDEBAR_WIDTH_COLLAPSED;
export const CARD_HEADER_HEIGHT = TOPBAR_HEIGHT_LIST;
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

export type GeometryCssVars = CSSProperties & Partial<Record<keyof typeof SHELL_CSS_VARS, never>> & {
  '--content-pad-x': string;
  '--content-pad-y': string;
  '--section-gap': string;
  '--card-gap': string;
  '--card-radius': string;
  '--columns-three': string;
};

/** Content geometry only. Screens must never override the inherited shell. */
export function geometryCssVars(
  surface: 'default' | 'pipelines' | 'lists' | 'cards' | 'calendar' = 'default'
): GeometryCssVars {
  return {
    '--content-pad-x': `${surface === 'pipelines' ? PIPELINE_CONTENT_PADDING_X : CONTENT_PADDING_X}px`,
    '--content-pad-y': `${CONTENT_PADDING_Y}px`,
    '--section-gap': `${SECTION_GAP}px`,
    '--card-gap': `${CARD_GAP}px`,
    '--card-radius': `${CARD_RADIUS}px`,
    '--columns-three': COLUMNS_THREE,
    ...(surface === 'lists' ? {
      '--content-pad-x': '0px',
      '--content-pad-y': '0px',
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
      '--content-pad-x': '0px',
      '--content-pad-y': '0px',
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

/** Bigin content defaults, without route-specific shell dimensions. */
export function biginGeometryCssVars(
  surface: 'default' | 'pipelines' | 'lists' = 'default'
): CSSProperties {
  return {
    ...geometryCssVars(surface),
    '--bigin-font-size': `${LIST_FONT_SIZE}px`,
    '--bigin-nav-gap': '4px',
    '--bigin-nav-height': '64px',
    '--bigin-nav-pad-y': '8px',
    '--bigin-nav-font-size': '11px',
    '--bigin-nav-label-width': '57px',
    '--bigin-nav-summary-font-size': '9px',
    ...(surface === 'pipelines' ? {
      '--list-header-background': 'var(--bigin-panel)',
      '--pipeline-column-width': `${PIPELINE_COLUMN_WIDTH}px`,
      '--pipeline-column-gap': `${PIPELINE_COLUMN_GAP}px`,
      '--pipeline-card-height': `${PIPELINE_CARD_HEIGHT}px`,
      '--pipeline-content-background': 'var(--bigin-bg)',
    } : {}),
  } as CSSProperties;
}
