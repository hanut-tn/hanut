-- ⚠️ ORDRE IMPORTANT
-- Ce fichier doit s'exécuter APRÈS :
-- 20260602_add_team_members.sql (définit get_seller_id, can_write_seller, get_team_role)
-- Ne pas renommer ce fichier sans vérifier l'ordre alphabétique final.
--
-- ============================================================
-- Journal d'activité équipe
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL CHECK (length(trim(action_type)) > 0),
  entity_type TEXT,
  entity_id   TEXT,
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_team_read" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_team_insert" ON activity_logs;

CREATE POLICY "activity_logs_team_read" ON activity_logs FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "activity_logs_team_insert" ON activity_logs FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE INDEX IF NOT EXISTS idx_activity_logs_seller_created
  ON activity_logs(seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_seller_user
  ON activity_logs(seller_id, user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_seller_action
  ON activity_logs(seller_id, action_type);
