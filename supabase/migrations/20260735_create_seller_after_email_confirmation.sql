-- Create the public seller profile at the database boundary when a self-signup
-- email becomes confirmed. This is a safety net for cases where Supabase
-- confirms the Auth user but the browser does not reach /api/auth/callback.

CREATE OR REPLACE FUNCTION public.ensure_signup_seller_profile_from_auth(
  p_user_id            UUID,
  p_email              TEXT,
  p_email_confirmed_at TIMESTAMPTZ,
  p_metadata           JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata JSONB := COALESCE(p_metadata, '{}'::JSONB);
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_name TEXT := left(COALESCE(NULLIF(trim(v_metadata ->> 'name'), ''), 'Ma boutique'), 100);
  v_phone TEXT := NULLIF(trim(COALESCE(v_metadata ->> 'phone', '')), '');
  v_base_slug TEXT;
  v_slug TEXT;
  v_attempt INTEGER;
  v_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL OR v_email = '' OR p_email_confirmed_at IS NULL THEN
    RETURN;
  END IF;

  -- Team-invited Auth users must never become seller owners automatically.
  IF v_metadata ? 'invitation_token' OR v_metadata ? 'team_role' THEN
    RETURN;
  END IF;

  -- New signups have hanut_signup=true. The name fallback repairs accounts
  -- created before that marker existed.
  IF lower(COALESCE(v_metadata ->> 'hanut_signup', '')) <> 'true'
     AND length(trim(COALESCE(v_metadata ->> 'name', ''))) < 2 THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM sellers WHERE id = p_user_id) THEN
    PERFORM set_demo_trial(p_user_id);
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM sellers WHERE lower(email) = v_email) THEN
    RETURN;
  END IF;

  v_base_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
  v_base_slug := left(v_base_slug, 50);

  IF length(v_base_slug) < 2 THEN
    v_base_slug := 'boutique-' || substring(replace(p_user_id::TEXT, '-', '') from 1 for 8);
  END IF;

  FOR v_attempt IN 0..9 LOOP
    v_slug := CASE
      WHEN v_attempt = 0 THEN v_base_slug
      ELSE left(v_base_slug, 45) || '-' || (v_attempt + 1)::TEXT
    END;

    BEGIN
      INSERT INTO sellers (id, email, name, phone, slug, plan)
      VALUES (p_user_id, v_email, v_name, v_phone, v_slug, 'starter')
      ON CONFLICT (id) DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted > 0 THEN
        PERFORM set_demo_trial(p_user_id);
      END IF;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF EXISTS (SELECT 1 FROM sellers WHERE id = p_user_id OR lower(email) = v_email) THEN
        PERFORM set_demo_trial(p_user_id);
        RETURN;
      END IF;
      -- Most likely a slug collision; try the next suffix.
    END;
  END LOOP;

  -- Last-resort unique slug. If this still collides, do not block Auth confirm.
  BEGIN
    INSERT INTO sellers (id, email, name, phone, slug, plan)
    VALUES (
      p_user_id,
      v_email,
      v_name,
      v_phone,
      'boutique-' || substring(replace(p_user_id::TEXT, '-', '') from 1 for 12),
      'starter'
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted > 0 THEN
      PERFORM set_demo_trial(p_user_id);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_signup_seller_profile_from_auth(UUID, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_signup_seller_after_email_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.ensure_signup_seller_profile_from_auth(
      NEW.id,
      NEW.email,
      NEW.email_confirmed_at,
      NEW.raw_user_meta_data
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_signup_seller_after_email_confirmation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_signup_seller_after_email_confirmation ON auth.users;
CREATE TRIGGER trg_signup_seller_after_email_confirmation
  AFTER INSERT OR UPDATE OF email, email_confirmed_at, raw_user_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_signup_seller_after_email_confirmation();

-- Backfill already-confirmed self-signups that were left without sellers.
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT id, email, email_confirmed_at, raw_user_meta_data
    FROM auth.users
    WHERE email_confirmed_at IS NOT NULL
  LOOP
    PERFORM public.ensure_signup_seller_profile_from_auth(
      v_user.id,
      v_user.email,
      v_user.email_confirmed_at,
      v_user.raw_user_meta_data
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
