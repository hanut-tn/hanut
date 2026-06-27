-- Correction analytics : top_products et has_missing_cost (double modèle commande)
--
-- top_products agrgeait depuis orders.product_id (champ legacy snapshot du 1er article).
-- Pour une commande multi-articles, tout le cod_amount était attribué au 1er produit ;
-- les autres produits n'apparaissaient jamais dans le classement.
--
-- has_missing_cost vérifiait orders.unit_cost = 0 (champ legacy), générant des faux positifs
-- pour les commandes multi-articles dont les coûts sont dans order_items.
--
-- Les deux sections sont remplacées pour agréger depuis order_items.
-- Fallback legacy conservé pour les commandes sans order_items.

CREATE OR REPLACE FUNCTION get_analytics_data(
  p_seller_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_duration  INTERVAL    := p_to - p_from;
  v_prev_from TIMESTAMPTZ := p_from - v_duration - interval '1 millisecond';
  v_prev_to   TIMESTAMPTZ := p_from - interval '1 millisecond';
  v_summary   JSONB;
  v_prev_sum  JSONB;
  v_daily     JSONB;
  v_by_status JSONB;
  v_top_prod  JSONB;
  v_top_cust  JSONB;
  v_top_zones JSONB;
  v_carriers  JSONB;
BEGIN

  -- ── Current period summary ────────────────────────────────────────────
  SELECT jsonb_build_object(
    'order_count',     count(*),
    'delivered_count', count(*) FILTER (WHERE status = 'delivered'),
    'shipped_count',   count(*) FILTER (WHERE status = 'shipped'),
    'returned_count',  count(*) FILTER (WHERE status = 'returned'),
    'cancelled_count', count(*) FILTER (WHERE status = 'cancelled'),
    'total_revenue',   COALESCE(sum(cod_amount) FILTER (WHERE status = 'delivered'), 0),
    'total_cost', COALESCE((
      SELECT sum(COALESCE(oi_costs.cost, o2.unit_cost * o2.quantity))
      FROM orders o2
      LEFT JOIN (
        SELECT order_id, sum(unit_cost * quantity) AS cost
        FROM order_items
        GROUP BY order_id
      ) oi_costs ON oi_costs.order_id = o2.id
      WHERE o2.seller_id = p_seller_id
        AND o2.deleted_at IS NULL
        AND o2.status    = 'delivered'
        AND o2.created_at >= p_from
        AND o2.created_at <= p_to
    ), 0),
    'total_fees', COALESCE((
      SELECT sum(d.fee)
      FROM deliveries d
      JOIN orders o3 ON d.order_id = o3.id
      WHERE o3.seller_id  = p_seller_id
        AND o3.deleted_at IS NULL
        AND o3.status     = 'delivered'
        AND o3.created_at >= p_from
        AND o3.created_at <= p_to
    ), 0),
    'cod_pending', COALESCE(sum(cod_amount) FILTER (
      WHERE status IN ('pending', 'new', 'confirmed', 'shipped')
    ), 0),
    -- Commandes multi-articles : coût manquant si un article a unit_cost = 0.
    -- Commandes legacy sans order_items : fallback sur orders.unit_cost.
    'has_missing_cost', (
      EXISTS(
        SELECT 1
        FROM order_items oi
        JOIN orders ox ON ox.id = oi.order_id
        WHERE ox.seller_id  = p_seller_id
          AND ox.deleted_at IS NULL
          AND ox.status     = 'delivered'
          AND ox.created_at >= p_from
          AND ox.created_at <= p_to
          AND oi.unit_cost  = 0
      ) OR EXISTS(
        SELECT 1 FROM orders ox
        WHERE ox.seller_id  = p_seller_id
          AND ox.deleted_at IS NULL
          AND ox.status     = 'delivered'
          AND ox.created_at >= p_from
          AND ox.created_at <= p_to
          AND ox.unit_cost  = 0
          AND NOT EXISTS (SELECT 1 FROM order_items oi2 WHERE oi2.order_id = ox.id)
      )
    )
  ) INTO v_summary
  FROM orders o
  WHERE o.seller_id  = p_seller_id
    AND o.deleted_at IS NULL
    AND o.created_at >= p_from
    AND o.created_at <= p_to;

  -- ── Previous period summary ───────────────────────────────────────────
  SELECT jsonb_build_object(
    'order_count',     count(*),
    'delivered_count', count(*) FILTER (WHERE status = 'delivered'),
    'shipped_count',   count(*) FILTER (WHERE status = 'shipped'),
    'returned_count',  count(*) FILTER (WHERE status = 'returned'),
    'total_revenue',   COALESCE(sum(cod_amount) FILTER (WHERE status = 'delivered'), 0),
    'total_cost', COALESCE((
      SELECT sum(COALESCE(oi_costs.cost, o2.unit_cost * o2.quantity))
      FROM orders o2
      LEFT JOIN (
        SELECT order_id, sum(unit_cost * quantity) AS cost
        FROM order_items
        GROUP BY order_id
      ) oi_costs ON oi_costs.order_id = o2.id
      WHERE o2.seller_id  = p_seller_id
        AND o2.deleted_at IS NULL
        AND o2.status     = 'delivered'
        AND o2.created_at >= v_prev_from
        AND o2.created_at <= v_prev_to
    ), 0),
    'total_fees', COALESCE((
      SELECT sum(d.fee)
      FROM deliveries d
      JOIN orders o3 ON d.order_id = o3.id
      WHERE o3.seller_id  = p_seller_id
        AND o3.deleted_at IS NULL
        AND o3.status     = 'delivered'
        AND o3.created_at >= v_prev_from
        AND o3.created_at <= v_prev_to
    ), 0)
  ) INTO v_prev_sum
  FROM orders o
  WHERE o.seller_id  = p_seller_id
    AND o.deleted_at IS NULL
    AND o.created_at >= v_prev_from
    AND o.created_at <= v_prev_to;

  -- ── Daily chart data ─────────────────────────────────────────────────
  SELECT jsonb_agg(
    jsonb_build_object(
      'date',              gs.day::text,
      'order_count',       COALESCE(cnt.n,   0),
      'delivered_revenue', COALESCE(cnt.rev, 0)
    ) ORDER BY gs.day
  ) INTO v_daily
  FROM generate_series(p_from::date, p_to::date, '1 day'::interval) AS gs(day)
  LEFT JOIN (
    SELECT
      created_at::date AS d,
      count(*)::int    AS n,
      COALESCE(sum(cod_amount) FILTER (WHERE status = 'delivered'), 0) AS rev
    FROM orders
    WHERE seller_id  = p_seller_id
      AND deleted_at IS NULL
      AND created_at >= p_from
      AND created_at <= p_to
    GROUP BY created_at::date
  ) cnt ON cnt.d = gs.day::date;

  -- ── Status distribution ───────────────────────────────────────────────
  SELECT COALESCE(
    (SELECT jsonb_object_agg(status, cnt)
     FROM (
       SELECT status, count(*)::int AS cnt
       FROM orders
       WHERE seller_id  = p_seller_id
         AND deleted_at IS NULL
         AND created_at >= p_from
         AND created_at <= p_to
       GROUP BY status
     ) t),
    '{}'::jsonb
  ) INTO v_by_status;

  -- ── Top 5 products by delivered revenue ──────────────────────────────
  -- Agrège depuis order_items pour couvrir les commandes multi-articles.
  -- Chaque produit reçoit sum(unit_price * quantity) de ses propres lignes,
  -- indépendamment du premier article de la commande.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', t.pid, 'name', p.name, 'revenue', t.revenue, 'count', t.cnt)
    ORDER BY t.revenue DESC
  ), '[]'::jsonb) INTO v_top_prod
  FROM (
    SELECT
      oi.product_id                             AS pid,
      sum(oi.unit_price * oi.quantity)          AS revenue,
      count(DISTINCT oi.order_id)::int          AS cnt
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.seller_id  = p_seller_id
      AND o.deleted_at IS NULL
      AND o.status     = 'delivered'
      AND o.created_at >= p_from
      AND o.created_at <= p_to
    GROUP BY oi.product_id
    ORDER BY revenue DESC
    LIMIT 5
  ) t
  JOIN products p ON p.id = t.pid;

  -- ── Top 5 customers by delivered revenue ─────────────────────────────
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', t.cid, 'name', c.name, 'revenue', t.revenue, 'count', t.cnt)
    ORDER BY t.revenue DESC
  ), '[]'::jsonb) INTO v_top_cust
  FROM (
    SELECT customer_id AS cid, sum(cod_amount) AS revenue, count(*)::int AS cnt
    FROM orders
    WHERE seller_id  = p_seller_id
      AND deleted_at IS NULL
      AND status     = 'delivered'
      AND created_at >= p_from
      AND created_at <= p_to
      AND customer_id IS NOT NULL
    GROUP BY customer_id
    ORDER BY revenue DESC
    LIMIT 5
  ) t
  JOIN customers c ON c.id = t.cid;

  -- ── Top 5 zones ───────────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('zone', zone, 'count', cnt)
    ORDER BY cnt DESC
  ), '[]'::jsonb) INTO v_top_zones
  FROM (
    SELECT
      CASE
        WHEN COALESCE(customer_delegation, customer_city) IS NOT NULL
          AND customer_governorate IS NOT NULL
          THEN COALESCE(customer_delegation, customer_city) || ' · ' || customer_governorate
        WHEN COALESCE(customer_delegation, customer_city) IS NOT NULL
          THEN COALESCE(customer_delegation, customer_city)
        WHEN customer_governorate IS NOT NULL
          THEN customer_governorate
        ELSE NULL
      END AS zone,
      count(*)::int AS cnt
    FROM orders
    WHERE seller_id  = p_seller_id
      AND deleted_at IS NULL
      AND created_at >= p_from
      AND created_at <= p_to
    GROUP BY zone
    ORDER BY cnt DESC
    LIMIT 6
  ) t
  WHERE zone IS NOT NULL;

  -- ── Carrier stats ─────────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'key',            t.carrier_key,
      'delivery_type',  t.dtype,
      'shipped',        t.shipped,
      'delivered',      t.delivered,
      'cod_to_reverse', t.cod_to_reverse,
      'cod_pending',    t.cod_pending,
      'fees',           t.fees
    ) ORDER BY t.shipped DESC
  ), '[]'::jsonb) INTO v_carriers
  FROM (
    SELECT
      CASE WHEN d.delivery_type = 'self' THEN 'self' ELSE d.carrier END AS carrier_key,
      d.delivery_type AS dtype,
      count(*)::int AS shipped,
      (count(*) FILTER (WHERE o.status = 'delivered'))::int AS delivered,
      COALESCE(sum(o.cod_amount) FILTER (
        WHERE d.cod_collected AND NOT d.cod_reversed AND d.delivery_type = 'carrier'
      ), 0) AS cod_to_reverse,
      COALESCE(sum(o.cod_amount) FILTER (
        WHERE NOT d.cod_collected AND o.status IN ('shipped', 'delivered')
      ), 0) AS cod_pending,
      COALESCE(sum(d.fee), 0) AS fees
    FROM deliveries d
    JOIN orders o ON d.order_id = o.id
    WHERE o.seller_id  = p_seller_id
      AND o.deleted_at IS NULL
      AND o.created_at >= p_from
      AND o.created_at <= p_to
    GROUP BY carrier_key, d.delivery_type
  ) t;

  RETURN jsonb_build_object(
    'summary',       v_summary,
    'prev_summary',  v_prev_sum,
    'daily',         COALESCE(v_daily, '[]'::jsonb),
    'by_status',     COALESCE(v_by_status, '{}'::jsonb),
    'top_products',  COALESCE(v_top_prod,  '[]'::jsonb),
    'top_customers', COALESCE(v_top_cust,  '[]'::jsonb),
    'top_zones',     COALESCE(v_top_zones, '[]'::jsonb),
    'carrier_stats', COALESCE(v_carriers,  '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
