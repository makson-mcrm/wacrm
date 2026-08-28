import { describe, expect, it } from 'vitest';
import {
  buildMissingDocumentsMessage,
  missingDocumentRequirements,
} from './document-requirements';

describe('Paczka 2 — lista braków dokumentowych', () => {
  it('wylicza braki z niezależnych pozycji checklisty', () => {
    const rows = [
      { name: 'Dowód osobisty', status: 'brak', required: true },
      { name: 'Zaświadczenie', status: 'otrzymany', required: true },
      { name: 'Wyciąg', status: 'do_poprawy', required: true },
    ];

    expect(missingDocumentRequirements(rows).map((row) => row.name)).toEqual([
      'Dowód osobisty',
      'Wyciąg',
    ]);
    expect(buildMissingDocumentsMessage(rows, 'Jan')).not.toContain(
      'Zaświadczenie'
    );
  });

  it('nie nadpisuje pozostałych pozycji po dostarczeniu jednej', () => {
    const rows = ['brak', 'brak', 'brak'].map((status, index) => ({
      name: `Dokument ${index + 1}`,
      status,
      required: true,
    }));
    const updated = rows.map((row, index) =>
      index === 1 ? { ...row, status: 'otrzymany' } : row
    );

    expect(missingDocumentRequirements(updated).map((row) => row.name)).toEqual([
      'Dokument 1',
      'Dokument 3',
    ]);
  });
});
