-- RPC atomique pour les changements de statut des commandes.
-- Remplace le UPDATE direct + INSERT séparés dans orders/actions.ts.
-- Le FOR UPDATE verrouille la ligne pendant la transaction pour éviter
-- les modifications concurrentes (race condition stock).

CREATE OR REPLACE FUNCTION update_order_status(
  p_seller_id UUID,
  p_order_id UUID,
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
  v_actor UUID;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  IF p_new_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_changed_by
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

  UPDATE orders
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, p_new_status, v_actor);
END;
$$;

REVOKE ALL ON FUNCTION update_order_status(UUID, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, UUID, TEXT, UUID) TO authenticated, service_role;
