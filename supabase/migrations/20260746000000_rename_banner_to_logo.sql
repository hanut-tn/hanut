-- Remplace la bannière large de la mini boutique par un logo (carré, affiché
-- à la place de l'avatar-initiale). Simplifie StorefrontBanner en un seul
-- layout au lieu de deux (grande bannière vs dégradé + avatar).

ALTER TABLE sellers RENAME COLUMN banner_url TO logo_url;

COMMENT ON COLUMN sellers.logo_url IS
  'URL logo boutique (carré, 400x400 conseillé). Si NULL, avatar avec initiale du nom.';

NOTIFY pgrst, 'reload schema';
