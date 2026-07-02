-- cancel_order_with_stock : extension de cancel_pending_order_with_stock
-- pour couvrir les statuts 'new' et 'confirmed' en plus de 'pending'.
--
-- cancel_pending_order_with_stock est conservé intact pour ne pas casser
-- les appels existants (server actions qui l'appellent explicitement).

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
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status NOT IN ('pending', 'new', 'confirmed') THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_STATUS:%', v_order.status;
  END IF;

  -- Restaurer le stock via la fonction partagée adjust_order_stock.
  PERFORM adjust_order_stock(
    p_seller_id,
    p_order_id,
    v_order.quantity,
    'order_cancel',
    'Commande annulée',
    p_changed_by
  );

  UPDATE orders
  SET status     = 'cancelled',
      updated_at = now()
  WHERE id        = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'cancelled', p_changed_by);
END;
$$;

REVOKE ALL ON FUNCTION cancel_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;
