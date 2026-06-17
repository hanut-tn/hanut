-- Corrige le calcul du coût dans les trois RPCs analytics.
--
-- Avant ce correctif, les fonctions utilisaient :
--   COALESCE(orders.unit_cost, 0) * orders.quantity
-- qui ne reflète que le coût du premier article (snapshot legacy).
-- Pour les commandes multi-articles, cela sous-estimait les coûts
-- et surestimait le profit dans le dashboard et les exports CSV.
--
-- Correction : agrégation réelle sur order_items via un LEFT JOIN.
-- orders.cod_amount reste inchangé — il représente le total de la
-- commande entière et était déjà correct pour les calculs de revenu.

-- ============================================================
-- get_analytics_summary
-- ============================================================

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
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  WITH order_base AS (
    SELECT
      o.id,
      o.cod_amount,
      o.status,
      COALESCE(ic.items_cost, 0) AS items_cost
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(unit_cost * quantity) AS items_cost
      FROM order_items
      WHERE seller_id = p_seller_id
      GROUP BY order_id
    ) ic ON ic.order_id = o.id
    WHERE o.seller_id  = p_seller_id
      AND o.deleted_at IS NULL
      AND o.created_at >= p_start
      AND o.created_at <= p_end
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
      CASE WHEN o.status = 'delivered' THEN o.items_cost ELSE 0 END
    ), 0),
    'order_count',     COUNT(o.id),
    'shipped_count',   COUNT(*) FILTER (WHERE o.status = 'shipped'),
    'delivered_count', COUNT(*) FILTER (WHERE o.status = 'delivered'),
    'returned_count',  COUNT(*) FILTER (WHERE o.status = 'returned'),
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

-- ============================================================
-- get_dashboard_kpis
-- ============================================================

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
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue',   COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.cod_amount ELSE 0 END), 0),
    'total_fees',      0,
    'total_cost',      COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN COALESCE(ic.items_cost, 0) ELSE 0 END), 0),
    'order_count',     COUNT(*),
    'shipped_count',   COUNT(*) FILTER (WHERE o.status = 'shipped'),
    'delivered_count', COUNT(*) FILTER (WHERE o.status = 'delivered'),
    'returned_count',  COUNT(*) FILTER (WHERE o.status = 'returned'),
    'cancelled_count', COUNT(*) FILTER (WHERE o.status = 'cancelled')
  )
  INTO v_result
  FROM orders o
  LEFT JOIN (
    SELECT order_id, SUM(unit_cost * quantity) AS items_cost
    FROM order_items
    WHERE seller_id = p_seller_id
    GROUP BY order_id
  ) ic ON ic.order_id = o.id
  WHERE o.seller_id  = p_seller_id
    AND o.deleted_at IS NULL
    AND o.created_at >= p_start
    AND o.created_at <= p_end;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_dashboard_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- ============================================================
-- get_analytics_export
-- ============================================================

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
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RAISE EXCEPTION 'INVALID_DATE_RANGE';
  END IF;

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
  ),
  order_item_costs AS (
    SELECT oi.order_id, SUM(oi.unit_cost * oi.quantity) AS items_cost
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.seller_id   = p_seller_id
      AND o.deleted_at  IS NULL
      AND o.created_at >= p_start
      AND o.created_at <= p_end
    GROUP BY oi.order_id
  )
  SELECT
    o.created_at::DATE AS day,
    COUNT(o.id)::BIGINT AS order_count,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN o.cod_amount ELSE 0 END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN COALESCE(ic.items_cost, 0) ELSE 0 END), 0) AS costs,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN COALESCE(f.total_fee, 0) ELSE 0 END), 0) AS fees,
    COALESCE(SUM(CASE WHEN o.status = 'delivered'
      THEN o.cod_amount
         - COALESCE(f.total_fee, 0)
         - COALESCE(ic.items_cost, 0)
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
  LEFT JOIN order_fees f        ON f.order_id  = o.id
  LEFT JOIN order_item_costs ic ON ic.order_id = o.id
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

NOTIFY pgrst, 'reload schema';
