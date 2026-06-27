-- Atomise la réception d'un réapprovisionnement planifié.
--
-- Problème : receiveRestockOrder faisait 3 appels DB séparés :
--   1. UPDATE products (stock / variants / cost)
--   2. UPDATE restock_orders (status = received)
--   3. INSERT stock_movements
-- En cas de crash entre ces appels, le stock était modifié sans que la commande
-- soit marquée reçue, ou le mouvement était absent. Le rollback manuel dans le
-- code JS (re-update products en cas d'erreur sur restock_orders) n'était pas
-- lui-même protégé contre les erreurs.
--
-- Solution : tout s'exécute dans une seule transaction côté DB.

CREATE OR REPLACE FUNCTION receive_restock_order(
  p_seller_id        UUID,
  p_restock_id       UUID,
  p_cost_update_mode TEXT    DEFAULT 'wac',
  p_changed_by       UUID    DEFAULT NULL,
  p_changed_by_name  TEXT    DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restock          restock_orders%ROWTYPE;
  v_product          products%ROWTYPE;
  v_new_stock        INTEGER;
  v_new_cost         NUMERIC;
  v_updated_variants JSONB;
  v_has_variants     BOOLEAN;
  v_has_var_restock  BOOLEAN;
  v_unit_cost        NUMERIC;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_cost_update_mode NOT IN ('wac', 'new', 'keep') THEN
    RAISE EXCEPTION 'INVALID_COST_UPDATE_MODE';
  END IF;

  SELECT * INTO v_restock
  FROM restock_orders
  WHERE id        = p_restock_id
    AND seller_id = p_seller_id
    AND status    = 'planned'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'RESTOCK_NOT_FOUND'; END IF;

  SELECT * INTO v_product
  FROM products
  WHERE id        = v_restock.product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;

  v_unit_cost    := v_restock.unit_cost;
  v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;
  v_has_var_restock := v_has_variants
    AND COALESCE(jsonb_array_length(v_restock.variants_quantities), 0) > 0;

  IF v_has_variants AND NOT v_has_var_restock THEN
    RAISE EXCEPTION 'VARIANT_QUANTITIES_REQUIRED';
  END IF;

  IF v_has_var_restock THEN
    SELECT jsonb_agg(
      jsonb_set(
        elem,
        '{qty}',
        to_jsonb(
          (elem->>'qty')::INTEGER
          + GREATEST(0, COALESCE(
              (SELECT (item->>'quantity')::INTEGER
               FROM jsonb_array_elements(v_restock.variants_quantities) AS items(item)
               WHERE item->>'variant' = variant_label(elem, ord)),
              0
            ))
        )
      )
      ORDER BY ord
    )
    INTO v_updated_variants
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord);

    v_new_stock := sum_variant_stock(v_updated_variants);
  ELSE
    v_updated_variants := v_product.variants;
    v_new_stock        := v_product.stock + v_restock.total_quantity;
  END IF;

  v_new_cost := v_product.cost;
  IF v_unit_cost IS NOT NULL AND v_unit_cost > 0 AND p_cost_update_mode <> 'keep' THEN
    IF p_cost_update_mode = 'wac' THEN
      v_new_cost := CASE
        WHEN v_product.cost IS NOT NULL AND v_product.cost > 0 AND v_product.stock > 0
          THEN ROUND(
            ((v_product.cost * v_product.stock) + (v_unit_cost * v_restock.total_quantity))
            / (v_product.stock + v_restock.total_quantity)::NUMERIC,
            2
          )
        ELSE v_unit_cost
      END;
    ELSIF p_cost_update_mode = 'new' THEN
      v_new_cost := v_unit_cost;
    END IF;
  END IF;

  UPDATE products
  SET stock    = v_new_stock,
      variants = v_updated_variants,
      cost     = CASE WHEN p_cost_update_mode <> 'keep' THEN v_new_cost ELSE cost END
  WHERE id        = v_restock.product_id
    AND seller_id = p_seller_id;

  UPDATE restock_orders
  SET status        = 'received',
      received_date = CURRENT_DATE,
      updated_at    = now()
  WHERE id        = p_restock_id
    AND seller_id = p_seller_id;

  INSERT INTO stock_movements (
    seller_id, product_id, variant_name,
    quantity_before, quantity_after, delta,
    movement_type, unit_cost, supplier, notes,
    created_by, created_by_name
  )
  VALUES (
    p_seller_id, v_restock.product_id, NULL,
    v_product.stock, v_new_stock, v_restock.total_quantity,
    'restock', v_unit_cost, v_restock.supplier,
    'Réapprovisionnement planifié reçu',
    p_changed_by, p_changed_by_name
  );
END;
$$;

REVOKE ALL ON FUNCTION receive_restock_order(UUID, UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_restock_order(UUID, UUID, TEXT, UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
