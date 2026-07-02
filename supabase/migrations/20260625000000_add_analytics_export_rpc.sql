-- Agrégation quotidienne des analytics pour l'export CSV.
-- Remplace le chargement de toutes les commandes en mémoire dans la route
-- analytics/export, qui était O(jours × commandes) en JS.
-- Cette RPC renvoie une ligne par jour ayant au moins une commande.
-- Les jours sans commande sont remplis par la route (valeurs à zéro).

CREATE OR REPLACE FUNCTION get_analytics_export(
  p_seller_id UUID,
  p_start     TIMESTAMPTZ,
  p_end       TIMESTAMPTZ
)
RETURNS TABLE (
  day           DATE,
  order_count   BIGINT,
  revenue       NUMERIC,
  costs         NUMERIC,
  fees          NUMERIC,
  profit        NUMERIC,
  delivery_rate INTEGER,
  cod_pending   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RAISE EXCEPTION 'INVALID_DATE_RANGE';
  END IF;

  -- La route limite déjà la période, mais la RPC est aussi appelable
  -- directement par authenticated. Garder une limite SQL évite un export
  -- volontairement trop coûteux.
  IF p_end > p_start + INTERVAL '366 days' THEN
    RAISE EXCEPTION 'DATE_RANGE_TOO_LARGE';
  END IF;

  RETURN QUERY
  WITH order_fees AS (
    SELECT d.order_id, COALESCE(SUM(d.fee), 0) AS total_fee
    FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    WHERE o.seller_id   = p_seller_id
      AND o.deleted_at  IS NULL
      AND o.created_at >= p_start
      AND o.created_at <= p_end
    GROUP BY d.order_id
  )
  SELECT
    o.created_at::DATE AS day,
    COUNT(o.id)::BIGINT AS order_count,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN o.cod_amount ELSE 0 END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN COALESCE(o.unit_cost, 0) * o.quantity ELSE 0 END), 0) AS costs,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN COALESCE(f.total_fee, 0) ELSE 0 END), 0) AS fees,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN o.cod_amount
         - COALESCE(f.total_fee, 0)
         - COALESCE(o.unit_cost, 0) * o.quantity
      ELSE 0 END), 0) AS profit,
    CASE
      WHEN COUNT(CASE WHEN o.status IN ('shipped','delivered','returned') THEN 1 END) = 0
        THEN 0
      ELSE ROUND(
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::NUMERIC * 100
        / COUNT(CASE WHEN o.status IN ('shipped','delivered','returned') THEN 1 END)
      )::INTEGER
    END AS delivery_rate,
    COALESCE(SUM(CASE WHEN o.status IN ('pending','new','confirmed','shipped')
      THEN o.cod_amount ELSE 0 END), 0) AS cod_pending
  FROM orders o
  LEFT JOIN order_fees f ON f.order_id = o.id
  WHERE o.seller_id   = p_seller_id
    AND o.deleted_at  IS NULL
    AND o.created_at >= p_start
    AND o.created_at <= p_end
  GROUP BY o.created_at::DATE
  ORDER BY o.created_at::DATE ASC;
END;
$$;

REVOKE ALL ON FUNCTION get_analytics_export(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_analytics_export(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
