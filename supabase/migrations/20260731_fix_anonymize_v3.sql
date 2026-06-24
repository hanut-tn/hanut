-- CORRECTION LÉGALE CRITIQUE — anonymize_customer v3
-- La migration 20260713 ne couvrait pas les colonnes PII structurées ajoutées
-- par 20260716_add_structured_addresses.sql :
--   - Sur customers : customer_governorate, customer_city, customer_delegation,
--     customer_address, customer_landmark, customer_postal_code, delivery_notes
--   - Sur orders    : customer_governorate, customer_delegation, customer_landmark,
--     customer_postal_code, delivery_notes
--   - Table customer_addresses : non purgée (adresses historiques de livraison)
--
-- Cette version v3 corrige toutes ces lacunes.

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

  -- ── Données nominatives + adresses (champs legacy + champs structurés v2) ──
  UPDATE customers
  SET
    -- Champs nominatifs (couverts depuis v1)
    name    = 'Client anonymisé',
    phone   = '00000000',
    email   = NULL,
    notes   = NULL,
    -- Adresse legacy (couverte depuis v1)
    address = NULL,
    city    = NULL,
    -- Adresse structurée (ajoutée en 20260716 — correction v3)
    customer_governorate  = NULL,
    customer_city         = NULL,
    customer_delegation   = NULL,
    customer_address      = NULL,
    customer_landmark     = NULL,
    customer_postal_code  = NULL,
    delivery_notes        = NULL,
    address_version       = 1
  WHERE id = p_customer_id
    AND seller_id = p_seller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND';
  END IF;

  -- ── Données client dénormalisées sur orders ───────────────────────────────
  -- orders.customer_email (ajouté en 20260711)
  -- orders.customer_governorate/delegation/landmark/postal_code/delivery_notes
  -- (ajoutés en 20260716)
  UPDATE orders
  SET
    customer_email       = NULL,
    customer_governorate = NULL,
    customer_delegation  = NULL,
    customer_landmark    = NULL,
    customer_postal_code = NULL,
    delivery_notes       = NULL,
    address_version      = 1
  WHERE seller_id   = p_seller_id
    AND customer_id = p_customer_id;

  -- ── Historique des adresses de livraison ──────────────────────────────────
  -- Table ajoutée en 20260715 — ignorée dans les versions précédentes.
  IF to_regclass('public.customer_addresses') IS NOT NULL THEN
    DELETE FROM customer_addresses
    WHERE seller_id   = p_seller_id
      AND customer_id = p_customer_id;
  END IF;

  -- ── Tags ─────────────────────────────────────────────────────────────────
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

  -- ── Nettoyage logs d'activité ─────────────────────────────────────────────
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
