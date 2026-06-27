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
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin;
  END IF;
END $$;

-- Schema auth simulé
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE,
  email_confirmed_at TIMESTAMPTZ,
  raw_user_meta_data JSONB DEFAULT '{}'::JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
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

-- Schema storage simulé (pour les migrations qui INSERT INTO storage.buckets
-- et CREATE POLICY ... ON storage.objects)
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  public             BOOLEAN NOT NULL DEFAULT false,
  file_size_limit    BIGINT,
  allowed_mime_types TEXT[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id  TEXT REFERENCES storage.buckets(id) ON DELETE CASCADE,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- storage.foldername(name) — retourne les segments du chemin séparés par '/'
-- Ex : storage.foldername('abc/file.jpg') → ARRAY['abc', 'file.jpg']
CREATE OR REPLACE FUNCTION storage.foldername(name TEXT)
RETURNS TEXT[] AS $$
  SELECT string_to_array(name, '/');
$$ LANGUAGE SQL IMMUTABLE;
