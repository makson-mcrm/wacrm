import { describe, expect, it } from 'vitest';
import { buildDealActivityUpdate } from '@/lib/sales/quick-activity';
import { buildTodayInputs } from './existing-data';
import { buildTodayPlan } from './ranking';

describe('activity to Deal to DZISIAJ round-trip', () => {
  it('shows the selected Deal values once and links back to that exact Deal', () => {
    const now = new Date('2026-09-08T08:00:00Z');
    const update = buildDealActivityUpdate({
      nextAction: 'Dosłać dokument do banku',
      nextActionAt: '2026-09-08T07:00:00Z',
      blocker: 'Brak zaświadczenia',
      blockerSince: now.toISOString(),
    });
    const inputs = buildTodayInputs({
      now,
      deals: [{ id: 'deal-a', title: 'Hipoteka A', contact_id: 'contact-a', company_id: 'company-a', ...update }],
      activities: [{ id: 'old-activity', title: 'Stary follow-up', deal_id: 'deal-a', scheduled_at: '2026-09-07T09:00:00Z' }],
      queue: [{ id: 'queue-a', source_type: 'ALERT_CRM', status: 'NOWE', deal_id: 'deal-a', snoozed_until: '2026-09-09T09:00:00Z' }],
      priorities: [{ id: 'priority-a', position: 1, title: 'Stary zapisany priorytet', completed: false, deal_id: 'deal-a' }],
    });
    expect(inputs.candidates).toHaveLength(1);
    expect(inputs.candidates[0]).toMatchObject({ id: 'deal:deal-a', action: 'Dosłać dokument do banku', dueAt: '2026-09-08T07:00:00Z', blocker: 'Brak zaświadczenia', href: '/quick-call?deal=deal-a&contact=contact-a&company=company-a' });
    expect(buildTodayPlan({ now, candidates: inputs.candidates }).now[0]).toMatchObject({ id: 'deal:deal-a', section: 'TERAZ' });
  });
});
