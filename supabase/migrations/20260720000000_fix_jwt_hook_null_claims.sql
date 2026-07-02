-- CORRECTIF PRIORITAIRE : set_seller_jwt_claims retournait NULL quand event->'claims'
-- était absent ou null, bloquant toute connexion avec l'erreur Supabase Auth :
--   "output claims do not conform to the expected schema: given: null"
--
-- Cause : jsonb_set(event, '{claims,seller_id}', ...) retourne NULL si le chemin
-- intermédiaire '{claims}' n'existe pas dans event. jsonb_set ne crée que la dernière
-- clé manquante d'un chemin multi-niveaux — les intermédiaires absents donnent NULL.
-- Les trois jsonb_set chaînés propageaient ce NULL jusqu'au RETURN.
--
-- Correctifs :
--   1. Guard event IS NULL → retourner '{}'
--   2. Extraire event->'claims' dans v_claims avec COALESCE(…, '{}') pour garantir
--      un objet valide avant toute manipulation
--   3. Enrichir les claims via l'opérateur || (fusion JSONB) — aucun chemin intermédiaire
--   4. Réécrire '{claims}' avec jsonb_set à un seul niveau — jamais NULL si event est valide
--   5. EXCEPTION WHEN OTHERS → retourner l'event d'origine pour ne jamais bloquer
--      la connexion d'un utilisateur légitime même en cas d'erreur DB inattendue

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
  -- Guard : Supabase Auth exige un objet JSONB valide, jamais NULL
  IF event IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  -- Récupérer les claims existants en garantissant un objet (jamais NULL)
  v_claims := COALESCE(event -> 'claims', '{}'::JSONB);

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

  -- Fusionner les claims enrichis (opérateur ||, sans chemin intermédiaire)
  v_claims := v_claims || jsonb_build_object(
    'seller_id',        v_seller_id,
    'plan',             COALESCE(v_plan, 'pro'),
    'subscription_end', v_subscription_end
  );

  -- Réécrire '{claims}' en un seul jsonb_set à un seul niveau de profondeur
  -- (chemin à un niveau = jamais NULL tant que event est un objet valide)
  RETURN jsonb_set(event, '{claims}', v_claims);

EXCEPTION WHEN OTHERS THEN
  -- Toute erreur interne retourne l'event d'origine sans enrichissement
  -- pour ne jamais bloquer la connexion d'un utilisateur légitime
  RETURN COALESCE(event, '{}'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION set_seller_jwt_claims(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_seller_jwt_claims(JSONB) TO supabase_auth_admin;
