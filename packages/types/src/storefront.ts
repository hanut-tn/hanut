export type StorefrontFont =
  | 'inter'
  | 'poppins'
  | 'playfair'
  | 'montserrat'
  | 'cairo'
  | 'tajawal'
  | 'raleway'
  | 'nunito'

export type StorefrontFontSize = 'small' | 'normal' | 'large'
export type StorefrontCardRadius = 'none' | 'rounded' | 'full'
export type StorefrontCardShadow = 'none' | 'sm' | 'md'
export type StorefrontImageRatio = 'square' | 'portrait' | 'landscape'
export type StorefrontLayout = 'grid-2' | 'grid-3' | 'list'

export interface StorefrontColors {
  primary: string
  pageBg: string
  cardBg: string
  textPrimary: string
  textSecondary: string
}

export interface StorefrontTypography {
  font: StorefrontFont
  size: StorefrontFontSize
}

export interface StorefrontCards {
  radius: StorefrontCardRadius
  shadow: StorefrontCardShadow
  imageRatio: StorefrontImageRatio
}

export interface StorefrontConfig {
  colors: StorefrontColors
  typography: StorefrontTypography
  cards: StorefrontCards
  layout: StorefrontLayout
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  colors: {
    primary: '#16a34a',
    pageBg: '#ffffff',
    cardBg: '#ffffff',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
  },
  typography: {
    font: 'inter',
    size: 'normal',
  },
  cards: {
    radius: 'rounded',
    shadow: 'sm',
    imageRatio: 'square',
  },
  layout: 'grid-3',
}

// Toute valeur ci-dessous est une donnée d'exécution (couleur hex, URL,
// nom de police) — jamais un nom de classe Tailwind. Une classe construite
// dynamiquement depuis cet objet et interpolée dans un className ne serait
// JAMAIS vue par le scanner statique de Tailwind au build (surtout que ce
// fichier vit dans packages/types, hors du glob `content` de
// apps/web/tailwind.config.ts) — elle finirait purgée du CSS compilé, sans
// effet, même si elle apparaît bien dans le HTML rendu. Ces valeurs doivent
// donc toujours être appliquées via `style` / CSS custom properties.
export const STOREFRONT_FONTS: Record<StorefrontFont, {
  label: string
  url: string
  family: string
  supportsArabic: boolean
}> = {
  inter:      { label: 'Inter',        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',        family: 'Inter, sans-serif',         supportsArabic: false },
  poppins:    { label: 'Poppins',      url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',      family: 'Poppins, sans-serif',       supportsArabic: false },
  playfair:   { label: 'Playfair',     url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap', family: "'Playfair Display', serif", supportsArabic: false },
  montserrat: { label: 'Montserrat',   url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',   family: 'Montserrat, sans-serif',    supportsArabic: false },
  cairo:      { label: 'Cairo (AR)',   url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',        family: 'Cairo, sans-serif',         supportsArabic: true },
  tajawal:    { label: 'Tajawal (AR)', url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap',          family: 'Tajawal, sans-serif',       supportsArabic: true },
  raleway:    { label: 'Raleway',      url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap',      family: 'Raleway, sans-serif',       supportsArabic: false },
  nunito:     { label: 'Nunito',       url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',       family: 'Nunito, sans-serif',        supportsArabic: false },
}

export const COLOR_PRESETS: Record<'primary' | 'pageBg' | 'cardBg' | 'text', string[]> = {
  primary: ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#ec4899', '#0891b2', '#111827'],
  pageBg:  ['#ffffff', '#f9fafb', '#f5f0e8', '#fdf4f9', '#f0f9ff', '#faf8f5', '#f0fdf4', '#030712'],
  cardBg:  ['#ffffff', '#f9fafb', '#111827', '#1e293b', '#faf8f5', '#fdf4f9', '#f0fdf4', '#000000'],
  text:    ['#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#f9fafb', '#ffffff'],
}

export const FONT_SIZE_SCALE: Record<StorefrontFontSize, { scale: number; label: string }> = {
  small:  { scale: 0.875, label: 'Petite' },
  normal: { scale: 1,     label: 'Normale' },
  large:  { scale: 1.125, label: 'Grande' },
}

export const CARD_RADIUS_VALUES: Record<StorefrontCardRadius, { css: string; label: string }> = {
  none:    { css: '0px',     label: 'Carrés' },
  rounded: { css: '1rem',    label: 'Arrondis' },
  full:    { css: '1.5rem',  label: 'Très arrondis' },
}

export const CARD_SHADOW_VALUES: Record<StorefrontCardShadow, { css: string; label: string }> = {
  none: { css: 'none',                                label: 'Aucune' },
  sm:   { css: '0 1px 3px 0 rgb(0 0 0 / 0.1)',         label: 'Légère' },
  md:   { css: '0 4px 6px -1px rgb(0 0 0 / 0.1)',      label: 'Prononcée' },
}

export const IMAGE_RATIO_VALUES: Record<StorefrontImageRatio, { css: string; label: string }> = {
  square:    { css: '1 / 1', label: 'Carré' },
  portrait:  { css: '3 / 4', label: 'Portrait' },
  landscape: { css: '4 / 3', label: 'Large' },
}

export const LAYOUT_LABELS: Record<StorefrontLayout, string> = {
  'grid-2': '2 colonnes',
  'grid-3': '3 colonnes',
  list: 'Liste',
}
