-- Message d'absence configurable pour la boutique publique.
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS closed_message TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closed_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN sellers.is_open IS
  'Si false, la boutique affiche un message d absence au lieu du catalogue.';

COMMENT ON COLUMN sellers.closed_message IS
  'Message affiché quand la boutique est en pause.
   Ex: "Boutique fermée jusqu au 25 juillet. On revient bientôt !"';

COMMENT ON COLUMN sellers.closed_until IS
  'Date de réouverture prévue. Optionnel.';
