-- Anonymiser les données PII d'un client (droit à l'effacement, loi organique n° 2004-63).
-- Le client reste en base pour conserver l'intégrité référentielle des commandes.
-- Les champs PII sont écrasés par des valeurs neutres, irréversiblement.

CREATE OR REPLACE FUNCTION anonymize_customer(
  p_seller_id   UUID,
  p_customer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    address = NULL,
    city    = NULL,
    notes   = NULL,
    tags    = ARRAY[]::TEXT[]
  WHERE id        = p_customer_id
    AND seller_id = p_seller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND';
  END IF;

  -- Les anciens journaux liés à ce client ne doivent pas conserver son nom
  -- ou d'autres données personnelles dans description/metadata.
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    UPDATE activity_logs
    SET
      description = 'Données client anonymisées',
      metadata = '{}'::jsonb
    WHERE seller_id = p_seller_id
      AND entity_type = 'customer'
      AND entity_id = p_customer_id::TEXT;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION anonymize_customer(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_customer(UUID, UUID) TO authenticated, service_role;
