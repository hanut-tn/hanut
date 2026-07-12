export type StorefrontTheme =
  | 'moderne'
  | 'elegant'
  | 'bold'
  | 'sombre'
  | 'nature'
  | 'pastel'

export type StorefrontLayout = 'grid-2' | 'grid-3' | 'list'

export interface StorefrontConfig {
  theme: StorefrontTheme
  primary_color: string
  layout: StorefrontLayout
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  theme: 'moderne',
  primary_color: '#16a34a',
  layout: 'grid-3',
}

// NOTE : pageBg / cardRadius / fontFamily / fontWeight sont des valeurs CSS
// brutes (jamais des noms de classes Tailwind). Une valeur comme "bg-[#faf8f5]"
// ou "font-serif" construite dynamiquement depuis cet objet et interpolée dans
// un className ne serait JAMAIS vue par le scanner statique de Tailwind au
// build — la classe finit purgée du CSS compilé et n'a plus aucun effet, même
// si elle apparaît bien dans le HTML rendu. Toute valeur ci-dessous doit donc
// être appliquée via l'attribut `style` (ou une CSS variable), jamais via
// `className={theme.xxx}`.
export const STOREFRONT_THEMES: Record<StorefrontTheme, {
  label: string
  description: string
  previewBg: string
  previewHeader: string
  previewCard: string
  previewText: string
  previewAccent: string
  /** Rayon des cartes produit — valeur CSS (rem), pas une classe Tailwind. */
  cardRadius: string
  /** Fond de page — couleur hex, pas une classe Tailwind. */
  pageBg: string
  /** font-family CSS, pas une classe Tailwind. */
  fontFamily: string
  /** font-weight CSS, pas une classe Tailwind. */
  fontWeight: string
}> = {
  moderne: {
    label: 'Moderne',
    description: 'Épuré et professionnel',
    previewBg: '#ffffff',
    previewHeader: '#16a34a',
    previewCard: '#ffffff',
    previewText: '#111827',
    previewAccent: '#16a34a',
    cardRadius: '1rem',
    pageBg: '#F9FAFB',
    fontFamily: 'inherit',
    fontWeight: 'inherit',
  },
  elegant: {
    label: 'Élégant',
    description: 'Raffiné et luxueux',
    previewBg: '#faf8f5',
    previewHeader: '#1a1a1a',
    previewCard: '#ffffff',
    previewText: '#1a1a1a',
    previewAccent: '#c9a84c',
    cardRadius: '0.5rem',
    pageBg: '#faf8f5',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontWeight: 'inherit',
  },
  bold: {
    label: 'Bold',
    description: 'Dynamique et jeune',
    previewBg: '#f9fafb',
    previewHeader: '#111827',
    previewCard: '#ffffff',
    previewText: '#111827',
    previewAccent: '#16a34a',
    cardRadius: '0.75rem',
    pageBg: '#F9FAFB',
    fontFamily: 'inherit',
    fontWeight: '900',
  },
  sombre: {
    label: 'Sombre',
    description: 'Premium et exclusif',
    previewBg: '#030712',
    previewHeader: '#000000',
    previewCard: '#111827',
    previewText: '#f9fafb',
    previewAccent: '#16a34a',
    cardRadius: '0.75rem',
    pageBg: '#030712',
    fontFamily: 'inherit',
    fontWeight: 'inherit',
  },
  nature: {
    label: 'Nature',
    description: 'Naturel et authentique',
    previewBg: '#f5f0e8',
    previewHeader: '#2d5016',
    previewCard: '#ffffff',
    previewText: '#1a2e0a',
    previewAccent: '#4a7c2f',
    cardRadius: '1.5rem',
    pageBg: '#f5f0e8',
    fontFamily: 'inherit',
    fontWeight: 'inherit',
  },
  pastel: {
    label: 'Pastel',
    description: 'Doux et coloré',
    previewBg: '#fdf4f9',
    previewHeader: '#ec4899',
    previewCard: '#ffffff',
    previewText: '#831843',
    previewAccent: '#ec4899',
    cardRadius: '1.5rem',
    pageBg: '#fdf4f9',
    fontFamily: 'inherit',
    fontWeight: 'inherit',
  },
}

export const PRESET_COLORS = [
  { label: 'Vert',    value: '#16a34a' },
  { label: 'Bleu',    value: '#2563eb' },
  { label: 'Noir',    value: '#111827' },
  { label: 'Rouge',   value: '#dc2626' },
  { label: 'Violet',  value: '#7c3aed' },
  { label: 'Orange',  value: '#ea580c' },
  { label: 'Rose',    value: '#ec4899' },
  { label: 'Marron',  value: '#92400e' },
]
