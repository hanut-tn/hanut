-- View for server-side customer sorting by computed stats.

CREATE OR REPLACE VIEW customers_with_stats AS
SELECT
  c.id,
  c.seller_id,
  c.name,
  c.phone,
  c.address,
  c.city,
  c.created_at,
  c.tags,
  c.order_count,
  COALESCE(SUM(
    CASE WHEN o.status = 'delivered' AND o.deleted_at IS NULL THEN o.cod_amount ELSE 0 END
  ), 0) AS total_spent_calc,
  MAX(CASE WHEN o.deleted_at IS NULL THEN o.created_at END) AS last_order_at
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.seller_id = c.seller_id
GROUP BY c.id, c.seller_id, c.name, c.phone, c.address, c.city, c.created_at, c.tags, c.order_count;
