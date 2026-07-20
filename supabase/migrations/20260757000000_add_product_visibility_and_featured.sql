-- Deux nouveaux champs sur products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_label TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_visible_in_storefront BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN products.is_featured IS
  'Si true, le produit apparaît en premier dans la boutique avec un badge.';

COMMENT ON COLUMN products.featured_label IS
  'Label du badge affiché sur le produit mis en avant.
   Ex: "Coup de cœur", "Nouveauté", "Best-seller", "Promo", "Exclusif".
   Si NULL et is_featured = true, affiche "En vedette" par défaut.';

COMMENT ON COLUMN products.is_visible_in_storefront IS
  'Si false, le produit est masqué de la boutique publique /s/[slug]
   mais reste visible et modifiable dans le dashboard.';
