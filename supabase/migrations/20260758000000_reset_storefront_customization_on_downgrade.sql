-- Réinitialise la personnalisation boutique (template, couleur, logo,
-- bannière) lors d'un downgrade vers Starter — même pattern que
-- cleanup_team_on_downgrade (20260708000000_team_cleanup_on_downgrade.sql).
--
-- Sans ce trigger, un vendeur qui redescend en Starter garde sa
-- personnalisation Pro (ex: template Dark, logo, bannière) visible sur sa
-- boutique publique jusqu'à son prochain enregistrement explicite dans
-- l'éditeur — saveStorefrontData() ne fait que bloquer l'écriture de
-- nouvelles valeurs Pro, pas nettoyer celles déjà en base.
--
-- Contrairement à l'équipe (suspendue puis restaurable), la personnalisation
-- n'est pas restaurée automatiquement à un upgrade — le vendeur la
-- reconfigure depuis l'éditeur, cohérent avec le fait qu'aucune sauvegarde
-- des anciennes valeurs n'est nécessaire ici (pas de risque de perte
-- irréversible de données métier comme des membres d'équipe).

CREATE OR REPLACE FUNCTION reset_storefront_customization_on_downgrade(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sellers
  SET
    storefront_config = jsonb_set(
      jsonb_set(
        COALESCE(storefront_config, '{}'::jsonb),
        '{template}', '"mode"'::jsonb
      ),
      '{primary_color}', '"#16a34a"'::jsonb
    ),
    logo_url = NULL,
    banner_url = NULL
  WHERE id = p_seller_id;
END;
$$;

CREATE OR REPLACE FUNCTION handle_plan_storefront_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.plan IN ('pro', 'business') AND NEW.plan = 'starter' THEN
    PERFORM reset_storefront_customization_on_downgrade(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION reset_storefront_customization_on_downgrade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION handle_plan_storefront_reset() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_handle_plan_storefront_reset ON sellers;

CREATE TRIGGER trg_handle_plan_storefront_reset
  AFTER UPDATE OF plan ON sellers
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION handle_plan_storefront_reset();

-- Corriger aussi les boutiques déjà en Starter au moment du déploiement
-- (le trigger ne s'applique qu'aux changements de plan futurs).
UPDATE sellers
SET
  storefront_config = jsonb_set(
    jsonb_set(
      COALESCE(storefront_config, '{}'::jsonb),
      '{template}', '"mode"'::jsonb
    ),
    '{primary_color}', '"#16a34a"'::jsonb
  ),
  logo_url = NULL,
  banner_url = NULL
WHERE plan = 'starter'
  AND (
    storefront_config->>'template' IS DISTINCT FROM 'mode'
    OR storefront_config->>'primary_color' IS DISTINCT FROM '#16a34a'
    OR logo_url IS NOT NULL
    OR banner_url IS NOT NULL
  );

NOTIFY pgrst, 'reload schema';
