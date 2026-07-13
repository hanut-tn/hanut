export type StorefrontTemplate = 'luxe' | 'mode' | 'fresh' | 'dark'
export type StorefrontLayout = 'grid-2' | 'grid-3' | 'list'

export interface StorefrontConfig {
  template: StorefrontTemplate
  primary_color: string
  layout: StorefrontLayout
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  template: 'mode',
  primary_color: '#16a34a',
  layout: 'grid-3',
}

// Toute valeur ci-dessous est une donnée d'exécution (couleur hex, police) —
// jamais un nom de classe Tailwind. Une classe construite dynamiquement
// depuis cet objet et interpolée dans un className ne serait JAMAIS vue par
// le scanner statique de Tailwind au build (ce fichier vit dans
// packages/types, hors du glob `content` de apps/web/tailwind.config.ts) —
// elle finirait purgée du CSS compilé, sans effet, même si elle apparaît
// bien dans le HTML rendu. Ces valeurs doivent donc toujours être
// appliquées via `style` / CSS custom properties.
export const STOREFRONT_TEMPLATES: Record<StorefrontTemplate, {
  label: string
  description: string
  // Aperçu (mini SVG dans l'éditeur)
  previewBg: string
  previewHeader: string
  previewCard: string
  previewText: string
  // Styles appliqués sur la boutique réelle
  pageBg: string
  cardBg: string
  textPrimary: string
  textSecondary: string
  cardRadius: string
  cardShadow: string
  fontFamily: string
  headerStyle: 'gradient' | 'dark' | 'cream'
}> = {
  mode: {
    label: 'Mode',
    description: 'Moderne et épuré',
    previewBg: '#ffffff',
    previewHeader: '#16a34a',
    previewCard: '#ffffff',
    previewText: '#111827',
    pageBg: '#ffffff',
    cardBg: '#ffffff',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    cardRadius: '1rem',
    cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontFamily: 'Inter, sans-serif',
    headerStyle: 'gradient',
  },
  luxe: {
    label: 'Luxe',
    description: 'Raffiné et élégant',
    previewBg: '#faf8f5',
    previewHeader: '#1a1a1a',
    previewCard: '#ffffff',
    previewText: '#1a1a1a',
    pageBg: '#faf8f5',
    cardBg: '#ffffff',
    textPrimary: '#1a1a1a',
    textSecondary: '#6b5e4e',
    cardRadius: '0.5rem',
    cardShadow: '0 2px 8px rgba(0,0,0,0.08)',
    fontFamily: "'Playfair Display', Georgia, serif",
    headerStyle: 'dark',
  },
  fresh: {
    label: 'Fresh',
    description: 'Naturel et coloré',
    previewBg: '#f0fdf4',
    previewHeader: '#16a34a',
    previewCard: '#ffffff',
    previewText: '#14532d',
    pageBg: '#f0fdf4',
    cardBg: '#ffffff',
    textPrimary: '#14532d',
    textSecondary: '#166534',
    cardRadius: '1.5rem',
    cardShadow: '0 1px 4px rgba(0,0,0,0.08)',
    fontFamily: "'Nunito', Inter, sans-serif",
    headerStyle: 'gradient',
  },
  dark: {
    label: 'Dark',
    description: 'Premium et exclusif',
    previewBg: '#0f0f0f',
    previewHeader: '#000000',
    previewCard: '#1a1a1a',
    previewText: '#f5f5f5',
    pageBg: '#0f0f0f',
    cardBg: '#1a1a1a',
    textPrimary: '#f5f5f5',
    textSecondary: '#a1a1aa',
    cardRadius: '1rem',
    cardShadow: '0 4px 16px rgba(0,0,0,0.6)',
    fontFamily: 'Inter, sans-serif',
    headerStyle: 'dark',
  },
}

export const PRESET_COLORS = [
  { label: 'Vert',   value: '#16a34a' },
  { label: 'Bleu',   value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Rouge',  value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Rose',   value: '#ec4899' },
  { label: 'Noir',   value: '#111827' },
  { label: 'Marron', value: '#92400e' },
]
