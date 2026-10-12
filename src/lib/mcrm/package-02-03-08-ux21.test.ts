import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (file: string) =>
  readFileSync(join(process.cwd(), file), 'utf8');

describe('kontrakt PACZKA 02/03/08 UX 2.1', () => {
  it('utrzymuje lekki preview klienta z relacjami i maksymalnie trzema Dealami', () => {
    const contact = source('src/components/contacts/contact-detail-view.tsx');
    expect(contact).toContain('Firma ({contactCompanies.length})');
    expect(contact).toContain('Współmałżonek ({spouseLinks.length})');
    expect(contact).toContain('.slice(0, 3)');
    expect(contact).toContain('PEŁNA KARTA KLIENTA');
    expect(contact).toContain('bg-emerald-900 text-white');
  });

  it('prowadzi nowy Deal w wymaganej kolejności i odrzuca kwotę niedodatnią', () => {
    const form = source('src/components/pipelines/deal-form.tsx');
    const labels = [
      'Klient *',
      'Nazwa / Temat *',
      'Kwota *',
      'Opis / Notatka *',
      'Kategoria produktu *',
      'Źródło / Namiar *',
    ];
    const positions = labels.map((label) => form.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(form).toContain('numericValue <= 0');
    expect(form).toContain("deal ? 'Zapisz zmiany' : 'UTWÓRZ'");
    expect(form).toContain('loadSpouseLinks(db, [defaultContactId])');
    expect(form).toContain("from('contact_companies')");
  });

  it('stosuje zatwierdzony UX 2.3 / 00S: widoczne etapy i trzy strefy Deala', () => {
    const deal = source('src/app/(dashboard)/deals/[id]/page.tsx');
    // 00S FINAL-PASS (09.10.2026) zastępuje nieaktualną regułę UX 2.1
    // nakazującą ukrycie siedmiostopniowego paska.
    expect(deal).toContain('aria-label="Etapy Deala"');
    expect(deal).not.toContain('className="hidden" aria-label="Etapy Deala"');
    expect(deal).toContain('orderedStages.slice(0, 7)');
    expect(deal).toContain('stage.name');
    expect(deal).toContain('aria-label="00S — trzy kolumny: kontekst, praca, wyniki"');
    expect(deal).toContain('aria-label="Kontekst sprawy"');
    expect(deal).toContain('aria-label="Główna przestrzeń pracy"');
    expect(deal).toContain('aria-label="Wyniki i szczegóły"');
    expect(deal).toContain('aria-label="Szybkie akcje Deala"');
    expect(deal).toContain('Dodaj aktywność');
    expect(deal).toContain('action=document');
  });

  it('utrzymuje szybki flow Aktywności bez numerowanych dużych sekcji', () => {
    const activity = source('src/components/sales/activity-board-08.tsx');
    expect(activity).not.toMatch(
      /\b[1-9]\. (Wybierz|Zarejestruj|Wynik|Notatka|Następny|Zapis|Zmień)/
    );
    expect(activity).not.toContain('sticky bottom-');
    expect(activity).toContain('WIĘCEJ / OPCJE');
    expect(activity).toContain('activity-blocker-mobile');
    expect(activity).toContain('activity-stage-mobile');
  });
});
