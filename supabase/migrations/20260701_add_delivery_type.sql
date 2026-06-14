-- Ajoute deux modes de livraison :
-- - carrier : livraison via un transporteur supporté ;
-- - self    : livraison effectuée directement par la boutique.

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'carrier';

-- Message optionnel visible par le client sur la page de suivi.
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS vendor_note TEXT;

ALTER TABLE deliveries
  ALTER COLUMN carrier DROP NOT NULL;

-- Poser les contraintes séparément des ADD COLUMN rend la migration idempotente
-- même si une première exécution partielle a déjà créé les colonnes.
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_delivery_type_check,
  DROP CONSTRAINT IF EXISTS deliveries_carrier_check,
  DROP CONSTRAINT IF EXISTS deliveries_vendor_note_length_check;

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_delivery_type_check
    CHECK (delivery_type IN ('self', 'carrier')),
  ADD CONSTRAINT deliveries_carrier_check
    CHECK (
      (
        delivery_type = 'self'
        AND carrier IS NULL
        AND tracking_number IS NULL
        AND fee IS NULL
      )
      OR (
        delivery_type = 'carrier'
        AND carrier IN ('intigo', 'navex', 'adex', 'aramex', 'bestdelivery')
        AND vendor_note IS NULL
      )
    ),
  ADD CONSTRAINT deliveries_vendor_note_length_check
    CHECK (vendor_note IS NULL OR char_length(vendor_note) <= 1000);

-- L'ancienne signature à 6 paramètres est remplacée par une signature à 8.
-- Les appels PostgREST nommés existants restent compatibles grâce aux valeurs
-- par défaut de p_delivery_type et p_vendor_note.
DROP FUNCTION IF EXISTS create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT);

CREATE FUNCTION create_delivery_from_order(
  p_seller_id       UUID,
  p_user_id         UUID,
  p_order_id        UUID,
  p_delivery_type   TEXT    DEFAULT 'carrier',
  p_carrier         TEXT    DEFAULT NULL,
  p_tracking_number TEXT    DEFAULT NULL,
  p_fee             NUMERIC DEFAULT NULL,
  p_vendor_note     TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id UUID;
  v_actor       UUID;
  v_order_status TEXT;
  v_carrier       TEXT;
  v_tracking      TEXT;
  v_fee           NUMERIC;
  v_vendor_note   TEXT;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE WHEN is_service_role() THEN p_user_id ELSE auth.uid() END;

  IF p_delivery_type NOT IN ('self', 'carrier') THEN
    RAISE EXCEPTION 'INVALID_DELIVERY_TYPE';
  END IF;

  IF p_fee IS NOT NULL AND (p_fee < 0 OR p_fee > 100000) THEN
    RAISE EXCEPTION 'INVALID_DELIVERY_FEE';
  END IF;

  IF p_tracking_number IS NOT NULL AND char_length(trim(p_tracking_number)) > 200 THEN
    RAISE EXCEPTION 'TRACKING_NUMBER_TOO_LONG';
  END IF;

  IF p_vendor_note IS NOT NULL AND char_length(trim(p_vendor_note)) > 1000 THEN
    RAISE EXCEPTION 'VENDOR_NOTE_TOO_LONG';
  END IF;

  IF p_delivery_type = 'carrier' THEN
    v_carrier := NULLIF(trim(COALESCE(p_carrier, '')), '');
    IF v_carrier IS NULL
      OR v_carrier NOT IN ('intigo', 'navex', 'adex', 'aramex', 'bestdelivery')
    THEN
      RAISE EXCEPTION 'INVALID_CARRIER';
    END IF;

    v_tracking := NULLIF(trim(COALESCE(p_tracking_number, '')), '');
    v_fee := CASE WHEN p_fee IS NULL OR p_fee = 0 THEN NULL ELSE p_fee END;
    v_vendor_note := NULL;
  ELSE
    v_carrier := NULL;
    v_tracking := NULL;
    v_fee := NULL;
    v_vendor_note := NULLIF(left(trim(COALESCE(p_vendor_note, '')), 1000), '');
  END IF;

  SELECT status
  INTO v_order_status
  FROM orders
  WHERE id = p_order_id
    AND seller_id = p_seller_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR v_order_status <> 'confirmed' THEN
    RAISE EXCEPTION 'order_not_shippable';
  END IF;

  INSERT INTO deliveries (
    order_id, delivery_type, carrier, tracking_number, fee, vendor_note
  )
  VALUES (
    p_order_id, p_delivery_type, v_carrier, v_tracking, v_fee, v_vendor_note
  )
  RETURNING id INTO v_delivery_id;

  UPDATE orders
  SET status = 'shipped'
  WHERE id = p_order_id
    AND seller_id = p_seller_id;

  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'shipped', v_actor);

  RETURN v_delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_delivery_from_order(UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT)
  TO authenticated, service_role;

-- Finalise une livraison personnelle et encaisse son COD dans la même
-- transaction. Elle n'est pas marquée "reversée" : aucun transporteur ne doit
-- reverser les fonds au vendeur.
CREATE OR REPLACE FUNCTION mark_self_delivery_complete(
  p_seller_id   UUID,
  p_user_id     UUID,
  p_delivery_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id   UUID;
  v_old_status TEXT;
  v_actor      UUID;
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(can_write_seller(p_seller_id), false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE WHEN is_service_role() THEN p_user_id ELSE auth.uid() END;

  SELECT o.id, o.status
  INTO v_order_id, v_old_status
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id = p_delivery_id
    AND d.delivery_type = 'self'
    AND o.seller_id = p_seller_id
    AND o.deleted_at IS NULL
  FOR UPDATE OF d, o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SELF_DELIVERY_NOT_FOUND';
  END IF;

  IF v_old_status NOT IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION:%->delivered', v_old_status;
  END IF;

  UPDATE deliveries
  SET cod_collected = true,
      delivered_at = COALESCE(delivered_at, now())
  WHERE id = p_delivery_id;

  IF v_old_status IS DISTINCT FROM 'delivered' THEN
    UPDATE orders
    SET status = 'delivered'
    WHERE id = v_order_id
      AND seller_id = p_seller_id;

    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (v_order_id, 'delivered', v_actor);
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION mark_self_delivery_complete(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_self_delivery_complete(UUID, UUID, UUID)
  TO authenticated, service_role;

-- Le COD d'une livraison personnelle est encaissé directement. Il compte dans
-- le total collecté, mais jamais dans les reversements transporteur en attente.
CREATE OR REPLACE FUNCTION get_cod_summary(p_seller_id UUID)
RETURNS TABLE(
  total_collected_amount NUMERIC,
  total_reversed_amount NUMERIC,
  pending_reversal_count BIGINT,
  pending_reversal_amount NUMERIC,
  total_fees NUMERIC,
  total_deliveries BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_service_role()
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(o.cod_amount) FILTER (WHERE d.cod_collected), 0),
    COALESCE(SUM(d.cod_reversed_amount) FILTER (
      WHERE d.delivery_type = 'carrier' AND d.cod_reversed
    ), 0),
    COUNT(*) FILTER (
      WHERE d.delivery_type = 'carrier' AND d.cod_collected AND NOT d.cod_reversed
    ),
    COALESCE(SUM(o.cod_amount) FILTER (
      WHERE d.delivery_type = 'carrier' AND d.cod_collected AND NOT d.cod_reversed
    ), 0),
    COALESCE(SUM(COALESCE(d.fee, 0)), 0),
    COUNT(*)
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
               AND o.seller_id = p_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION get_cod_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cod_summary(UUID) TO authenticated, service_role;
