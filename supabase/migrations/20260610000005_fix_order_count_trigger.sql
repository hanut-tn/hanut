-- Synchroniser customers.order_count avec le nombre réel de commandes actives.
-- "Active" = deleted_at IS NULL.

-- Étape 1 : Recalculer order_count pour tous les clients existants (corriger les valeurs stale).
UPDATE customers c
SET order_count = (
  SELECT COUNT(*)
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.deleted_at IS NULL
);

-- Étape 2 : Créer la fonction trigger.
CREATE OR REPLACE FUNCTION update_customer_order_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INSERT d'une nouvelle commande active.
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE customers
    SET order_count = order_count + 1
    WHERE id = NEW.customer_id;

  -- DELETE définitif d'une commande encore active.
  -- Si la commande était déjà en corbeille, le compteur a déjà été décrémenté
  -- au moment du soft-delete : ne pas décrémenter une seconde fois.
  ELSIF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE customers
    SET order_count = GREATEST(order_count - 1, 0)
    WHERE id = OLD.customer_id;

  -- UPDATE : gestion du soft-delete et de la restauration.
  ELSIF TG_OP = 'UPDATE' AND NEW.customer_id IS NOT NULL THEN
    -- Mise en corbeille : deleted_at vient d'être renseigné.
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE customers
      SET order_count = GREATEST(order_count - 1, 0)
      WHERE id = NEW.customer_id;
    -- Restauration : deleted_at vient d'être remis à NULL.
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE customers
      SET order_count = order_count + 1
      WHERE id = NEW.customer_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Étape 3 : Créer le trigger.
DROP TRIGGER IF EXISTS trg_update_customer_order_count ON orders;

CREATE TRIGGER trg_update_customer_order_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE
ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_order_count();

-- Vérification post-migration (à exécuter manuellement pour valider) :
-- SELECT c.id, c.order_count AS stored, COUNT(o.id) AS real
-- FROM customers c
-- LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
-- GROUP BY c.id, c.order_count
-- HAVING c.order_count != COUNT(o.id);
