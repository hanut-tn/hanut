-- Configuration visuelle de la mini boutique publique (thème, couleur, disposition).

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS storefront_config JSONB NOT NULL DEFAULT '{
    "theme": "moderne",
    "primary_color": "#16a34a",
    "layout": "grid-3"
  }'::jsonb;

COMMENT ON COLUMN sellers.storefront_config IS
  'Configuration visuelle mini boutique.
   theme: moderne | elegant | bold | sombre | nature | pastel
   primary_color: code hex
   layout: grid-2 | grid-3 | list';
