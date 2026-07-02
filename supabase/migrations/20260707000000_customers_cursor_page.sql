-- Keyset (cursor) pagination for customers list.
-- Replaces offset-based LIMIT/OFFSET with a compound cursor (sort_value + id),
-- giving index-backed performance regardless of page depth.
--
-- Caller passes p_cursor_value (last seen sort column value as text) +
-- p_cursor_id (last seen row id). NULL cursor = first page.
-- Returns up to p_limit + 1 rows; caller detects hasMore from row count.

DROP FUNCTION IF EXISTS get_customers_cursor_page(UUID, TEXT, INT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION get_customers_cursor_page(
  p_seller_id    UUID,
  p_sort_by      TEXT    DEFAULT 'name',
  p_limit        INT     DEFAULT 20,
  p_cursor_value TEXT    DEFAULT NULL,
  p_cursor_id    UUID    DEFAULT NULL,
  p_search       TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  phone            TEXT,
  address          TEXT,
  city             TEXT,
  created_at       TIMESTAMPTZ,
  tags             JSONB,
  order_count      BIGINT,
  total_spent_calc NUMERIC,
  last_order_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT := LEAST(GREATEST(p_limit, 1), 50) + 1;
BEGIN
  IF p_sort_by NOT IN ('name', 'total_spent', 'order_count', 'last_order') THEN
    RAISE EXCEPTION 'INVALID_SORT';
  END IF;

  IF NOT is_service_role()
    AND NOT COALESCE(
      get_team_role(p_seller_id) IN ('admin', 'operator', 'readonly'),
      false
    )
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_sort_by = 'order_count' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR (p_cursor_value IS NOT NULL AND (
              c.order_count < p_cursor_value::BIGINT
              OR (c.order_count = p_cursor_value::BIGINT AND c.id < p_cursor_id)
              OR c.order_count IS NULL
            ))
        OR (p_cursor_value IS NULL AND c.order_count IS NULL AND c.id < p_cursor_id)
      )
    ORDER BY c.order_count DESC NULLS LAST, c.id DESC
    LIMIT v_limit;

  ELSIF p_sort_by = 'total_spent' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR (p_cursor_value IS NOT NULL AND (
              c.total_spent_calc < p_cursor_value::NUMERIC
              OR (c.total_spent_calc = p_cursor_value::NUMERIC AND c.id < p_cursor_id)
              OR c.total_spent_calc IS NULL
            ))
        OR (p_cursor_value IS NULL AND c.total_spent_calc IS NULL AND c.id < p_cursor_id)
      )
    ORDER BY c.total_spent_calc DESC NULLS LAST, c.id DESC
    LIMIT v_limit;

  ELSIF p_sort_by = 'last_order' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR (p_cursor_value IS NOT NULL AND (
              c.last_order_at < p_cursor_value::TIMESTAMPTZ
              OR (c.last_order_at = p_cursor_value::TIMESTAMPTZ AND c.id < p_cursor_id)
              OR c.last_order_at IS NULL
            ))
        OR (p_cursor_value IS NULL AND c.last_order_at IS NULL AND c.id < p_cursor_id)
      )
    ORDER BY c.last_order_at DESC NULLS LAST, c.id DESC
    LIMIT v_limit;

  ELSE -- default: name ASC, id ASC
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.address, c.city, c.created_at, to_jsonb(c.tags),
           c.order_count::BIGINT, c.total_spent_calc, c.last_order_at
    FROM customers_with_stats c
    WHERE c.seller_id = p_seller_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
      AND (
        p_cursor_id IS NULL
        OR c.name > p_cursor_value
        OR (c.name = p_cursor_value AND c.id > p_cursor_id)
      )
    ORDER BY c.name ASC, c.id ASC
    LIMIT v_limit;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION get_customers_cursor_page(UUID, TEXT, INT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customers_cursor_page(UUID, TEXT, INT, TEXT, UUID, TEXT)
  TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_customers_cursor_name
  ON customers(seller_id, name ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_customers_cursor_order_count
  ON customers(seller_id, order_count DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_customers_cursor_total_spent
  ON customers(seller_id, total_spent DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_customers_cursor_last_order
  ON customers(seller_id, last_order_at DESC NULLS LAST, id DESC);

NOTIFY pgrst, 'reload schema';
