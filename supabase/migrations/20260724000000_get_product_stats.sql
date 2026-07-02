-- RPC pour les statistiques d'un produit, lues depuis order_items.
-- Les requêtes sur orders.product_id sont erronées depuis 20260717 car
-- create_order_with_items laisse product_id = premier article uniquement ;
-- les commandes multi-articles ont donc des stats produit manquantes si
-- on filtre sur orders.product_id directement.

CREATE OR REPLACE FUNCTION get_product_stats(
  p_seller_id  UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT jsonb_build_object(
    'total_orders',
      COUNT(DISTINCT o.id) FILTER (WHERE o.deleted_at IS NULL),
    'total_revenue',
      COALESCE(SUM(oi.unit_price * oi.quantity)
        FILTER (WHERE o.status = 'delivered' AND o.deleted_at IS NULL), 0),
    'total_qty_sold',
      COALESCE(SUM(oi.quantity)
        FILTER (WHERE o.status = 'delivered' AND o.deleted_at IS NULL), 0),
    'this_month_qty',
      COALESCE(SUM(oi.quantity)
        FILTER (WHERE o.status = 'delivered'
                  AND o.deleted_at IS NULL
                  AND o.created_at >= date_trunc('month', now())), 0),
    'returned_count',
      COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'returned' AND o.deleted_at IS NULL),
    'has_blocking_orders',
      EXISTS(
        SELECT 1 FROM order_items AS check_oi
        WHERE check_oi.product_id = p_product_id
          AND check_oi.seller_id  = p_seller_id
        LIMIT 1
      ),
    'recent_orders',
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',            q.order_id,
            'cod_amount',    q.cod_amount,
            'status',        q.status,
            'created_at',    q.created_at,
            'quantity',      q.qty,
            'customer_name', q.customer_name
          ) ORDER BY q.created_at DESC
        )
        FROM (
          SELECT
            o2.id             AS order_id,
            o2.cod_amount,
            o2.status,
            o2.created_at,
            SUM(oi2.quantity) AS qty,
            c.name            AS customer_name
          FROM order_items oi2
          JOIN orders o2 ON o2.id = oi2.order_id
          LEFT JOIN customers c
            ON c.id = o2.customer_id AND c.seller_id = p_seller_id
          WHERE oi2.product_id = p_product_id
            AND oi2.seller_id  = p_seller_id
            AND o2.deleted_at  IS NULL
          GROUP BY o2.id, o2.cod_amount, o2.status, o2.created_at, c.name
          ORDER BY o2.created_at DESC
          LIMIT 5
        ) q
      ), '[]'::jsonb)
  ) INTO v_result
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = p_product_id
    AND oi.seller_id  = p_seller_id;

  RETURN v_result;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_order_items_product_seller
  ON order_items(seller_id, product_id);

REVOKE ALL ON FUNCTION get_product_stats(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_product_stats(UUID, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
