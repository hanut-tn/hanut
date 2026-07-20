'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff, Star, ShoppingBag } from 'lucide-react'
import type { TemplateProductCardProps } from '../types'

// Identité Fresh : coins très arrondis, ombre colorée, badges fun, rating
// décoratif, bouton coloré avec emoji, léger soulèvement au survol.
export default function FreshProductCard({ product, t, onSelect, onQuickAdd }: TemplateProductCardProps) {
  const isOut = product.stock === 0
  const isNew = !isOut && product.stock > 10
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
    <div
      style={{
        backgroundColor: 'var(--card-bg, #fff)',
        borderRadius: 'var(--card-radius, 1.5rem)',
        boxShadow: isHovering
          ? '0 10px 24px color-mix(in srgb, var(--primary) 22%, transparent)'
          : '0 4px 14px color-mix(in srgb, var(--primary) 12%, transparent)',
        transform: isHovering ? 'translateY(-4px)' : 'none',
      }}
      className="w-full overflow-hidden flex flex-col transition-all duration-200"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOut}
        className="relative block aspect-square w-full overflow-hidden"
        aria-label={product.name}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover ${isOut ? 'opacity-50' : ''}`}
          />
        ) : (
          <span style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, var(--card-bg, #fff))' }} className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-8 h-8" style={{ color: 'var(--primary)', opacity: 0.5 }} />
          </span>
        )}
        {isOut && (
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-white text-red-600 shadow-sm">{t.shop.outOfStock}</span>
          </span>
        )}
        {product.is_featured ? (
          <div className="absolute top-2 left-2">
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              ✨ {product.featured_label || 'En vedette'}
            </span>
          </div>
        ) : isNew && (
          <span
            style={{ backgroundColor: 'var(--primary)' }}
            className="absolute top-2 start-2 text-[10px] px-2.5 py-1 rounded-full font-bold text-white shadow-sm flex items-center gap-1"
          >
            ⭐ BEST
          </span>
        )}
      </button>

      <div className="px-3.5 pb-3.5 pt-2.5 flex flex-col gap-1.5 flex-1">
        <div className="flex-1">
          <p style={{ color: 'var(--text-primary, #14532d)' }} className="text-sm font-bold line-clamp-2">{product.name}</p>
          <div className="flex items-center gap-0.5 mt-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < 4 ? 'fill-current' : ''}`} style={{ color: 'var(--primary)', opacity: i < 4 ? 1 : 0.25 }} />
            ))}
          </div>
          <p style={{ color: 'var(--primary)' }} className="text-base font-extrabold mt-1">
            {hasPriceRange ? t.shop.fromPrice(product.minPrice) : `${product.minPrice} DT`}
          </p>
          {product.hasVariants && (
            <span
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
              className="inline-block mt-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
            >
              {t.shop.variantsCount(product.variants.length)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isOut}
          style={isOut
            ? { backgroundColor: 'color-mix(in srgb, var(--text-secondary, #166534) 15%, transparent)', color: 'var(--text-secondary, #166534)' }
            : { backgroundColor: 'var(--primary)' }}
          className={`w-full min-h-[40px] touch-manipulation flex items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-transform active:scale-95 ${
            isOut ? 'cursor-not-allowed' : 'text-white'
          }`}
        >
          {isOut ? t.shop.outOfStock : <>{t.shop.add} <ShoppingBag className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  )
}
