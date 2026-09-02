import { execFileSync } from 'node:child_process';

const base = process.env.MIGRATION_BASE || 'HEAD';
const diff = execFileSync(
  'git',
  ['diff', '--unified=0', base, '--', 'supabase/migrations'],
  { encoding: 'utf8' }
);

const destructive =
  /\b(drop\s+table|drop\s+schema|truncate|delete\s+from|alter\s+table\b[^;]*\bdrop\s+column)\b/i;
const approval = /DATA-SAFETY:\s*BACKUP-VERIFIED/i;
const added = diff
  .split('\n')
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .map((line) => line.slice(1));

const violations = added.filter((line) => destructive.test(line));
if (violations.length > 0 && !added.some((line) => approval.test(line))) {
  console.error(
    'Blocked destructive migration. Create and verify a backup, then add ' +
      '`-- DATA-SAFETY: BACKUP-VERIFIED` to the reviewed migration.'
  );
  for (const line of violations) console.error(`  ${line.trim()}`);
  process.exit(1);
}

console.log('Migration data-safety check passed.');
