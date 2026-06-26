-- Ajoute une garde contre le stock négatif lors de la restauration d'une commande
-- depuis la corbeille.
--
-- adjust_order_items_stock avec p_delta_sign = -1 re-déduit le stock.
-- Sans garde, si le stock a été vendu entre-temps, la valeur devient négative.
-- Correction : vérifier le stock disponible avant de déduire.

CREATE OR REPLACE FUNCTION adjust_order_items_stock(
  p_seller_id     UUID,
  p_order_id      UUID,
  p_delta_sign    INTEGER,
  p_movement_type TEXT,
  p_notes         TEXT,
  p_changed_by    UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item             order_items%ROWTYPE;
  v_product          products%ROWTYPE;
  v_has_variants     BOOLEAN;
  v_variant_matches  INTEGER;
  v_variant_stock    INTEGER := 0;
  v_delta            INTEGER;
  v_updated_variants JSONB;
  v_new_stock        INTEGER;
  v_seller_name      TEXT := '';
BEGIN
  IF p_delta_sign NOT IN (1, -1) THEN
    RAISE EXCEPTION 'adjust_order_items_stock: p_delta_sign doit être +1 ou -1';
  END IF;

  SELECT COALESCE(name, '') INTO v_seller_name FROM sellers WHERE id = p_seller_id;

  FOR v_item IN
    SELECT * FROM order_items
    WHERE order_id  = p_order_id
      AND seller_id = p_seller_id
    ORDER BY created_at
  LOOP
    v_delta := p_delta_sign * v_item.quantity;

    SELECT *
    INTO v_product
    FROM products
    WHERE id        = v_item.product_id
      AND seller_id = p_seller_id
    FOR UPDATE;

    -- Produit supprimé depuis la commande : rien à ajuster.
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

    IF v_has_variants AND v_item.variant IS NOT NULL THEN
      SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
      INTO v_variant_matches, v_variant_stock
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
      WHERE variant_label(elem, ord) = v_item.variant;

      -- Variante supprimée depuis la commande : ignorer cet article.
      IF v_variant_matches = 0 THEN CONTINUE; END IF;

      -- Garde : stock négatif impossible lors d'une re-déduction (restauration corbeille).
      IF v_delta < 0 AND v_variant_stock < v_item.quantity THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK_ON_RESTORE';
      END IF;

      SELECT jsonb_agg(
        CASE
          WHEN variant_label(elem, ord) = v_item.variant
            THEN jsonb_set(elem, '{qty}', to_jsonb((elem->>'qty')::INTEGER + v_delta))
          ELSE elem
        END
        ORDER BY ord
      )
      INTO v_updated_variants
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord);

      v_new_stock := sum_variant_stock(v_updated_variants);

      UPDATE products
      SET variants = v_updated_variants,
          stock    = v_new_stock
      WHERE id        = v_product.id
        AND seller_id = p_seller_id;
    ELSE
      -- Garde : stock négatif impossible lors d'une re-déduction (restauration corbeille).
      IF v_delta < 0 AND v_product.stock < v_item.quantity THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK_ON_RESTORE';
      END IF;

      v_new_stock := v_product.stock + v_delta;

      UPDATE products
      SET stock = v_new_stock
      WHERE id        = v_product.id
        AND seller_id = p_seller_id;
    END IF;

    INSERT INTO stock_movements (
      seller_id, product_id, variant_name,
      quantity_before, quantity_after, delta,
      movement_type, order_id, notes,
      created_by, created_by_name
    )
    VALUES (
      p_seller_id, v_product.id, v_item.variant,
      v_product.stock, v_new_stock, v_delta,
      p_movement_type, p_order_id, p_notes,
      p_changed_by, v_seller_name
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION adjust_order_items_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_order_items_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
