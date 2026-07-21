-- S'assurer que les colonnes onboarding existent avec les bons defaults.
-- onboarding_completed existe déjà (20260603000001_add_onboarding.sql) —
-- ADD COLUMN IF NOT EXISTS reste sûr et sans effet dans ce cas.
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN sellers.onboarding_step IS
  'Étape courante de l''onboarding obligatoire (/setup) : 1=Bienvenue, 2=Style, 3=Produit, 4=Live, 5=Terminé.';

-- IMPORTANT : le nouveau flow /setup rend le dashboard inaccessible tant que
-- onboarding_completed = false (cf. middleware). Sans ce correctif, tout
-- vendeur déjà actif mais n'ayant jamais explicitement "complété" l'ancienne
-- checklist optionnelle (dashboard/OnboardingChecklist.tsx) se retrouverait
-- brutalement verrouillé hors de son propre dashboard au prochain chargement
-- de page, avec un assistant "créons votre boutique" pour une boutique qui
-- existe déjà depuis longtemps. On ne gate donc que les nouveaux comptes :
-- tout vendeur déjà créé avant cette migration est marqué onboardé.
UPDATE sellers
SET onboarding_completed = true,
    onboarding_step = 5
WHERE onboarding_completed = false;

NOTIFY pgrst, 'reload schema';
