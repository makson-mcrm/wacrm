import { describe, expect, it } from 'vitest';
import {
  APP_SIDEBAR_WIDTH,
  PIPELINE_SIDEBAR_WIDTH,
  PIPELINE_CONTENT_PADDING_X,
  PIPELINE_TEAM_PANEL_WIDTH,
  PIPELINE_MOBILE_TEAM_PANEL_WIDTH,
  PIPELINE_COLUMN_WIDTH,
  PIPELINE_CARD_WIDTH,
  PIPELINE_COLUMN_PADDING,
  PIPELINE_COLUMN_GAP,
  BOARD_START_Y,
  MOBILE_TOPBAR_HEIGHT,
  MOBILE_SIDEBAR_WIDTH,
  PIPELINE_TOOLBAR_HEIGHT,
  PIPELINE_MOBILE_TOOLBAR_HEIGHT,
  PIPELINE_TOOLBAR_BUTTON_HEIGHT,
  PIPELINE_MOBILE_TOOLBAR_BUTTON_HEIGHT,
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

describe('KM3.5.1: geometria zalogowanego Bigin', () => {
  it('geometria treści Lejka przy globalnej ramie Bigin wyznacza początek tablicy x=295', () => {
    expect(PIPELINE_SIDEBAR_WIDTH).toBe(64);
    expect(PIPELINE_CONTENT_PADDING_X).toBe(10);
    expect(PIPELINE_SIDEBAR_WIDTH + PIPELINE_TEAM_PANEL_WIDTH + PIPELINE_CONTENT_PADDING_X).toBe(295);
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
      APP_SIDEBAR_WIDTH: 64,
      APP_HEADER_HEIGHT: 48,
      CONTENT_PADDING_X: 24,
      CONTENT_PADDING_Y: 24,
      SECTION_GAP: 16,
      CARD_GAP: 12,
      CARD_RADIUS: 12,
      COLUMNS_THREE: 'minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr)',
    });
    expect(SHELL_CSS_VARS).toMatchObject({
      '--app-sidebar-width': '64px',
      '--app-sidebar-width-collapsed': '64px',
      '--app-topbar-height': '48px',
    });
  });

  it('zachowuje krok 230, kartę 220 i początek y=115 dla desktopu i telefonu', () => {
    expect([PIPELINE_COLUMN_WIDTH, PIPELINE_CARD_WIDTH, PIPELINE_COLUMN_PADDING, PIPELINE_COLUMN_GAP]).toEqual([230, 220, 5, 0]);
    expect(PIPELINE_COLUMN_WIDTH - 2 * PIPELINE_COLUMN_PADDING).toBe(PIPELINE_CARD_WIDTH);
    expect(BOARD_START_Y).toBe(115);
    expect(APP_HEADER_HEIGHT + PIPELINE_TOOLBAR_HEIGHT).toBe(115);
    expect(MOBILE_TOPBAR_HEIGHT + PIPELINE_MOBILE_TOOLBAR_HEIGHT).toBe(115);
    expect([MOBILE_TOPBAR_HEIGHT, MOBILE_SIDEBAR_WIDTH]).toEqual([43, 63]);
    expect([PIPELINE_TOOLBAR_BUTTON_HEIGHT, PIPELINE_MOBILE_TOOLBAR_BUTTON_HEIGHT]).toEqual([32, 29]);
    expect(MOBILE_SIDEBAR_WIDTH + PIPELINE_MOBILE_TEAM_PANEL_WIDTH + PIPELINE_CONTENT_PADDING_X).toBe(272);
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
