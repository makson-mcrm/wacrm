-- Security hotfix: application roles do not need table-owner privileges.
-- This changes privileges only; it does not alter schema objects or customer data.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- Keep future tables fail-closed for the same owner-only privileges.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
