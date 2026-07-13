// Contrats partagés par les 4 identités visuelles de la boutique publique.
// Ces composants sont du rendu pur : toute la logique métier (panier, étapes,
// recherche, filtres) vit dans StorefrontShell et leur est injectée via
// props. Aucune couleur/police n'est passée en prop — tout passe par les CSS
// vars posées sur la racine (buildCssVariables), donc un composant de
// template n'a jamais besoin de lire `StorefrontConfig` directement.

import type { StorefrontProduct, CartItem } from '@/lib/storefront/cart'
import type { StorefrontDict, Lang } from '@/lib/i18n/storefront'
import type { Category } from '@hanut/types'

export interface TemplateHeaderProps {
  sellerName: string
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl: string | null
  cartCount: number
  onCartOpen: () => void
  lang: Lang
  onLangToggle: () => void
  t: StorefrontDict
}

export interface TemplateSearchBarProps {
  value: string
  onChange: (value: string) => void
  t: StorefrontDict
}

export interface TemplateCategoryBarProps {
  categories: Category[]
  selected: string
  onSelect: (id: string) => void
  t: StorefrontDict
}

export interface TemplateProductCardProps {
  product: StorefrontProduct
  t: StorefrontDict
  onSelect: (product: StorefrontProduct) => void
  onQuickAdd: (product: StorefrontProduct) => void
}

export interface TemplateCartBarProps {
  totals: { totalItems: number; totalPrice: number }
  t: StorefrontDict
  onOpenCart: () => void
  onCheckout: () => void
}

export interface TemplateCartDrawerProps {
  items: CartItem[]
  totals: { totalItems: number; totalPrice: number }
  t: StorefrontDict
  isRtl: boolean
  portalContainer?: HTMLElement | null
  onClose: () => void
  onUpdateQuantity: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  onCheckout: () => void
}

export interface TemplateProductModalProps {
  product: StorefrontProduct
  cart: CartItem[]
  t: StorefrontDict
  isRtl: boolean
  portalContainer?: HTMLElement | null
  onClose: () => void
  onAdd: (item: Omit<CartItem, 'key'>) => void
}
