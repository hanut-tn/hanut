-- Élargit storefront_config : couleurs multiples, typographie, style de
-- cartes — remplace l'ancien schéma { theme, primary_color, layout } par un
-- éditeur visuel complet (couleurs indépendantes, police, rayon/ombre/ratio
-- des cartes produit), au lieu de thèmes prédéfinis figés.

ALTER TABLE sellers
  ALTER COLUMN storefront_config
  SET DEFAULT '{
    "colors": {
      "primary": "#16a34a",
      "pageBg": "#ffffff",
      "cardBg": "#ffffff",
      "textPrimary": "#111827",
      "textSecondary": "#6b7280"
    },
    "typography": {
      "font": "inter",
      "size": "normal"
    },
    "cards": {
      "radius": "rounded",
      "shadow": "sm",
      "imageRatio": "square"
    },
    "layout": "grid-3"
  }'::jsonb;

-- Migre les configs existants (ancien schéma theme/primary_color) vers le
-- nouveau format, en approximant colors/cards depuis le thème prédéfini
-- choisi précédemment pour ne pas perdre l'intention visuelle du vendeur.
UPDATE sellers
SET storefront_config = jsonb_build_object(
  'colors', jsonb_build_object(
    'primary', COALESCE(storefront_config->>'primary_color', '#16a34a'),
    'pageBg', CASE storefront_config->>'theme'
      WHEN 'sombre' THEN '#030712'
      WHEN 'elegant' THEN '#faf8f5'
      WHEN 'nature' THEN '#f5f0e8'
      WHEN 'pastel' THEN '#fdf4f9'
      ELSE '#ffffff'
    END,
    'cardBg', CASE storefront_config->>'theme'
      WHEN 'sombre' THEN '#111827'
      ELSE '#ffffff'
    END,
    'textPrimary', CASE storefront_config->>'theme'
      WHEN 'sombre' THEN '#f9fafb'
      ELSE '#111827'
    END,
    'textSecondary', '#6b7280'
  ),
  'typography', jsonb_build_object(
    'font', CASE storefront_config->>'theme'
      WHEN 'elegant' THEN 'playfair'
      ELSE 'inter'
    END,
    'size', 'normal'
  ),
  'cards', jsonb_build_object(
    'radius', CASE storefront_config->>'theme'
      WHEN 'elegant' THEN 'none'
      WHEN 'moderne' THEN 'rounded'
      WHEN 'bold' THEN 'rounded'
      WHEN 'sombre' THEN 'rounded'
      ELSE 'full'
    END,
    'shadow', 'sm',
    'imageRatio', 'square'
  ),
  'layout', COALESCE(storefront_config->>'layout', 'grid-3')
)
WHERE storefront_config ? 'theme' OR storefront_config ? 'primary_color';

COMMENT ON COLUMN sellers.storefront_config IS
  'Configuration visuelle complète de la mini boutique.
   colors: {primary, pageBg, cardBg, textPrimary, textSecondary} — codes hex
   typography: {font, size} — font ∈ STOREFRONT_FONTS (packages/types), size ∈ small|normal|large
   cards: {radius, shadow, imageRatio} — radius ∈ none|rounded|full, shadow ∈ none|sm|md, imageRatio ∈ square|portrait|landscape
   layout: grid-2 | grid-3 | list';
