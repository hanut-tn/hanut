// Registry des 4 identités visuelles de la boutique publique. StorefrontShell
// pioche ici les composants de rendu correspondant à `config.template` — lui
// seul connaît le panier, les étapes et les filtres ; ces composants ne font
// que du rendu.

import type { ComponentType } from 'react'
import type { StorefrontTemplate } from '@hanut/types'
import type {
  TemplateHeaderProps,
  TemplateSearchBarProps,
  TemplateCategoryBarProps,
  TemplateProductCardProps,
  TemplateCartBarProps,
  TemplateCartDrawerProps,
  TemplateProductModalProps,
} from './types'

import ModeHeader from './mode/ModeHeader'
import ModeSearchBar from './mode/ModeSearchBar'
import ModeCategoryBar from './mode/ModeCategoryBar'
import ModeProductCard from './mode/ModeProductCard'
import ModeCartBar from './mode/ModeCartBar'
import ModeCartDrawer from './mode/ModeCartDrawer'
import ModeProductModal from './mode/ModeProductModal'

import LuxeHeader from './luxe/LuxeHeader'
import LuxeSearchBar from './luxe/LuxeSearchBar'
import LuxeCategoryBar from './luxe/LuxeCategoryBar'
import LuxeProductCard from './luxe/LuxeProductCard'
import LuxeCartBar from './luxe/LuxeCartBar'
import LuxeCartDrawer from './luxe/LuxeCartDrawer'
import LuxeProductModal from './luxe/LuxeProductModal'

import FreshHeader from './fresh/FreshHeader'
import FreshSearchBar from './fresh/FreshSearchBar'
import FreshCategoryBar from './fresh/FreshCategoryBar'
import FreshProductCard from './fresh/FreshProductCard'
import FreshCartBar from './fresh/FreshCartBar'
import FreshCartDrawer from './fresh/FreshCartDrawer'
import FreshProductModal from './fresh/FreshProductModal'

import DarkHeader from './dark/DarkHeader'
import DarkSearchBar from './dark/DarkSearchBar'
import DarkCategoryBar from './dark/DarkCategoryBar'
import DarkProductCard from './dark/DarkProductCard'
import DarkCartBar from './dark/DarkCartBar'
import DarkCartDrawer from './dark/DarkCartDrawer'
import DarkProductModal from './dark/DarkProductModal'

export interface TemplateComponents {
  Header: ComponentType<TemplateHeaderProps>
  SearchBar: ComponentType<TemplateSearchBarProps>
  CategoryBar: ComponentType<TemplateCategoryBarProps>
  ProductCard: ComponentType<TemplateProductCardProps>
  CartBar: ComponentType<TemplateCartBarProps>
  CartDrawer: ComponentType<TemplateCartDrawerProps>
  ProductModal: ComponentType<TemplateProductModalProps>
  /** Classes de la grille produits — le nombre de colonnes fait partie de
   * l'identité visuelle (ex: Luxe reste en 1 colonne même en desktop large). */
  gridClass: string
  /** Variante sans breakpoints `sm:`/`lg:`, utilisée dans le cadre iPhone de
   * l'éditeur (largeur CSS fixe mais rendu dans le vrai viewport desktop). */
  gridClassMobile: string
}

export const TEMPLATE_REGISTRY: Record<StorefrontTemplate, TemplateComponents> = {
  mode: {
    Header: ModeHeader,
    SearchBar: ModeSearchBar,
    CategoryBar: ModeCategoryBar,
    ProductCard: ModeProductCard,
    CartBar: ModeCartBar,
    CartDrawer: ModeCartDrawer,
    ProductModal: ModeProductModal,
    gridClass: 'grid grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-3 sm:gap-5 sm:px-5 lg:grid-cols-4 w-full',
    gridClassMobile: 'grid grid-cols-2 gap-4 px-4 py-5 w-full',
  },
  luxe: {
    Header: LuxeHeader,
    SearchBar: LuxeSearchBar,
    CategoryBar: LuxeCategoryBar,
    ProductCard: LuxeProductCard,
    CartBar: LuxeCartBar,
    CartDrawer: LuxeCartDrawer,
    ProductModal: LuxeProductModal,
    gridClass: 'grid grid-cols-1 gap-8 px-5 py-8 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 w-full max-w-2xl mx-auto',
    gridClassMobile: 'grid grid-cols-1 gap-8 px-5 py-8 w-full max-w-2xl mx-auto',
  },
  fresh: {
    Header: FreshHeader,
    SearchBar: FreshSearchBar,
    CategoryBar: FreshCategoryBar,
    ProductCard: FreshProductCard,
    CartBar: FreshCartBar,
    CartDrawer: FreshCartDrawer,
    ProductModal: FreshProductModal,
    gridClass: 'grid grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 w-full',
    gridClassMobile: 'grid grid-cols-2 gap-4 px-4 py-5 w-full',
  },
  dark: {
    Header: DarkHeader,
    SearchBar: DarkSearchBar,
    CategoryBar: DarkCategoryBar,
    ProductCard: DarkProductCard,
    CartBar: DarkCartBar,
    CartDrawer: DarkCartDrawer,
    ProductModal: DarkProductModal,
    gridClass: 'grid grid-cols-2 gap-3 px-3 py-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 w-full',
    gridClassMobile: 'grid grid-cols-2 gap-3 px-3 py-4 w-full',
  },
}

export function getTemplateComponents(template: StorefrontTemplate): TemplateComponents {
  return TEMPLATE_REGISTRY[template] ?? TEMPLATE_REGISTRY.mode
}
