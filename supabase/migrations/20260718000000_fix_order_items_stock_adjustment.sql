-- Corrige le bug de restauration de stock pour les commandes multi-articles.
--
-- Avant ce correctif, cancel_order_with_stock, cancel_pending_order_with_stock,
-- soft_delete_order_with_stock et restore_trashed_order_with_stock appelaient
-- adjust_order_stock(... v_order.quantity ...), qui ne traitait que le premier
-- article (orders.product_id / orders.quantity / orders.variant). Pour une
-- commande multi-articles, le stock des articles 2..N n'était jamais restauré.
--
-- Solution : nouveau helper interne adjust_order_items_stock qui itère sur
-- order_items et ajuste le stock de chaque article. Les quatre RPCs le
-- remplacent désormais à la place de adjust_order_stock.
--
-- adjust_order_stock reste inchangé — il est toujours utilisé par
-- soft_delete_order_with_stock (lien interne) et mark_delivery_cod_collected
-- (rollback shipped→confirmed). Ces chemins ne touchent pas le stock produit
-- et ne sont pas concernés par ce correctif.

-- ============================================================
-- Helper interne : ajuste le stock de tous les articles d'une commande.
-- p_delta_sign = +1 : restaurer le stock (annulation/suppression)
-- p_delta_sign = -1 : déduire le stock (restauration depuis corbeille)
-- Non exposé à authenticated — appelé uniquement par les RPCs ci-dessous.
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_order_items_stock(
  p_seller_id     UUID,
  p_order_id      UUID,
  p_delta_sign    INTEGER,
  p_movement_type TEXT,
  p_notes         TEXT,
  p_changed_by    UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item             order_items%ROWTYPE;
  v_product          products%ROWTYPE;
  v_has_variants     BOOLEAN;
  v_variant_matches  INTEGER;
  v_delta            INTEGER;
  v_updated_variants JSONB;
  v_new_stock        INTEGER;
  v_seller_name      TEXT := '';
BEGIN
  IF p_delta_sign NOT IN (1, -1) THEN
    RAISE EXCEPTION 'adjust_order_items_stock: p_delta_sign doit être +1 ou -1';
  END IF;

  SELECT COALESCE(name, '') INTO v_seller_name FROM sellers WHERE id = p_seller_id;

  FOR v_item IN
    SELECT * FROM order_items
    WHERE order_id  = p_order_id
      AND seller_id = p_seller_id
    ORDER BY created_at
  LOOP
    v_delta := p_delta_sign * v_item.quantity;

    SELECT *
    INTO v_product
    FROM products
    WHERE id        = v_item.product_id
      AND seller_id = p_seller_id
    FOR UPDATE;

    -- Produit supprimé depuis la commande : rien à ajuster.
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_has_variants := COALESCE(jsonb_array_length(v_product.variants), 0) > 0;

    IF v_has_variants AND v_item.variant IS NOT NULL THEN
      SELECT COUNT(*)
      INTO v_variant_matches
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord)
      WHERE variant_label(elem, ord) = v_item.variant;

      -- Variante supprimée depuis la commande : ignorer cet article.
      IF v_variant_matches = 0 THEN CONTINUE; END IF;

      SELECT jsonb_agg(
        CASE
          WHEN variant_label(elem, ord) = v_item.variant
            THEN jsonb_set(elem, '{qty}', to_jsonb((elem->>'qty')::INTEGER + v_delta))
          ELSE elem
        END
        ORDER BY ord
      )
      INTO v_updated_variants
      FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY AS e(elem, ord);

      v_new_stock := sum_variant_stock(v_updated_variants);

      UPDATE products
      SET variants = v_updated_variants,
          stock    = v_new_stock
      WHERE id        = v_product.id
        AND seller_id = p_seller_id;
    ELSE
      v_new_stock := v_product.stock + v_delta;

      UPDATE products
      SET stock = v_new_stock
      WHERE id        = v_product.id
        AND seller_id = p_seller_id;
    END IF;

    INSERT INTO stock_movements (
      seller_id, product_id, variant_name,
      quantity_before, quantity_after, delta,
      movement_type, order_id, notes,
      created_by, created_by_name
    )
    VALUES (
      p_seller_id, v_product.id, v_item.variant,
      v_product.stock, v_new_stock, v_delta,
      p_movement_type, p_order_id, p_notes,
      p_changed_by, v_seller_name
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION adjust_order_items_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_order_items_stock(UUID, UUID, INTEGER, TEXT, TEXT, UUID) TO service_role;

-- ============================================================
-- cancel_pending_order_with_stock
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_changed_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_actor UUID;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE WHEN is_service_role() THEN p_changed_by ELSE auth.uid() END;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Seules les commandes en attente peuvent être annulées ici';
  END IF;

  PERFORM adjust_order_items_stock(
    p_seller_id, p_order_id, 1, 'order_cancel', 'Commande annulée', v_actor
  );

  UPDATE orders
  SET status = 'cancelled'
  WHERE id        = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'cancelled', v_actor);
END;
$$;

REVOKE ALL ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_pending_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- cancel_order_with_stock
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_order_with_stock(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_changed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_actor UUID;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  v_actor := CASE WHEN is_service_role() THEN p_changed_by ELSE auth.uid() END;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  IF v_order.status NOT IN ('pending', 'new', 'confirmed', 'returned') THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_STATUS:%', v_order.status;
  END IF;

  PERFORM adjust_order_items_stock(
    p_seller_id, p_order_id, 1, 'order_cancel',
    CASE
      WHEN v_order.status = 'returned' THEN 'Commande retournée puis annulée'
      ELSE 'Commande annulée'
    END,
    v_actor
  );

  UPDATE orders
  SET status     = 'cancelled',
      updated_at = now()
  WHERE id        = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'cancelled', v_actor);
END;
$$;

REVOKE ALL ON FUNCTION cancel_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- soft_delete_order_with_stock
-- ============================================================

CREATE OR REPLACE FUNCTION soft_delete_order_with_stock(
  p_seller_id  UUID,
  p_order_id   UUID,
  p_archived_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order       orders%ROWTYPE;
  v_seller_plan TEXT;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
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
    PERFORM adjust_order_items_stock(
      p_seller_id, p_order_id, 1, 'order_cancel',
      'Commande déplacée en corbeille', p_archived_by
    );
  END IF;

  UPDATE orders
  SET deleted_at  = NOW(),
      archived_by = p_archived_by
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION soft_delete_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION soft_delete_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- restore_trashed_order_with_stock
-- ============================================================

CREATE OR REPLACE FUNCTION restore_trashed_order_with_stock(
  p_seller_id   UUID,
  p_order_id    UUID,
  p_restored_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_actor UUID;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE WHEN is_service_role() THEN p_restored_by ELSE auth.uid() END;

  SELECT *
  INTO v_order
  FROM orders
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable dans la corbeille'; END IF;
  IF v_order.deleted_at < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être restaurée après 30 jours dans la corbeille.';
  END IF;

  -- Re-déduire le stock uniquement pour les commandes dont le stock avait
  -- été restauré au moment de la mise en corbeille.
  IF v_order.status IN ('pending', 'new', 'confirmed') THEN
    PERFORM adjust_order_items_stock(
      p_seller_id, p_order_id, -1, 'order',
      'Commande restaurée depuis la corbeille', v_actor
    );
  END IF;

  UPDATE orders
  SET deleted_at  = NULL,
      archived_by = NULL
  WHERE id        = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION restore_trashed_order_with_stock(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_trashed_order_with_stock(UUID, UUID, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
