-- DÉPRÉCIÉ : la section create_order_with_stock de ce fichier (12 params, sans SECURITY DEFINER)
-- est remplacée par 20260610_consolidate_order_rpc.sql
-- Ne pas modifier ce fichier.

-- Add tracking_token to orders for public tracking URLs (replaces UUID exposure)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE DEFAULT NULL;

UPDATE orders
SET tracking_token = encode(gen_random_bytes(16), 'hex')
WHERE tracking_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);

-- Recreate create_order_with_stock to include tracking_token generation on INSERT

DROP FUNCTION IF EXISTS create_order_with_stock(
  UUID,
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  NUMERIC,
  TEXT,
  TEXT
);

CREATE OR REPLACE FUNCTION create_order_with_stock(
  p_seller_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT DEFAULT NULL,
  p_customer_city TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_variant TEXT DEFAULT NULL,
  p_cod_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'new'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_customer_id UUID;
  v_order_id UUID;
  v_customer_name TEXT := NULLIF(trim(coalesce(p_customer_name, '')), '');
  v_customer_phone TEXT := NULLIF(trim(coalesce(p_customer_phone, '')), '');
  v_customer_address TEXT := NULLIF(trim(coalesce(p_customer_address, '')), '');
  v_customer_city TEXT := NULLIF(trim(coalesce(p_customer_city, '')), '');
  v_variant TEXT := NULLIF(trim(coalesce(p_variant, '')), '');
  v_notes TEXT := NULLIF(trim(coalesce(p_notes, '')), '');
  v_cod_amount NUMERIC(10,2);
  v_variant_count INTEGER;
BEGIN
  IF p_seller_id IS NULL THEN
    RAISE EXCEPTION 'Vendeur introuvable';
  END IF;

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  IF v_customer_name IS NULL THEN
    RAISE EXCEPTION 'Nom client obligatoire';
  END IF;

  IF v_customer_phone IS NULL THEN
    RAISE EXCEPTION 'Téléphone client obligatoire';
  END IF;

  IF p_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned') THEN
    RAISE EXCEPTION 'Statut de commande invalide';
  END IF;

  SELECT *
  INTO v_product
  FROM products
  WHERE id = p_product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  IF v_variant IS NOT NULL THEN
    SELECT COUNT(*) INTO v_variant_count
    FROM jsonb_array_elements(v_product.variants) AS v
    WHERE (
      v->>'size' = v_variant OR
      v->>'color' = v_variant OR
      v->>'name' = v_variant OR
      CONCAT(COALESCE(v->>'size', ''), ' / ', COALESCE(v->>'color', '')) = v_variant
    )
    AND (v->>'qty')::INTEGER >= p_quantity;

    IF v_variant_count = 0 THEN
      RAISE EXCEPTION 'variant_insufficient_stock';
    END IF;
  END IF;

  IF v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant. Il reste % unité(s) disponible(s).', v_product.stock;
  END IF;

  v_cod_amount := COALESCE(p_cod_amount, v_product.price * p_quantity);

  IF v_cod_amount < 0 THEN
    RAISE EXCEPTION 'Montant COD invalide';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT id
    INTO v_customer_id
    FROM customers
    WHERE id = p_customer_id
      AND seller_id = p_seller_id
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'Client introuvable';
    END IF;
  ELSE
    SELECT id
    INTO v_customer_id
    FROM customers
    WHERE seller_id = p_seller_id
      AND phone = v_customer_phone
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
      INSERT INTO customers (
        seller_id,
        name,
        phone,
        address,
        city
      )
      VALUES (
        p_seller_id,
        v_customer_name,
        v_customer_phone,
        v_customer_address,
        v_customer_city
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  UPDATE customers
  SET
    name = v_customer_name,
    phone = v_customer_phone,
    address = v_customer_address,
    city = v_customer_city
  WHERE id = v_customer_id
    AND seller_id = p_seller_id;

  INSERT INTO orders (
    seller_id,
    customer_id,
    product_id,
    variant,
    quantity,
    cod_amount,
    notes,
    status,
    tracking_token
  )
  VALUES (
    p_seller_id,
    v_customer_id,
    p_product_id,
    v_variant,
    p_quantity,
    v_cod_amount,
    v_notes,
    p_status,
    encode(gen_random_bytes(16), 'hex')
  )
  RETURNING id INTO v_order_id;

  IF v_variant IS NOT NULL AND v_product.variants IS NOT NULL THEN
    UPDATE products
    SET variants = (
      SELECT jsonb_agg(
        CASE
          WHEN (
            v->>'size' = v_variant OR
            v->>'color' = v_variant OR
            v->>'name' = v_variant OR
            CONCAT(COALESCE(v->>'size', ''), ' / ', COALESCE(v->>'color', '')) = v_variant
          )
          THEN jsonb_set(v, '{qty}', to_jsonb(GREATEST(0, (v->>'qty')::INTEGER - p_quantity)))
          ELSE v
        END
      )
      FROM jsonb_array_elements(variants) v
    )
    WHERE id = p_product_id
      AND seller_id = p_seller_id;
  END IF;

  UPDATE products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id
    AND seller_id = p_seller_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT
) TO authenticated, service_role;
