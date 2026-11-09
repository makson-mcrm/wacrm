import { describe, expect, it } from 'vitest';
import {
  APP_SIDEBAR_WIDTH,
  PIPELINE_SIDEBAR_WIDTH,
  PIPELINE_CONTENT_PADDING_X,
  APP_HEADER_HEIGHT,
  BOARD_START_X,
  CONTENT_PADDING_X,
  CONTENT_PADDING_Y,
  SECTION_GAP,
  CARD_GAP,
  CARD_RADIUS,
  COLUMNS_THREE,
  SHELL_CSS_VARS,
  geometryCssVars,
  type GeometryCssVars,
} from './layout-geometry';

describe('02A-5: geometria 00S', () => {
  it('geometria treści Lejka przy globalnej ramie Bigin wyznacza początek tablicy x=295', () => {
    expect(PIPELINE_SIDEBAR_WIDTH).toBe(285);
    expect(PIPELINE_CONTENT_PADDING_X).toBe(10);
    expect(PIPELINE_SIDEBAR_WIDTH + PIPELINE_CONTENT_PADDING_X).toBe(295);
    expect(BOARD_START_X).toBe(295);
    expect(geometryCssVars('pipelines')).toEqual({
      ...geometryCssVars(),
      '--content-pad-x': '10px',
    });
    expect(geometryCssVars('pipelines')).not.toHaveProperty('--app-sidebar-width');
    expect(geometryCssVars('pipelines')).not.toHaveProperty('--app-header-height');
  });

  it('eksportuje uzgodnione wymiary i proporcje', () => {
    expect({
      APP_SIDEBAR_WIDTH,
      APP_HEADER_HEIGHT,
      CONTENT_PADDING_X,
      CONTENT_PADDING_Y,
      SECTION_GAP,
      CARD_GAP,
      CARD_RADIUS,
      COLUMNS_THREE,
    }).toEqual({
      APP_SIDEBAR_WIDTH: 285,
      APP_HEADER_HEIGHT: 48,
      CONTENT_PADDING_X: 24,
      CONTENT_PADDING_Y: 24,
      SECTION_GAP: 16,
      CARD_GAP: 12,
      CARD_RADIUS: 12,
      COLUMNS_THREE: 'minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr)',
    });
    expect(SHELL_CSS_VARS).toMatchObject({
      '--app-sidebar-width': '285px',
      '--app-sidebar-width-collapsed': '64px',
      '--app-topbar-height': '48px',
    });
  });

  it('zwraca typowane zmienne CSS gotowe do dziedziczenia z shellu', () => {
    const vars: GeometryCssVars = geometryCssVars();
    expect(vars).toEqual({
      '--content-pad-x': '24px',
      '--content-pad-y': '24px',
      '--section-gap': '16px',
      '--card-gap': '12px',
      '--card-radius': '12px',
      '--columns-three': COLUMNS_THREE,
    });
  });
});
