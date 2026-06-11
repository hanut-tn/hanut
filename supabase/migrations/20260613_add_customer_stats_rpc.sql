-- Calcule les statistiques d'un client côté SQL au lieu de charger
-- toutes ses commandes en mémoire applicative.
-- Remplace le SELECT unbounded dans api/customers/[id]/route.ts.

CREATE OR REPLACE FUNCTION get_customer_stats(
  p_customer_id UUID,
  p_seller_id UUID
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
    'total_spent', COALESCE(SUM(
      CASE WHEN o.status = 'delivered' THEN o.cod_amount ELSE 0 END
    ), 0),
    'order_count', COUNT(o.id),
    'delivered_count', COUNT(CASE WHEN o.status = 'delivered' THEN 1 END),
    'returned_count',  COUNT(CASE WHEN o.status = 'returned'  THEN 1 END),
    'cancelled_count', COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END),
    'delivery_rate', CASE
      WHEN COUNT(CASE WHEN o.status IN ('delivered', 'returned') THEN 1 END) = 0 THEN 0
      ELSE ROUND(
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::NUMERIC /
        COUNT(CASE WHEN o.status IN ('delivered', 'returned') THEN 1 END) * 100
      , 1)
    END,
    'favorite_product', (
      SELECT p.name
      FROM orders o2
      JOIN products p ON p.id = o2.product_id
      WHERE o2.customer_id = p_customer_id
        AND o2.seller_id = p_seller_id
        AND o2.deleted_at IS NULL
      GROUP BY p.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    'last_order_at', MAX(o.created_at)
  )
  INTO v_result
  FROM orders o
  WHERE o.customer_id = p_customer_id
    AND o.seller_id = p_seller_id
    AND o.deleted_at IS NULL;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_customer_stats(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customer_stats(UUID, UUID) TO authenticated, service_role;
