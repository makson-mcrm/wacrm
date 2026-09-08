export type DryRunDisposition =
  'merge' | 'create' | 'requires_decision' | 'conflict';

export type MigrationEntity = 'contact' | 'company' | 'deal' | 'stage';

export interface BiginContactInput {
  externalId?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  acquiredAt?: string | null;
  originalSource?: string | null;
}

export interface BiginCompanyInput {
  externalId?: string | null;
  name: string;
  nip?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface BiginHistoryInput {
  text: string;
  occurredAt?: string | null;
}

export interface BiginActiveCaseInput {
  externalDealId?: string | null;
  dealTitle: string;
  stageName: string;
  contact: BiginContactInput;
  company?: BiginCompanyInput | null;
  productCategory?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  notes?: string | null;
  history?: BiginHistoryInput[];
  acquiredAt?: string | null;
  originalSource?: string | null;
}

export interface ExistingContactForBigin {
  id: string;
  phone?: string | null;
  phoneNormalized?: string | null;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  source?: string | null;
  sourceDetails?: string | null;
  createdAt?: string | null;
}

export interface ExistingCompanyForBigin {
  id: string;
  name: string;
  nip?: string | null;
  nipNormalized?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface ExistingDealForBigin {
  id: string;
  title: string;
  contactId?: string | null;
  companyId?: string | null;
  source?: string | null;
  sourceDetails?: string | null;
  productType?: string | null;
  dealType?: string | null;
  createdAt?: string | null;
}

export interface ExistingStageForBigin {
  id: string;
  pipelineId: string;
  name: string;
}

export interface ExistingBiginSnapshot {
  contacts: ExistingContactForBigin[];
  companies: ExistingCompanyForBigin[];
  deals: ExistingDealForBigin[];
  stages: ExistingStageForBigin[];
  contactCompanies: Array<{ contactId: string; companyId: string }>;
}

export interface BiginStageMapping {
  biginStageName: string;
  targetStageId: string;
}

export interface DryRunAction {
  caseKey: string;
  entity: MigrationEntity;
  disposition: DryRunDisposition;
  targetId?: string;
  label: string;
  reason: string;
}

export interface ProposedBiginRows {
  contact: {
    targetId?: string;
    values: Record<string, unknown>;
  };
  company?: {
    targetId?: string;
    values: Record<string, unknown>;
  };
  deal: {
    targetId?: string;
    values: Record<string, unknown>;
  };
  dealNotes: Array<Record<string, unknown>>;
  links: {
    contactCompany: boolean;
    dealContact: true;
  };
  kpi: {
    countAsNewLead: false;
    countAsNewDeal: false;
  };
}

export interface BiginCaseDryRun {
  caseKey: string;
  readyToWrite: boolean;
  actions: DryRunAction[];
  proposed: ProposedBiginRows;
}

export interface BiginDryRunReport {
  generatedAt: string;
  source: 'Bigin';
  canImport: boolean;
  cases: BiginCaseDryRun[];
  summary: Record<DryRunDisposition, number>;
  willMerge: DryRunAction[];
  willCreate: DryRunAction[];
  requiresDecision: DryRunAction[];
  conflicts: DryRunAction[];
}

type ContactResolution = {
  disposition: DryRunDisposition;
  target?: ExistingContactForBigin;
  targetId?: string;
  reason: string;
};

type CompanyResolution = {
  disposition: DryRunDisposition;
  target?: ExistingCompanyForBigin;
  targetId?: string;
  reason: string;
};

type DealResolution = {
  disposition: DryRunDisposition;
  target?: ExistingDealForBigin;
  targetId?: string;
  reason: string;
};

export function buildBiginActiveCasesDryRun(input: {
  cases: BiginActiveCaseInput[];
  existing: ExistingBiginSnapshot;
  stageMappings: BiginStageMapping[];
  now?: Date;
}): BiginDryRunReport {
  const plannedContacts = new Map<string, string>();
  const plannedCompanies = new Map<string, string>();
  const seenDealIds = new Set<string>();
  const caseReports = input.cases.map((activeCase, index) => {
    const caseKey = activeCase.externalDealId?.trim() || `row-${index + 1}`;
    const contact = resolveContact(
      activeCase,
      input.existing,
      plannedContacts,
      caseKey
    );
    const company = resolveCompany(
      activeCase.company,
      input.existing,
      plannedCompanies,
      caseKey
    );
    const stage = resolveStage(
      activeCase.stageName,
      input.existing.stages,
      input.stageMappings,
      caseKey
    );
    const deal = resolveDeal({
      activeCase,
      existing: input.existing,
      contact,
      company,
      seenDealIds,
      caseKey,
    });

    if (activeCase.externalDealId?.trim())
      seenDealIds.add(activeCase.externalDealId.trim());

    const actions: DryRunAction[] = [
      action(caseKey, 'contact', contact, contactLabel(activeCase.contact)),
      ...(activeCase.company
        ? [action(caseKey, 'company', company, activeCase.company.name)]
        : []),
      stage.action,
      action(caseKey, 'deal', deal, activeCase.dealTitle),
    ];
    const readyToWrite = actions.every(
      (item) => item.disposition === 'merge' || item.disposition === 'create'
    );

    return {
      caseKey,
      readyToWrite,
      actions,
      proposed: proposedRows(activeCase, contact, company, deal, stage.stageId),
    };
  });

  const actions = caseReports.flatMap((item) => item.actions);
  const select = (disposition: DryRunDisposition) =>
    actions.filter((item) => item.disposition === disposition);
  const willMerge = select('merge');
  const willCreate = select('create');
  const requiresDecision = select('requires_decision');
  const conflicts = select('conflict');

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    source: 'Bigin',
    canImport: caseReports.every((item) => item.readyToWrite),
    cases: caseReports,
    summary: {
      merge: willMerge.length,
      create: willCreate.length,
      requires_decision: requiresDecision.length,
      conflict: conflicts.length,
    },
    willMerge,
    willCreate,
    requiresDecision,
    conflicts,
  };
}

function resolveContact(
  activeCase: BiginActiveCaseInput,
  existing: ExistingBiginSnapshot,
  planned: Map<string, string>,
  caseKey: string
): ContactResolution {
  const candidate = activeCase.contact;
  const phoneKeys = identityPhoneKeys(candidate.phone);
  const email = normalizeEmail(candidate.email);
  const phoneMatches = unique(
    existing.contacts.filter((contact) =>
      intersects(
        phoneKeys,
        identityPhoneKeys(contact.phoneNormalized || contact.phone)
      )
    )
  );
  const emailMatches = unique(
    email
      ? existing.contacts.filter(
          (contact) => normalizeEmail(contact.email) === email
        )
      : []
  );

  if (phoneMatches.length > 1 || emailMatches.length > 1)
    return {
      disposition: 'requires_decision',
      reason: 'Więcej niż jeden Kontakt pasuje do silnego identyfikatora.',
    };

  if (
    phoneMatches[0] &&
    emailMatches[0] &&
    phoneMatches[0].id !== emailMatches[0].id
  )
    return {
      disposition: 'conflict',
      reason: 'Telefon i e-mail wskazują dwa różne istniejące Kontakty.',
    };

  const strongMatch = phoneMatches[0] || emailMatches[0];
  if (strongMatch) {
    const conflicts = contactFieldConflicts(candidate, strongMatch);
    if (conflicts.length)
      return {
        disposition: 'requires_decision',
        target: strongMatch,
        targetId: strongMatch.id,
        reason: `Kontakt pasuje, ale różnią się pola: ${conflicts.join(', ')}.`,
      };
    return {
      disposition: 'merge',
      target: strongMatch,
      targetId: strongMatch.id,
      reason: phoneMatches[0]
        ? 'Zgodny numer telefonu — MERGE do istniejącego Kontaktu.'
        : 'Zgodny adres e-mail — MERGE do istniejącego Kontaktu.',
    };
  }

  const companyIds = companyCandidateIds(activeCase.company, existing);
  const name = normalizeName(contactLabel(candidate));
  const auxiliaryMatches = name
    ? existing.contacts.filter((contact) => {
        if (normalizeName(contactLabel(contact)) !== name) return false;
        if (!companyIds.size) return false;
        return existing.contactCompanies.some(
          (link) =>
            link.contactId === contact.id && companyIds.has(link.companyId)
        );
      })
    : [];

  if (auxiliaryMatches.length === 1) {
    const target = auxiliaryMatches[0];
    if (phoneKeys.size || email)
      return {
        disposition: 'requires_decision',
        target,
        targetId: target.id,
        reason:
          'Imię/nazwisko i Firma pasują, ale podany telefon/e-mail nie potwierdza Kontaktu.',
      };
    return {
      disposition: 'merge',
      target,
      targetId: target.id,
      reason: 'Dokładne imię/nazwisko + Firma — pomocniczy MERGE.',
    };
  }
  if (auxiliaryMatches.length > 1)
    return {
      disposition: 'requires_decision',
      reason: 'Imię/nazwisko + Firma pasują do kilku Kontaktów.',
    };

  const identityKey = contactIdentityKey(candidate, activeCase.company);
  if (!identityKey)
    return {
      disposition: 'requires_decision',
      reason: 'Brak telefonu, e-maila albo pełnego imienia/nazwiska z Firmą.',
    };
  const plannedId = planned.get(identityKey);
  if (plannedId)
    return {
      disposition: 'merge',
      targetId: plannedId,
      reason: 'Ten sam Kontakt występuje już w tym pliku — jeden nowy rekord.',
    };

  const targetId = `@new-contact:${caseKey}`;
  planned.set(identityKey, targetId);
  return {
    disposition: 'create',
    targetId,
    reason: 'Brak zgodnego Kontaktu — przygotowano utworzenie.',
  };
}

function resolveCompany(
  candidate: BiginCompanyInput | null | undefined,
  existing: ExistingBiginSnapshot,
  planned: Map<string, string>,
  caseKey: string
): CompanyResolution {
  if (!candidate)
    return { disposition: 'merge', reason: 'Sprawa nie wskazuje Firmy.' };
  const nip = digits(candidate.nip);
  const name = normalizeName(candidate.name);
  const nipMatches = nip
    ? existing.companies.filter(
        (company) => digits(company.nipNormalized || company.nip) === nip
      )
    : [];
  const nameMatches = existing.companies.filter(
    (company) => normalizeName(company.name) === name
  );

  if (nipMatches.length > 1 || nameMatches.length > 1)
    return {
      disposition: 'requires_decision',
      reason: 'Więcej niż jedna Firma pasuje do NIP-u lub nazwy.',
    };
  if (nipMatches[0] && nameMatches[0] && nipMatches[0].id !== nameMatches[0].id)
    return {
      disposition: 'conflict',
      reason: 'NIP i nazwa wskazują dwie różne Firmy.',
    };

  const target = nipMatches[0] || nameMatches[0];
  if (target) {
    if (nip && target.nip && digits(target.nip) !== nip)
      return {
        disposition: 'conflict',
        target,
        targetId: target.id,
        reason: 'Ta sama nazwa Firmy ma inny NIP.',
      };
    return {
      disposition: 'merge',
      target,
      targetId: target.id,
      reason: nipMatches[0]
        ? 'Zgodny NIP — MERGE do istniejącej Firmy.'
        : 'Zgodna pełna nazwa — MERGE do istniejącej Firmy.',
    };
  }

  const identityKey = nip ? `nip:${nip}` : `name:${name}`;
  const plannedId = planned.get(identityKey);
  if (plannedId)
    return {
      disposition: 'merge',
      targetId: plannedId,
      reason: 'Ta sama Firma występuje już w tym pliku — jeden nowy rekord.',
    };
  const targetId = `@new-company:${caseKey}`;
  planned.set(identityKey, targetId);
  return {
    disposition: 'create',
    targetId,
    reason: 'Brak zgodnej Firmy — przygotowano utworzenie.',
  };
}

function resolveStage(
  stageName: string,
  stages: ExistingStageForBigin[],
  mappings: BiginStageMapping[],
  caseKey: string
): { stageId?: string; action: DryRunAction } {
  const mapping = mappings.find(
    (item) => normalizeName(item.biginStageName) === normalizeName(stageName)
  );
  const stage = mapping
    ? stages.find((item) => item.id === mapping.targetStageId)
    : undefined;
  if (!mapping || !stage)
    return {
      action: {
        caseKey,
        entity: 'stage',
        disposition: 'requires_decision',
        label: stageName || 'Brak etapu',
        reason: 'Brak potwierdzonego mapowania etapu Bigin do mCRM AI.',
      },
    };
  return {
    stageId: stage.id,
    action: {
      caseKey,
      entity: 'stage',
      disposition: 'merge',
      targetId: stage.id,
      label: `${stageName} → ${stage.name}`,
      reason: 'Etap ma jawne mapowanie zaakceptowane przed importem.',
    },
  };
}

function resolveDeal(input: {
  activeCase: BiginActiveCaseInput;
  existing: ExistingBiginSnapshot;
  contact: ContactResolution;
  company: CompanyResolution;
  seenDealIds: Set<string>;
  caseKey: string;
}): DealResolution {
  const externalId = input.activeCase.externalDealId?.trim();
  if (!externalId)
    return {
      disposition: 'requires_decision',
      reason: 'Brak trwałego identyfikatora Deala z Bigin.',
    };
  if (input.seenDealIds.has(externalId))
    return {
      disposition: 'conflict',
      reason: 'Ten sam identyfikator Deala Bigin występuje kilka razy w pliku.',
    };

  const marked = input.existing.deals.filter((deal) =>
    hasBiginMarker(deal.sourceDetails, 'deal', externalId)
  );
  if (marked.length > 1)
    return {
      disposition: 'conflict',
      reason:
        'Identyfikator Deala Bigin jest przypisany do kilku Deali mCRM AI.',
    };
  if (marked[0]) {
    const conflict = dealRelationConflict(
      marked[0],
      input.contact,
      input.company
    );
    if (conflict)
      return {
        disposition: 'conflict',
        target: marked[0],
        targetId: marked[0].id,
        reason: conflict,
      };
    return {
      disposition: 'merge',
      target: marked[0],
      targetId: marked[0].id,
      reason: 'Zgodny identyfikator Bigin — MERGE do tego samego Deala.',
    };
  }

  const possible = input.existing.deals.filter((deal) => {
    if (normalizeName(deal.title) !== normalizeName(input.activeCase.dealTitle))
      return false;
    const contactMatches =
      !input.contact.targetId || deal.contactId === input.contact.targetId;
    const companyMatches =
      !input.activeCase.company ||
      !input.company.targetId ||
      deal.companyId === input.company.targetId;
    return contactMatches && companyMatches;
  });
  if (possible.length)
    return {
      disposition: 'requires_decision',
      target: possible.length === 1 ? possible[0] : undefined,
      targetId: possible.length === 1 ? possible[0].id : undefined,
      reason:
        'Podobny Deal istnieje, ale bez identyfikatora Bigin — nie scalamy automatycznie.',
    };

  return {
    disposition: 'create',
    targetId: `@new-deal:${input.caseKey}`,
    reason:
      'Nowy identyfikator Bigin — utwórz osobny Deal, nawet jeśli Kontakt ma inne Deale.',
  };
}

function proposedRows(
  activeCase: BiginActiveCaseInput,
  contact: ContactResolution,
  company: CompanyResolution,
  deal: DealResolution,
  stageId?: string
): ProposedBiginRows {
  const acquiredAt =
    validIso(activeCase.contact.acquiredAt) ||
    validIso(activeCase.acquiredAt) ||
    null;
  const originalSource =
    activeCase.contact.originalSource?.trim() ||
    activeCase.originalSource?.trim() ||
    null;
  const contactMarker = migrationMarker(
    'contact',
    activeCase.contact.externalId || activeCase.externalDealId || 'unknown',
    originalSource
  );
  const dealMarker = migrationMarker(
    'deal',
    activeCase.externalDealId || 'unknown',
    originalSource
  );
  const contactName = contactLabel(activeCase.contact);

  const contactValues = compact({
    name: missing(contact.target?.name) ? contactName : undefined,
    first_name: missing(contact.target?.firstName)
      ? activeCase.contact.firstName?.trim()
      : undefined,
    last_name: missing(contact.target?.lastName)
      ? activeCase.contact.lastName?.trim()
      : undefined,
    phone: missing(contact.target?.phone)
      ? activeCase.contact.phone?.trim()
      : undefined,
    email: missing(contact.target?.email)
      ? normalizeEmail(activeCase.contact.email)
      : undefined,
    source: missing(contact.target?.source) ? 'Bigin' : undefined,
    source_details: appendMarker(contact.target?.sourceDetails, contactMarker),
    created_at: earlierDate(contact.target?.createdAt, acquiredAt),
  });

  const companyMarker = migrationMarker(
    'company',
    activeCase.company?.externalId || activeCase.externalDealId || 'unknown',
    originalSource
  );
  const companyValues = activeCase.company
    ? compact({
        name: activeCase.company.name.trim(),
        nip: missing(company.target?.nip)
          ? activeCase.company.nip?.trim()
          : undefined,
        phone: missing(company.target?.phone)
          ? activeCase.company.phone?.trim()
          : undefined,
        email: missing(company.target?.email)
          ? normalizeEmail(activeCase.company.email)
          : undefined,
        notes: appendMarker(company.target?.notes, companyMarker),
      })
    : undefined;

  const dealValues = compact({
    title: activeCase.dealTitle.trim(),
    contact_id: contact.targetId,
    company_id: activeCase.company ? company.targetId : undefined,
    stage_id: stageId,
    source: missing(deal.target?.source) ? 'Bigin' : undefined,
    source_details: appendMarker(deal.target?.sourceDetails, dealMarker),
    lead_source: originalSource,
    product_type: missing(deal.target?.productType)
      ? activeCase.productCategory?.trim()
      : undefined,
    next_action: activeCase.nextAction?.trim(),
    next_action_at: validIso(activeCase.nextActionAt),
    notes: activeCase.notes?.trim(),
    created_at: earlierDate(deal.target?.createdAt, acquiredAt),
    status: deal.disposition === 'create' ? 'open' : undefined,
  });

  return {
    contact: { targetId: contact.targetId, values: contactValues },
    ...(companyValues
      ? { company: { targetId: company.targetId, values: companyValues } }
      : {}),
    deal: { targetId: deal.targetId, values: dealValues },
    dealNotes: (activeCase.history ?? [])
      .filter((item) => item.text.trim())
      .map((item) =>
        compact({
          deal_id: deal.targetId,
          note_text: item.text.trim(),
          created_at: validIso(item.occurredAt) || acquiredAt,
        })
      ),
    links: {
      contactCompany: Boolean(activeCase.company),
      dealContact: true,
    },
    kpi: { countAsNewLead: false, countAsNewDeal: false },
  };
}

function action(
  caseKey: string,
  entity: MigrationEntity,
  resolution: ContactResolution | CompanyResolution | DealResolution,
  label: string
): DryRunAction {
  return {
    caseKey,
    entity,
    disposition: resolution.disposition,
    targetId: resolution.targetId,
    label,
    reason: resolution.reason,
  };
}

function companyCandidateIds(
  company: BiginCompanyInput | null | undefined,
  existing: ExistingBiginSnapshot
): Set<string> {
  if (!company) return new Set();
  const nip = digits(company.nip);
  const name = normalizeName(company.name);
  return new Set(
    existing.companies
      .filter(
        (item) =>
          (nip && digits(item.nipNormalized || item.nip) === nip) ||
          normalizeName(item.name) === name
      )
      .map((item) => item.id)
  );
}

function dealRelationConflict(
  deal: ExistingDealForBigin,
  contact: ContactResolution,
  company: CompanyResolution
): string | null {
  if (
    deal.contactId &&
    contact.targetId &&
    !contact.targetId.startsWith('@') &&
    deal.contactId !== contact.targetId
  )
    return 'Deal Bigin wskazuje inny istniejący Kontakt.';
  if (
    deal.companyId &&
    company.targetId &&
    !company.targetId.startsWith('@') &&
    deal.companyId !== company.targetId
  )
    return 'Deal Bigin wskazuje inną istniejącą Firmę.';
  return null;
}

function contactFieldConflicts(
  candidate: BiginContactInput,
  existing: ExistingContactForBigin
): string[] {
  const conflicts: string[] = [];
  if (
    candidate.phone &&
    existing.phone &&
    !intersects(
      identityPhoneKeys(candidate.phone),
      identityPhoneKeys(existing.phone)
    )
  )
    conflicts.push('telefon');
  if (
    candidate.email &&
    existing.email &&
    normalizeEmail(candidate.email) !== normalizeEmail(existing.email)
  )
    conflicts.push('e-mail');
  return conflicts;
}

function contactIdentityKey(
  contact: BiginContactInput,
  company?: BiginCompanyInput | null
): string | null {
  const phone = [...identityPhoneKeys(contact.phone)][0];
  if (phone) return `phone:${phone}`;
  const email = normalizeEmail(contact.email);
  if (email) return `email:${email}`;
  const name = normalizeName(contactLabel(contact));
  const companyName = normalizeName(company?.name);
  return name && companyName ? `name-company:${name}:${companyName}` : null;
}

function identityPhoneKeys(value?: string | null): Set<string> {
  const normalized = digits(value);
  if (!normalized) return new Set();
  const keys = new Set([normalized]);
  if (normalized.length === 9) keys.add(`48${normalized}`);
  if (normalized.length === 11 && normalized.startsWith('48'))
    keys.add(normalized.slice(2));
  if (normalized.length === 13 && normalized.startsWith('0048'))
    keys.add(normalized.slice(4));
  return keys;
}

function migrationMarker(
  entity: 'contact' | 'company' | 'deal',
  externalId: string,
  originalSource?: string | null
) {
  const source = originalSource
    ? `;original_source=${safe(originalSource)}`
    : '';
  return `[MIGRATION:Bigin;entity=${entity};external_id=${safe(externalId)}${source}]`;
}

function hasBiginMarker(
  sourceDetails: string | null | undefined,
  entity: 'deal',
  externalId: string
) {
  return Boolean(
    sourceDetails?.includes(
      `[MIGRATION:Bigin;entity=${entity};external_id=${safe(externalId)}`
    )
  );
}

function appendMarker(existing: string | null | undefined, marker: string) {
  if (existing?.includes(marker)) return existing;
  return [existing?.trim(), marker].filter(Boolean).join('\n');
}

function earlierDate(
  current: string | null | undefined,
  imported: string | null | undefined
) {
  if (!imported) return undefined;
  if (!current) return imported;
  return +new Date(imported) < +new Date(current) ? imported : undefined;
}

function validIso(value?: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(+date) ? null : date.toISOString();
}

function contactLabel(contact: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    contact.name?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    'Kontakt bez nazwy'
  );
}

function compact(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function missing(value: unknown) {
  return value == null || (typeof value === 'string' && !value.trim());
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLocaleLowerCase('pl-PL') || '';
}

function normalizeName(value?: string | null) {
  return (
    value
      ?.trim()
      .toLocaleLowerCase('pl-PL')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ') || ''
  );
}

function digits(value?: string | null) {
  return value?.replace(/\D/g, '') || '';
}

function intersects(left: Set<string>, right: Set<string>) {
  return [...left].some((value) => right.has(value));
}

function unique<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function safe(value: string) {
  return value.replace(/[\]\n\r;]/g, '_').trim();
}
