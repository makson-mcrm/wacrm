import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

describe('Paczka P2 — odbiór ekranów 02, 03 i 04', () => {
  it('Klienci mają kontraktowe zakładki, kolumny, eksport i nieznany numer', () => {
    const page = source('src/app/(dashboard)/contacts/page.tsx');
    for (const label of [
      'Wszyscy',
      'Osoby',
      'Firmy',
      'Kluczowi',
      'Aktywni',
      'Eksportuj',
      'Firma / Osoba',
      'Powiązania',
      'Aktywna sprawa / etap',
      'Ostatnia aktywność',
      'Nowy kontakt / nieznany numer',
      'Na stronie:',
    ]) expect(page).toContain(label);
    expect(page).toContain('const PAGE_SIZE = 20');
    expect(page).toContain("const contactId = query.get('open')");
    expect(page).toContain('if (contactId) openDetail(contactId)');
    expect(page).toContain('isInteractiveContactRowTarget(event.target)');
  });

  it('Deal ma dokładny zestaw zakładek, stepper i karty podsumowania', () => {
    const page = source('src/app/(dashboard)/deals/[id]/page.tsx');
    for (const label of [
      "['summary', 'Podsumowanie']",
      "['activity', 'Aktywność']",
      "['banks', 'Banki']",
      "['documents', 'Dokumenty']",
      "['files', 'Pliki']",
      "['stage-history', 'Historia etapów']",
      "['assistant', 'Asystent AI']",
      'Powiązana osoba',
      'Powiązana firma',
      'Kluczowe informacje',
      'Lista dokumentów',
      'Termin główny',
      'probability',
      '/contacts?open=',
    ]) expect(page).toContain(label);
  });

  it('Lejek ma kontraktowe filtry, statystyki i odseparowanie danych testowych', () => {
    const page = source('src/app/(dashboard)/pipelines/page.tsx');
    for (const label of [
      'Produkt',
      'Tag',
      'Bank',
      'Priorytet',
      'Tylko przeterminowane',
      'Bez next action',
      'Aktywne sprawy',
      'Przychód TERAZ',
      'Przychód PÓŹNIEJ',
      'Asystent AI',
      'AI+',
      'Przeanalizuj lejek',
      'Archiwum (',
    ]) {
      expect(page).toContain(label);
    }
    expect(page).toContain('isOperationalTestRecord');
    expect(page).toContain('href="/assistant?feature=pipeline"');
    expect(page).toContain('<ChevronRight');
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
      'Ostatnia aktywność:',
      '/deals/',
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
