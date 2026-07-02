-- Account deletion must also work on projects where optional feature tables
-- have not been installed yet. Dynamic SQL avoids resolving a missing table
-- before the existence check is evaluated.

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

  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.activity_logs WHERE seller_id = $1'
      USING p_seller_id;
  END IF;

  IF to_regclass('public.stock_movements') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.stock_movements WHERE seller_id = $1'
      USING p_seller_id;
  END IF;

  IF to_regclass('public.restock_orders') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.restock_orders WHERE seller_id = $1'
      USING p_seller_id;
  END IF;

  IF to_regclass('public.order_status_history') IS NOT NULL THEN
    EXECUTE '
      DELETE FROM public.order_status_history
      WHERE order_id IN (
        SELECT id FROM public.orders WHERE seller_id = $1
      )
    ' USING p_seller_id;
  END IF;

  IF to_regclass('public.cod_reversals') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.cod_reversals WHERE seller_id = $1'
      USING p_seller_id;
  END IF;

  DELETE FROM deliveries
    WHERE order_id IN (SELECT id FROM orders WHERE seller_id = p_seller_id);
  DELETE FROM orders    WHERE seller_id = p_seller_id;
  DELETE FROM customers WHERE seller_id = p_seller_id;
  DELETE FROM products  WHERE seller_id = p_seller_id;

  IF to_regclass('public.team_members') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.team_members WHERE seller_id = $1'
      USING p_seller_id;
  END IF;

  IF to_regclass('public.sms_templates') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.sms_templates WHERE seller_id = $1'
      USING p_seller_id;
  END IF;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.rate_limits WHERE identifier LIKE $1'
      USING p_seller_id::text || '%';
  END IF;

  DELETE FROM sellers WHERE id = p_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION delete_seller_account(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_seller_account(UUID, UUID) TO service_role;
