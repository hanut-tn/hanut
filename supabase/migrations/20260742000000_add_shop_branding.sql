-- Branding de la mini boutique publique (/s/[slug]).
-- Champs optionnels : si NULL, la boutique retombe sur le nom du compte
-- et le fond dégradé brand par défaut.

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS shop_name TEXT,
  ADD COLUMN IF NOT EXISTS shop_description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN sellers.shop_name IS
  'Nom affiché sur la mini boutique. Si NULL, utilise le nom du compte (sellers.name).';
COMMENT ON COLUMN sellers.shop_description IS
  'Description courte affichée sous le nom sur la mini boutique.';
COMMENT ON COLUMN sellers.banner_url IS
  'URL image bannière boutique (1200x300 conseillé). Si NULL, fond dégradé brand par défaut.';

NOTIFY pgrst, 'reload schema';
