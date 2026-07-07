-- Prix par variante.
--
-- Nouveau format du JSONB products.variants :
--   Avant : [{ size?, color?, qty }]
--   Après : [{ size?, color?, qty, price? }]
-- price est optionnel — si absent (ou null, ou négatif), le prix du produit
-- (products.price) est utilisé. Aucun changement de schéma de table : variants
-- est déjà JSONB, et variant_label() ne lit que size/color/name, donc le
-- libellé des variantes existantes ne change pas.
--
-- create_order_with_items est recréée avec la résolution de prix suivante :
--   1. unit_price passé explicitement dans l'item (dashboard : le vendeur a un
--      champ "Prix unitaire" modifiable par ligne — remise, prix négocié).
--      Les commandes publiques ne peuvent PAS l'injecter :
--      create_public_order_with_otp ne transmet que product_id/variant/quantity.
--   2. price de la variante sélectionnée, si défini.
--   3. products.price en dernier recours (comportement historique inchangé).

COMMENT ON COLUMN products.variants IS
'Tableau JSONB de variantes. Format: [{size?, color?, qty, price?}]. Si price est absent sur une variante, le prix du produit (products.price) est utilisé.';

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
  v_variant_price           NUMERIC;
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
    -- customer_landmark intentionnellement optionnel (20260740)
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

    -- Prix de la variante si défini (ignoré si négatif / illisible).
    v_variant_price := NULL;
    IF v_has_variants AND v_item_variant IS NOT NULL THEN
      SELECT (elem->>'price')::NUMERIC
      INTO v_variant_price
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
      WHERE variant_label(elem, ord) = v_item_variant
        AND (elem->>'price') IS NOT NULL
      LIMIT 1;
      IF v_variant_price IS NOT NULL AND v_variant_price < 0 THEN
        v_variant_price := NULL;
      END IF;
    END IF;

    v_item_unit_price := COALESCE(
      (v_item->>'unit_price')::NUMERIC,  -- prix explicite (dashboard vendeur)
      v_variant_price,                   -- prix de la variante si défini
      v_product.price                    -- prix du produit en dernier recours
    );
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

    v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

    -- Même résolution de prix que dans la boucle de validation.
    v_variant_price := NULL;
    IF v_has_variants AND v_item_variant IS NOT NULL THEN
      SELECT (elem->>'price')::NUMERIC
      INTO v_variant_price
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
      WHERE variant_label(elem, ord) = v_item_variant
        AND (elem->>'price') IS NOT NULL
      LIMIT 1;
      IF v_variant_price IS NOT NULL AND v_variant_price < 0 THEN
        v_variant_price := NULL;
      END IF;
    END IF;

    v_item_unit_price := COALESCE(
      (v_item->>'unit_price')::NUMERIC,
      v_variant_price,
      v_product.price
    );
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

NOTIFY pgrst, 'reload schema';
