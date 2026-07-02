-- Démo trial : plan Pro 14 jours à l'inscription
-- subscription_end existe déjà dans schema.sql ; cette migration
-- ajoute le DEFAULT sur plan et crée la fonction set_demo_trial().

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

ALTER TABLE sellers
  ALTER COLUMN plan SET DEFAULT 'pro';

-- Appelée par la route d'inscription (service_role) pour activer la démo.
-- Idempotente : ne ré-écrit pas si subscription_end est déjà défini.
CREATE OR REPLACE FUNCTION set_demo_trial(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sellers
  SET
    plan             = 'pro',
    subscription_end = NOW() + INTERVAL '14 days'
  WHERE id = p_seller_id
    AND subscription_end IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION set_demo_trial(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_demo_trial(UUID) TO service_role;
