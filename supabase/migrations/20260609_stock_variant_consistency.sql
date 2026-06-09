-- Stock variantes : rendre products.stock cohérent avec SUM(variants[].qty)
-- et centraliser les mouvements critiques liés aux commandes.

CREATE OR REPLACE FUNCTION variant_label(p_variant JSONB, p_index BIGINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(array_to_string(ARRAY[
      NULLIF(p_variant->>'size', ''),
      NULLIF(p_variant->>'color', '')
    ], ' / '), ''),
    NULLIF(p_variant->>'name', ''),
    'Variante ' || p_index::TEXT
  );
$$;

CREATE OR REPLACE FUNCTION sum_variant_stock(p_variants JSONB)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(GREATEST(0, COALESCE((v->>'qty')::INTEGER, 0))), 0)::INTEGER
  FROM jsonb_array_elements(COALESCE(p_variants, '[]'::jsonb)) AS v;
$$;

DROP FUNCTION IF EXISTS create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT
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
  IF p_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned') THEN
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
    quantity, cod_amount, notes, status, tracking_token
  )
  VALUES (
    p_seller_id, v_customer_id, p_product_id, v_variant,
    p_quantity, v_cod_amount, v_notes, p_status,
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

CREATE OR REPLACE FUNCTION adjust_order_stock(
  p_seller_id UUID,
  p_order_id UUID,
  p_delta INTEGER,
  p_movement_type TEXT,
  p_notes TEXT,
  p_changed_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_product products%ROWTYPE;
  v_has_variants BOOLEAN;
  v_variant_matches INTEGER := 0;
  v_variant_stock INTEGER := 0;
  v_updated_variants JSONB;
  v_new_stock INTEGER;
  v_seller_name TEXT := '';
BEGIN
  IF p_delta = 0 THEN RAISE EXCEPTION 'Delta invalide'; END IF;
  IF p_movement_type NOT IN ('order', 'order_cancel', 'restock', 'correction', 'return', 'loss') THEN
    RAISE EXCEPTION 'Type de mouvement invalide';
  END IF;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;

  SELECT *
  INTO v_product
  FROM products
  WHERE id = v_order.product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;

  v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

  IF v_has_variants THEN
    IF v_order.variant IS NULL OR trim(v_order.variant) = '' THEN
      RAISE EXCEPTION 'Cette commande n''a pas de variante enregistrée';
    END IF;

    SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
    INTO v_variant_matches, v_variant_stock
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
    WHERE variant_label(elem, ord) = v_order.variant;

    IF v_variant_matches = 0 THEN RAISE EXCEPTION 'Variante introuvable'; END IF;
    IF v_variant_matches > 1 THEN RAISE EXCEPTION 'Variante ambiguë'; END IF;
    IF p_delta < 0 AND v_variant_stock < ABS(p_delta) THEN
      RAISE EXCEPTION 'Stock insuffisant pour cette variante';
    END IF;

    SELECT jsonb_agg(
      CASE
        WHEN variant_label(elem, ord) = v_order.variant
          THEN jsonb_set(elem, '{qty}', to_jsonb((elem->>'qty')::INTEGER + p_delta))
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
    WHERE id = v_product.id
      AND seller_id = p_seller_id;
  ELSE
    IF p_delta < 0 AND v_product.stock < ABS(p_delta) THEN
      RAISE EXCEPTION 'Stock insuffisant. Il reste % unité(s) disponible(s).', v_product.stock;
    END IF;

    v_new_stock := v_product.stock + p_delta;

    UPDATE products
    SET stock = v_new_stock
    WHERE id = v_product.id
      AND seller_id = p_seller_id;
  END IF;

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
    v_product.id,
    v_order.variant,
    v_product.stock,
    v_new_stock,
    p_delta,
    p_movement_type,
    p_order_id,
    p_notes,
    p_changed_by,
    v_seller_name
  );

  RETURN v_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock(
  p_seller_id UUID,
  p_order_id UUID,
  p_changed_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Seules les commandes en attente peuvent être annulées ici';
  END IF;

  PERFORM adjust_order_stock(p_seller_id, p_order_id, v_order.quantity, 'order_cancel', 'Commande annulée', p_changed_by);

  UPDATE orders
  SET status = 'returned'
  WHERE id = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'returned', p_changed_by);
END;
$$;

CREATE OR REPLACE FUNCTION soft_delete_order_with_stock(
  p_seller_id UUID,
  p_order_id UUID,
  p_archived_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status NOT IN ('pending', 'new', 'confirmed', 'delivered', 'returned') THEN
    RAISE EXCEPTION 'Une commande expédiée ne peut pas être supprimée. Attendez la livraison ou le retour.';
  END IF;

  IF v_order.status IN ('pending', 'new', 'confirmed') THEN
    PERFORM adjust_order_stock(p_seller_id, p_order_id, v_order.quantity, 'order_cancel', 'Commande déplacée en corbeille', p_archived_by);
  END IF;

  UPDATE orders
  SET deleted_at = NOW(),
      archived_by = p_archived_by
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION restore_trashed_order_with_stock(
  p_seller_id UUID,
  p_order_id UUID,
  p_restored_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable dans la corbeille'; END IF;
  IF v_order.deleted_at < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être restaurée après 30 jours dans la corbeille.';
  END IF;

  IF v_order.status IN ('pending', 'new', 'confirmed') THEN
    PERFORM adjust_order_stock(p_seller_id, p_order_id, -v_order.quantity, 'order', 'Commande restaurée depuis la corbeille', p_restored_by);
  END IF;

  UPDATE orders
  SET deleted_at = NULL,
      archived_by = NULL
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION variant_label(JSONB, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sum_variant_stock(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION adjust_order_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION soft_delete_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION restore_trashed_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION adjust_order_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION soft_delete_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION restore_trashed_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;
