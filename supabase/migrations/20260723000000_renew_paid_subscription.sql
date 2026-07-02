-- RPC pure : renouvelle un abonnement payant existant.
-- Étend subscription_end depuis GREATEST(now(), subscription_end actuel)
-- pour éviter de perdre du temps restant lors d'un renouvellement anticipé.
-- Conserve le plan courant (pas de changement de plan ici — utiliser
-- activate_paid_subscription pour changer de plan).
-- Même interface p_activated_by que activate_paid_subscription :
-- UUID fondateur ou identifiant système pour futur webhook.

CREATE OR REPLACE FUNCTION renew_paid_subscription(
  p_seller_id     UUID,
  p_duration_days INTEGER DEFAULT 30,
  p_activated_by  TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_plan TEXT;
  v_prev_end     TIMESTAMPTZ;
  v_new_end      TIMESTAMPTZ;
  v_actor_uuid   UUID;
BEGIN
  IF NOT is_service_role() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_seller_id IS NULL THEN
    RAISE EXCEPTION 'p_seller_id obligatoire';
  END IF;
  IF COALESCE(p_duration_days, 0) <= 0 THEN
    RAISE EXCEPTION 'p_duration_days doit être > 0';
  END IF;

  SELECT plan, subscription_end
  INTO v_current_plan, v_prev_end
  FROM sellers
  WHERE id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boutique introuvable : %', p_seller_id;
  END IF;

  -- Extension depuis le maximum entre maintenant et la fin courante :
  -- renouvellement anticipé → le temps restant est préservé.
  v_new_end := GREATEST(now(), COALESCE(v_prev_end, now()))
               + (p_duration_days || ' days')::INTERVAL;

  UPDATE sellers
  SET
    subscription_status = 'active',
    subscription_end    = v_new_end
  WHERE id = p_seller_id;

  BEGIN
    v_actor_uuid := p_activated_by::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor_uuid := NULL;
  END;

  INSERT INTO activity_logs (
    seller_id, user_id, user_name,
    action_type, entity_type, entity_id,
    description, metadata
  )
  VALUES (
    p_seller_id,
    v_actor_uuid,
    COALESCE(p_activated_by, 'système'),
    'subscription_renewed',
    'seller',
    p_seller_id::TEXT,
    'a renouvelé l''abonnement ' || v_current_plan || ' (' || p_duration_days || ' jours)',
    jsonb_build_object(
      'plan',                      v_current_plan,
      'duration_days',             p_duration_days,
      'subscription_end',          v_new_end,
      'previous_subscription_end', v_prev_end
    )
  );

  RETURN jsonb_build_object(
    'seller_id',                 p_seller_id,
    'plan',                      v_current_plan,
    'subscription_status',       'active',
    'subscription_end',          v_new_end,
    'previous_subscription_end', v_prev_end
  );
END;
$$;

REVOKE ALL ON FUNCTION renew_paid_subscription(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION renew_paid_subscription(UUID, INTEGER, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
