import { describe, expect, it } from 'vitest';
import {
  APP_SIDEBAR_WIDTH,
  APP_HEADER_HEIGHT,
  CONTENT_PADDING_X,
  CONTENT_PADDING_Y,
  SECTION_GAP,
  CARD_GAP,
  CARD_RADIUS,
  COLUMNS_THREE,
  geometryCssVars,
  type GeometryCssVars,
} from './layout-geometry';

describe('02A-5: geometria 00S', () => {
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
      APP_SIDEBAR_WIDTH: 160,
      APP_HEADER_HEIGHT: 56,
      CONTENT_PADDING_X: 24,
      CONTENT_PADDING_Y: 24,
      SECTION_GAP: 16,
      CARD_GAP: 12,
      CARD_RADIUS: 12,
      COLUMNS_THREE: 'minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr)',
    });
  });

  it('zwraca typowane zmienne CSS gotowe do dziedziczenia z shellu', () => {
    const vars: GeometryCssVars = geometryCssVars();
    expect(vars).toEqual({
      '--app-sidebar-width': '160px',
      '--app-header-height': '56px',
      '--content-pad-x': '24px',
      '--content-pad-y': '24px',
      '--section-gap': '16px',
      '--card-gap': '12px',
      '--card-radius': '12px',
      '--columns-three': COLUMNS_THREE,
    });
  });
});
