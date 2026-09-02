# Production data safety

WaCRM production data lives in the hosted Supabase PostgreSQL project, not in
the Hostinger filesystem or browser storage. A deployment must never reset,
seed, truncate, or recreate the production database.

Rules for every production change:

1. Create and verify a backup/checkpoint before any destructive operation.
2. Migrations are additive by default and must preserve existing rows.
3. `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, `DELETE FROM`, and
   `ALTER TABLE ... DROP COLUMN` are blocked by `npm run check:migrations`.
4. A reviewed destructive migration may pass only after a verified backup and
   the explicit marker `-- DATA-SAFETY: BACKUP-VERIFIED` in that migration.
5. Deployment scripts may build and start the application, but must not run
   database reset, production seed, or cleanup commands.
6. UI changes must not delete CRM records as a side effect. Deletion requires
   a deliberate user action and existing authorization checks.

The local migration CI may use `supabase db reset --local` against its
throwaway container. It is never pointed at the hosted project.
