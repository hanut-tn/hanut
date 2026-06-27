-- Ferme deux portes RLS qui permettaient à un client authentifié de contourner
-- la logique métier des RPC en écrivant directement sur des tables critiques.
--
-- 1. orders : supprime la policy UPDATE directe.
--    Aucun code applicatif ne fait de .update() sur orders — tout passe par des
--    RPC SECURITY DEFINER (update_order_status, cancel_order_with_stock, …).
--    Les RPC bypassent la RLS, donc cette suppression n'a aucun impact fonctionnel.
--
-- 2. deliveries : ajoute un trigger BEFORE UPDATE qui bloque les écritures directes
--    sur les champs critiques (cod_collected, cod_reversed, delivered_at).
--    Les champs de métadonnées (tracking_number, carrier_status, fee, vendor_note)
--    restent modifiables directement depuis updateDelivery().
--    Les RPC SECURITY DEFINER (mark_delivery_cod_collected, …) ont current_user =
--    'postgres' et ne sont donc pas bloqués par le trigger.

-- ============================================================
-- 1. orders : retrait de la policy UPDATE directe
-- ============================================================

DROP POLICY IF EXISTS "orders_team_update" ON orders;

-- ============================================================
-- 2. deliveries : trigger de garde sur les champs critiques COD
-- ============================================================

CREATE OR REPLACE FUNCTION guard_delivery_critical_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER (défaut) : le trigger s'exécute avec le current_user de
-- l'appelant. Les RPC SECURITY DEFINER ont current_user = 'postgres' ;
-- les appels authentifiés directs ont current_user = 'authenticated'.
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.cod_collected IS DISTINCT FROM OLD.cod_collected
      OR NEW.cod_reversed  IS DISTINCT FROM OLD.cod_reversed
      OR NEW.delivered_at  IS DISTINCT FROM OLD.delivered_at
    THEN
      RAISE EXCEPTION 'DELIVERY_CRITICAL_FIELD_DIRECT_UPDATE_FORBIDDEN';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_delivery_critical_fields ON deliveries;
CREATE TRIGGER guard_delivery_critical_fields
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION guard_delivery_critical_fields();

NOTIFY pgrst, 'reload schema';
