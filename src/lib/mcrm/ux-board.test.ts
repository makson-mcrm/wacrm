import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

describe('plansza UX mCRM AI 10.09', () => {
  it('utrzymuje zatwierdzony fundament nawigacji dziewięciu ekranów', () => {
    const sidebar = source('src/components/layout/sidebar.tsx');
    for (const label of [
      'DZISIAJ',
      'KLIENCI',
      'DEAL',
      'LEJEK',
      'KALENDARZ',
      'ZADANIA',
      'FINANSE',
      'AKTYWNOŚĆ',
      'ASYSTENT',
    ]) {
      expect(sidebar).toContain(`label: '${label}'`);
    }
  });

  it('nie pokazuje pustego DZISIAJ podczas ładowania albo błędu danych', () => {
    const dashboard = source('src/app/(dashboard)/dashboard/page.tsx');
    expect(dashboard).toContain('TodayLoadingState');
    expect(dashboard).toContain('TodayErrorState');
    expect(dashboard).toContain('Nie pokazujemy niepełnego planu');
    expect(dashboard).toContain(".eq('account_id', accountId)");
    expect(dashboard).toContain('warsawDayRange(date)');
    expect(dashboard).not.toContain('scheduled_at.lte.${end}');
    expect(dashboard).not.toContain(".lte('starts_at', end)");
    expect(dashboard).not.toContain('snoozed_until.lte.${end}');
  });

  it('utrzymuje zwarty mobilny DZISIAJ i pięć paneli desktopowych', () => {
    const dashboard = source('src/app/(dashboard)/dashboard/page.tsx');
    expect(dashboard).toContain('MobileTodayBoard');
    expect(dashboard).toContain('Pięć paneli roboczych mCRM AI');
    for (const label of [
      'TERAZ',
      'NASTĘPNY BLOK',
      'PÓŹNIEJ DZISIAJ',
      'Lejek sprzedaży',
      'Klient',
      'Deal',
      'Asystent AI',
    ]) {
      expect(dashboard).toContain(label);
    }
  });

  it('AKTYWNOŚĆ nie przywraca ciężkiego banera i zachowuje pięć akcji', () => {
    const activity = source('src/components/sales/quick-activity-form.tsx');
    expect(activity).not.toContain('tracking-[0.22em] text-lime-300');
    for (const label of [
      'ZADZWOŃ',
      'DYKTUJ',
      'UMÓW',
      'WIADOMOŚĆ',
      'DODAJ DOKUMENT',
      'Podsumowanie rozmowy',
      'ROZPOZNAŁEM',
      'ZAPIS',
    ]) {
      expect(activity).toContain(label);
    }
  });

  it('Klient i Deal utrzymują hierarchię akcja, kontekst, szczegóły', () => {
    const contact = source('src/components/contacts/contact-detail-view.tsx');
    const deal = source('src/app/(dashboard)/deals/[id]/page.tsx');
    for (const label of ['WIADOMOŚĆ', 'DYKTUJ', 'WIĘCEJ', '+ NOWY DEAL']) {
      expect(contact).toContain(label);
    }
    for (const label of [
      'Następny krok',
      'Termin',
      'Blocker',
      'DODAJ DOKUMENT',
      'ASYSTENT AI',
      'Szczegóły',
      'Historia',
      'Dokumenty',
    ]) {
      expect(deal).toContain(label);
    }
  });

  it('płatne funkcje AI mają jeden limonkowy kontrakt i pełny zestaw akcji', () => {
    const assistant = source(
      'src/components/assistant/deal-assistant-actions.tsx'
    );
    expect(assistant).toContain(
      "const AI_BUTTON = 'border-lime-400 bg-lime-300"
    );
    for (const label of [
      'PRZYGOTUJ MNIE',
      'KWALIFIKUJ TEMAT',
      'SPRAWDŹ KOMPLETACJĘ',
      'SPRAWDŹ WIEDZĘ BANKOWĄ',
      'PROWADŹ MNIE KROK PO KROKU',
    ]) {
      expect(assistant).toContain(label);
    }
  });
});
