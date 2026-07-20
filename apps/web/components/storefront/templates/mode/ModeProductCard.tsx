'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import type { TemplateProductCardProps } from '../types'

// Identité Mode : angles droits, pas d'ombre, séparateur fin, bouton
// outline aligné à droite (pas pleine largeur), typographie légère.
export default function ModeProductCard({ product, t, onSelect, onQuickAdd }: TemplateProductCardProps) {
  const isOut = product.stock === 0
  const hasPriceRange = product.maxPrice > product.minPrice
  const [isHovering, setIsHovering] = useState(false)

  function handleAdd() {
    if (isOut) return
    if (product.hasVariants) {
      onSelect(product)
      return
    }
    onQuickAdd(product)
  }

  return (
    <div className="w-full flex flex-col">
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOut}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative block aspect-square w-full overflow-hidden bg-[#f5f5f5]"
        aria-label={product.name}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-300 ${isHovering ? 'scale-105' : ''} ${isOut ? 'opacity-50' : ''}`}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-gray-300" strokeWidth={1.25} />
          </span>
        )}
        {isOut && (
          <span className="absolute inset-x-0 bottom-0 bg-white/90 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900">
            {t.shop.outOfStock}
          </span>
        )}
        {product.is_featured && (
          <div className="absolute top-0 left-0 right-0 flex justify-start p-2">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              {product.featured_label || 'En vedette'}
            </span>
          </div>
        )}
      </button>

      <div className="pt-2.5 flex flex-col gap-1">
        <p className="text-sm text-gray-500 font-normal truncate">{product.name}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-900">
            {hasPriceRange ? t.shop.fromPrice(product.minPrice) : `${product.minPrice} DT`}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOut}
            className={`shrink-0 min-h-[30px] touch-manipulation border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
              isOut
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
            }`}
          >
            {t.shop.add}
          </button>
        </div>
      </div>
    </div>
  )
}
