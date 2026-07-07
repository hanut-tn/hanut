-- Complète anonymize_customer v3 (20260731) : les activity_logs liés aux
-- commandes (entity_type='order') embarquent aussi le nom du client en clair
-- dans la description ("a créé une commande pour {nom}", suppression, etc.).
-- Le nettoyage précédent ne ciblait que entity_type='customer', laissant ces
-- logs de commande intacts jusqu'à leur purge (365 jours).

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
    notes   = NULL,
    address = NULL,
    city    = NULL,
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

  UPDATE orders
  SET
    customer_email       = NULL,
    customer_address     = NULL,
    customer_city         = NULL,
    customer_governorate = NULL,
    customer_delegation  = NULL,
    customer_landmark    = NULL,
    customer_postal_code = NULL,
    delivery_notes       = NULL,
    address_version      = 1
  WHERE seller_id   = p_seller_id
    AND customer_id = p_customer_id;

  IF to_regclass('public.customer_addresses') IS NOT NULL THEN
    DELETE FROM customer_addresses
    WHERE seller_id   = p_seller_id
      AND customer_id = p_customer_id;
  END IF;

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

    -- Correction v4 : les logs de commande du client anonymisé contiennent
    -- aussi son nom en clair dans la description.
    UPDATE activity_logs
    SET
      description = 'Commande liée à un client anonymisé',
      metadata = '{}'::jsonb
    WHERE seller_id = p_seller_id
      AND entity_type = 'order'
      AND entity_id::TEXT IN (
        SELECT id::TEXT FROM orders
        WHERE seller_id = p_seller_id AND customer_id = p_customer_id
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION anonymize_customer(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_customer(UUID, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
