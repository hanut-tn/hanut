-- Ajouter banner_url séparé de logo_url
-- logo_url = logo carré affiché dans le header (400x400)
-- banner_url = grande image en haut de la boutique (1200x400)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN sellers.logo_url IS
  'Logo carré de la boutique. Format recommandé: 400x400px.';

COMMENT ON COLUMN sellers.banner_url IS
  'Bannière en haut de la mini boutique. Format recommandé: 1200x400px.';
