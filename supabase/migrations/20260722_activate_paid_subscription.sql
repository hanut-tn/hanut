-- RPC pure : active un abonnement payant pour une boutique.
-- Conçue pour être déclenchée aussi bien manuellement (fondateur via SQL Editor)
-- que par un webhook de paiement automatisé (Konnect.tn ou équivalent) —
-- aucune dépendance sur WhatsApp, upgrade_requests ou le processus manuel.
--
-- p_activated_by : TEXT souple — accepte un UUID (fondateur) ou un identifiant
-- système ('webhook:konnect'). Stocké dans activity_logs pour traçabilité.
-- Le cast UUID est tenté silencieusement ; si non-UUID, user_id vaut NULL.
--
-- upgrade_requests : si une demande pendante existe pour cette boutique,
-- elle est marquée 'activated' comme effet de bord. Pas de demande → pas d'erreur.
-- Un futur webhook de paiement peut ne pas avoir de ligne upgrade_requests
-- correspondante — la fonction se comporte identiquement dans les deux cas.

CREATE OR REPLACE FUNCTION activate_paid_subscription(
  p_seller_id     UUID,
  p_plan          TEXT,
  p_duration_days INTEGER DEFAULT 30,
  p_activated_by  TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_end   TIMESTAMPTZ;
  v_new_end    TIMESTAMPTZ;
  v_req_id     UUID;
  v_actor_uuid UUID;
BEGIN
  IF NOT is_service_role() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_seller_id IS NULL THEN
    RAISE EXCEPTION 'p_seller_id obligatoire';
  END IF;
  IF p_plan NOT IN ('starter', 'pro') THEN
    RAISE EXCEPTION 'plan invalide : % (valeurs acceptées : starter, pro)', p_plan;
  END IF;
  IF COALESCE(p_duration_days, 0) <= 0 THEN
    RAISE EXCEPTION 'p_duration_days doit être > 0';
  END IF;

  SELECT subscription_end
  INTO v_prev_end
  FROM sellers
  WHERE id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boutique introuvable : %', p_seller_id;
  END IF;

  v_new_end := now() + (p_duration_days || ' days')::INTERVAL;

  UPDATE sellers
  SET
    plan                = p_plan,
    subscription_status = 'active',
    subscription_end    = v_new_end
  WHERE id = p_seller_id;

  -- Effet de bord optionnel : marquer la dernière demande pendante comme activée.
  -- Silencieux si aucune demande n'existe.
  SELECT id INTO v_req_id
  FROM upgrade_requests
  WHERE seller_id = p_seller_id AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_req_id IS NOT NULL THEN
    UPDATE upgrade_requests
    SET status = 'activated', activated_at = now()
    WHERE id = v_req_id;
  END IF;

  -- p_activated_by est TEXT : UUID ou identifiant système.
  -- Cast UUID tenté silencieusement pour activity_logs.user_id.
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
    'subscription_activated',
    'seller',
    p_seller_id::TEXT,
    'a activé l''abonnement ' || p_plan || ' (' || p_duration_days || ' jours)',
    jsonb_build_object(
      'plan',                      p_plan,
      'duration_days',             p_duration_days,
      'subscription_end',          v_new_end,
      'previous_subscription_end', v_prev_end,
      'upgrade_request_id',        v_req_id
    )
  );

  RETURN jsonb_build_object(
    'seller_id',                 p_seller_id,
    'plan',                      p_plan,
    'subscription_status',       'active',
    'subscription_end',          v_new_end,
    'previous_subscription_end', v_prev_end,
    'upgrade_request_activated', v_req_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION activate_paid_subscription(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_paid_subscription(UUID, TEXT, INTEGER, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
