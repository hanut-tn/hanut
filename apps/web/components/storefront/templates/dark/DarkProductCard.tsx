'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff, ArrowUpRight } from 'lucide-react'
import type { TemplateProductCardProps } from '../types'

// Identité Dark : fond #1a1a1a, bordure blanche discrète, image en niveaux
// de gris au repos (couleur au survol), symbole "◈" avant le prix, bouton
// outline uppercase avec glow au survol.
export default function DarkProductCard({ product, t, onSelect, onQuickAdd }: TemplateProductCardProps) {
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
    <div
      style={{
        backgroundColor: 'var(--card-bg, #1a1a1a)',
        border: `1px solid ${isHovering ? 'color-mix(in srgb, var(--primary) 50%, transparent)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isHovering ? '0 0 20px color-mix(in srgb, var(--primary) 25%, transparent)' : 'none',
        borderRadius: 'var(--card-radius, 1rem)',
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
            className="object-cover transition-all duration-300"
            style={{ filter: isHovering || isOut ? 'none' : 'grayscale(1)', opacity: isOut ? 0.4 : 1 }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <ImageOff className="w-8 h-8 text-white/20" strokeWidth={1.25} />
          </span>
        )}
        {isOut && (
          <span className="absolute inset-x-0 bottom-0 bg-black/80 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
            {t.shop.outOfStock}
          </span>
        )}
        {product.is_featured && (
          <div className="absolute top-2 left-2">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                textShadow: '0 0 8px currentColor',
              }}
            >
              {product.featured_label || 'En vedette'}
            </span>
          </div>
        )}
      </button>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} className="px-3 pb-3 pt-2.5 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <p className="text-sm font-black uppercase tracking-tight text-white line-clamp-2">{product.name}</p>
          <p style={{ color: 'var(--primary)', textShadow: '0 0 12px color-mix(in srgb, var(--primary) 45%, transparent)' }} className="text-base font-bold mt-1">
            <span aria-hidden>◈</span>{' '}
            {hasPriceRange ? t.shop.fromPrice(product.minPrice) : `${product.minPrice} DT`}
          </p>
          {product.hasVariants && (
            <span className="inline-block mt-1 text-[10px] font-medium text-white/50 uppercase tracking-wide">
              {t.shop.variantsCount(product.variants.length)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isOut}
          style={{
            borderColor: isOut ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
            color: isOut ? 'rgba(255,255,255,0.3)' : '#fff',
          }}
          className="w-full min-h-[38px] touch-manipulation flex items-center justify-center gap-1 border text-[11px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed hover:border-white"
        >
          {isOut ? t.shop.outOfStock : <>{t.shop.add} <ArrowUpRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  )
}
