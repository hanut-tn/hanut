-- Ajoute la personnalisation du bouton "Ajouter" (texte + rayon des coins)
-- au DEFAULT de storefront_config. Les configs existants récupèrent cette
-- valeur par défaut à la lecture via le merge applicatif
-- (mergeStorefrontConfig, base = DEFAULT_STOREFRONT_CONFIG) — aucun
-- backfill nécessaire, comme pour les colonnes ajoutées précédemment.
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
    "button": {
      "text": "Ajouter",
      "radius": "rounded"
    },
    "layout": "grid-3"
  }'::jsonb;

COMMENT ON COLUMN sellers.storefront_config IS
  'Configuration visuelle complète de la mini boutique.
   colors: {primary, pageBg, cardBg, textPrimary, textSecondary} — codes hex
   typography: {font, size} — font ∈ STOREFRONT_FONTS (packages/types), size ∈ small|normal|large
   cards: {radius, shadow, imageRatio} — radius ∈ none|rounded|full, shadow ∈ none|sm|md, imageRatio ∈ square|portrait|landscape
   button: {text, radius} — texte du bouton "Ajouter" et rayon de ses coins
   layout: grid-2 | grid-3 | list';
