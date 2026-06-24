-- Purge automatique des commandes en corbeille après 90 jours
-- Conformité RGPD / loi tunisienne 2004-63 : les données PII ne doivent pas
-- être conservées indéfiniment après suppression logique.
--
-- Exceptions strictes — jamais supprimé automatiquement :
--   1. Commande avec COD encaissé non encore reversé (cod_collected=true,
--      cod_reversed=false) : montant dû en suspens, suppression empêcherait
--      le réconciliation comptable.
--   2. [Futur] Commandes en litige : aucun mécanisme de litige n'existe
--      actuellement dans le schéma. À ajouter manuellement si besoin via une
--      colonne orders.dispute_at ou un statut dédié.
--
-- Déclenchement : pg_cron — à activer dans le dashboard Supabase :
--   Database → Extensions → pg_cron → Enable
-- Puis la planification ci-dessous sera active au prochain `db reset` ou
-- après avoir exécuté manuellement le SELECT cron.schedule(...).
--
-- Autorisation requise : service_role uniquement.

CREATE OR REPLACE FUNCTION purge_trashed_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_count INTEGER := 0;
BEGIN
  IF NOT is_service_role() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  FOR v_order IN
    SELECT o.id, o.seller_id
    FROM orders o
    WHERE o.deleted_at IS NOT NULL
      AND o.deleted_at < now() - INTERVAL '90 days'
      -- Exception 1 : COD encaissé non reversé
      AND NOT EXISTS (
        SELECT 1
        FROM deliveries d
        WHERE d.order_id      = o.id
          AND d.cod_collected = true
          AND d.cod_reversed  = false
      )
    FOR UPDATE SKIP LOCKED  -- évite les conflits si plusieurs workers
  LOOP
    -- Log avant suppression (activity_logs n'a pas de FK vers orders — survivra à la cascade)
    INSERT INTO activity_logs (
      seller_id,  user_id, user_name,
      action_type, entity_type, entity_id,
      description, metadata
    )
    VALUES (
      v_order.seller_id,
      NULL,
      'système:purge_automatique',
      'order_purged',
      'order',
      v_order.id::TEXT,
      'Suppression définitive automatique (corbeille > 90 jours)',
      jsonb_build_object(
        'order_id',   v_order.id,
        'reason',     'trash_retention_90_days'
      )
    );

    -- Suppression définitive (CASCADE vers order_items, deliveries, etc.)
    DELETE FROM orders WHERE id = v_order.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION purge_trashed_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_trashed_orders() TO service_role;

-- ── Planification pg_cron ─────────────────────────────────────────────────
-- pg_cron doit être activé dans le dashboard Supabase avant que cette section
-- soit effective (Database → Extensions → pg_cron).
-- La migration échoue silencieusement si l'extension n'est pas activée —
-- un DO $$ EXCEPTION guard protège contre l'échec au premier db reset.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-trashed-orders-daily');
    PERFORM cron.schedule(
      'purge-trashed-orders-daily',
      '0 2 * * *',  -- 3h heure de Tunis (UTC+1) = 02h UTC
      'SELECT purge_trashed_orders()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron non activé : la RPC existe mais n'est pas planifiée.
  -- Activer manuellement via le dashboard Supabase puis relancer ce bloc.
  NULL;
END $$;

NOTIFY pgrst, 'reload schema';
