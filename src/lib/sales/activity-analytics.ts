export const MCRM_ACTIVITY_SCHEMA = 'mcrm_ai_activity_v1' as const;

export const SALES_MEANINGS = [
  'brak_kontaktu',
  'kontakt_bez_postepu',
  'wartosciowa_rozmowa',
  'nowy_realny_temat',
  'ustalony_next_action',
  'usuniety_blocker',
  'deal_przesuniety',
  'krok_do_wniosku',
  'krok_do_decyzji',
  'krok_do_uruchomienia',
] as const;

export type SalesMeaning = (typeof SALES_MEANINGS)[number];
export type EvidenceOrigin = 'FAKT' | 'WNIOSEK_AI' | 'BRAK_DANYCH';

type Fact = {
  field: string;
  value: string | number | boolean | null;
  origin: 'FAKT';
};

type AiInference = {
  field: string;
  value: string;
  origin: 'WNIOSEK_AI';
  model?: string;
};

type MissingData = {
  field: string;
  origin: 'BRAK_DANYCH';
};

export type ActivityAnalytics = {
  schema: typeof MCRM_ACTIVITY_SCHEMA;
  recorded_at: string;
  sales_meanings: SalesMeaning[];
  evidence: {
    facts: Fact[];
    ai_inferences: AiInference[];
    missing_data: MissingData[];
  };
};

type ActivityAnalyticsInput = {
  recordedAt: string;
  channel: string;
  activityType: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  originalNote?: string | null;
  result?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  blocker?: string | null;
  previousBlocker?: string | null;
  productCategory?: string | null;
  customerSource?: string | null;
  acquiredAt?: string | null;
  migrationTag?: string | null;
};

function fact(field: string, value: Fact['value']): Fact {
  return { field, value, origin: 'FAKT' };
}

function missing(field: string): MissingData {
  return { field, origin: 'BRAK_DANYCH' };
}

export function findMigrationTag(...values: Array<string | null | undefined>) {
  return (
    values
      .find((value) => (value ? /bigin|migrac|import/i.test(value) : false))
      ?.trim() || null
  );
}

export function buildActivityAnalytics(
  input: ActivityAnalyticsInput
): ActivityAnalytics {
  const note = input.originalNote?.trim() || null;
  const result = input.result?.trim() || null;
  const nextAction = input.nextAction?.trim() || null;
  const blocker = input.blocker?.trim() || null;
  const previousBlocker = input.previousBlocker?.trim() || null;
  const salesMeanings: SalesMeaning[] = [];

  if (input.activityType === 'telefon') {
    if (result === 'nie_odebral' || result === 'oddzwonic') {
      salesMeanings.push('brak_kontaktu');
    } else if (result === 'odebral') {
      salesMeanings.push(
        note || nextAction ? 'wartosciowa_rozmowa' : 'kontakt_bez_postepu'
      );
    }
  }
  if (nextAction) salesMeanings.push('ustalony_next_action');
  if (previousBlocker && !blocker) salesMeanings.push('usuniety_blocker');

  const facts = [
    fact('occurred_at', input.recordedAt),
    fact('channel', input.channel),
    fact('activity_type', input.activityType),
    fact('contact_id', input.contactId || null),
    fact('company_id', input.companyId || null),
    fact('deal_id', input.dealId || null),
    fact('original_note', note),
    fact('result', result),
    fact('next_action', nextAction),
    fact('next_action_at', input.nextActionAt || null),
    fact('blocker', blocker),
  ];

  const optional = [
    ['product_category', input.productCategory?.trim() || null],
    ['customer_source', input.customerSource?.trim() || null],
    ['acquired_at', input.acquiredAt || null],
    ['migration_tag', input.migrationTag?.trim() || null],
  ] as const;
  const missingData: MissingData[] = [];
  for (const [field, value] of optional) {
    if (value) facts.push(fact(field, value));
    else missingData.push(missing(field));
  }

  return {
    schema: MCRM_ACTIVITY_SCHEMA,
    recorded_at: input.recordedAt,
    sales_meanings: [...new Set(salesMeanings)],
    evidence: {
      facts,
      ai_inferences: [],
      missing_data: missingData,
    },
  };
}

export function serializeActivityAnalytics(payload: ActivityAnalytics) {
  return JSON.stringify(payload);
}

export function parseActivityAnalytics(value?: string | null) {
  if (!value?.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ActivityAnalytics>;
    if (parsed.schema !== MCRM_ACTIVITY_SCHEMA) return null;
    if (!Array.isArray(parsed.sales_meanings) || !parsed.evidence) return null;
    return parsed as ActivityAnalytics;
  } catch {
    return null;
  }
}

export function analyticsFact(
  analytics: ActivityAnalytics | null,
  field: string
) {
  return analytics?.evidence.facts.find((item) => item.field === field)?.value;
}
