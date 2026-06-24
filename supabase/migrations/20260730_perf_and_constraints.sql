-- Audit Sprint 2 — performance & intégrité
-- 1. Index sur activity_logs(entity_type, entity_id) pour les lookups d'historique
-- 2. Index sur orders(customer_id, created_at) pour le recalcul de last_order_at
-- 3. Contrainte carrier IS NOT NULL pour les livraisons de type 'carrier'
-- 4. Trigger update_customer_stats() réécrit en delta (O(1) sur INSERT/status-UPDATE)

-- ─── 1. Index activity_logs ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs(entity_type, entity_id);

-- ─── 2. Index orders → customer stats ─────────────────────────────────────────
-- Utilisé par refresh_customer_stats (MAX(created_at)) et par le delta-trigger (COUNT).
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
  ON orders(customer_id, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_status
  ON orders(customer_id, status)
  WHERE deleted_at IS NULL;

-- ─── 3. Contrainte carrier requis ─────────────────────────────────────────────
-- Une livraison de type 'carrier' doit toujours avoir un transporteur.
-- ON CONFLICT DO NOTHING via ADD CONSTRAINT IF NOT EXISTS (Pg 15+),
-- ou guard DO $$ RAISE si déjà présente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_carrier_required' AND conrelid = 'deliveries'::regclass
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT chk_carrier_required
      CHECK (delivery_type = 'self' OR carrier IS NOT NULL);
  END IF;
END $$;

-- ─── 4. Trigger delta update_customer_stats ────────────────────────────────────
-- Remplace la version full-scan (SUM sur tout l'historique client à chaque mutation).
-- Hot paths (INSERT, UPDATE OF status/cod_amount) → O(1) via delta arithmétique.
-- Cold paths (DELETE, soft-delete, customer_id change) → recalcul complet acceptable.

CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid        UUID;
  v_old_counts BOOLEAN;
  v_new_counts BOOLEAN;
  v_delta      NUMERIC;
BEGIN
  -- Réassignation de customer_id : recalcul complet sur les deux clients (rare).
  IF TG_OP = 'UPDATE' AND NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    PERFORM refresh_customer_stats(OLD.customer_id);
    PERFORM refresh_customer_stats(NEW.customer_id);
    RETURN NEW;
  END IF;

  v_cid        := COALESCE(NEW.customer_id, OLD.customer_id);
  v_old_counts := (TG_OP <> 'INSERT') AND OLD.status = 'delivered' AND OLD.deleted_at IS NULL;
  v_new_counts := (TG_OP <> 'DELETE') AND NEW.status = 'delivered' AND NEW.deleted_at IS NULL;

  -- delta total_spent : O(1), jamais de SUM.
  v_delta :=
    COALESCE(CASE WHEN v_new_counts THEN NEW.cod_amount ELSE 0 END, 0)
    - COALESCE(CASE WHEN v_old_counts THEN OLD.cod_amount ELSE 0 END, 0);

  IF v_delta <> 0 THEN
    UPDATE customers
    SET total_spent = GREATEST(0, total_spent + v_delta)
    WHERE id = v_cid;
  END IF;

  -- last_order_at :
  --   INSERT               → O(1) GREATEST (commande la plus récente ne peut que monter)
  --   DELETE / soft-delete / created_at change → recalcul MAX (opérations rares)
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE customers
    SET last_order_at = GREATEST(COALESCE(last_order_at, NEW.created_at), NEW.created_at)
    WHERE id = v_cid;

  ELSIF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND (
           NEW.deleted_at  IS DISTINCT FROM OLD.deleted_at
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ))
  THEN
    UPDATE customers
    SET last_order_at = (
      SELECT MAX(created_at)
      FROM orders
      WHERE customer_id = v_cid AND deleted_at IS NULL
    )
    WHERE id = v_cid;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Le trigger reste identique (colonnes ciblées déjà définies en 20260618).
-- On redéfinit pour s'assurer d'utiliser la nouvelle fonction.
DROP TRIGGER IF EXISTS trg_update_customer_stats ON orders;

CREATE TRIGGER trg_update_customer_stats
AFTER INSERT OR UPDATE OF status, deleted_at, cod_amount, customer_id, created_at
OR DELETE
ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();
