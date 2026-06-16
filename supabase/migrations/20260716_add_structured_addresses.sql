-- Adresses structurees pour commandes COD.
-- Les colonnes legacy customers.address/customers.city et
-- orders.customer_address/orders.customer_city sont conservees.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_governorate TEXT,
  ADD COLUMN IF NOT EXISTS customer_city TEXT,
  ADD COLUMN IF NOT EXISTS customer_delegation TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_landmark TEXT,
  ADD COLUMN IF NOT EXISTS customer_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS address_version SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_governorate TEXT,
  ADD COLUMN IF NOT EXISTS customer_delegation TEXT,
  ADD COLUMN IF NOT EXISTS customer_landmark TEXT,
  ADD COLUMN IF NOT EXISTS customer_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS address_version SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE customer_addresses
  ADD COLUMN IF NOT EXISTS customer_governorate TEXT,
  ADD COLUMN IF NOT EXISTS customer_city TEXT,
  ADD COLUMN IF NOT EXISTS customer_delegation TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_landmark TEXT,
  ADD COLUMN IF NOT EXISTS customer_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS address_version SMALLINT NOT NULL DEFAULT 1;

UPDATE customers
SET
  customer_governorate = COALESCE(NULLIF(trim(customer_governorate), ''), NULLIF(trim(city), '')),
  customer_address     = COALESCE(NULLIF(trim(customer_address), ''), NULLIF(trim(address), ''))
WHERE customer_governorate IS NULL
   OR customer_address IS NULL;

UPDATE orders AS o
SET
  customer_governorate = COALESCE(
    NULLIF(trim(o.customer_governorate), ''),
    NULLIF(trim(o.customer_city), ''),
    NULLIF(trim(c.customer_governorate), ''),
    NULLIF(trim(c.city), '')
  ),
  customer_address = COALESCE(
    NULLIF(trim(o.customer_address), ''),
    NULLIF(trim(c.customer_address), ''),
    NULLIF(trim(c.address), '')
  )
FROM customers AS c
WHERE o.customer_id = c.id
  AND o.seller_id = c.seller_id
  AND (o.customer_governorate IS NULL OR o.customer_address IS NULL);

UPDATE customer_addresses AS ca
SET
  customer_governorate = COALESCE(NULLIF(trim(ca.customer_governorate), ''), NULLIF(trim(ca.city), ''), NULLIF(trim(c.customer_governorate), ''), NULLIF(trim(c.city), '')),
  customer_city        = COALESCE(NULLIF(trim(ca.customer_city), ''), NULLIF(trim(c.customer_city), '')),
  customer_delegation  = COALESCE(NULLIF(trim(ca.customer_delegation), ''), NULLIF(trim(c.customer_delegation), '')),
  customer_address     = COALESCE(NULLIF(trim(ca.customer_address), ''), NULLIF(trim(ca.address), ''), NULLIF(trim(c.customer_address), ''), NULLIF(trim(c.address), '')),
  customer_landmark    = COALESCE(NULLIF(trim(ca.customer_landmark), ''), NULLIF(trim(c.customer_landmark), '')),
  customer_postal_code = COALESCE(NULLIF(trim(ca.customer_postal_code), ''), NULLIF(trim(c.customer_postal_code), '')),
  delivery_notes       = COALESCE(NULLIF(trim(ca.delivery_notes), ''), NULLIF(trim(c.delivery_notes), ''))
FROM customers AS c
WHERE ca.customer_id = c.id
  AND ca.seller_id = c.seller_id;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_structured_address_required,
  DROP CONSTRAINT IF EXISTS customers_postal_code_format;

ALTER TABLE customers
  ADD CONSTRAINT customers_structured_address_required
    CHECK (
      address_version < 2
      OR (
        NULLIF(trim(COALESCE(customer_governorate, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_city, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_address, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_landmark, '')), '') IS NOT NULL
      )
    ),
  ADD CONSTRAINT customers_postal_code_format
    CHECK (customer_postal_code IS NULL OR customer_postal_code ~ '^[0-9]{4}$');

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_structured_address_required,
  DROP CONSTRAINT IF EXISTS orders_postal_code_format;

ALTER TABLE orders
  ADD CONSTRAINT orders_structured_address_required
    CHECK (
      address_version < 2
      OR (
        NULLIF(trim(COALESCE(customer_governorate, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_city, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_address, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_landmark, '')), '') IS NOT NULL
      )
    ),
  ADD CONSTRAINT orders_postal_code_format
    CHECK (customer_postal_code IS NULL OR customer_postal_code ~ '^[0-9]{4}$');

ALTER TABLE customer_addresses
  DROP CONSTRAINT IF EXISTS customer_addresses_structured_address_required,
  DROP CONSTRAINT IF EXISTS customer_addresses_postal_code_format;

ALTER TABLE customer_addresses
  ADD CONSTRAINT customer_addresses_structured_address_required
    CHECK (
      address_version < 2
      OR (
        NULLIF(trim(COALESCE(customer_governorate, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_city, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_address, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(customer_landmark, '')), '') IS NOT NULL
      )
    ),
  ADD CONSTRAINT customer_addresses_postal_code_format
    CHECK (customer_postal_code IS NULL OR customer_postal_code ~ '^[0-9]{4}$');

CREATE INDEX IF NOT EXISTS idx_customers_structured_location
  ON customers(seller_id, customer_governorate, customer_city);

CREATE INDEX IF NOT EXISTS idx_orders_structured_location_created
  ON orders(seller_id, customer_governorate, customer_city, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_addresses_structured_location
  ON customer_addresses(seller_id, customer_governorate, customer_city);

DROP FUNCTION IF EXISTS create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT
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

DROP FUNCTION IF EXISTS create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION create_public_order_with_otp(
  p_slug                  TEXT,
  p_email                 TEXT,
  p_code_hash             TEXT,
  p_product_id            UUID,
  p_quantity              INTEGER,
  p_customer_name         TEXT,
  p_customer_phone        TEXT,
  p_customer_address      TEXT DEFAULT NULL,
  p_customer_city         TEXT DEFAULT NULL,
  p_variant               TEXT DEFAULT NULL,
  p_notes                 TEXT DEFAULT NULL,
  p_customer_governorate  TEXT DEFAULT NULL,
  p_customer_delegation   TEXT DEFAULT NULL,
  p_customer_landmark     TEXT DEFAULT NULL,
  p_customer_postal_code  TEXT DEFAULT NULL,
  p_delivery_notes        TEXT DEFAULT NULL
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

  BEGIN
    v_order_id := create_order_with_stock(
      p_seller_id             => v_seller_id,
      p_product_id            => p_product_id,
      p_quantity              => p_quantity,
      p_customer_name         => p_customer_name,
      p_customer_phone        => p_customer_phone,
      p_customer_address      => p_customer_address,
      p_customer_city         => p_customer_city,
      p_customer_id           => NULL,
      p_variant               => p_variant,
      p_cod_amount            => NULL,
      p_notes                 => p_notes,
      p_status                => 'pending',
      p_changed_by            => NULL,
      p_customer_email        => lower(trim(p_email)),
      p_customer_governorate  => p_customer_governorate,
      p_customer_delegation   => p_customer_delegation,
      p_customer_landmark     => p_customer_landmark,
      p_customer_postal_code  => p_customer_postal_code,
      p_delivery_notes        => p_delivery_notes
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
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

DROP VIEW IF EXISTS customers_with_stats;
CREATE OR REPLACE VIEW customers_with_stats WITH (security_invoker = true) AS
SELECT
  c.id,
  c.seller_id,
  c.name,
  c.phone,
  c.customer_governorate,
  c.customer_city,
  c.customer_delegation,
  c.customer_address,
  c.customer_landmark,
  c.customer_postal_code,
  c.delivery_notes,
  c.address_version,
  c.address,
  c.city,
  c.created_at,
  c.tags,
  c.order_count,
  c.total_spent AS total_spent_calc,
  c.last_order_at
FROM customers c;

DROP FUNCTION IF EXISTS get_customers_cursor_page(UUID, TEXT, INT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION get_customers_cursor_page(
  p_seller_id    UUID,
  p_sort_by      TEXT    DEFAULT 'name',
  p_limit        INT     DEFAULT 20,
  p_cursor_value TEXT    DEFAULT NULL,
  p_cursor_id    UUID    DEFAULT NULL,
  p_search       TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id                     UUID,
  name                   TEXT,
  phone                  TEXT,
  customer_governorate   TEXT,
  customer_city          TEXT,
  customer_delegation    TEXT,
  customer_address       TEXT,
  customer_landmark      TEXT,
  customer_postal_code   TEXT,
  delivery_notes         TEXT,
  address_version        SMALLINT,
  address                TEXT,
  city                   TEXT,
  created_at             TIMESTAMPTZ,
  tags                   JSONB,
  order_count            BIGINT,
  total_spent_calc       NUMERIC,
  last_order_at          TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT := LEAST(GREATEST(p_limit, 1), 50) + 1;
BEGIN
  IF p_sort_by NOT IN ('name', 'total_spent', 'order_count', 'last_order') THEN
    RAISE EXCEPTION 'INVALID_SORT';
  END IF;

  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_sort_by = 'order_count' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.customer_governorate, c.customer_city,
           c.customer_delegation, c.customer_address, c.customer_landmark,
           c.customer_postal_code, c.delivery_notes, c.address_version,
           c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR (p_cursor_value IS NOT NULL AND (
          c.order_count < p_cursor_value::BIGINT
          OR (c.order_count = p_cursor_value::BIGINT AND c.id < p_cursor_id)
          OR c.order_count IS NULL
        ))
        OR (p_cursor_value IS NULL AND c.order_count IS NULL AND c.id < p_cursor_id)
      )
    ORDER BY c.order_count DESC NULLS LAST, c.id DESC
    LIMIT v_limit;

  ELSIF p_sort_by = 'total_spent' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.customer_governorate, c.customer_city,
           c.customer_delegation, c.customer_address, c.customer_landmark,
           c.customer_postal_code, c.delivery_notes, c.address_version,
           c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR (p_cursor_value IS NOT NULL AND (
          c.total_spent_calc < p_cursor_value::NUMERIC
          OR (c.total_spent_calc = p_cursor_value::NUMERIC AND c.id < p_cursor_id)
          OR c.total_spent_calc IS NULL
        ))
        OR (p_cursor_value IS NULL AND c.total_spent_calc IS NULL AND c.id < p_cursor_id)
      )
    ORDER BY c.total_spent_calc DESC NULLS LAST, c.id DESC
    LIMIT v_limit;

  ELSIF p_sort_by = 'last_order' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.customer_governorate, c.customer_city,
           c.customer_delegation, c.customer_address, c.customer_landmark,
           c.customer_postal_code, c.delivery_notes, c.address_version,
           c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR (p_cursor_value IS NOT NULL AND (
          c.last_order_at < p_cursor_value::TIMESTAMPTZ
          OR (c.last_order_at = p_cursor_value::TIMESTAMPTZ AND c.id < p_cursor_id)
          OR c.last_order_at IS NULL
        ))
        OR (p_cursor_value IS NULL AND c.last_order_at IS NULL AND c.id < p_cursor_id)
      )
    ORDER BY c.last_order_at DESC NULLS LAST, c.id DESC
    LIMIT v_limit;

  ELSE
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.customer_governorate, c.customer_city,
           c.customer_delegation, c.customer_address, c.customer_landmark,
           c.customer_postal_code, c.delivery_notes, c.address_version,
           c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR c.name > p_cursor_value
        OR (c.name = p_cursor_value AND c.id > p_cursor_id)
      )
    ORDER BY c.name ASC, c.id ASC
    LIMIT v_limit;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION get_customers_cursor_page(UUID, TEXT, INT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customers_cursor_page(UUID, TEXT, INT, TEXT, UUID, TEXT)
  TO authenticated, service_role;

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
  product JSONB
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
    ) AS product
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

CREATE OR REPLACE FUNCTION anonymize_customer(
  p_seller_id   UUID,
  p_customer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tags_type TEXT;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  UPDATE customers
  SET
    name = 'Client anonymisé',
    phone = '00000000',
    email = NULL,
    address = NULL,
    city = NULL,
    customer_governorate = NULL,
    customer_city = NULL,
    customer_delegation = NULL,
    customer_address = NULL,
    customer_landmark = NULL,
    customer_postal_code = NULL,
    delivery_notes = NULL,
    address_version = 1,
    notes = NULL
  WHERE id = p_customer_id
    AND seller_id = p_seller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND';
  END IF;

  DELETE FROM customer_addresses
  WHERE seller_id = p_seller_id
    AND customer_id = p_customer_id;

  UPDATE orders
  SET
    customer_email = NULL,
    customer_address = NULL,
    customer_city = NULL,
    customer_governorate = NULL,
    customer_delegation = NULL,
    customer_landmark = NULL,
    customer_postal_code = NULL,
    delivery_notes = NULL,
    address_version = 1
  WHERE seller_id = p_seller_id
    AND customer_id = p_customer_id;

  SELECT attribute.atttypid::regtype::TEXT
  INTO v_tags_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.customers'::regclass
    AND attribute.attname = 'tags'
    AND NOT attribute.attisdropped;

  IF v_tags_type = 'jsonb' THEN
    EXECUTE
      'UPDATE public.customers SET tags = ''[]''::jsonb WHERE id = $1 AND seller_id = $2'
      USING p_customer_id, p_seller_id;
  ELSIF v_tags_type = 'text[]' THEN
    EXECUTE
      'UPDATE public.customers SET tags = ARRAY[]::text[] WHERE id = $1 AND seller_id = $2'
      USING p_customer_id, p_seller_id;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_CUSTOMER_TAGS_TYPE:%', COALESCE(v_tags_type, 'missing');
  END IF;

  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    UPDATE activity_logs
    SET
      description = 'Données client anonymisées',
      metadata = '{}'::jsonb
    WHERE seller_id = p_seller_id
      AND entity_type = 'customer'
      AND entity_id::TEXT = p_customer_id::TEXT;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION anonymize_customer(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_customer(UUID, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
