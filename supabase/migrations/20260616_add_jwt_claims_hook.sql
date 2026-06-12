-- JWT Custom Access Token Hook
-- Enrichit le JWT Supabase avec les données seller pour éviter
-- les requêtes DB dans le middleware Edge Runtime.
--
-- APRÈS avoir appliqué cette migration, enregistrer le hook dans
-- le Dashboard Supabase :
--   Authentication → Hooks → Custom Access Token Hook
--   → Sélectionner : public.set_seller_jwt_claims
--   → Sauvegarder
--
-- Une fois le hook actif, tous les nouveaux tokens contiendront
-- les claims seller_id, plan et subscription_end.
-- Les tokens existants seront mis à jour au prochain refresh (au plus 1h).
-- Pour forcer le refresh immédiat côté client : supabase.auth.refreshSession()

CREATE OR REPLACE FUNCTION set_seller_jwt_claims(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_seller_id      TEXT := NULL;
  v_plan           TEXT := NULL;
  v_subscription_end TEXT := NULL;
BEGIN
  v_user_id := (event ->> 'user_id')::UUID;

  -- Chercher si l'utilisateur est owner d'une boutique
  SELECT id::TEXT, plan, subscription_end::TEXT
  INTO v_seller_id, v_plan, v_subscription_end
  FROM sellers
  WHERE id = v_user_id;

  -- Si pas owner, chercher via team_members
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

  -- Injecter les claims dans le JWT (NULL si pas encore de profil seller)
  event := jsonb_set(event, '{claims,seller_id}', COALESCE(to_jsonb(v_seller_id), 'null'::jsonb));
  event := jsonb_set(event, '{claims,plan}', to_jsonb(COALESCE(v_plan, 'pro')));
  event := jsonb_set(event, '{claims,subscription_end}', COALESCE(to_jsonb(v_subscription_end), 'null'::jsonb));

  RETURN event;
END;
$$;

REVOKE ALL ON FUNCTION set_seller_jwt_claims(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_seller_jwt_claims(JSONB) TO supabase_auth_admin;
