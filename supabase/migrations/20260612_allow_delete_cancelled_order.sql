-- Permettre le soft-delete des commandes annulées (cancelled).
-- Le stock a déjà été restauré lors de l'annulation —
-- aucune restauration supplémentaire n'est nécessaire ici.

CREATE OR REPLACE FUNCTION soft_delete_order_with_stock(
  p_seller_id UUID,
  p_order_id UUID,
  p_archived_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_seller_plan TEXT;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status NOT IN ('pending', 'new', 'confirmed', 'delivered', 'returned', 'cancelled') THEN
    RAISE EXCEPTION 'Une commande expédiée ne peut pas être supprimée. Attendez la livraison ou le retour.';
  END IF;

  SELECT COALESCE(plan, 'starter')
  INTO v_seller_plan
  FROM sellers
  WHERE id = p_seller_id;

  IF v_seller_plan = 'starter'
    AND v_order.status IN ('delivered', 'returned', 'cancelled')
  THEN
    RAISE EXCEPTION 'CANNOT_DELETE';
  END IF;

  -- Restaurer le stock uniquement pour les commandes actives (non résolues).
  -- delivered/returned/cancelled : stock déjà géré en amont.
  IF v_order.status IN ('pending', 'new', 'confirmed') THEN
    PERFORM adjust_order_stock(p_seller_id, p_order_id, v_order.quantity, 'order_cancel', 'Commande déplacée en corbeille', p_archived_by);
  END IF;

  UPDATE orders
  SET deleted_at = NOW(),
      archived_by = p_archived_by
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION soft_delete_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION soft_delete_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;
