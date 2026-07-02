-- Index pour les queries d'anonymisation (UPDATE activity_logs WHERE entity_type/entity_id).
-- Évite un seq scan sur la table complète pour retrouver les logs d'un client.
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs(seller_id, entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- Index pour les queries par user (journal d'équipe, filtre par membre).
CREATE INDEX IF NOT EXISTS idx_activity_logs_user
  ON activity_logs(seller_id, user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ANALYZE activity_logs;
