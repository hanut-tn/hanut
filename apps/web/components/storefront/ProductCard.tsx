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
  const [isHovering, setIsHovering] = useState(false)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const images = [product.image_url, ...product.images_gallery].filter((u): u is string => !!u)
  const hasMultipleImages = images.length > 1
  const displayIndex = hasMultipleImages && isHovering ? 1 : 0
  const displaySrc = images[displayIndex] ?? null

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
    <div
      style={{ borderRadius: 'var(--card-radius, 1rem)' }}
      className="bg-white border border-gray-100 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image ratio 4:3 */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOut}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative block aspect-[4/3] bg-gray-50 w-full"
        aria-label={product.name}
      >
        {displaySrc ? (
          <Image
            key={displaySrc}
            src={displaySrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-opacity duration-200 ${isOut ? 'opacity-60' : ''}`}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-gray-400">
            <ImageOff className="w-8 h-8 opacity-40" />
          </span>
        )}
        {isOut && (
          <span className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-red-600 text-white shadow-sm">
              {t.shop.outOfStock}
            </span>
          </span>
        )}
        {isLow && (
          <span className="absolute top-2 start-2 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500 text-white">
            {t.shop.lowStock(product.stock)}
          </span>
        )}
        {hasMultipleImages && (
          <span className="absolute bottom-1.5 inset-x-0 flex items-center justify-center gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === displayIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </span>
        )}
      </button>

      {/* Body */}
      <div className="px-3 pb-3 pt-2 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 line-clamp-2">{product.name}</p>
          <p className="text-base font-bold mt-0.5" style={{ color: 'var(--primary)' }}>
            {hasPriceRange ? t.shop.fromPrice(product.minPrice) : `${product.minPrice} DT`}
          </p>
          {product.hasVariants && (
            <span className="inline-block mt-1 text-[10px] bg-gray-50 text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">
              {t.shop.variantsCount(product.variants.length)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isOut}
          style={isOut ? undefined : { backgroundColor: justAdded ? 'var(--primary-dark)' : 'var(--primary)' }}
          className={`w-full min-h-[40px] touch-manipulation flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ease-out ${
            isOut
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'text-white active:scale-[0.97]'
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
