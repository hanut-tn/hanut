-- Préserver le sens historique du taux de livraison client :
-- commandes livrées / toutes les commandes actives du client.
-- La première version de la RPC utilisait livré / (livré + retourné),
-- ce qui changeait la métrique affichée dans la fiche client.

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

  WITH order_base AS (
    SELECT id, product_id, cod_amount, status, created_at
    FROM orders
    WHERE customer_id = p_customer_id
      AND seller_id = p_seller_id
      AND deleted_at IS NULL
  )
  SELECT jsonb_build_object(
    'total_spent', COALESCE(SUM(
      CASE WHEN status = 'delivered' THEN cod_amount ELSE 0 END
    ), 0),
    'order_count', COUNT(*),
    'delivered_count', COUNT(*) FILTER (WHERE status = 'delivered'),
    'returned_count', COUNT(*) FILTER (WHERE status = 'returned'),
    'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'delivery_rate', CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC /
        COUNT(*) * 100
      )
    END,
    'favorite_product', (
      SELECT p.name
      FROM order_base o2
      JOIN products p ON p.id = o2.product_id
      GROUP BY p.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    'last_order_at', MAX(created_at)
  )
  INTO v_result
  FROM order_base;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_customer_stats(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customer_stats(UUID, UUID) TO authenticated, service_role;
