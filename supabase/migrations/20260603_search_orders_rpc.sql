CREATE OR REPLACE FUNCTION search_orders(
  p_seller_id UUID,
  p_search TEXT,
  p_customer_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  cod_amount NUMERIC,
  status TEXT,
  variant TEXT,
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ,
  customer JSONB,
  product JSONB
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    o.id,
    o.cod_amount,
    o.status,
    o.variant,
    o.quantity,
    o.notes,
    o.created_at,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'phone', c.phone,
      'city', c.city
    ) AS customer,
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'price', p.price
    ) AS product
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN products p ON p.id = o.product_id
  WHERE o.seller_id = p_seller_id
    AND o.deleted_at IS NULL
    AND (
      (
        cardinality(p_customer_ids) > 0
        AND o.customer_id = ANY(p_customer_ids)
      )
      OR (
        p_search IS NOT NULL
        AND length(btrim(p_search)) >= 2
        AND o.id::text ILIKE btrim(p_search) || '%'
      )
    )
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION search_orders(UUID, TEXT, UUID[], INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_orders(UUID, TEXT, UUID[], INTEGER) TO authenticated, service_role;
