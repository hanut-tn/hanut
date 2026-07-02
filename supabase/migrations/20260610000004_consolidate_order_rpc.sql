-- DÉPRÉCIÉ : cette version de create_order_with_stock (13 params, avec unit_cost)
-- est remplacée par 20260716_add_structured_addresses.sql (19 params, adresses structurées).
-- Conservé pour le replay complet des migrations — ne pas déplacer ni supprimer
-- (référencé par chemin exact dans supabase-migrations.test.ts).
--
-- Cette migration garantit que create_order_with_stock est toujours dans sa version
-- finale correcte, indépendamment de l'ordre d'application des migrations précédentes.
-- Source de vérité historique : 20260610_add_order_unit_cost.sql (version 13 params, SECURITY DEFINER, unit_cost).

-- Supprimer toutes les versions existantes (12 params et 13 params).
DROP FUNCTION IF EXISTS create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT
);
DROP FUNCTION IF EXISTS create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID
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
  p_status TEXT DEFAULT 'new',
  p_changed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_has_variants BOOLEAN;
  v_variant_matches INTEGER := 0;
  v_variant_stock INTEGER := 0;
  v_updated_variants JSONB;
  v_new_stock INTEGER;
  v_seller_name TEXT := '';
BEGIN
  IF p_seller_id IS NULL THEN RAISE EXCEPTION 'Vendeur introuvable'; END IF;
  IF p_product_id IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF v_customer_name IS NULL THEN RAISE EXCEPTION 'Nom client obligatoire'; END IF;
  IF v_customer_phone IS NULL THEN RAISE EXCEPTION 'Téléphone client obligatoire'; END IF;
  IF p_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled') THEN
    RAISE EXCEPTION 'Statut de commande invalide';
  END IF;

  SELECT *
  INTO v_product
  FROM products
  WHERE id = p_product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;

  v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

  IF v_has_variants THEN
    IF v_variant IS NULL THEN
      RAISE EXCEPTION 'Variante obligatoire';
    END IF;

    SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
    INTO v_variant_matches, v_variant_stock
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
    WHERE variant_label(elem, ord) = v_variant;

    IF v_variant_matches = 0 THEN
      RAISE EXCEPTION 'Variante invalide';
    END IF;
    IF v_variant_matches > 1 THEN
      RAISE EXCEPTION 'Variante ambiguë';
    END IF;
    IF v_variant_stock < p_quantity THEN
      RAISE EXCEPTION 'variant_insufficient_stock';
    END IF;
  ELSE
    IF v_product.stock < p_quantity THEN
      RAISE EXCEPTION 'Stock insuffisant. Il reste % unité(s) disponible(s).', v_product.stock;
    END IF;
  END IF;

  v_cod_amount := COALESCE(p_cod_amount, v_product.price * p_quantity);
  IF v_cod_amount < 0 THEN RAISE EXCEPTION 'Montant COD invalide'; END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE id = p_customer_id
      AND seller_id = p_seller_id
    FOR UPDATE;

    IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Client introuvable'; END IF;
  ELSE
    SELECT id INTO v_customer_id
    FROM customers
    WHERE seller_id = p_seller_id
      AND phone = v_customer_phone
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
      INSERT INTO customers (seller_id, name, phone, address, city)
      VALUES (p_seller_id, v_customer_name, v_customer_phone, v_customer_address, v_customer_city)
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  UPDATE customers
  SET name = v_customer_name,
      phone = v_customer_phone,
      address = v_customer_address,
      city = v_customer_city
  WHERE id = v_customer_id
    AND seller_id = p_seller_id;

  INSERT INTO orders (
    seller_id, customer_id, product_id, variant,
    quantity, cod_amount, unit_cost, notes, status, tracking_token
  )
  VALUES (
    p_seller_id, v_customer_id, p_product_id, v_variant,
    p_quantity, v_cod_amount, COALESCE(v_product.cost, 0), v_notes, p_status,
    replace(gen_random_uuid()::text, '-', '')
  )
  RETURNING id INTO v_order_id;

  IF v_has_variants THEN
    SELECT jsonb_agg(
      CASE
        WHEN variant_label(elem, ord) = v_variant
          THEN jsonb_set(elem, '{qty}', to_jsonb((elem->>'qty')::INTEGER - p_quantity))
        ELSE elem
      END
      ORDER BY ord
    )
    INTO v_updated_variants
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord);

    v_new_stock := sum_variant_stock(v_updated_variants);

    UPDATE products
    SET variants = v_updated_variants,
        stock = v_new_stock
    WHERE id = p_product_id
      AND seller_id = p_seller_id;
  ELSE
    v_new_stock := v_product.stock - p_quantity;

    UPDATE products
    SET stock = v_new_stock
    WHERE id = p_product_id
      AND seller_id = p_seller_id;
  END IF;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (v_order_id, p_status, p_changed_by);

  SELECT COALESCE(name, '') INTO v_seller_name
  FROM sellers
  WHERE id = p_seller_id;

  INSERT INTO stock_movements (
    seller_id,
    product_id,
    variant_name,
    quantity_before,
    quantity_after,
    delta,
    movement_type,
    order_id,
    notes,
    created_by,
    created_by_name
  )
  VALUES (
    p_seller_id,
    p_product_id,
    v_variant,
    v_product.stock,
    v_new_stock,
    -p_quantity,
    'order',
    v_order_id,
    'Commande créée',
    p_changed_by,
    v_seller_name
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID
) TO authenticated, service_role;
