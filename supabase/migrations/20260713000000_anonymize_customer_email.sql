-- L'email ajouté aux clients est une donnée personnelle et doit être effacé
-- par le même workflow d'anonymisation que le téléphone et l'adresse.

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

  UPDATE orders
  SET customer_email = NULL
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
