CREATE OR REPLACE FUNCTION create_delivery_from_order(
  p_seller_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_carrier TEXT,
  p_tracking_number TEXT DEFAULT NULL,
  p_fee NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM orders
    WHERE id = p_order_id
      AND seller_id = p_seller_id
      AND deleted_at IS NULL
      AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'order_not_shippable';
  END IF;

  INSERT INTO deliveries (
    order_id,
    carrier,
    tracking_number,
    fee
  )
  VALUES (
    p_order_id,
    p_carrier,
    NULLIF(trim(COALESCE(p_tracking_number, '')), ''),
    CASE WHEN p_fee IS NULL OR p_fee <= 0 THEN NULL ELSE p_fee END
  )
  RETURNING id INTO v_delivery_id;

  UPDATE orders
  SET status = 'shipped'
  WHERE id = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (
    order_id,
    status,
    changed_by
  )
  VALUES (
    p_order_id,
    'shipped',
    p_user_id
  );

  RETURN v_delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION mark_delivery_cod_collected(
  p_seller_id UUID,
  p_user_id UUID,
  p_delivery_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_old_status TEXT;
BEGIN
  SELECT o.id, o.status
  INTO v_order_id, v_old_status
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id = p_delivery_id
    AND o.seller_id = p_seller_id
    AND o.deleted_at IS NULL
  FOR UPDATE OF d, o;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'delivery_not_found';
  END IF;

  UPDATE deliveries
  SET
    cod_collected = true,
    delivered_at = COALESCE(delivered_at, now())
  WHERE id = p_delivery_id;

  IF v_old_status IS DISTINCT FROM 'delivered' THEN
    UPDATE orders
    SET status = 'delivered'
    WHERE id = v_order_id
      AND seller_id = p_seller_id;

    INSERT INTO order_status_history (
      order_id,
      status,
      changed_by
    )
    VALUES (
      v_order_id,
      'delivered',
      p_user_id
    );
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION mark_delivery_cod_collected(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_delivery_cod_collected(UUID, UUID, UUID) TO authenticated, service_role;
