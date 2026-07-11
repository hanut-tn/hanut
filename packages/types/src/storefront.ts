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

export const STOREFRONT_THEMES: Record<StorefrontTheme, {
  label: string
  description: string
  previewBg: string
  previewHeader: string
  previewCard: string
  previewText: string
  previewAccent: string
  cardRadius: string
  pageBg: string
  fontClass: string
}> = {
  moderne: {
    label: 'Moderne',
    description: 'Épuré et professionnel',
    previewBg: '#ffffff',
    previewHeader: '#16a34a',
    previewCard: '#ffffff',
    previewText: '#111827',
    previewAccent: '#16a34a',
    cardRadius: 'rounded-2xl',
    pageBg: 'bg-gray-50',
    fontClass: '',
  },
  elegant: {
    label: 'Élégant',
    description: 'Raffiné et luxueux',
    previewBg: '#faf8f5',
    previewHeader: '#1a1a1a',
    previewCard: '#ffffff',
    previewText: '#1a1a1a',
    previewAccent: '#c9a84c',
    cardRadius: 'rounded-lg',
    pageBg: 'bg-[#faf8f5]',
    fontClass: 'font-serif',
  },
  bold: {
    label: 'Bold',
    description: 'Dynamique et jeune',
    previewBg: '#f9fafb',
    previewHeader: '#111827',
    previewCard: '#ffffff',
    previewText: '#111827',
    previewAccent: '#16a34a',
    cardRadius: 'rounded-xl',
    pageBg: 'bg-gray-50',
    fontClass: 'font-black',
  },
  sombre: {
    label: 'Sombre',
    description: 'Premium et exclusif',
    previewBg: '#030712',
    previewHeader: '#000000',
    previewCard: '#111827',
    previewText: '#f9fafb',
    previewAccent: '#16a34a',
    cardRadius: 'rounded-xl',
    pageBg: 'bg-gray-950',
    fontClass: '',
  },
  nature: {
    label: 'Nature',
    description: 'Naturel et authentique',
    previewBg: '#f5f0e8',
    previewHeader: '#2d5016',
    previewCard: '#ffffff',
    previewText: '#1a2e0a',
    previewAccent: '#4a7c2f',
    cardRadius: 'rounded-3xl',
    pageBg: 'bg-[#f5f0e8]',
    fontClass: '',
  },
  pastel: {
    label: 'Pastel',
    description: 'Doux et coloré',
    previewBg: '#fdf4f9',
    previewHeader: '#ec4899',
    previewCard: '#ffffff',
    previewText: '#831843',
    previewAccent: '#ec4899',
    cardRadius: 'rounded-3xl',
    pageBg: 'bg-[#fdf4f9]',
    fontClass: '',
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
