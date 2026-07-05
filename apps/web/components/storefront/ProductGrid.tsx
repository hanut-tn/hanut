'use client'

import { Store } from 'lucide-react'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import ProductCard from './ProductCard'

type Props = {
  products: StorefrontProduct[]
  t: StorefrontDict
  onSelect: (product: StorefrontProduct) => void
  onQuickAdd: (product: StorefrontProduct) => void
}

export default function ProductGrid({ products, t, onSelect, onQuickAdd }: Props) {
  const inStock = products.filter(p => p.stock > 0)
  const outOfStock = products.filter(p => p.stock === 0)

  if (inStock.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <Store className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
        <p className="font-semibold text-[#1C1917] text-lg">{t.shop.emptyTitle}</p>
        <p className="text-sm text-[#78716C] mt-1">{t.shop.emptyDesc}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
