import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

describe('Lejek sprzedaży — odbiór desktop i mobile', () => {
  it('ma filtry, sortowanie i odseparowanie danych testowych', () => {
    const page = source('src/app/(dashboard)/pipelines/page.tsx');
    for (const label of [
      'Produkt',
      'Opiekun',
      'Źródło',
      'Status',
      'Ostatnia aktywność — najnowsze',
      'Największa kwota',
      'Najbliższy next action',
      'Pokaż archiwum poza etapami 1–6',
    ]) {
      expect(page).toContain(label);
    }
    expect(page).toContain('isOperationalTestRecord');
  });

  it('ma niezależny scroll kolumn i mobilny akordeon', () => {
    const board = source('src/components/pipelines/pipeline-board.tsx');
    expect(board).toContain('pipeline-stage-scroll');
    expect(board).toContain('aria-expanded={open}');
    expect(board).toContain('max-h-[55vh]');
  });

  it('pokazuje wymagane informacje i aktywne powiązania karty', () => {
    const card = source('src/components/pipelines/deal-card.tsx');
    for (const token of [
      'probability',
      'Ostatnia aktywność:',
      '/contacts?open=',
      '/companies?open=',
      '/deals/',
      'Następnie:',
    ]) {
      expect(card).toContain(token);
    }
  });

  it('udostępnia wymagany układ nawigacji mobile', () => {
    const nav = source('src/components/layout/mobile-bottom-nav.tsx');
    for (const label of ['DZISIAJ', 'AKTYWNOŚĆ', 'DODAJ', 'KLIENCI', 'ASYSTENT']) {
      expect(nav).toContain(`label: '${label}'`);
    }
    expect(nav).not.toContain("label: 'LEJEK'");
    expect(nav).toContain('grid-cols-5');
  });
});
