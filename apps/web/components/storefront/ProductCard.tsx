'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImageOff, Plus, Check } from 'lucide-react'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  product: StorefrontProduct
  t: StorefrontDict
  onSelect: (product: StorefrontProduct) => void
  onQuickAdd: (product: StorefrontProduct) => void
}

export default function ProductCard({ product, t, onSelect, onQuickAdd }: Props) {
  const isOut = product.stock === 0
  const isLow = !isOut && product.stock <= product.low_stock_alert
  const hasPriceRange = product.maxPrice > product.minPrice
  const [justAdded, setJustAdded] = useState(false)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleAdd() {
    if (isOut) return
    if (product.hasVariants) {
      onSelect(product)
      return
    }
    onQuickAdd(product)
    setJustAdded(true)
    if (addedTimer.current) clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <div className={`bg-white border border-[#E7E5E4] rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-md ${isOut ? 'opacity-60' : ''}`}>
      {/* Image */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOut}
        className="relative block aspect-square bg-[#F0FDF4] w-full"
        aria-label={product.name}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[#78716C]">
            <ImageOff className="w-8 h-8 opacity-30" />
          </span>
        )}
        {isOut && (
          <span className="absolute top-2 start-2 text-xs px-2 py-0.5 rounded-full font-medium bg-red-600 text-white">
            {t.shop.outOfStock}
          </span>
        )}
        {isLow && (
          <span className="absolute top-2 start-2 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500 text-white">
            {t.shop.lowStock(product.stock)}
          </span>
        )}
      </button>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1C1917] line-clamp-2">{product.name}</p>
          <p className="text-base font-bold text-brand-600 mt-0.5">
            {hasPriceRange ? t.shop.fromPrice(product.minPrice) : `${product.minPrice} DT`}
          </p>
          {product.hasVariants && (
            <span className="inline-block mt-1 text-[10px] border border-[#E7E5E4] rounded px-1.5 py-0.5 text-[#78716C]">
              {t.shop.variantsCount(product.variants.length)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isOut}
          className={`w-full min-h-[40px] touch-manipulation flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ease-out ${
            isOut
              ? 'bg-[#F5F5F4] text-[#A8A29E] cursor-not-allowed'
              : justAdded
                ? 'bg-[#0B5E46] text-white'
                : 'bg-[#16A34A] text-white hover:bg-[#15803D] active:scale-[0.97]'
          }`}
        >
          {isOut ? (
            t.shop.outOfStock
          ) : justAdded ? (
            <>
              <Check className="w-4 h-4" />
              {t.shop.added}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {t.shop.add}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
