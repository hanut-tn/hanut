-- Simplifie storefront_config : template + primary_color + layout seulement.
-- Remplace le système de personnalisation fine (dizaines de champs
-- couleur/police/dimension) par 4 templates visuels prédéfinis + une
-- couleur d'accent. Dérive `template` depuis l'ancien `theme` quand présent
-- (sinon retombe sur 'mode'), et `primary_color` depuis l'ancien
-- `colors.primary` (schéma le plus récent) ou l'ancien `primary_color` à
-- plat (schéma d'origine), sinon la couleur brand par défaut.
UPDATE sellers
SET storefront_config = jsonb_build_object(
  'template', COALESCE(
    CASE storefront_config->>'theme'
      WHEN 'sombre' THEN 'dark'
      WHEN 'elegant' THEN 'luxe'
      WHEN 'nature' THEN 'fresh'
      ELSE 'mode'
    END,
    'mode'
  ),
  'primary_color', COALESCE(
    storefront_config->'colors'->>'primary',
    storefront_config->>'primary_color',
    '#16a34a'
  ),
  'layout', COALESCE(storefront_config->>'layout', 'grid-3')
);

-- Nouveau DEFAULT simple.
ALTER TABLE sellers
  ALTER COLUMN storefront_config
  SET DEFAULT '{
    "template": "mode",
    "primary_color": "#16a34a",
    "layout": "grid-3"
  }'::jsonb;

COMMENT ON COLUMN sellers.storefront_config IS
  'Configuration visuelle mini boutique.
   template: luxe | mode | fresh | dark
   primary_color: code hex couleur principale
   layout: grid-2 | grid-3 | list';
