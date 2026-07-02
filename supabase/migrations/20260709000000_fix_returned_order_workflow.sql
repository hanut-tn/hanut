-- Rend le workflow shipped -> returned -> cancelled réellement utilisable.
-- Toute annulation doit passer par cancel_order_with_stock afin de restaurer
-- le stock exactement une fois, y compris après un retour transporteur.

INSERT INTO order_status_transitions (from_status, to_status)
VALUES ('returned', 'cancelled')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION update_order_status(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_new_status TEXT,
  p_changed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_actor          UUID;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  IF p_new_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  -- Les annulations modifient aussi le stock et doivent rester atomiques.
  IF p_new_status = 'cancelled' THEN
    RAISE EXCEPTION 'USE_CANCEL_ORDER_RPC';
  END IF;

  v_actor := CASE
    WHEN is_service_role() THEN p_changed_by
    ELSE auth.uid()
  END;

  SELECT status INTO v_current_status
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM order_status_transitions
    WHERE from_status = v_current_status
      AND to_status = p_new_status
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION:%->%', v_current_status, p_new_status;
  END IF;

  UPDATE orders
  SET
    status = p_new_status,
    updated_at = now()
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, p_new_status, v_actor);
END;
$$;

CREATE OR REPLACE FUNCTION cancel_order_with_stock(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_changed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_actor UUID;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  v_actor := CASE
    WHEN is_service_role() THEN p_changed_by
    ELSE auth.uid()
  END;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status NOT IN ('pending', 'new', 'confirmed', 'returned') THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_STATUS:%', v_order.status;
  END IF;

  PERFORM adjust_order_stock(
    p_seller_id,
    p_order_id,
    v_order.quantity,
    'order_cancel',
    CASE
      WHEN v_order.status = 'returned' THEN 'Commande retournée puis annulée'
      ELSE 'Commande annulée'
    END,
    v_actor
  );

  UPDATE orders
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'cancelled', v_actor);
END;
$$;

REVOKE ALL ON FUNCTION update_order_status(UUID, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, UUID, TEXT, UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION cancel_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_order_with_stock(UUID, UUID, UUID)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
