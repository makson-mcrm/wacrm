import { describe, expect, it } from 'vitest';
import {
  analyticsFact,
  buildActivityAnalytics,
  findMigrationTag,
  parseActivityAnalytics,
  serializeActivityAnalytics,
} from './activity-analytics';

const base = {
  recordedAt: '2026-04-02T10:00:00.000Z',
  channel: 'telefon',
  activityType: 'telefon',
  contactId: 'contact-1',
  companyId: 'company-1',
  dealId: 'deal-1',
};

describe('mCRM AI activity analytics', () => {
  it('records facts, missing data and no fabricated AI inference', () => {
    const payload = buildActivityAnalytics({
      ...base,
      originalNote: 'Klient chce wrócić jutro.',
      result: 'odebral',
      nextAction: 'Oddzwonić',
      nextActionAt: '2026-04-03T10:00:00.000Z',
      blocker: 'Brak dokumentu',
      productCategory: 'Hipoteka',
      customerSource: null,
      acquiredAt: '2025-12-01T08:00:00.000Z',
      migrationTag: null,
    });

    expect(payload.sales_meanings).toEqual([
      'wartosciowa_rozmowa',
      'ustalony_next_action',
    ]);
    expect(payload.evidence.ai_inferences).toEqual([]);
    expect(payload.evidence.missing_data.map((item) => item.field)).toEqual([
      'customer_source',
      'migration_tag',
    ]);
    expect(analyticsFact(payload, 'original_note')).toBe(
      'Klient chce wrócić jutro.'
    );
  });

  it('classifies no contact and a removed blocker deterministically', () => {
    const payload = buildActivityAnalytics({
      ...base,
      result: 'nie_odebral',
      nextAction: 'Ponowić telefon',
      blocker: '',
      previousBlocker: 'Brak PIT',
    });

    expect(payload.sales_meanings).toEqual([
      'brak_kontaktu',
      'ustalony_next_action',
      'usuniety_blocker',
    ]);
  });

  it('round-trips only the versioned mCRM AI structure', () => {
    const payload = buildActivityAnalytics(base);
    expect(parseActivityAnalytics(serializeActivityAnalytics(payload))).toEqual(
      payload
    );
    expect(parseActivityAnalytics('stara kategoria')).toBeNull();
  });

  it('recognizes an existing migration designation', () => {
    expect(findMigrationTag(null, 'Migracja Bigin 2025', 'polecenie')).toBe(
      'Migracja Bigin 2025'
    );
    expect(findMigrationTag('polecenie')).toBeNull();
  });
});
