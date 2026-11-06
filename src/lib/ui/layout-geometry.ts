import type { CSSProperties } from 'react';

export const APP_SIDEBAR_WIDTH = 160;
// Bigin demo, 1536×1024, 05.11.2026. Apply only to the pipeline frame.
export const PIPELINE_SIDEBAR_WIDTH = 285;
export const PIPELINE_CONTENT_PADDING_X = 10;
export const APP_HEADER_HEIGHT = 56;
// Bigin contacts, 1536×1024. Scoped to the three list routes in KM3.2.09-A2.
export const LIST_SIDEBAR_WIDTH = 65;
export const LIST_BANNER_HEIGHT = 33;
export const LIST_HEADER_HEIGHT = 49;
export const LIST_TOOLBAR_HEIGHT = 56;
export const LIST_TABLE_TOP = 138;
export const LIST_ROW_HEIGHT = 32;
export const LIST_HEADER_BACKGROUND = '#093E52';
export const LIST_CONTENT_BACKGROUND = '#FFFFFF';
export const LIST_ROW_BACKGROUND = '#FCFDFD';
export const LIST_BORDER_COLOR = '#E8ECEF';
export const LIST_TEXT_COLOR = '#212129';
export const LIST_FONT_SIZE = 14;
export const LIST_TABLE_HEADER_FONT_SIZE = 12;

export const listTableClassName = [
  'table-fixed',
  '[&_tr]:h-[var(--list-row-height)] [&_tr]:border-[var(--list-border)]',
  '[&_th]:h-[var(--list-row-height)] [&_th]:border-r [&_th]:border-[var(--list-border)]',
  '[&_th]:px-4 [&_th]:py-0 [&_th]:text-[length:var(--list-header-font-size)]',
  '[&_th]:font-normal [&_th]:text-[var(--list-text)]',
  '[&_td]:h-[var(--list-row-height)] [&_td]:truncate [&_td]:px-4 [&_td]:py-0',
  '[&_td]:text-[length:var(--list-font-size)] [&_td]:text-[var(--list-text)] [&_td]:leading-5',
  '[&_tbody_tr]:bg-[var(--list-row-background)] [&_thead_tr]:bg-[var(--list-row-background)]',
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
  surface: 'default' | 'pipelines' | 'lists' = 'default'
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
      '--list-text': LIST_TEXT_COLOR,
      '--list-font-size': `${LIST_FONT_SIZE}px`,
      '--list-header-font-size': `${LIST_TABLE_HEADER_FONT_SIZE}px`,
    } : {}),
  };
}
