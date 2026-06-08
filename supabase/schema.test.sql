-- ============================================================
-- HANUT — Mocks CI pour PostgreSQL pur (sans Supabase)
-- À appliquer AVANT schema.sql dans le pipeline CI
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Rôles Supabase simulés (pour les GRANT/REVOKE dans les migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
END $$;

-- Schema auth simulé
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- auth.uid() retourne un UUID fixe pour les tests
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::UUID;
$$ LANGUAGE SQL;

-- auth.role() simulée (utilisée dans certaines politiques RLS)
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT 'authenticated';
$$ LANGUAGE SQL;

-- auth.jwt() simulée
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
  SELECT '{}'::JSONB;
$$ LANGUAGE SQL;
