-- Table des transitions de statut autorisées pour les commandes.
-- update_order_status vérifie cette table avant d'appliquer tout changement.
-- Les statuts delivered, returned, cancelled sont terminaux (aucune transition sortante).
-- shipped -> confirmed est un rollback technique lorsqu'une livraison non collectée est supprimée.

CREATE TABLE IF NOT EXISTS order_status_transitions (
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO order_status_transitions (from_status, to_status)
VALUES
  ('pending',   'new'),
  ('pending',   'cancelled'),
  ('new',       'confirmed'),
  ('new',       'cancelled'),
  ('confirmed', 'shipped'),
  ('confirmed', 'cancelled'),
  ('shipped',   'delivered'),
  ('shipped',   'returned'),
  ('shipped',   'confirmed')
ON CONFLICT DO NOTHING;

ALTER TABLE order_status_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transitions_select" ON order_status_transitions;

CREATE POLICY "transitions_select" ON order_status_transitions
  FOR SELECT TO authenticated USING (true);

-- Mettre à jour update_order_status pour vérifier la transition.
-- La garde can_write_seller et la logique v_actor sont conservées telles quelles.

CREATE OR REPLACE FUNCTION update_order_status(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_new_status TEXT,
  p_changed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_actor          UUID;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  IF p_new_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_changed_by
    ELSE auth.uid()
  END;

  SELECT status INTO v_current_status
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM order_status_transitions
    WHERE from_status = v_current_status
      AND to_status   = p_new_status
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION:%->%', v_current_status, p_new_status;
  END IF;

  UPDATE orders
  SET status     = p_new_status,
      updated_at = now()
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, p_new_status, v_actor);
END;
$$;

REVOKE ALL ON FUNCTION update_order_status(UUID, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, UUID, TEXT, UUID) TO authenticated, service_role;
