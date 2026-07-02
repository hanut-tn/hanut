-- Correctif : set_seller_jwt_claims — claim 'plan' par défaut 'pro' → 'starter'
-- COALESCE(v_plan, 'pro') accordait le plan pro à tout utilisateur Auth sans
-- entrée en base (inscription incomplète, utilisateur sans boutique...).
-- Un utilisateur sans abonnement doit recevoir 'starter', pas 'pro'.

CREATE OR REPLACE FUNCTION set_seller_jwt_claims(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          UUID;
  v_seller_id        TEXT := NULL;
  v_plan             TEXT := NULL;
  v_subscription_end TEXT := NULL;
  v_claims           JSONB;
BEGIN
  IF event IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  v_claims  := COALESCE(event -> 'claims', '{}'::JSONB);
  v_user_id := (event ->> 'user_id')::UUID;

  SELECT id::TEXT, plan, subscription_end::TEXT
  INTO v_seller_id, v_plan, v_subscription_end
  FROM sellers
  WHERE id = v_user_id;

  IF v_seller_id IS NULL THEN
    SELECT s.id::TEXT, s.plan, s.subscription_end::TEXT
    INTO v_seller_id, v_plan, v_subscription_end
    FROM team_members tm
    JOIN sellers s ON s.id = tm.seller_id
    WHERE tm.user_id = v_user_id
      AND tm.status = 'active'
    ORDER BY tm.joined_at NULLS LAST, tm.invited_at ASC
    LIMIT 1;
  END IF;

  v_claims := v_claims || jsonb_build_object(
    'seller_id',        v_seller_id,
    'plan',             COALESCE(v_plan, 'starter'),
    'subscription_end', v_subscription_end
  );

  RETURN jsonb_set(event, '{claims}', v_claims);

EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(event, '{}'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION set_seller_jwt_claims(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_seller_jwt_claims(JSONB) TO supabase_auth_admin;
