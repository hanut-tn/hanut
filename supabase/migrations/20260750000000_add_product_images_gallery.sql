-- Galerie multi-photos par produit.
-- image_url reste l'image principale (inchangée).
-- images_gallery est un tableau d'URLs supplémentaires (max 5, appliqué côté app).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images_gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.images_gallery IS
  'URLs des images supplémentaires du produit (max 5).
   Format: ["url1", "url2", ...].
   image_url reste la photo principale.';
