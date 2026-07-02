-- Restore the SQL privileges expected by Supabase PostgREST roles.
--
-- RLS policies decide which rows authenticated users may access. PostgreSQL
-- table privileges are checked before RLS; without these grants, even the
-- service_role API key receives "permission denied for table ...".

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- service_role is a server-only secret and bypasses RLS in Supabase. It needs
-- full table access for account creation, background jobs and test cleanup.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Authenticated users receive normal DML privileges at the SQL layer. RLS
-- remains enabled and is still the mandatory row-level authorization layer.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO authenticated;
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO authenticated;

-- Keep the same behavior for tables and sequences created by future
-- migrations executed by the postgres migration role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
