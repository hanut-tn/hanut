-- Transactional cascade delete for seller account.
-- Auth user deletion is handled server-side after this RPC succeeds.

CREATE OR REPLACE FUNCTION delete_seller_account(p_seller_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sellers WHERE id = p_seller_id AND id = p_user_id
  ) THEN
    RAISE EXCEPTION 'seller_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    WHERE o.seller_id = p_seller_id
      AND d.cod_collected = true
      AND d.cod_reversed = false
  ) THEN
    RAISE EXCEPTION 'cod_pending';
  END IF;

  DELETE FROM activity_logs    WHERE seller_id = p_seller_id;
  DELETE FROM stock_movements  WHERE seller_id = p_seller_id;
  DELETE FROM restock_orders   WHERE seller_id = p_seller_id;
  DELETE FROM order_status_history
    WHERE order_id IN (SELECT id FROM orders WHERE seller_id = p_seller_id);
  DELETE FROM deliveries
    WHERE order_id IN (SELECT id FROM orders WHERE seller_id = p_seller_id);
  DELETE FROM orders    WHERE seller_id = p_seller_id;
  DELETE FROM customers WHERE seller_id = p_seller_id;
  DELETE FROM products  WHERE seller_id = p_seller_id;
  DELETE FROM team_members WHERE seller_id = p_seller_id;

  -- Tables optionnelles — ignorer si elles n'existent pas encore
  BEGIN
    DELETE FROM sms_templates WHERE seller_id = p_seller_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM rate_limits WHERE identifier LIKE p_seller_id::text || '%';
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  DELETE FROM sellers WHERE id = p_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION delete_seller_account(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_seller_account(UUID, UUID) TO service_role;
