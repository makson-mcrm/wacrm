export type DocumentRequirementStatus =
  | 'brak'
  | 'poproszono'
  | 'otrzymany'
  | 'do_poprawy'
  | 'zaakceptowany'
  | 'wyslany';

export type DocumentRequirement = {
  name: string;
  status: string;
  required?: boolean;
};

const MISSING_STATUSES = new Set(['brak', 'poproszono', 'do_poprawy']);

export function missingDocumentRequirements<T extends DocumentRequirement>(
  requirements: T[]
): T[] {
  return requirements.filter(
    (row) => row.required !== false && MISSING_STATUSES.has(row.status)
  );
}

export function buildMissingDocumentsMessage(
  requirements: DocumentRequirement[],
  firstName?: string
): string {
  const prefix = firstName ? `${firstName}, p` : 'P';
  const items = missingDocumentRequirements(requirements)
    .map(
      (row) =>
        `• ${row.name}${row.status === 'do_poprawy' ? ' — do poprawy' : ''}`
    )
    .join('\n');
  return `${prefix}roszę o uzupełnienie dokumentów:\n${items}\n\nTomasz Makson`;
}
