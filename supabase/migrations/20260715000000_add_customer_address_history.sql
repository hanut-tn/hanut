-- Historique des adresses client.
-- Un client peut commander plusieurs fois avec des adresses différentes :
-- on conserve toutes les adresses utilisées sans écraser l'adresse principale
-- de la fiche client à chaque nouvelle commande.

CREATE TABLE IF NOT EXISTS customer_addresses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id          UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  customer_id        UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address            TEXT,
  city               TEXT,
  address_normalized TEXT NOT NULL,
  city_normalized    TEXT NOT NULL,
  use_count          INTEGER NOT NULL DEFAULT 1 CHECK (use_count >= 0),
  first_used_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_addresses_not_empty
    CHECK (address_normalized <> '' OR city_normalized <> ''),
  CONSTRAINT customer_addresses_unique_value
    UNIQUE (customer_id, address_normalized, city_normalized)
);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_addresses_team_read" ON customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_team_insert" ON customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_team_update" ON customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_team_delete" ON customer_addresses;

CREATE POLICY "customer_addresses_team_read"
  ON customer_addresses FOR SELECT
  USING (get_team_role(seller_id) IN ('admin', 'operator', 'readonly'));

CREATE POLICY "customer_addresses_team_insert"
  ON customer_addresses FOR INSERT
  WITH CHECK (can_write_seller(seller_id));

CREATE POLICY "customer_addresses_team_update"
  ON customer_addresses FOR UPDATE
  USING (can_write_seller(seller_id))
  WITH CHECK (can_write_seller(seller_id));

CREATE POLICY "customer_addresses_team_delete"
  ON customer_addresses FOR DELETE
  USING (get_team_role(seller_id) = 'admin');

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_last_used
  ON customer_addresses(customer_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_seller_customer
  ON customer_addresses(seller_id, customer_id);

-- Snapshot adresse par commande : l'historique d'une commande ne doit pas
-- changer si l'adresse principale du client est modifiée plus tard.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_city TEXT;

-- Backfill minimal depuis l'adresse principale actuelle.
INSERT INTO customer_addresses (
  seller_id,
  customer_id,
  address,
  city,
  address_normalized,
  city_normalized,
  use_count,
  first_used_at,
  last_used_at
)
SELECT
  seller_id,
  id,
  NULLIF(trim(coalesce(address, '')), ''),
  NULLIF(trim(coalesce(city, '')), ''),
  lower(trim(coalesce(address, ''))),
  lower(trim(coalesce(city, ''))),
  GREATEST(order_count, 1),
  created_at,
  now()
FROM customers
WHERE NULLIF(trim(coalesce(address, '')), '') IS NOT NULL
   OR NULLIF(trim(coalesce(city, '')), '') IS NOT NULL
ON CONFLICT (customer_id, address_normalized, city_normalized) DO NOTHING;

UPDATE orders AS o
SET
  customer_address = COALESCE(o.customer_address, c.address),
  customer_city    = COALESCE(o.customer_city, c.city)
FROM customers AS c
WHERE o.customer_id = c.id
  AND o.seller_id = c.seller_id
  AND (o.customer_address IS NULL OR o.customer_city IS NULL);

CREATE OR REPLACE FUNCTION create_order_with_stock(
  p_seller_id        UUID,
  p_product_id       UUID,
  p_quantity         INTEGER,
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_customer_address TEXT    DEFAULT NULL,
  p_customer_city    TEXT    DEFAULT NULL,
  p_customer_id      UUID    DEFAULT NULL,
  p_variant          TEXT    DEFAULT NULL,
  p_cod_amount       NUMERIC DEFAULT NULL,
  p_notes            TEXT    DEFAULT NULL,
  p_status           TEXT    DEFAULT 'new',
  p_changed_by       UUID    DEFAULT NULL,
  p_customer_email   TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product          products%ROWTYPE;
  v_customer_id      UUID;
  v_order_id         UUID;
  v_customer_name    TEXT    := NULLIF(trim(coalesce(p_customer_name,    '')), '');
  v_customer_phone   TEXT    := NULLIF(trim(coalesce(p_customer_phone,   '')), '');
  v_customer_address TEXT    := NULLIF(trim(coalesce(p_customer_address, '')), '');
  v_customer_city    TEXT    := NULLIF(trim(coalesce(p_customer_city,    '')), '');
  v_customer_email   TEXT    := NULLIF(trim(coalesce(p_customer_email,   '')), '');
  v_variant          TEXT    := NULLIF(trim(coalesce(p_variant,          '')), '');
  v_notes            TEXT    := NULLIF(trim(coalesce(p_notes,            '')), '');
  v_cod_amount       NUMERIC(10,2);
  v_has_variants     BOOLEAN;
  v_variant_matches  INTEGER := 0;
  v_variant_stock    INTEGER := 0;
  v_updated_variants JSONB;
  v_new_stock        INTEGER;
  v_seller_name      TEXT    := '';
  v_seller_plan      TEXT;
  v_subscription_end TIMESTAMPTZ;
  v_monthly_orders   INTEGER := 0;
  v_actor            UUID;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_seller_id  IS NULL THEN RAISE EXCEPTION 'Vendeur introuvable'; END IF;
  IF p_product_id IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF v_customer_name  IS NULL THEN RAISE EXCEPTION 'Nom client obligatoire'; END IF;
  IF v_customer_phone IS NULL THEN RAISE EXCEPTION 'Téléphone client obligatoire'; END IF;

  IF p_status NOT IN ('pending', 'new') THEN
    RAISE EXCEPTION 'INVALID_STATUS_ON_CREATE:%', p_status;
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

    -- ⚠️ SYNCHRONISER avec PLAN_LIMITS.starter.ordersPerMonth dans apps/web/lib/constants.ts (actuellement 100).
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
    IF v_variant IS NULL THEN
      RAISE EXCEPTION 'Variante obligatoire';
    END IF;

    SELECT COUNT(*), COALESCE(MAX((elem->>'qty')::INTEGER), 0)
    INTO v_variant_matches, v_variant_stock
    FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
    WHERE variant_label(elem, ord) = v_variant;

    IF v_variant_matches = 0 THEN RAISE EXCEPTION 'Variante invalide'; END IF;
    IF v_variant_matches > 1 THEN RAISE EXCEPTION 'Variante ambiguë'; END IF;
    IF v_variant_stock < p_quantity THEN RAISE EXCEPTION 'variant_insufficient_stock'; END IF;
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
      INSERT INTO customers (seller_id, name, phone, address, city, email)
      VALUES (p_seller_id, v_customer_name, v_customer_phone, v_customer_address, v_customer_city, v_customer_email)
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  UPDATE customers
  SET
    name    = v_customer_name,
    phone   = v_customer_phone,
    -- Ne pas écraser l'adresse principale avec chaque commande :
    -- l'historique complet est dans customer_addresses.
    address = COALESCE(address, v_customer_address),
    city    = COALESCE(city, v_customer_city),
    email   = COALESCE(v_customer_email, email)
  WHERE id = v_customer_id
    AND seller_id = p_seller_id;

  IF v_customer_address IS NOT NULL OR v_customer_city IS NOT NULL THEN
    INSERT INTO customer_addresses (
      seller_id,
      customer_id,
      address,
      city,
      address_normalized,
      city_normalized,
      use_count,
      first_used_at,
      last_used_at
    )
    VALUES (
      p_seller_id,
      v_customer_id,
      v_customer_address,
      v_customer_city,
      lower(trim(coalesce(v_customer_address, ''))),
      lower(trim(coalesce(v_customer_city, ''))),
      1,
      now(),
      now()
    )
    ON CONFLICT (customer_id, address_normalized, city_normalized)
    DO UPDATE SET
      address      = EXCLUDED.address,
      city         = EXCLUDED.city,
      use_count    = customer_addresses.use_count + 1,
      last_used_at = now();
  END IF;

  INSERT INTO orders (
    seller_id, customer_id, product_id, variant,
    quantity, cod_amount, unit_cost, notes, status, tracking_token,
    customer_email, customer_address, customer_city
  )
  VALUES (
    p_seller_id, v_customer_id, p_product_id, v_variant,
    p_quantity, v_cod_amount, COALESCE(v_product.cost, 0), v_notes, p_status,
    replace(gen_random_uuid()::text, '-', ''),
    v_customer_email, v_customer_address, v_customer_city
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
        stock    = v_new_stock
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
    'order', v_order_id, 'Commande créée', v_actor, v_seller_name
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_stock(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT
) TO authenticated, service_role;

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
    name    = 'Client anonymisé',
    phone   = '00000000',
    email   = NULL,
    address = NULL,
    city    = NULL,
    notes   = NULL
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
    customer_email   = NULL,
    customer_address = NULL,
    customer_city    = NULL
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
