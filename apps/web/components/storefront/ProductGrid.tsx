'use client'

import { Store } from 'lucide-react'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import type { StorefrontLayout, EditTarget, PopoverPosition } from '@hanut/types'
import ProductCard from './ProductCard'

type Props = {
  products: StorefrontProduct[]
  t: StorefrontDict
  layout?: StorefrontLayout
  editMode?: boolean
  buttonText?: string
  onSelect: (product: StorefrontProduct) => void
  onQuickAdd: (product: StorefrontProduct) => void
  onEditTargetChange?: (target: EditTarget, position?: PopoverPosition) => void
}

// Le gap est piloté par --card-gap (configurable) via `style`, pas par les
// classes gap-* de Tailwind — seul le nombre de colonnes reste ici, en
// classes statiques littérales (donc scannées, sans risque de purge).
const LAYOUT_CLASS: Record<StorefrontLayout, string> = {
  'grid-2': 'grid grid-cols-2 px-3 py-4 sm:px-4',
  'grid-3': 'grid grid-cols-2 px-3 py-4 sm:grid-cols-3 sm:px-4 lg:grid-cols-4',
  list: 'flex flex-col px-3 py-4 sm:px-4',
}

export default function ProductGrid({ products, t, layout = 'grid-3', editMode = false, buttonText, onSelect, onQuickAdd, onEditTargetChange }: Props) {
  const inStock = products.filter(p => p.stock > 0)
  const outOfStock = products.filter(p => p.stock === 0)

  if (inStock.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <Store className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
        <p style={{ fontSize: 'calc(1.125rem * var(--font-size-scale, 1))' }} className="font-semibold text-[#1C1917]">
          {t.shop.emptyTitle}
        </p>
        <p style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }} className="text-[#78716C] mt-1">
          {t.shop.emptyDesc}
        </p>
      </div>
    )
  }

  return (
    <div style={{ gap: 'var(--card-gap, 12px)' }} className={LAYOUT_CLASS[layout]}>
      {[...inStock, ...outOfStock].map(product => (
        <ProductCard
          key={product.id}
          product={product}
          t={t}
          editMode={editMode}
          buttonText={buttonText}
          onSelect={onSelect}
          onQuickAdd={onQuickAdd}
          onEditTargetChange={onEditTargetChange}
        />
      ))}
    </div>
  )
}
