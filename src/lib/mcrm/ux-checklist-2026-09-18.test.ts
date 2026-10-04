import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

describe('checklista odbiorowa UX 9 ekranów — 18.09.2026', () => {
  it('wspólny shell obsługuje telefon, tablet, klawiaturę i safe area', () => {
    const shell = source('src/app/(dashboard)/dashboard-shell.tsx');
    const nav = source('src/components/layout/mobile-bottom-nav.tsx');
    expect(shell).toContain('window.visualViewport');
    expect(shell).toContain('100dvh');
    expect(shell).toContain('safe-area-inset-bottom');
    expect(nav).toContain('md:hidden');
    expect(nav).toContain('safe-area-inset-bottom');
    expect(nav).toContain('grid-cols-5');
    expect(nav).toContain('<GlobalAdd mobile />');
  });

  it('Deal wymaga jawnego wyboru, ma akcje sterujące i kontekst nad foldem', () => {
    const quickActivity = source('src/lib/sales/quick-activity.ts');
    const deal = source('src/app/(dashboard)/deals/[id]/page.tsx');
    expect(quickActivity).toContain('activeDealCount > 1');
    for (const label of [
      'Cofnij',
      'Zmień Deal',
      '+ Nowy Deal',
      'Następny krok',
      'Termin',
      'Blocker',
    ]) {
      expect(deal).toContain(label);
    }
  });

  it('Lejek rozdziela sześć etapów i archiwum oraz ma mobilny wybór 1–6', () => {
    const page = source('src/app/(dashboard)/pipelines/page.tsx');
    const board = source('src/components/pipelines/pipeline-board.tsx');
    expect(page).toContain('active.slice(0, 6)');
    expect(page).toContain('return includeArchive ? archive');
    expect(board).toContain('Etapy lejka 1–6');
    expect(board).toContain('pipeline-stage-scroll');
  });

  it('Kalendarz ma pn–pt domyślnie, opcjonalny weekend i komplet widoków', () => {
    const calendar = source('src/app/(dashboard)/calendar/page.tsx');
    expect(calendar).toContain('showWeekends ? 7 : 5');
    expect(calendar).toContain('Pokaż weekend');
    expect(calendar).toContain("'day' | 'week' | 'month'");
  });

  it('Zadania mają pełny zestaw filtrów i klikalne relacje', () => {
    const tasks = source('src/app/(dashboard)/tasks/page.tsx');
    for (const label of [
      'Wszystkie',
      'Dziś',
      'Po terminie',
      'Następne dni',
      'Bez terminu',
      'Osoba',
      'Firma',
      'Deal',
    ]) {
      expect(tasks).toContain(label);
    }
    expect(tasks).toContain('/companies?open=');
    expect(tasks).toContain('/contacts?open=');
    expect(tasks).toContain('/deals/');
  });

  it('Finanse są jednym shellem operacyjnym z importem i zamknięciem miesiąca', () => {
    const finances = source('src/app/(dashboard)/finances/page.tsx');
    for (const label of [
      'Firma',
      'Prywatne',
      'Razem',
      'Przychody',
      'Koszty',
      'Wynik',
      'VAT',
      'Dokumenty i wyciągi',
      'Import pliku',
      'Status miesiąca',
      'ZUS',
      'PIT',
      'Historia zamknięć',
      'Zamknij miesiąc',
    ]) {
      expect(finances).toContain(label);
    }
    expect(finances).toContain("from('deal_documents')");
    expect(finances).toContain("from('sales_activities')");
    expect(finances).toContain('kalkulator prowizji');
  });

  it('Asystent wymaga jawnego kontekstu i udostępnia jego zmianę', () => {
    const assistant = source('src/app/(dashboard)/assistant/page.tsx');
    expect(assistant).toContain('Zmień kontekst');
    expect(assistant).toContain('Wybierz jawnie klienta i Deal');
    expect(assistant).toContain('nie odpowiada ogólnie bez jawnego');
    expect(assistant).not.toContain('rows[0]?.id');
  });
});
