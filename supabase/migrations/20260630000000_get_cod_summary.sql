-- Résumé financier COD réservé aux admins de la boutique.
-- Les commandes archivées restent incluses : une créance COD ne disparaît
-- pas lorsqu'une commande est déplacée dans la corbeille.

CREATE OR REPLACE FUNCTION get_cod_summary(p_seller_id UUID)
RETURNS TABLE(
  total_collected_amount NUMERIC,
  total_reversed_amount  NUMERIC,
  pending_reversal_count BIGINT,
  pending_reversal_amount NUMERIC,
  total_fees             NUMERIC,
  total_deliveries       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(o.cod_amount) FILTER (WHERE d.cod_collected),                    0) AS total_collected_amount,
    COALESCE(SUM(d.cod_reversed_amount) FILTER (WHERE d.cod_reversed),             0) AS total_reversed_amount,
    COUNT(*) FILTER (WHERE d.cod_collected AND NOT d.cod_reversed)                   AS pending_reversal_count,
    COALESCE(SUM(o.cod_amount) FILTER (WHERE d.cod_collected AND NOT d.cod_reversed), 0) AS pending_reversal_amount,
    COALESCE(SUM(COALESCE(d.fee, 0)),                                              0) AS total_fees,
    COUNT(*)                                                                          AS total_deliveries
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
               AND o.seller_id = p_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION get_cod_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cod_summary(UUID) TO authenticated, service_role;
