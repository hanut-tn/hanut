-- Historique des changements de statut des commandes (pour le suivi public)
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON order_status_history(order_id, changed_at);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_history_team_read" ON order_status_history;
DROP POLICY IF EXISTS "order_status_history_team_insert" ON order_status_history;

-- Le suivi public passe par createServiceClient, qui bypass RLS.
-- Les server actions dashboard utilisent l'utilisateur connecté : admins et opérateurs doivent pouvoir écrire l'historique.
CREATE POLICY "order_status_history_team_read" ON order_status_history FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
  );

CREATE POLICY "order_status_history_team_insert" ON order_status_history FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
    AND can_write_seller(get_seller_id())
  );
