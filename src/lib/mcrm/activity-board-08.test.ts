import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('AKTYWNOŚĆ — plansza 08', () => {
  it('keeps the fast UX 2.1 sales flow without numbered large sections', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'),
      'utf8'
    );
    for (const label of [
      'Klient i Deal',
      'Akcja',
      'Wynik',
      'Notatka lub dyktowanie',
      'Ostatnie aktywności w tym dealu',
      'Zobacz wszystkie',
      'Odebrał',
      'Nie odebrał',
      'Oddzwonić',
      'Następny krok',
      'Termin',
      'Blocker',
    ])
      expect(source).toContain(label);
    expect(source).not.toMatch(
      /\b[1-9]\. (Wybierz|Zarejestruj|Wynik|Notatka|Następny|Zapis|Zmień)/
    );
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
    expect(source).toContain(".eq('deal_id', dealId)");
    expect(source).toContain(".order('occurred_at', { ascending: false })");
  });

  it('domyka interakcje P1c bez duplikowania zadania', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'),
      'utf8'
    );
    expect(source).toContain(
      "type ActivityView = 'new' | 'history' | 'documents' | 'tasks'"
    );
    expect(source).toContain('setCreateTask(true)');
    expect(source).toContain('id="activity-task-title"');
    expect(source).toContain('id="activity-occurred-at"');
    expect(source).toContain('occurred_at: occurredIso');
    expect(source).toContain("activity_type: 'zadanie'");
    expect(source).toContain("activity_status: 'PLANOWANE'");
    expect(source).toContain('scheduled_at: nextIso');
    expect(source).toContain('Wyślij kopię e-maila do klienta');
    expect(source).toContain(
      'toWarsawDateTimeInput(selectedDeal.next_action_at)'
    );
  });

  it('utrzymuje szybki mobile core, schowane opcje i zapis bez position fixed', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/sales/activity-board-08.tsx'),
      'utf8'
    );
    expect(source).toContain('WIĘCEJ / OPCJE');
    expect(source).toContain('data-slot="activity-mobile-save"');
    expect(source).not.toContain('sticky bottom-');
    expect(source).not.toContain('className="fixed inset-x-3');
    expect(source).toContain('var(--app-viewport-height,100dvh)');
    expect(source).toContain('env(safe-area-inset-bottom)');
    expect(source).toContain('AI: rozpoznaj z notatki');
    expect(source).toContain('activity-blocker-mobile');
    expect(source).toContain('activity-stage-mobile');
  });
});
