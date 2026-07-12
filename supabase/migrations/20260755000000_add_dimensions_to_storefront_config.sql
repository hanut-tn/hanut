-- Ajoute les dimensions (tailles/espacements en px) au storefront_config :
-- taille exacte du nom/prix produit, hauteur d'image + gap + padding des
-- cartes, taille du logo + hauteur de bannière, taille/padding des chips et
-- du bouton "Ajouter". Rétrocompatible — merge JSONB sur les seules configs
-- n'ayant pas encore `productName.size` (les anciens configs avaient un
-- `productName.size` textuel small|normal|large ; sa présence ne suffit
-- donc pas à distinguer l'ancien schéma du nouveau — on écrase toujours ce
-- sous-champ précis plutôt que de tester son existence).
UPDATE sellers
SET storefront_config = storefront_config ||
  jsonb_build_object(
    'productName', COALESCE(storefront_config->'productName', '{}'::jsonb) ||
      jsonb_build_object('size', 16),
    'productPrice', COALESCE(storefront_config->'productPrice', '{}'::jsonb) ||
      jsonb_build_object('size', 16),
    'cards', COALESCE(storefront_config->'cards', '{}'::jsonb) ||
      jsonb_build_object('imageHeight', 200, 'gap', 12, 'padding', 12),
    'header', COALESCE(storefront_config->'header', '{}'::jsonb) ||
      jsonb_build_object('logoSize', 48, 'bannerHeight', 200),
    'chips', COALESCE(storefront_config->'chips', '{}'::jsonb) ||
      jsonb_build_object('fontSize', 14, 'paddingX', 12, 'paddingY', 6),
    'button', COALESCE(storefront_config->'button', '{}'::jsonb) ||
      jsonb_build_object('fontSize', 14, 'paddingX', 16, 'paddingY', 10)
  )
WHERE (storefront_config->'productName'->>'size') IS DISTINCT FROM '16'
   OR NOT (storefront_config ? 'header');

-- Nouveau DEFAULT complet.
ALTER TABLE sellers
  ALTER COLUMN storefront_config
  SET DEFAULT '{
    "colors": {"primary":"#16a34a","pageBg":"#ffffff","cardBg":"#ffffff","textPrimary":"#111827","textSecondary":"#6b7280"},
    "typography": {"font":"inter","size":"normal"},
    "cards": {"radius":"rounded","shadow":"sm","imageRatio":"square","imageHeight":200,"gap":12,"padding":12},
    "button": {"text":"Ajouter","radius":"rounded","fontSize":14,"paddingX":16,"paddingY":10},
    "search": {"bg":"#f9fafb","borderColor":"#e5e7eb","textColor":"#111827"},
    "chips": {"bg":"#f3f4f6","textColor":"#374151","activeBg":"#16a34a","activeTextColor":"#ffffff","fontSize":14,"paddingX":12,"paddingY":6},
    "cartBar": {"bg":"#16a34a","textColor":"#ffffff","buttonBg":"#ffffff","buttonTextColor":"#16a34a"},
    "productName": {"color":"#111827","size":16,"weight":"semibold"},
    "productPrice": {"color":"#16a34a","size":16,"weight":"bold"},
    "header": {"logoSize":48,"bannerHeight":200},
    "layout": "grid-3"
  }'::jsonb;

COMMENT ON COLUMN sellers.storefront_config IS
  'Configuration visuelle complète de la mini boutique.
   colors: {primary, pageBg, cardBg, textPrimary, textSecondary} — codes hex
   typography: {font, size} — font ∈ STOREFRONT_FONTS (packages/types), size ∈ small|normal|large (échelle globale)
   cards: {radius, shadow, imageRatio, imageHeight, gap, padding} — dimensions en px
   button: {text, radius, fontSize, paddingX, paddingY} — dimensions en px
   search: {bg, borderColor, textColor}
   chips: {bg, textColor, activeBg, activeTextColor, fontSize, paddingX, paddingY} — dimensions en px
   cartBar: {bg, textColor, buttonBg, buttonTextColor}
   productName / productPrice: {color, size, weight} — size en px exact (10-32), weight ∈ normal|medium|semibold|bold
   header: {logoSize, bannerHeight} — dimensions en px
   layout: grid-2 | grid-3 | list';
