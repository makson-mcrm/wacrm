import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/070_isolate_banking_knowledge_index.sql'
  ),
  'utf8'
);

describe('M4 — izolacja indeksu od globalnej wyszukiwarki', () => {
  it('wyklucza źródła wewnętrzne M4 z obu globalnych funkcji wyszukiwania', () => {
    expect(migration.match(/NOT LIKE 'google_drive_internal%'/g)).toHaveLength(
      2
    );
    expect(migration).toContain('match_ai_knowledge_fts');
    expect(migration).toContain('match_ai_knowledge_semantic');
  });

  it('zachowuje RLS przez SECURITY INVOKER i wiąże dokument z kontem', () => {
    expect(migration.match(/SECURITY INVOKER/g)).toHaveLength(2);
    expect(migration.match(/d\.account_id = c\.account_id/g)).toHaveLength(2);
    expect(migration.match(/c\.account_id = p_account_id/g)).toHaveLength(2);
  });
});

