-- RPC atomique pour les ajustements de stock manuels.
-- Le FOR UPDATE verrouille la ligne produit pendant la transaction
-- pour éviter les race conditions entre deux ajustements simultanés.
-- Remplace le UPDATE direct dans catalog/actions.ts adjustStock().

CREATE OR REPLACE FUNCTION adjust_product_stock(
  p_seller_id UUID,
  p_product_id UUID,
  p_variant_name TEXT,
  p_delta INTEGER,
  p_movement_type TEXT,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_supplier TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_changed_by UUID DEFAULT NULL,
  p_changed_by_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_variant_matches INTEGER := 0;
  v_variant_stock INTEGER := 0;
  v_new_stock INTEGER;
  v_new_variants JSONB;
  v_quantity_before INTEGER;
  v_new_cost NUMERIC;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  IF p_movement_type NOT IN ('restock', 'correction', 'return', 'loss', 'order_cancel') THEN
    RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE';
  END IF;

  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  v_quantity_before := v_product.stock;

  IF p_variant_name IS NOT NULL AND p_variant_name != '' THEN
    -- Ajuster la variante spécifique via variant_label() pour cohérence
    SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
    INTO v_variant_matches, v_variant_stock
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
    WHERE variant_label(elem, ord) = p_variant_name;

    IF v_variant_matches = 0 THEN
      RAISE EXCEPTION 'VARIANT_NOT_FOUND';
    END IF;

    IF v_variant_matches > 1 THEN
      RAISE EXCEPTION 'VARIANT_AMBIGUOUS';
    END IF;

    IF p_delta < 0 AND v_variant_stock < ABS(p_delta) THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_new_variants := (
      SELECT jsonb_agg(
        CASE
          WHEN variant_label(elem, ord) = p_variant_name
            THEN jsonb_set(elem, '{qty}', to_jsonb((elem->>'qty')::INTEGER + p_delta))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
    );

    v_new_stock := sum_variant_stock(v_new_variants);
  ELSE
    IF p_delta < 0 AND v_product.stock < ABS(p_delta) THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_new_stock := v_product.stock + p_delta;
    v_new_variants := v_product.variants;
  END IF;

  -- Calcul du nouveau coût WAC sur restock uniquement
  IF p_movement_type = 'restock' AND p_unit_cost IS NOT NULL AND p_delta > 0 AND p_unit_cost > 0 THEN
    IF v_product.stock > 0 AND v_product.cost IS NOT NULL AND v_product.cost > 0 THEN
      v_new_cost := ROUND(
        ((v_product.cost * v_product.stock) + (p_unit_cost * p_delta)) / (v_product.stock + p_delta),
        2
      );
    ELSE
      v_new_cost := p_unit_cost;
    END IF;
  ELSE
    v_new_cost := v_product.cost;
  END IF;

  UPDATE products
  SET stock    = v_new_stock,
      variants = v_new_variants,
      cost     = COALESCE(v_new_cost, cost)
  WHERE id = p_product_id
    AND seller_id = p_seller_id;

  INSERT INTO stock_movements (
    seller_id, product_id, variant_name,
    quantity_before, quantity_after, delta,
    movement_type, unit_cost, supplier, notes,
    created_by, created_by_name
  ) VALUES (
    p_seller_id, p_product_id, NULLIF(p_variant_name, ''),
    v_quantity_before, v_new_stock, p_delta,
    p_movement_type, p_unit_cost, p_supplier, p_notes,
    p_changed_by, p_changed_by_name
  );

  RETURN jsonb_build_object(
    'stock_before', v_quantity_before,
    'stock_after',  v_new_stock,
    'delta',        p_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION adjust_product_stock(UUID, UUID, TEXT, INTEGER, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_product_stock(UUID, UUID, TEXT, INTEGER, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT) TO authenticated, service_role;
