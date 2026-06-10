-- Agrège les métriques financières côté serveur pour éviter de charger
-- des dizaines de milliers de lignes en mémoire côté applicatif.
-- Produit des totaux exacts même quand la query orders est tronquée.
-- Important : la fonction vérifie l'accès au seller demandé avant d'agréger,
-- car SECURITY DEFINER contourne les policies RLS de la table orders.

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_seller_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
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

  WITH order_base AS (
    SELECT
      id,
      cod_amount,
      quantity,
      unit_cost,
      status
    FROM orders
    WHERE seller_id = p_seller_id
      AND deleted_at IS NULL
      AND created_at >= p_start
      AND created_at <= p_end
  ),
  delivery_fees AS (
    SELECT
      d.order_id,
      SUM(COALESCE(d.fee, 0)) AS fee
    FROM deliveries d
    INNER JOIN order_base o ON o.id = d.order_id
    WHERE d.cod_collected = true
    GROUP BY d.order_id
  )
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(
      CASE WHEN o.status = 'delivered' THEN o.cod_amount ELSE 0 END
    ), 0),
    'total_fees', COALESCE(SUM(
      CASE WHEN o.status = 'delivered' THEN COALESCE(d.fee, 0) ELSE 0 END
    ), 0),
    'total_cost', COALESCE(SUM(
      CASE WHEN o.status = 'delivered'
        THEN COALESCE(o.unit_cost, 0) * o.quantity
        ELSE 0 END
    ), 0),
    'order_count', COUNT(o.id),
    'shipped_count', COUNT(*) FILTER (WHERE o.status = 'shipped'),
    'delivered_count', COUNT(*) FILTER (WHERE o.status = 'delivered'),
    'returned_count', COUNT(*) FILTER (WHERE o.status = 'returned'),
    'cancelled_count', COUNT(*) FILTER (WHERE o.status = 'cancelled')
  )
  INTO v_result
  FROM order_base o
  LEFT JOIN delivery_fees d ON d.order_id = o.id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_analytics_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_analytics_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
