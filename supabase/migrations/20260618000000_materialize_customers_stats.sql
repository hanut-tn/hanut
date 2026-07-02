-- Dénormaliser les stats clients dans la table customers.
-- Objectif : éliminer le recalcul d'agrégats (JOIN + GROUP BY) à chaque
-- requête de liste, qui devient critique à partir de 10 000 commandes/vendeur.
-- Un trigger maintient les colonnes à jour après chaque INSERT/UPDATE/DELETE sur orders.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS total_spent   NUMERIC       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;

-- Backfill depuis les données existantes.
UPDATE customers c
SET
  total_spent = COALESCE((
    SELECT SUM(cod_amount)
    FROM orders
    WHERE customer_id = c.id
      AND seller_id   = c.seller_id
      AND status      = 'delivered'
      AND deleted_at  IS NULL
  ), 0),
  last_order_at = (
    SELECT MAX(created_at)
    FROM orders
    WHERE customer_id = c.id
      AND seller_id   = c.seller_id
      AND deleted_at  IS NULL
  );

-- Trigger pour maintenir total_spent et last_order_at.
-- order_count est déjà maintenu par trg_update_customer_order_count.
CREATE OR REPLACE FUNCTION refresh_customer_stats(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE customers
  SET
    total_spent = COALESCE((
      SELECT SUM(cod_amount)
      FROM orders
      WHERE customer_id = p_customer_id
        AND status      = 'delivered'
        AND deleted_at  IS NULL
    ), 0),
    last_order_at = (
      SELECT MAX(created_at)
      FROM orders
      WHERE customer_id = p_customer_id
        AND deleted_at  IS NULL
    )
  WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM refresh_customer_stats(OLD.customer_id);
  END IF;

  IF TG_OP = 'INSERT'
    OR (TG_OP = 'UPDATE' AND NEW.customer_id IS DISTINCT FROM OLD.customer_id)
  THEN
    PERFORM refresh_customer_stats(NEW.customer_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION refresh_customer_stats(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_customer_stats() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_update_customer_stats ON orders;

-- Déclenché sur les colonnes qui influencent total_spent et last_order_at.
CREATE TRIGGER trg_update_customer_stats
AFTER INSERT OR UPDATE OF status, deleted_at, cod_amount, customer_id, created_at
OR DELETE
ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();

-- Recréer aussi le trigger order_count pour supporter les changements customer_id.
-- La version précédente ne suivait que deleted_at.
CREATE OR REPLACE FUNCTION update_customer_order_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.customer_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE customers
    SET order_count = GREATEST(order_count - 1, 0)
    WHERE id = OLD.customer_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.customer_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE customers
    SET order_count = order_count + 1
    WHERE id = NEW.customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION update_customer_order_count() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_update_customer_order_count ON orders;

CREATE TRIGGER trg_update_customer_order_count
AFTER INSERT OR UPDATE OF deleted_at, customer_id OR DELETE
ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_order_count();

-- Mettre à jour customers_with_stats pour lire les colonnes précalculées.
-- total_spent_calc est conservé comme alias pour la compatibilité
-- avec les queries existantes dans customers/list/route.ts.
CREATE OR REPLACE VIEW customers_with_stats WITH (security_invoker = true) AS
SELECT
  c.id,
  c.seller_id,
  c.name,
  c.phone,
  c.address,
  c.city,
  c.created_at,
  c.tags,
  c.order_count,
  c.total_spent        AS total_spent_calc,
  c.last_order_at
FROM customers c;

-- Index pour les tris par last_order_at et total_spent dans la liste clients.
CREATE INDEX IF NOT EXISTS idx_customers_seller_last_order_at
  ON customers(seller_id, last_order_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_customers_seller_total_spent
  ON customers(seller_id, total_spent DESC);
