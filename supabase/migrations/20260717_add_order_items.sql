CREATE TABLE IF NOT EXISTS order_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id  UUID        NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES products(id),
  variant    TEXT,
  quantity   INTEGER     NOT NULL CHECK (quantity >= 1),
  unit_price NUMERIC(10,2) NOT NULL,
  unit_cost  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers read own order items" ON order_items;
CREATE POLICY "Sellers read own order items"
  ON order_items FOR SELECT
  USING (
    seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.seller_id = auth.uid()
    )
  );

INSERT INTO order_items (order_id, seller_id, product_id, variant, quantity, unit_price, unit_cost, created_at)
SELECT
  o.id,
  o.seller_id,
  o.product_id,
  o.variant,
  o.quantity,
  CASE WHEN o.quantity > 0 THEN ROUND(o.cod_amount / o.quantity, 2) ELSE o.cod_amount END,
  COALESCE(o.unit_cost, 0),
  o.created_at
FROM orders o
WHERE o.product_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS create_order_with_items(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
);

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_seller_id             UUID,
  p_customer_name         TEXT,
  p_customer_phone        TEXT,
  p_customer_address      TEXT    DEFAULT NULL,
  p_customer_city         TEXT    DEFAULT NULL,
  p_customer_id           UUID    DEFAULT NULL,
  p_notes                 TEXT    DEFAULT NULL,
  p_status                TEXT    DEFAULT 'new',
  p_changed_by            UUID    DEFAULT NULL,
  p_customer_email        TEXT    DEFAULT NULL,
  p_customer_governorate  TEXT    DEFAULT NULL,
  p_customer_delegation   TEXT    DEFAULT NULL,
  p_customer_landmark     TEXT    DEFAULT NULL,
  p_customer_postal_code  TEXT    DEFAULT NULL,
  p_delivery_notes        TEXT    DEFAULT NULL,
  p_cod_amount            TEXT    DEFAULT NULL,
  p_items                 JSONB   DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id             UUID;
  v_order_id                UUID;
  v_customer_name           TEXT := NULLIF(trim(coalesce(p_customer_name, '')), '');
  v_customer_phone          TEXT := NULLIF(trim(coalesce(p_customer_phone, '')), '');
  v_customer_address        TEXT := NULLIF(trim(coalesce(p_customer_address, '')), '');
  v_customer_city           TEXT := NULLIF(trim(coalesce(p_customer_city, '')), '');
  v_customer_governorate    TEXT := NULLIF(trim(coalesce(p_customer_governorate, p_customer_city, '')), '');
  v_customer_delegation     TEXT := NULLIF(trim(coalesce(p_customer_delegation, '')), '');
  v_customer_landmark       TEXT := NULLIF(trim(coalesce(p_customer_landmark, '')), '');
  v_customer_postal_code    TEXT := NULLIF(regexp_replace(coalesce(p_customer_postal_code, ''), '\D', '', 'g'), '');
  v_delivery_notes          TEXT := NULLIF(trim(coalesce(p_delivery_notes, '')), '');
  v_customer_email          TEXT := NULLIF(trim(coalesce(p_customer_email, '')), '');
  v_notes                   TEXT := NULLIF(trim(coalesce(p_notes, '')), '');
  v_items                   JSONB := '[]'::JSONB;
  v_address_version         SMALLINT := 1;
  v_address_normalized      TEXT;
  v_city_normalized         TEXT;
  v_seller_plan             TEXT;
  v_subscription_end        TIMESTAMPTZ;
  v_monthly_orders          INTEGER := 0;
  v_actor                   UUID;
  v_seller_name             TEXT := '';
  v_cod_amount              NUMERIC(10,2);
  v_computed_total          NUMERIC(10,2) := 0;
  v_item                    JSONB;
  v_product                 products%ROWTYPE;
  v_has_variants            BOOLEAN;
  v_variant_matches         INTEGER := 0;
  v_variant_stock           INTEGER := 0;
  v_updated_variants        JSONB;
  v_new_stock               INTEGER;
  v_item_variant            TEXT;
  v_item_product_id         UUID;
  v_item_quantity           INTEGER;
  v_item_unit_price         NUMERIC(10,2);
  v_item_unit_cost          NUMERIC(10,2);
  v_first_product_id        UUID;
  v_first_variant           TEXT;
  v_first_quantity          INTEGER;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  BEGIN
    v_items := CASE
      WHEN p_items IS NULL THEN '[]'::JSONB
      WHEN jsonb_typeof(p_items) = 'array' THEN p_items
      WHEN jsonb_typeof(p_items) = 'string' THEN (p_items #>> '{}')::JSONB
      ELSE p_items
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'INVALID_ORDER_ITEMS';
  END;

  IF jsonb_typeof(v_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ORDER_ITEMS';
  END IF;

  IF p_seller_id IS NULL THEN RAISE EXCEPTION 'Vendeur introuvable'; END IF;
  IF jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'Au moins un article est obligatoire'; END IF;
  IF v_customer_name IS NULL THEN RAISE EXCEPTION 'Nom client obligatoire'; END IF;
  IF v_customer_phone IS NULL THEN RAISE EXCEPTION 'Telephone client obligatoire'; END IF;

  IF p_status NOT IN ('pending', 'new') THEN
    RAISE EXCEPTION 'INVALID_STATUS_ON_CREATE:%', p_status;
  END IF;

  IF v_customer_postal_code IS NOT NULL AND v_customer_postal_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_POSTAL_CODE';
  END IF;

  IF p_customer_governorate IS NOT NULL
     OR p_customer_landmark IS NOT NULL
     OR p_customer_postal_code IS NOT NULL
     OR p_delivery_notes IS NOT NULL
  THEN
    v_address_version := 2;
    IF v_customer_governorate IS NULL THEN RAISE EXCEPTION 'Gouvernorat obligatoire'; END IF;
    IF v_customer_city IS NULL THEN RAISE EXCEPTION 'Ville ou delegation obligatoire'; END IF;
    IF v_customer_address IS NULL THEN RAISE EXCEPTION 'Adresse detaillee obligatoire'; END IF;
    IF v_customer_landmark IS NULL THEN RAISE EXCEPTION 'Repere livreur obligatoire'; END IF;
  END IF;

  SELECT plan, subscription_end
  INTO v_seller_plan, v_subscription_end
  FROM sellers
  WHERE id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Vendeur introuvable'; END IF;

  IF v_subscription_end IS NOT NULL AND v_subscription_end < now() THEN
    RAISE EXCEPTION 'SHOP_INACTIVE';
  END IF;

  IF COALESCE(v_seller_plan, 'starter') = 'starter' THEN
    SELECT COUNT(*)
    INTO v_monthly_orders
    FROM orders
    WHERE seller_id = p_seller_id
      AND deleted_at IS NULL
      AND created_at >= date_trunc('month', now());

    IF v_monthly_orders >= 100 THEN
      RAISE EXCEPTION 'LIMIT_REACHED';
    END IF;
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_changed_by
    ELSE auth.uid()
  END;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        item->>'product_id' AS product_id,
        COALESCE(NULLIF(trim(coalesce(item->>'variant', '')), ''), '') AS variant_key,
        COUNT(*) AS item_count
      FROM jsonb_array_elements(v_items) AS items(item)
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_ORDER_ITEM';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_item_product_id := (v_item->>'product_id')::UUID;
    v_item_quantity   := (v_item->>'quantity')::INTEGER;
    v_item_variant    := NULLIF(trim(coalesce(v_item->>'variant', '')), '');

    IF v_item_product_id IS NULL THEN RAISE EXCEPTION 'Produit introuvable dans un article'; END IF;
    IF v_item_quantity IS NULL OR v_item_quantity < 1 THEN RAISE EXCEPTION 'Quantite invalide'; END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = v_item_product_id AND seller_id = p_seller_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;

    v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

    IF v_has_variants THEN
      IF v_item_variant IS NULL THEN RAISE EXCEPTION 'Variante obligatoire'; END IF;

      SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
      INTO v_variant_matches, v_variant_stock
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
      WHERE variant_label(elem, ord) = v_item_variant;

      IF v_variant_matches = 0 THEN RAISE EXCEPTION 'Variante invalide'; END IF;
      IF v_variant_matches > 1 THEN RAISE EXCEPTION 'Variante ambigue'; END IF;
      IF v_variant_stock < v_item_quantity THEN RAISE EXCEPTION 'variant_insufficient_stock'; END IF;
    ELSE
      IF v_product.stock < v_item_quantity THEN
        RAISE EXCEPTION 'Stock insuffisant. Il reste % unite(s) disponible(s).', v_product.stock;
      END IF;
    END IF;

    v_item_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, v_product.price);
    v_computed_total  := v_computed_total + (v_item_unit_price * v_item_quantity);
  END LOOP;

  v_cod_amount := CASE
    WHEN p_cod_amount IS NOT NULL AND p_cod_amount <> '' THEN p_cod_amount::NUMERIC(10,2)
    ELSE v_computed_total
  END;
  IF v_cod_amount < 0 THEN RAISE EXCEPTION 'Montant COD invalide'; END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE id = p_customer_id AND seller_id = p_seller_id
    FOR UPDATE;
    IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Client introuvable'; END IF;
  ELSE
    SELECT id INTO v_customer_id
    FROM customers
    WHERE seller_id = p_seller_id AND phone = v_customer_phone
    ORDER BY created_at ASC LIMIT 1
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
      INSERT INTO customers (
        seller_id, name, phone, address, city, email,
        customer_governorate, customer_city, customer_delegation,
        customer_address, customer_landmark, customer_postal_code,
        delivery_notes, address_version
      )
      VALUES (
        p_seller_id, v_customer_name, v_customer_phone,
        v_customer_address, v_customer_governorate, v_customer_email,
        v_customer_governorate, v_customer_city, v_customer_delegation,
        v_customer_address, v_customer_landmark, v_customer_postal_code,
        v_delivery_notes, v_address_version
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  UPDATE customers
  SET
    name = v_customer_name,
    phone = v_customer_phone,
    address = COALESCE(address, v_customer_address),
    city = COALESCE(city, v_customer_governorate),
    email = COALESCE(v_customer_email, email),
    customer_governorate = COALESCE(customer_governorate, v_customer_governorate),
    customer_city = COALESCE(customer_city, v_customer_city),
    customer_delegation = COALESCE(customer_delegation, v_customer_delegation),
    customer_address = COALESCE(customer_address, v_customer_address),
    customer_landmark = COALESCE(customer_landmark, v_customer_landmark),
    customer_postal_code = COALESCE(customer_postal_code, v_customer_postal_code),
    delivery_notes = COALESCE(delivery_notes, v_delivery_notes),
    address_version = GREATEST(address_version, v_address_version)
  WHERE id = v_customer_id AND seller_id = p_seller_id;

  IF v_customer_address IS NOT NULL
     OR v_customer_city IS NOT NULL
     OR v_customer_governorate IS NOT NULL
     OR v_customer_landmark IS NOT NULL
  THEN
    v_address_normalized := CASE
      WHEN v_address_version >= 2 THEN lower(trim(concat_ws('|',
        coalesce(v_customer_governorate, ''),
        coalesce(v_customer_city, ''),
        coalesce(v_customer_delegation, ''),
        coalesce(v_customer_address, ''),
        coalesce(v_customer_landmark, ''),
        coalesce(v_customer_postal_code, '')
      )))
      ELSE lower(trim(coalesce(v_customer_address, '')))
    END;

    v_city_normalized := CASE
      WHEN v_address_version >= 2 THEN ''
      ELSE lower(trim(coalesce(v_customer_city, '')))
    END;

    INSERT INTO customer_addresses (
      seller_id, customer_id, address, city,
      customer_governorate, customer_city, customer_delegation,
      customer_address, customer_landmark, customer_postal_code,
      delivery_notes, address_version,
      address_normalized, city_normalized,
      use_count, first_used_at, last_used_at
    )
    VALUES (
      p_seller_id, v_customer_id, v_customer_address, v_customer_governorate,
      v_customer_governorate, v_customer_city, v_customer_delegation,
      v_customer_address, v_customer_landmark, v_customer_postal_code,
      v_delivery_notes, v_address_version,
      v_address_normalized, v_city_normalized,
      1, now(), now()
    )
    ON CONFLICT (customer_id, address_normalized, city_normalized)
    DO UPDATE SET
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      customer_governorate = EXCLUDED.customer_governorate,
      customer_city = EXCLUDED.customer_city,
      customer_delegation = EXCLUDED.customer_delegation,
      customer_address = EXCLUDED.customer_address,
      customer_landmark = EXCLUDED.customer_landmark,
      customer_postal_code = EXCLUDED.customer_postal_code,
      delivery_notes = EXCLUDED.delivery_notes,
      address_version = GREATEST(customer_addresses.address_version, EXCLUDED.address_version),
      use_count = customer_addresses.use_count + 1,
      last_used_at = now();
  END IF;

  v_first_product_id := (v_items->0->>'product_id')::UUID;
  v_first_variant    := NULLIF(trim(coalesce(v_items->0->>'variant', '')), '');
  v_first_quantity   := (v_items->0->>'quantity')::INTEGER;

  INSERT INTO orders (
    seller_id, customer_id, product_id, variant,
    quantity, cod_amount, unit_cost, notes, status, tracking_token,
    customer_email, customer_address, customer_city,
    customer_governorate, customer_delegation, customer_landmark,
    customer_postal_code, delivery_notes, address_version
  )
  VALUES (
    p_seller_id, v_customer_id, v_first_product_id, v_first_variant,
    v_first_quantity, v_cod_amount,
    (SELECT COALESCE(cost, 0) FROM products WHERE id = v_first_product_id AND seller_id = p_seller_id),
    v_notes, p_status,
    replace(gen_random_uuid()::text, '-', ''),
    v_customer_email, v_customer_address, v_customer_city,
    v_customer_governorate, v_customer_delegation, v_customer_landmark,
    v_customer_postal_code, v_delivery_notes, v_address_version
  )
  RETURNING id INTO v_order_id;

  SELECT COALESCE(name, '') INTO v_seller_name
  FROM sellers WHERE id = p_seller_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_item_product_id := (v_item->>'product_id')::UUID;
    v_item_quantity   := (v_item->>'quantity')::INTEGER;
    v_item_variant    := NULLIF(trim(coalesce(v_item->>'variant', '')), '');

    SELECT * INTO v_product
    FROM products WHERE id = v_item_product_id AND seller_id = p_seller_id;

    v_has_variants    := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;
    v_item_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, v_product.price);
    v_item_unit_cost  := COALESCE(v_product.cost, 0);

    INSERT INTO order_items (order_id, seller_id, product_id, variant, quantity, unit_price, unit_cost)
    VALUES (v_order_id, p_seller_id, v_item_product_id, v_item_variant, v_item_quantity, v_item_unit_price, v_item_unit_cost);

    IF v_has_variants THEN
      SELECT jsonb_agg(
        CASE
          WHEN variant_label(elem, ord) = v_item_variant
            THEN jsonb_set(elem, '{qty}', to_jsonb((elem->>'qty')::INTEGER - v_item_quantity))
          ELSE elem
        END
        ORDER BY ord
      )
      INTO v_updated_variants
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord);

      v_new_stock := sum_variant_stock(v_updated_variants);

      UPDATE products
      SET variants = v_updated_variants, stock = v_new_stock
      WHERE id = v_item_product_id AND seller_id = p_seller_id;
    ELSE
      v_new_stock := v_product.stock - v_item_quantity;

      UPDATE products
      SET stock = v_new_stock
      WHERE id = v_item_product_id AND seller_id = p_seller_id;
    END IF;

    INSERT INTO stock_movements (
      seller_id, product_id, variant_name,
      quantity_before, quantity_after, delta,
      movement_type, order_id, notes, created_by, created_by_name
    )
    VALUES (
      p_seller_id, v_item_product_id, v_item_variant,
      v_product.stock, v_new_stock, -v_item_quantity,
      'order', v_order_id, 'Commande creee', v_actor, v_seller_name
    );
  END LOOP;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (v_order_id, p_status, v_actor);

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_items(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_items(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;

DROP FUNCTION IF EXISTS create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION create_order_with_stock(
  p_seller_id             UUID,
  p_product_id            UUID,
  p_quantity              INTEGER,
  p_customer_name         TEXT,
  p_customer_phone        TEXT,
  p_customer_address      TEXT    DEFAULT NULL,
  p_customer_city         TEXT    DEFAULT NULL,
  p_customer_id           UUID    DEFAULT NULL,
  p_variant               TEXT    DEFAULT NULL,
  p_cod_amount            NUMERIC DEFAULT NULL,
  p_notes                 TEXT    DEFAULT NULL,
  p_status                TEXT    DEFAULT 'new',
  p_changed_by            UUID    DEFAULT NULL,
  p_customer_email        TEXT    DEFAULT NULL,
  p_customer_governorate  TEXT    DEFAULT NULL,
  p_customer_delegation   TEXT    DEFAULT NULL,
  p_customer_landmark     TEXT    DEFAULT NULL,
  p_customer_postal_code  TEXT    DEFAULT NULL,
  p_delivery_notes        TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product                 products%ROWTYPE;
  v_customer_id             UUID;
  v_order_id                UUID;
  v_customer_name           TEXT := NULLIF(trim(coalesce(p_customer_name, '')), '');
  v_customer_phone          TEXT := NULLIF(trim(coalesce(p_customer_phone, '')), '');
  v_customer_address        TEXT := NULLIF(trim(coalesce(p_customer_address, '')), '');
  v_customer_city           TEXT := NULLIF(trim(coalesce(p_customer_city, '')), '');
  v_customer_governorate    TEXT := NULLIF(trim(coalesce(p_customer_governorate, p_customer_city, '')), '');
  v_customer_delegation     TEXT := NULLIF(trim(coalesce(p_customer_delegation, '')), '');
  v_customer_landmark       TEXT := NULLIF(trim(coalesce(p_customer_landmark, '')), '');
  v_customer_postal_code    TEXT := NULLIF(regexp_replace(coalesce(p_customer_postal_code, ''), '\D', '', 'g'), '');
  v_delivery_notes          TEXT := NULLIF(trim(coalesce(p_delivery_notes, '')), '');
  v_customer_email          TEXT := NULLIF(trim(coalesce(p_customer_email, '')), '');
  v_variant                 TEXT := NULLIF(trim(coalesce(p_variant, '')), '');
  v_notes                   TEXT := NULLIF(trim(coalesce(p_notes, '')), '');
  v_cod_amount              NUMERIC(10,2);
  v_has_variants            BOOLEAN;
  v_variant_matches         INTEGER := 0;
  v_variant_stock           INTEGER := 0;
  v_updated_variants        JSONB;
  v_new_stock               INTEGER;
  v_seller_name             TEXT := '';
  v_seller_plan             TEXT;
  v_subscription_end        TIMESTAMPTZ;
  v_monthly_orders          INTEGER := 0;
  v_actor                   UUID;
  v_address_version         SMALLINT := 1;
  v_address_normalized      TEXT;
  v_city_normalized         TEXT;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_seller_id IS NULL THEN RAISE EXCEPTION 'Vendeur introuvable'; END IF;
  IF p_product_id IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantite invalide'; END IF;
  IF v_customer_name IS NULL THEN RAISE EXCEPTION 'Nom client obligatoire'; END IF;
  IF v_customer_phone IS NULL THEN RAISE EXCEPTION 'Telephone client obligatoire'; END IF;

  IF p_status NOT IN ('pending', 'new') THEN
    RAISE EXCEPTION 'INVALID_STATUS_ON_CREATE:%', p_status;
  END IF;

  IF v_customer_postal_code IS NOT NULL AND v_customer_postal_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_POSTAL_CODE';
  END IF;

  IF p_customer_governorate IS NOT NULL
     OR p_customer_landmark IS NOT NULL
     OR p_customer_postal_code IS NOT NULL
     OR p_delivery_notes IS NOT NULL
  THEN
    v_address_version := 2;

    IF v_customer_governorate IS NULL THEN RAISE EXCEPTION 'Gouvernorat obligatoire'; END IF;
    IF v_customer_city IS NULL THEN RAISE EXCEPTION 'Ville ou delegation obligatoire'; END IF;
    IF v_customer_address IS NULL THEN RAISE EXCEPTION 'Adresse detaillee obligatoire'; END IF;
    IF v_customer_landmark IS NULL THEN RAISE EXCEPTION 'Repere livreur obligatoire'; END IF;
  END IF;

  SELECT plan, subscription_end
  INTO v_seller_plan, v_subscription_end
  FROM sellers
  WHERE id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Vendeur introuvable'; END IF;

  IF v_subscription_end IS NOT NULL AND v_subscription_end < now() THEN
    RAISE EXCEPTION 'SHOP_INACTIVE';
  END IF;

  IF COALESCE(v_seller_plan, 'starter') = 'starter' THEN
    SELECT COUNT(*)
    INTO v_monthly_orders
    FROM orders
    WHERE seller_id = p_seller_id
      AND deleted_at IS NULL
      AND created_at >= date_trunc('month', now());

    IF v_monthly_orders >= 100 THEN
      RAISE EXCEPTION 'LIMIT_REACHED';
    END IF;
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_changed_by
    ELSE auth.uid()
  END;

  SELECT *
  INTO v_product
  FROM products
  WHERE id = p_product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;

  v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

  IF v_has_variants THEN
    IF v_variant IS NULL THEN RAISE EXCEPTION 'Variante obligatoire'; END IF;

    SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
    INTO v_variant_matches, v_variant_stock
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
    WHERE variant_label(elem, ord) = v_variant;

    IF v_variant_matches = 0 THEN RAISE EXCEPTION 'Variante invalide'; END IF;
    IF v_variant_matches > 1 THEN RAISE EXCEPTION 'Variante ambigue'; END IF;
    IF v_variant_stock < p_quantity THEN RAISE EXCEPTION 'variant_insufficient_stock'; END IF;
  ELSE
    IF v_product.stock < p_quantity THEN
      RAISE EXCEPTION 'Stock insuffisant. Il reste % unite(s) disponible(s).', v_product.stock;
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
      INSERT INTO customers (
        seller_id, name, phone, address, city, email,
        customer_governorate, customer_city, customer_delegation,
        customer_address, customer_landmark, customer_postal_code,
        delivery_notes, address_version
      )
      VALUES (
        p_seller_id, v_customer_name, v_customer_phone,
        v_customer_address, v_customer_governorate, v_customer_email,
        v_customer_governorate, v_customer_city, v_customer_delegation,
        v_customer_address, v_customer_landmark, v_customer_postal_code,
        v_delivery_notes, v_address_version
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  UPDATE customers
  SET
    name = v_customer_name,
    phone = v_customer_phone,
    address = COALESCE(address, v_customer_address),
    city = COALESCE(city, v_customer_governorate),
    email = COALESCE(v_customer_email, email),
    customer_governorate = COALESCE(customer_governorate, v_customer_governorate),
    customer_city = COALESCE(customer_city, v_customer_city),
    customer_delegation = COALESCE(customer_delegation, v_customer_delegation),
    customer_address = COALESCE(customer_address, v_customer_address),
    customer_landmark = COALESCE(customer_landmark, v_customer_landmark),
    customer_postal_code = COALESCE(customer_postal_code, v_customer_postal_code),
    delivery_notes = COALESCE(delivery_notes, v_delivery_notes),
    address_version = GREATEST(address_version, v_address_version)
  WHERE id = v_customer_id
    AND seller_id = p_seller_id;

  IF v_customer_address IS NOT NULL
     OR v_customer_city IS NOT NULL
     OR v_customer_governorate IS NOT NULL
     OR v_customer_landmark IS NOT NULL
  THEN
    v_address_normalized := CASE
      WHEN v_address_version >= 2 THEN lower(trim(concat_ws('|',
        coalesce(v_customer_governorate, ''),
        coalesce(v_customer_city, ''),
        coalesce(v_customer_delegation, ''),
        coalesce(v_customer_address, ''),
        coalesce(v_customer_landmark, ''),
        coalesce(v_customer_postal_code, '')
      )))
      ELSE lower(trim(coalesce(v_customer_address, '')))
    END;

    v_city_normalized := CASE
      WHEN v_address_version >= 2 THEN ''
      ELSE lower(trim(coalesce(v_customer_city, '')))
    END;

    INSERT INTO customer_addresses (
      seller_id, customer_id, address, city,
      customer_governorate, customer_city, customer_delegation,
      customer_address, customer_landmark, customer_postal_code,
      delivery_notes, address_version,
      address_normalized, city_normalized,
      use_count, first_used_at, last_used_at
    )
    VALUES (
      p_seller_id, v_customer_id, v_customer_address, v_customer_governorate,
      v_customer_governorate, v_customer_city, v_customer_delegation,
      v_customer_address, v_customer_landmark, v_customer_postal_code,
      v_delivery_notes, v_address_version,
      v_address_normalized, v_city_normalized,
      1, now(), now()
    )
    ON CONFLICT (customer_id, address_normalized, city_normalized)
    DO UPDATE SET
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      customer_governorate = EXCLUDED.customer_governorate,
      customer_city = EXCLUDED.customer_city,
      customer_delegation = EXCLUDED.customer_delegation,
      customer_address = EXCLUDED.customer_address,
      customer_landmark = EXCLUDED.customer_landmark,
      customer_postal_code = EXCLUDED.customer_postal_code,
      delivery_notes = EXCLUDED.delivery_notes,
      address_version = GREATEST(customer_addresses.address_version, EXCLUDED.address_version),
      use_count = customer_addresses.use_count + 1,
      last_used_at = now();
  END IF;

  INSERT INTO orders (
    seller_id, customer_id, product_id, variant,
    quantity, cod_amount, unit_cost, notes, status, tracking_token,
    customer_email, customer_address, customer_city,
    customer_governorate, customer_delegation, customer_landmark,
    customer_postal_code, delivery_notes, address_version
  )
  VALUES (
    p_seller_id, v_customer_id, p_product_id, v_variant,
    p_quantity, v_cod_amount, COALESCE(v_product.cost, 0), v_notes, p_status,
    replace(gen_random_uuid()::text, '-', ''),
    v_customer_email, v_customer_address, v_customer_city,
    v_customer_governorate, v_customer_delegation, v_customer_landmark,
    v_customer_postal_code, v_delivery_notes, v_address_version
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

  INSERT INTO order_items (order_id, seller_id, product_id, variant, quantity, unit_price, unit_cost)
  VALUES (v_order_id, p_seller_id, p_product_id, v_variant, p_quantity, v_cod_amount / NULLIF(p_quantity, 0), COALESCE(v_product.cost, 0));

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (v_order_id, p_status, v_actor);

  SELECT COALESCE(name, '') INTO v_seller_name
  FROM sellers
  WHERE id = p_seller_id;

  INSERT INTO stock_movements (
    seller_id, product_id, variant_name,
    quantity_before, quantity_after, delta,
    movement_type, order_id, notes, created_by, created_by_name
  )
  VALUES (
    p_seller_id, p_product_id, v_variant,
    v_product.stock, v_new_stock, -p_quantity,
    'order', v_order_id, 'Commande creee', v_actor, v_seller_name
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

DROP FUNCTION IF EXISTS search_orders(UUID, TEXT, UUID[], INTEGER);
CREATE OR REPLACE FUNCTION search_orders(
  p_seller_id UUID,
  p_search TEXT,
  p_customer_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  cod_amount NUMERIC,
  status TEXT,
  variant TEXT,
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ,
  customer_address TEXT,
  customer_city TEXT,
  customer_governorate TEXT,
  customer_delegation TEXT,
  customer_landmark TEXT,
  customer_postal_code TEXT,
  delivery_notes TEXT,
  address_version SMALLINT,
  customer JSONB,
  product JSONB,
  items JSONB
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    o.id,
    o.cod_amount,
    o.status,
    o.variant,
    o.quantity,
    o.notes,
    o.created_at,
    o.customer_address,
    o.customer_city,
    o.customer_governorate,
    o.customer_delegation,
    o.customer_landmark,
    o.customer_postal_code,
    o.delivery_notes,
    o.address_version,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'phone', c.phone,
      'customer_governorate', c.customer_governorate,
      'customer_city', c.customer_city,
      'customer_delegation', c.customer_delegation,
      'customer_address', c.customer_address,
      'customer_landmark', c.customer_landmark,
      'customer_postal_code', c.customer_postal_code,
      'delivery_notes', c.delivery_notes,
      'address_version', c.address_version,
      'address', c.address,
      'city', c.city
    ) AS customer,
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'price', p.price
    ) AS product,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'variant', oi.variant,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'unit_cost', oi.unit_cost,
        'product', jsonb_build_object('id', op.id, 'name', op.name, 'price', op.price)
      ) ORDER BY oi.created_at)
      FROM order_items oi
      JOIN products op ON op.id = oi.product_id
      WHERE oi.order_id = o.id
    ), '[]'::jsonb) AS items
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN products p ON p.id = o.product_id
  WHERE o.seller_id = p_seller_id
    AND o.deleted_at IS NULL
    AND (
      (
        cardinality(p_customer_ids) > 0
        AND o.customer_id = ANY(p_customer_ids)
      )
      OR (
        p_search IS NOT NULL
        AND length(btrim(p_search)) >= 2
        AND o.id::text ILIKE btrim(p_search) || '%'
      )
    )
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION search_orders(UUID, TEXT, UUID[], INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_orders(UUID, TEXT, UUID[], INTEGER) TO authenticated, service_role;

DROP FUNCTION IF EXISTS create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION create_public_order_with_otp(
  p_slug                  TEXT,
  p_email                 TEXT,
  p_code_hash             TEXT,
  p_product_id            UUID    DEFAULT NULL,
  p_quantity              INTEGER DEFAULT 1,
  p_customer_name         TEXT    DEFAULT NULL,
  p_customer_phone        TEXT    DEFAULT NULL,
  p_customer_address      TEXT    DEFAULT NULL,
  p_customer_city         TEXT    DEFAULT NULL,
  p_variant               TEXT    DEFAULT NULL,
  p_notes                 TEXT    DEFAULT NULL,
  p_customer_governorate  TEXT    DEFAULT NULL,
  p_customer_delegation   TEXT    DEFAULT NULL,
  p_customer_landmark     TEXT    DEFAULT NULL,
  p_customer_postal_code  TEXT    DEFAULT NULL,
  p_delivery_notes        TEXT    DEFAULT NULL,
  p_items                 JSONB   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp            order_otps%ROWTYPE;
  v_seller_id      UUID;
  v_order_id       UUID;
  v_tracking_token TEXT;
  v_order_error    TEXT;
  v_effective_items JSONB;
BEGIN
  IF NOT is_service_role() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT id
  INTO v_seller_id
  FROM sellers
  WHERE slug = lower(trim(p_slug));

  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'SHOP_NOT_FOUND');
  END IF;

  SELECT *
  INTO v_otp
  FROM order_otps
  WHERE seller_id = v_seller_id
    AND slug = lower(trim(p_slug))
    AND email = lower(trim(p_email))
    AND verified = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP_NOT_FOUND');
  END IF;

  IF v_otp.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP_EXPIRED');
  END IF;

  IF v_otp.attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP_TOO_MANY_ATTEMPTS');
  END IF;

  IF v_otp.code_hash <> p_code_hash THEN
    UPDATE order_otps
    SET attempts = LEAST(attempts + 1, 5)
    WHERE id = v_otp.id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', CASE
        WHEN v_otp.attempts + 1 >= 5 THEN 'OTP_TOO_MANY_ATTEMPTS'
        ELSE 'OTP_INCORRECT'
      END
    );
  END IF;

  v_effective_items := CASE
    WHEN p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_strip_nulls(jsonb_build_object(
            'product_id', item->>'product_id',
            'variant', NULLIF(trim(coalesce(item->>'variant', '')), ''),
            'quantity', item->>'quantity'
          ))
        ),
        '[]'::JSONB
      )
      FROM jsonb_array_elements(p_items) AS items(item)
    )
    WHEN p_product_id IS NOT NULL THEN jsonb_build_array(jsonb_build_object(
      'product_id', p_product_id,
      'variant', p_variant,
      'quantity', COALESCE(p_quantity, 1)
    ))
    ELSE NULL
  END;

  IF v_effective_items IS NULL OR jsonb_array_length(v_effective_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ORDER_CREATION_FAILED', 'detail', 'Au moins un article est obligatoire');
  END IF;

  BEGIN
    v_order_id := create_order_with_items(
      p_seller_id             => v_seller_id,
      p_customer_name         => p_customer_name,
      p_customer_phone        => p_customer_phone,
      p_customer_address      => p_customer_address,
      p_customer_city         => p_customer_city,
      p_customer_id           => NULL,
      p_notes                 => p_notes,
      p_status                => 'pending',
      p_changed_by            => NULL,
      p_customer_email        => lower(trim(p_email)),
      p_customer_governorate  => p_customer_governorate,
      p_customer_delegation   => p_customer_delegation,
      p_customer_landmark     => p_customer_landmark,
      p_customer_postal_code  => p_customer_postal_code,
      p_delivery_notes        => p_delivery_notes,
      p_cod_amount            => NULL,
      p_items                 => v_effective_items
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_order_error = MESSAGE_TEXT;
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ORDER_CREATION_FAILED',
      'detail', v_order_error
    );
  END;

  UPDATE order_otps
  SET verified = true
  WHERE id = v_otp.id
    AND verified = false;

  SELECT tracking_token
  INTO v_tracking_token
  FROM orders
  WHERE id = v_order_id
    AND seller_id = v_seller_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'tracking_token', v_tracking_token,
    'seller_id', v_seller_id
  );
END;
$$;

REVOKE ALL ON FUNCTION create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO service_role;

NOTIFY pgrst, 'reload schema';
