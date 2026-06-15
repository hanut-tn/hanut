-- Retire immédiatement l'accès équipe lors d'un downgrade vers Starter,
-- sans supprimer définitivement les membres ni les invitations.
-- Les membres sont restaurés automatiquement si le vendeur repasse en Pro/Business.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS status_before_suspension TEXT;

ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_status_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_status_check
  CHECK (status IN ('pending', 'active', 'suspended'));

ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_status_before_suspension_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_status_before_suspension_check
  CHECK (
    status_before_suspension IS NULL
    OR status_before_suspension IN ('pending', 'active')
  );

CREATE OR REPLACE FUNCTION cleanup_team_on_downgrade(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE team_members
  SET
    status_before_suspension = status,
    status = 'suspended'
  WHERE seller_id = p_seller_id
    AND status IN ('pending', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION restore_team_after_upgrade(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE team_members
  SET
    status = CASE
      WHEN status_before_suspension = 'active' AND user_id IS NOT NULL THEN 'active'
      ELSE 'pending'
    END,
    status_before_suspension = NULL
  WHERE seller_id = p_seller_id
    AND status = 'suspended';
END;
$$;

CREATE OR REPLACE FUNCTION handle_plan_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.plan IN ('pro', 'business') AND NEW.plan = 'starter' THEN
    PERFORM cleanup_team_on_downgrade(NEW.id);
  ELSIF OLD.plan = 'starter' AND NEW.plan IN ('pro', 'business') THEN
    PERFORM restore_team_after_upgrade(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_team_on_downgrade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_team_after_upgrade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION handle_plan_team_access() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_handle_plan_downgrade ON sellers;
DROP TRIGGER IF EXISTS trg_handle_plan_team_access ON sellers;

CREATE TRIGGER trg_handle_plan_team_access
  AFTER UPDATE OF plan ON sellers
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION handle_plan_team_access();

-- Corriger aussi les boutiques déjà en Starter au moment du déploiement.
UPDATE team_members AS member
SET
  status_before_suspension = member.status,
  status = 'suspended'
FROM sellers AS seller
WHERE seller.id = member.seller_id
  AND seller.plan = 'starter'
  AND member.status IN ('pending', 'active');

NOTIFY pgrst, 'reload schema';
