-- Sécuriser les RPCs de livraison et d'annulation sans garde.
-- Ajoute can_write_seller pour create_delivery_from_order,
-- mark_delivery_cod_collected, cancel_pending_order_with_stock.
-- Ajoute une garde admin-only pour restore_trashed_order_with_stock
-- (cohérent avec soft_delete_order_with_stock et la restriction app).

-- ============================================================
-- create_delivery_from_order
-- ============================================================

CREATE OR REPLACE FUNCTION create_delivery_from_order(
  p_seller_id      UUID,
  p_user_id        UUID,
  p_order_id       UUID,
  p_carrier        TEXT,
  p_tracking_number TEXT DEFAULT NULL,
  p_fee            NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id UUID;
  v_actor UUID;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_user_id
    ELSE auth.uid()
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM orders
    WHERE id        = p_order_id
      AND seller_id = p_seller_id
      AND deleted_at IS NULL
      AND status    = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'order_not_shippable';
  END IF;

  INSERT INTO deliveries (order_id, carrier, tracking_number, fee)
  VALUES (
    p_order_id,
    p_carrier,
    NULLIF(trim(COALESCE(p_tracking_number, '')), ''),
    CASE WHEN p_fee IS NULL OR p_fee <= 0 THEN NULL ELSE p_fee END
  )
  RETURNING id INTO v_delivery_id;

  UPDATE orders
  SET status = 'shipped'
  WHERE id        = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'shipped', v_actor);

  RETURN v_delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;

-- ============================================================
-- mark_delivery_cod_collected
-- ============================================================

CREATE OR REPLACE FUNCTION mark_delivery_cod_collected(
  p_seller_id   UUID,
  p_user_id     UUID,
  p_delivery_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id   UUID;
  v_old_status TEXT;
  v_actor      UUID;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_user_id
    ELSE auth.uid()
  END;

  SELECT o.id, o.status
  INTO v_order_id, v_old_status
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id        = p_delivery_id
    AND o.seller_id = p_seller_id
    AND o.deleted_at IS NULL
  FOR UPDATE OF d, o;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'delivery_not_found';
  END IF;

  IF v_old_status NOT IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION:%->delivered', v_old_status;
  END IF;

  UPDATE deliveries
  SET cod_collected = true,
      delivered_at  = COALESCE(delivered_at, now())
  WHERE id = p_delivery_id;

  IF v_old_status IS DISTINCT FROM 'delivered' THEN
    UPDATE orders
    SET status = 'delivered'
    WHERE id        = v_order_id
      AND seller_id = p_seller_id;

    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (v_order_id, 'delivered', v_actor);
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION mark_delivery_cod_collected(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_delivery_cod_collected(UUID, UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- cancel_pending_order_with_stock
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_changed_by UUID DEFAULT NULL
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
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_changed_by
    ELSE auth.uid()
  END;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Seules les commandes en attente peuvent être annulées ici';
  END IF;

  PERFORM adjust_order_stock(
    p_seller_id, p_order_id, v_order.quantity, 'order_cancel', 'Commande annulée', v_actor
  );

  UPDATE orders
  SET status = 'cancelled'
  WHERE id        = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'cancelled', v_actor);
END;
$$;

REVOKE ALL ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- restore_trashed_order_with_stock
-- ============================================================

CREATE OR REPLACE FUNCTION restore_trashed_order_with_stock(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_restored_by UUID DEFAULT NULL
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
  -- Admin-only : cohérent avec soft_delete_order_with_stock et la restriction app.
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_restored_by
    ELSE auth.uid()
  END;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable dans la corbeille'; END IF;
  IF v_order.deleted_at < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être restaurée après 30 jours dans la corbeille.';
  END IF;

  IF v_order.status IN ('pending', 'new', 'confirmed') THEN
    PERFORM adjust_order_stock(
      p_seller_id, p_order_id, -v_order.quantity, 'order', 'Commande restaurée depuis la corbeille', v_actor
    );
  END IF;

  UPDATE orders
  SET deleted_at  = NULL,
      archived_by = NULL
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION restore_trashed_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_trashed_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;

-- Helper interne uniquement : les RPC publiques ci-dessus effectuent les
-- contrôles d'accès avant de l'appeler. Il ne doit pas être invoqué directement.
REVOKE ALL ON FUNCTION adjust_order_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION adjust_order_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION adjust_order_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) TO service_role;
