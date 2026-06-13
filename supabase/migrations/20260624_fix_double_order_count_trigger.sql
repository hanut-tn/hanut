-- Suppression du trigger en double sur customers.order_count.
--
-- PROBLÈME : schema.sql crée orders_increment_customer_count (AFTER INSERT,
-- +1 inconditionnel). La migration 20260618_materialize_customers_stats.sql
-- crée trg_update_customer_order_count (AFTER INSERT OR UPDATE OF deleted_at
-- OR DELETE, gère INSERT/UPDATE/DELETE et customer_id change).
-- Les deux coexistent → chaque nouvelle commande incrémente order_count de 2.
--
-- SOLUTION : supprimer l'ancien trigger et recalculer order_count réel.

BEGIN;

-- Ne pas supprimer l'ancien mécanisme si le trigger de remplacement n'existe
-- pas. Cette garde évite de laisser order_count sans synchronisation sur une
-- base qui aurait reçu les migrations précédentes dans un ordre incomplet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'orders'::regclass
      AND tgname = 'trg_update_customer_order_count'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION
      'trg_update_customer_order_count is required before removing the legacy trigger';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. Suppression de l'ancien trigger et sa fonction
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS orders_increment_customer_count ON orders;
DROP FUNCTION IF EXISTS increment_customer_order_count();

-- ─────────────────────────────────────────────────────────────
-- 2. Backfill — recalculer order_count réel pour tous les clients
-- ─────────────────────────────────────────────────────────────
UPDATE customers c
SET order_count = (
  SELECT COUNT(*)
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.seller_id = c.seller_id
    AND o.deleted_at IS NULL
);

COMMIT;

-- Vérification post-migration (exécuter manuellement pour confirmer) :
-- SELECT c.id, c.order_count AS stored, COUNT(o.id) AS real_count
-- FROM customers c
-- LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
-- GROUP BY c.id, c.order_count
-- HAVING c.order_count <> COUNT(o.id)
-- LIMIT 10;
-- Résultat attendu : 0 lignes.
