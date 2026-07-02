-- Ajouter le statut 'cancelled' pour distinguer les vraies annulations
-- des retours transporteur ('returned').
-- Une commande annulée avant expédition n'a jamais été expédiée —
-- la compter comme 'returned' biaisait le taux de retour dans les analytics.

-- 1. Étendre la contrainte CHECK sur orders.status.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'new',
  'confirmed',
  'shipped',
  'delivered',
  'returned',
  'cancelled'
));

-- 2. Mettre à jour cancel_pending_order_with_stock pour utiliser 'cancelled'.
CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock(
  p_seller_id UUID,
  p_order_id UUID,
  p_changed_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Seules les commandes en attente peuvent être annulées ici';
  END IF;

  PERFORM adjust_order_stock(p_seller_id, p_order_id, v_order.quantity, 'order_cancel', 'Commande annulée', p_changed_by);

  UPDATE orders
  SET status = 'cancelled'
  WHERE id = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'cancelled', p_changed_by);
END;
$$;

REVOKE ALL ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;
