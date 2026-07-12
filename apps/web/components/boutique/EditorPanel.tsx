'use client'

import { useState } from 'react'
import { ChevronDown, Store, Palette, Type, LayoutTemplate, Grid3x3, Search, Tags, ShoppingCart, Baseline, Move } from 'lucide-react'
import type {
  StorefrontColors, StorefrontTypography, StorefrontCards, StorefrontSearch, StorefrontChips,
  StorefrontCartBar, StorefrontTextStyle, StorefrontLayout,
} from '@hanut/types'
import IdentitySection from './editor/IdentitySection'
import ColorsSection from './editor/ColorsSection'
import TypographySection from './editor/TypographySection'
import CardsSection from './editor/CardsSection'
import SearchSection from './editor/SearchSection'
import ChipsSection from './editor/ChipsSection'
import CartBarSection from './editor/CartBarSection'
import ProductNameSection from './editor/ProductNameSection'
import ProductPriceSection from './editor/ProductPriceSection'
import SpacingSection from './editor/SpacingSection'
import LayoutSection from './editor/LayoutSection'

type SectionId = 'identity' | 'colors' | 'typography' | 'cards' | 'search' | 'chips' | 'cartBar' | 'productTexts' | 'spacing' | 'layout'

type Props = {
  shopName: string
  shopDescription: string
  logoUrl: string | null
  logoUploading: boolean
  bannerUrl: string | null
  bannerUploading: boolean
  accountName: string
  onShopNameChange: (value: string) => void
  onShopDescriptionChange: (value: string) => void
  onLogoFile: (file: File) => void
  onLogoRemove: () => void
  onBannerFile: (file: File) => void
  onBannerRemove: () => void

  colors: StorefrontColors
  onColorsChange: (patch: Partial<StorefrontColors>) => void

  typography: StorefrontTypography
  onTypographyChange: (patch: Partial<StorefrontTypography>) => void

  cards: StorefrontCards
  onCardsChange: (patch: Partial<StorefrontCards>) => void

  search: StorefrontSearch
  onSearchChange: (patch: Partial<StorefrontSearch>) => void

  chips: StorefrontChips
  onChipsChange: (patch: Partial<StorefrontChips>) => void

  cartBar: StorefrontCartBar
  onCartBarChange: (patch: Partial<StorefrontCartBar>) => void

  productName: StorefrontTextStyle
  onProductNameChange: (patch: Partial<StorefrontTextStyle>) => void
  productPrice: StorefrontTextStyle
  onProductPriceChange: (patch: Partial<StorefrontTextStyle>) => void

  layout: StorefrontLayout
  onLayoutChange: (layout: StorefrontLayout) => void
}

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'identity', label: 'Identité', icon: Store },
  { id: 'colors', label: 'Couleurs', icon: Palette },
  { id: 'typography', label: 'Typographie', icon: Type },
  { id: 'cards', label: 'Cartes produits', icon: Grid3x3 },
  { id: 'search', label: 'Recherche', icon: Search },
  { id: 'chips', label: 'Catégories', icon: Tags },
  { id: 'cartBar', label: 'Panier', icon: ShoppingCart },
  { id: 'productTexts', label: 'Textes produits', icon: Baseline },
  { id: 'spacing', label: 'Espacements', icon: Move },
  { id: 'layout', label: 'Disposition', icon: LayoutTemplate },
]

export default function EditorPanel(props: Props) {
  const [openSection, setOpenSection] = useState<SectionId>('identity')

  return (
    <div className="divide-y divide-[#E7E5E4]">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isOpen = openSection === id
        return (
          <div key={id}>
            <button
              type="button"
              onClick={() => setOpenSection(id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-2 px-4 py-3.5 min-h-[48px] text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#78716C]" />
                {label}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#78716C] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-5">
                {id === 'identity' && (
                  <IdentitySection
                    shopName={props.shopName}
                    shopDescription={props.shopDescription}
                    logoUrl={props.logoUrl}
                    logoUploading={props.logoUploading}
                    bannerUrl={props.bannerUrl}
                    bannerUploading={props.bannerUploading}
                    accountName={props.accountName}
                    onShopNameChange={props.onShopNameChange}
                    onShopDescriptionChange={props.onShopDescriptionChange}
                    onLogoFile={props.onLogoFile}
                    onLogoRemove={props.onLogoRemove}
                    onBannerFile={props.onBannerFile}
                    onBannerRemove={props.onBannerRemove}
                  />
                )}
                {id === 'colors' && (
                  <ColorsSection colors={props.colors} onChange={props.onColorsChange} />
                )}
                {id === 'typography' && (
                  <TypographySection typography={props.typography} onChange={props.onTypographyChange} />
                )}
                {id === 'cards' && (
                  <CardsSection cards={props.cards} onChange={props.onCardsChange} />
                )}
                {id === 'search' && (
                  <SearchSection search={props.search} onChange={props.onSearchChange} />
                )}
                {id === 'chips' && (
                  <ChipsSection chips={props.chips} onChange={props.onChipsChange} />
                )}
                {id === 'cartBar' && (
                  <CartBarSection cartBar={props.cartBar} onChange={props.onCartBarChange} />
                )}
                {id === 'productTexts' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Nom du produit</h3>
                      <ProductNameSection productName={props.productName} onChange={props.onProductNameChange} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Prix du produit</h3>
                      <ProductPriceSection productPrice={props.productPrice} onChange={props.onProductPriceChange} />
                    </div>
                  </div>
                )}
                {id === 'spacing' && (
                  <SpacingSection cards={props.cards} onChange={props.onCardsChange} />
                )}
                {id === 'layout' && (
                  <LayoutSection layout={props.layout} onChange={props.onLayoutChange} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
