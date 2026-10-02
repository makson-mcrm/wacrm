import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('AKTYWNOŚĆ — plansza 08', () => {
  it('keeps the full sales flow on one screen', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'),
      'utf8'
    );
    for (const label of [
      '1. Klient i Deal',
      '2. Akcja',
      '3. Wynik rozmowy',
      '4. Notatka lub dyktowanie',
      '5. Następny krok · 6. Termin · 7. Blocker',
      '9. Zmień etap lub zamknij deal',
      '10. Ostatnie aktywności w tym dealu',
      'Odebrał',
      'Nie odebrał',
      'Oddzwonić',
      'Następny krok',
      'Termin',
      'Blocker',
    ])
      expect(source).toContain(label);
  });

  it('wysyła WIADOMOŚĆ realną ścieżką WhatsApp z kontekstem Deala', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'),
      'utf8'
    );
    expect(source).toContain("fetch('/api/whatsapp/send'");
    expect(source).toContain('deal_id: selectedDeal?.id || null');
    expect(source).toContain("message_type: 'text'");
    expect(source).toContain('history_saved');
  });

  it('zapisuje wymagane tabele w kontekście konta i użytkownika', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'),
      'utf8'
    );
    expect(source).toContain("from('sales_activities').insert");
    expect(source).toContain("from('contacts')");
    expect(source).toContain("from('deals')");
    expect(source).toContain('account_id: accountId');
    expect(source).toContain('user_id: session.user.id');
    expect(source).toContain('contactUpdate.updated_at = now');
    expect(source).toContain('dealUpdate.updated_at = now');
    expect(source).toContain(
      'if (contactWrite.error) throw contactWrite.error'
    );
    expect(source).toContain('if (dealWrite.error) throw dealWrite.error');
    expect(source).toContain('{3,}$');
  });
});
