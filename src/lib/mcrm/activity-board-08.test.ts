import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('AKTYWNOŚĆ — plansza 08', () => {
  it('keeps the full sales flow on one screen', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'), 'utf8');
    for (const label of [
      '1. Wybierz klienta i deal',
      '2. Zarejestruj rozmowę',
      '3. Wynik rozmowy',
      '4. Zmień etap lub zamknij deal',
      '5. Zapisz aktywność',
      'Odebrał',
      'Nie odebrał',
      'Oddzwonić',
      'Następny krok',
      'Termin',
      'Blocker',
    ]) expect(source).toContain(label);
  });
});
