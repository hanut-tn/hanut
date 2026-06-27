-- Ferme l'ancienne policy FOR ALL créée dans la migration de base.
--
-- 20260726 supprimait orders_team_update, mais il restait la policy historique
-- "Sellers manage own orders" (FOR ALL) sur orders. Elle autorisait encore les
-- updates directs via PostgREST et contournait les RPC de transition de statut.

DROP POLICY IF EXISTS "Sellers manage own orders" ON orders;
DROP POLICY IF EXISTS "orders_team_update" ON orders;

-- Garde défensive si une future policy UPDATE ré-ouvre certains champs non
-- critiques : les transitions de statut doivent rester RPC-only.
CREATE OR REPLACE FUNCTION guard_order_critical_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'ORDER_CRITICAL_FIELD_DIRECT_UPDATE_FORBIDDEN';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_order_critical_fields ON orders;
CREATE TRIGGER guard_order_critical_fields
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION guard_order_critical_fields();

NOTIFY pgrst, 'reload schema';
