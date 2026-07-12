'use client'

import { Store } from 'lucide-react'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import type { StorefrontLayout } from '@hanut/types'
import ProductCard from './ProductCard'

type Props = {
  products: StorefrontProduct[]
  t: StorefrontDict
  layout?: StorefrontLayout
  onSelect: (product: StorefrontProduct) => void
  onQuickAdd: (product: StorefrontProduct) => void
}

const LAYOUT_CLASS: Record<StorefrontLayout, string> = {
  'grid-2': 'grid grid-cols-2 gap-3 px-3 py-4 sm:gap-4 sm:px-4',
  'grid-3': 'grid grid-cols-2 gap-3 px-3 py-4 sm:grid-cols-3 sm:gap-4 sm:px-4 lg:grid-cols-4 lg:gap-5',
  list: 'flex flex-col gap-3 px-3 py-4 sm:px-4',
}

export default function ProductGrid({ products, t, layout = 'grid-3', onSelect, onQuickAdd }: Props) {
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
    <div className={LAYOUT_CLASS[layout]}>
      {[...inStock, ...outOfStock].map(product => (
        <ProductCard
          key={product.id}
          product={product}
          t={t}
          onSelect={onSelect}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  )
}
