import { describe, expect, it } from 'vitest';
import {
  buildBiginActiveCasesDryRun,
  type BiginActiveCaseInput,
  type ExistingBiginSnapshot,
} from './active-cases';

const existing: ExistingBiginSnapshot = {
  contacts: [
    {
      id: 'contact-grzegorz',
      name: 'Grzegorz Wilewski',
      phone: '500 600 700',
      email: 'grzegorz@example.test',
      source: 'Polecenie',
      createdAt: '2025-05-01T08:00:00.000Z',
    },
  ],
  companies: [
    {
      id: 'company-wilbud',
      name: 'Wilbud',
      nip: '123-456-32-12',
    },
    {
      id: 'company-other',
      name: 'Inna Firma',
      nip: '9999999999',
    },
  ],
  contactCompanies: [
    { contactId: 'contact-grzegorz', companyId: 'company-wilbud' },
  ],
  deals: [
    {
      id: 'deal-private',
      title: 'Hipoteka prywatna',
      contactId: 'contact-grzegorz',
      source: 'Polecenie',
    },
  ],
  stages: [
    { id: 'stage-contact', pipelineId: 'pipeline', name: '1. KONTAKT' },
    { id: 'stage-process', pipelineId: 'pipeline', name: '5. WNIOSKI' },
  ],
};

const mappings = [
  { biginStageName: 'Kontakt', targetStageId: 'stage-contact' },
  { biginStageName: 'Wnioski', targetStageId: 'stage-process' },
];

function activeCase(
  overrides: Partial<BiginActiveCaseInput> = {}
): BiginActiveCaseInput {
  return {
    externalDealId: 'BIGIN-DEAL-1',
    dealTitle: 'Finansowanie firmowe',
    stageName: 'Wnioski',
    contact: {
      externalId: 'BIGIN-CONTACT-1',
      name: 'Grzegorz Wilewski',
      phone: '+48 500 600 700',
      email: 'GRZEGORZ@example.test',
      acquiredAt: '2024-02-03T10:00:00+01:00',
      originalSource: 'Rekomendacja',
    },
    company: {
      externalId: 'BIGIN-COMPANY-1',
      name: 'Wilbud',
      nip: '1234563212',
    },
    productCategory: 'Kredyt firmowy',
    nextAction: 'Uzupełnić dokumenty',
    nextActionAt: '2026-09-15T09:00:00+02:00',
    history: [
      {
        text: 'Klient przesłał pierwszą część dokumentów.',
        occurredAt: '2026-08-20T12:00:00+02:00',
      },
    ],
    ...overrides,
  };
}

describe('Bigin active-cases dry-run', () => {
  it('recognizes Grzegorz and creates a separate firm Deal', () => {
    const report = buildBiginActiveCasesDryRun({
      cases: [activeCase()],
      existing,
      stageMappings: mappings,
      now: new Date('2026-09-08T10:00:00Z'),
    });

    expect(report.canImport).toBe(true);
    expect(report.willMerge).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: 'contact',
          targetId: 'contact-grzegorz',
        }),
        expect.objectContaining({
          entity: 'company',
          targetId: 'company-wilbud',
        }),
      ])
    );
    expect(report.willCreate).toContainEqual(
      expect.objectContaining({ entity: 'deal' })
    );
    expect(report.cases[0].proposed.deal.values).toMatchObject({
      contact_id: 'contact-grzegorz',
      company_id: 'company-wilbud',
      source: 'Bigin',
      lead_source: 'Rekomendacja',
      stage_id: 'stage-process',
    });
    expect(report.cases[0].proposed.kpi).toEqual({
      countAsNewLead: false,
      countAsNewDeal: false,
    });
    expect(report.cases[0].proposed.contact.values).not.toHaveProperty(
      'source'
    );
  });

  it('keeps several Deals for one Contact as separate records', () => {
    const report = buildBiginActiveCasesDryRun({
      cases: [
        activeCase(),
        activeCase({
          externalDealId: 'BIGIN-DEAL-2',
          dealTitle: 'Leasing firmowy',
        }),
      ],
      existing,
      stageMappings: mappings,
    });

    expect(
      report.willCreate.filter((item) => item.entity === 'deal')
    ).toHaveLength(2);
    expect(
      report.cases.map((item) => item.proposed.deal.values.contact_id)
    ).toEqual(['contact-grzegorz', 'contact-grzegorz']);
  });

  it('creates one Contact for repeated new-person rows in the same file', () => {
    const first = activeCase({
      externalDealId: 'BIGIN-NEW-1',
      contact: {
        externalId: 'BIGIN-NEW-CONTACT',
        name: 'Nowa Osoba',
        phone: '+48 511 222 333',
      },
      company: null,
    });
    const report = buildBiginActiveCasesDryRun({
      cases: [first, { ...first, externalDealId: 'BIGIN-NEW-2' }],
      existing,
      stageMappings: mappings,
    });

    expect(
      report.willCreate.filter((item) => item.entity === 'contact')
    ).toHaveLength(1);
    expect(report.cases.map((item) => item.proposed.contact.targetId)).toEqual([
      '@new-contact:BIGIN-NEW-1',
      '@new-contact:BIGIN-NEW-1',
    ]);
    expect(
      report.willCreate.filter((item) => item.entity === 'deal')
    ).toHaveLength(2);
  });

  it('uses exact name plus Company only when strong identifiers are absent', () => {
    const report = buildBiginActiveCasesDryRun({
      cases: [
        activeCase({
          contact: { name: 'Grzegorz Wilewski' },
        }),
      ],
      existing,
      stageMappings: mappings,
    });

    expect(report.cases[0].actions).toContainEqual(
      expect.objectContaining({
        entity: 'contact',
        disposition: 'merge',
        targetId: 'contact-grzegorz',
      })
    );
  });

  it('requires a decision for a similar Deal without a Bigin marker', () => {
    const report = buildBiginActiveCasesDryRun({
      cases: [
        activeCase({
          externalDealId: 'BIGIN-NEW-ID',
          dealTitle: 'Hipoteka prywatna',
          company: null,
        }),
      ],
      existing,
      stageMappings: mappings,
    });

    expect(report.canImport).toBe(false);
    expect(report.requiresDecision).toContainEqual(
      expect.objectContaining({ entity: 'deal', targetId: 'deal-private' })
    );
  });

  it('reports a Deal/Firma conflict instead of silently relinking', () => {
    const withImportedDeal: ExistingBiginSnapshot = {
      ...existing,
      deals: [
        ...existing.deals,
        {
          id: 'deal-bigin',
          title: 'Finansowanie firmowe',
          contactId: 'contact-grzegorz',
          companyId: 'company-other',
          sourceDetails:
            '[MIGRATION:Bigin;entity=deal;external_id=BIGIN-DEAL-1]',
        },
      ],
    };
    const report = buildBiginActiveCasesDryRun({
      cases: [activeCase()],
      existing: withImportedDeal,
      stageMappings: mappings,
    });

    expect(report.canImport).toBe(false);
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({
        entity: 'deal',
        reason: 'Deal Bigin wskazuje inną istniejącą Firmę.',
      })
    );
  });

  it('blocks missing stage mappings and duplicate Bigin Deal ids', () => {
    const report = buildBiginActiveCasesDryRun({
      cases: [activeCase(), activeCase()],
      existing,
      stageMappings: [],
    });

    expect(report.canImport).toBe(false);
    expect(
      report.requiresDecision.some((item) => item.entity === 'stage')
    ).toBe(true);
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({ entity: 'deal' })
    );
  });
});
