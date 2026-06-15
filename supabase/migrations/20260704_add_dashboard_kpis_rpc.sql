-- Fallback KPI pour le dashboard quand get_analytics_summary échoue.
-- Retourne les mêmes champs que get_analytics_summary mais via un
-- COUNT/SUM direct, sans jointure delivery_fees.
-- Jamais de LIMIT — safe pour 1M+ commandes.

CREATE OR REPLACE FUNCTION get_dashboard_kpis(
  p_seller_id UUID,
  p_start     TIMESTAMPTZ,
  p_end       TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue',   COALESCE(SUM(CASE WHEN status = 'delivered' THEN cod_amount ELSE 0 END), 0),
    'total_fees',      0,
    'total_cost',      COALESCE(SUM(CASE WHEN status = 'delivered' THEN COALESCE(unit_cost, 0) * COALESCE(quantity, 1) ELSE 0 END), 0),
    'order_count',     COUNT(*),
    'shipped_count',   COUNT(*) FILTER (WHERE status = 'shipped'),
    'delivered_count', COUNT(*) FILTER (WHERE status = 'delivered'),
    'returned_count',  COUNT(*) FILTER (WHERE status = 'returned'),
    'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled')
  )
  INTO v_result
  FROM orders
  WHERE seller_id  = p_seller_id
    AND deleted_at IS NULL
    AND created_at >= p_start
    AND created_at <= p_end;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_dashboard_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
