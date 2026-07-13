'use client'

import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import type { TemplateProductCardProps } from '../types'

// Identité Luxe : image portrait généreuse, texte centré en serif, bouton
// outline centré. Pas de badge variantes — mention discrète en texte.
export default function LuxeProductCard({ product, t, onSelect, onQuickAdd }: TemplateProductCardProps) {
  const isOut = product.stock === 0
  const hasPriceRange = product.maxPrice > product.minPrice

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
      className="w-full flex flex-col items-center text-center overflow-hidden"
      style={{ backgroundColor: 'var(--card-bg, #fff)', boxShadow: 'var(--card-shadow)', borderRadius: 'var(--card-radius, 0.5rem)' }}
    >
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOut}
        className="relative block aspect-[3/4] w-full overflow-hidden"
        aria-label={product.name}
        style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 6%, var(--card-bg, #fff))' }}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className={`object-cover ${isOut ? 'opacity-50' : ''}`}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-8 h-8" style={{ color: 'var(--primary)', opacity: 0.4 }} strokeWidth={1} />
          </span>
        )}
        {isOut && (
          <span
            style={{ backgroundColor: 'color-mix(in srgb, var(--page-bg, #faf8f5) 90%, transparent)', color: 'var(--text-primary, #1a1a1a)' }}
            className="absolute inset-x-0 bottom-0 py-2 text-center text-[10px] uppercase tracking-[0.15em]"
          >
            {t.shop.outOfStock}
          </span>
        )}
      </button>

      <div className="px-4 py-4 flex flex-col items-center gap-1.5 flex-1">
        <p style={{ color: 'var(--text-primary, #1a1a1a)', fontFamily: 'var(--font-family)' }} className="text-sm font-medium">
          {product.name}
        </p>
        <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-sm font-light tracking-wide">
          {hasPriceRange ? t.shop.fromPrice(product.minPrice) : `${product.minPrice} DT`}
        </p>
        {product.hasVariants && (
          <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-[10px] italic opacity-70">
            Plusieurs options
          </p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={isOut}
          style={isOut
            ? { borderColor: 'color-mix(in srgb, var(--text-secondary, #6b5e4e) 30%, transparent)', color: 'var(--text-secondary, #6b5e4e)' }
            : { borderColor: 'var(--primary)', color: 'var(--primary)' }}
          className="mt-1.5 min-h-[38px] touch-manipulation w-full border px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors disabled:cursor-not-allowed"
        >
          {isOut ? t.shop.outOfStock : t.shop.add}
        </button>
      </div>
    </div>
  )
}
