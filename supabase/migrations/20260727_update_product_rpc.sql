-- Remplace le .update() direct de upsertProduct par une RPC SECURITY DEFINER.
--
-- Problème : upsertProduct faisait un UPDATE direct sur products incluant stock
-- et variants, sans créer de stock_movement. Le stock pouvait donc changer
-- silencieusement, rendant l'historique incomplet (données comptables fausses).
--
-- Solution : update_product détecte le delta de stock et insère un mouvement
-- de type 'correction' si le stock total change, le tout dans la même transaction.

CREATE OR REPLACE FUNCTION update_product(
  p_seller_id       UUID,
  p_product_id      UUID,
  p_name            TEXT,
  p_price           NUMERIC,
  p_cost            NUMERIC,
  p_stock           INTEGER,
  p_low_stock_alert INTEGER,
  p_variants        JSONB,
  p_image_url       TEXT,
  p_description     TEXT,
  p_changed_by      UUID,
  p_changed_by_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product   products%ROWTYPE;
  v_new_stock INTEGER;
  v_delta     INTEGER;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT * INTO v_product
  FROM products
  WHERE id        = p_product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;

  v_new_stock := CASE
    WHEN COALESCE(jsonb_array_length(p_variants), 0) > 0 THEN sum_variant_stock(p_variants)
    ELSE p_stock
  END;

  v_delta := v_new_stock - v_product.stock;

  UPDATE products
  SET name            = p_name,
      price           = p_price,
      cost            = p_cost,
      stock           = v_new_stock,
      low_stock_alert = p_low_stock_alert,
      variants        = p_variants,
      image_url       = p_image_url,
      description     = p_description
  WHERE id        = p_product_id
    AND seller_id = p_seller_id;

  IF v_delta <> 0 THEN
    INSERT INTO stock_movements (
      seller_id, product_id, variant_name,
      quantity_before, quantity_after, delta,
      movement_type, notes, created_by, created_by_name
    )
    VALUES (
      p_seller_id, p_product_id, NULL,
      v_product.stock, v_new_stock, v_delta,
      'correction', 'Mise à jour catalogue', p_changed_by, p_changed_by_name
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_product(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER, JSONB, TEXT, TEXT, UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_product(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER, JSONB, TEXT, TEXT, UUID, TEXT
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
