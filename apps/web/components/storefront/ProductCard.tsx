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
      style={{
        backgroundColor: 'var(--card-bg, #fff)',
        borderRadius: 'var(--card-radius, 1rem)',
        boxShadow: 'var(--card-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
      }}
      className="border border-black/5 overflow-hidden flex flex-col"
    >
      {/* Image — ratio configurable par le vendeur (carré/portrait/large) */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOut}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{ aspectRatio: 'var(--image-aspect, 1 / 1)' }}
        className="relative block bg-gray-50 w-full"
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
            <span
              style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
              className="px-3 py-1 rounded-full font-semibold bg-red-600 text-white shadow-sm"
            >
              {t.shop.outOfStock}
            </span>
          </span>
        )}
        {isLow && (
          <span
            style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
            className="absolute top-2 start-2 px-2 py-0.5 rounded-full font-medium bg-amber-500 text-white"
          >
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
          <p
            style={{ color: 'var(--text-primary, #111827)', fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
            className="font-semibold line-clamp-2"
          >
            {product.name}
          </p>
          <p
            style={{ color: 'var(--primary)', fontSize: 'calc(1rem * var(--font-size-scale, 1))' }}
            className="font-bold mt-0.5"
          >
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
          style={{
            fontSize: 'calc(0.875rem * var(--font-size-scale, 1))',
            ...(isOut ? {} : { backgroundColor: justAdded ? 'var(--primary-dark)' : 'var(--primary)' }),
          }}
          className={`w-full min-h-[40px] touch-manipulation flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-150 ease-out ${
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
