-- ============================================================
-- Migration 00020: Grant API role privileges
-- ============================================================
-- Newer Supabase projects default to NOT auto-exposing tables created in
-- the public schema to the Data API roles (anon, authenticated,
-- service_role) — see config.toml's auto_expose_new_tables note. None of
-- the preceding migrations granted privileges explicitly, so every table
-- was unreachable via the API even for service_role, which bypasses RLS
-- but still needs the underlying GRANT to touch a table at all.
--
-- service_role gets full access (it bypasses RLS, so this is the only gate).
-- authenticated gets full access too, gated by the RLS policies from
-- migration 00018. anon is intentionally left without table grants — every
-- anon-reachable operation in this app goes through API routes using the
-- service_role admin client (e.g. wallet auth), not direct table access.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Apply the same grants automatically to tables/sequences/functions created
-- by any future migration, so this doesn't silently regress again.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;
