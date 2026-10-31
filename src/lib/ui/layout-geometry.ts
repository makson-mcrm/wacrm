import type { CSSProperties } from 'react';

export const APP_SIDEBAR_WIDTH = 160;
export const APP_HEADER_HEIGHT = 56;
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
export function geometryCssVars(): GeometryCssVars {
  return {
    '--app-sidebar-width': `${APP_SIDEBAR_WIDTH}px`,
    '--app-header-height': `${APP_HEADER_HEIGHT}px`,
    '--content-pad-x': `${CONTENT_PADDING_X}px`,
    '--content-pad-y': `${CONTENT_PADDING_Y}px`,
    '--section-gap': `${SECTION_GAP}px`,
    '--card-gap': `${CARD_GAP}px`,
    '--card-radius': `${CARD_RADIUS}px`,
    '--columns-three': COLUMNS_THREE,
  };
}
