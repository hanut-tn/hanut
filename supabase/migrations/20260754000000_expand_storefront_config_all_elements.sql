-- Étend storefront_config : recherche, chips catégories, barre panier,
-- textes produit (nom/prix). Rétrocompatible — merge JSONB (`||`) sur les
-- seules configs n'ayant pas encore la clé 'search', pour ne pas écraser
-- les personnalisations déjà enregistrées (couleurs, cards, button...).
UPDATE sellers
SET storefront_config = storefront_config ||
  jsonb_build_object(
    'search', jsonb_build_object(
      'bg', '#f9fafb',
      'borderColor', '#e5e7eb',
      'textColor', '#111827'
    ),
    'chips', jsonb_build_object(
      'bg', '#f3f4f6',
      'textColor', '#374151',
      'activeBg', '#16a34a',
      'activeTextColor', '#ffffff'
    ),
    'cartBar', jsonb_build_object(
      'bg', '#16a34a',
      'textColor', '#ffffff',
      'buttonBg', '#ffffff',
      'buttonTextColor', '#16a34a'
    ),
    'productName', jsonb_build_object(
      'color', '#111827',
      'size', 'normal',
      'weight', 'semibold'
    ),
    'productPrice', jsonb_build_object(
      'color', '#16a34a',
      'size', 'normal',
      'weight', 'bold'
    )
  )
WHERE NOT storefront_config ? 'search';

-- Met à jour le DEFAULT pour les nouveaux vendeurs.
ALTER TABLE sellers
  ALTER COLUMN storefront_config
  SET DEFAULT '{
    "colors": {"primary":"#16a34a","pageBg":"#ffffff","cardBg":"#ffffff","textPrimary":"#111827","textSecondary":"#6b7280"},
    "typography": {"font":"inter","size":"normal"},
    "cards": {"radius":"rounded","shadow":"sm","imageRatio":"square"},
    "button": {"text":"Ajouter","radius":"rounded"},
    "search": {"bg":"#f9fafb","borderColor":"#e5e7eb","textColor":"#111827"},
    "chips": {"bg":"#f3f4f6","textColor":"#374151","activeBg":"#16a34a","activeTextColor":"#ffffff"},
    "cartBar": {"bg":"#16a34a","textColor":"#ffffff","buttonBg":"#ffffff","buttonTextColor":"#16a34a"},
    "productName": {"color":"#111827","size":"normal","weight":"semibold"},
    "productPrice": {"color":"#16a34a","size":"normal","weight":"bold"},
    "layout": "grid-3"
  }'::jsonb;

COMMENT ON COLUMN sellers.storefront_config IS
  'Configuration visuelle complète de la mini boutique.
   colors: {primary, pageBg, cardBg, textPrimary, textSecondary} — codes hex
   typography: {font, size} — font ∈ STOREFRONT_FONTS (packages/types), size ∈ small|normal|large
   cards: {radius, shadow, imageRatio} — radius ∈ none|rounded|full, shadow ∈ none|sm|md, imageRatio ∈ square|portrait|landscape
   button: {text, radius} — texte du bouton "Ajouter" et rayon de ses coins
   search: {bg, borderColor, textColor} — barre de recherche
   chips: {bg, textColor, activeBg, activeTextColor} — chips de filtre catégorie
   cartBar: {bg, textColor, buttonBg, buttonTextColor} — barre panier sticky
   productName / productPrice: {color, size, weight} — size ∈ small|normal|large, weight ∈ normal|medium|semibold|bold
   layout: grid-2 | grid-3 | list';
