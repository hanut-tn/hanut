'use client'

import { ShoppingBag } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Dark : fond noir, pas d'avatar, nom énorme uppercase + ®, panier
// avec effet lumineux (glow). Contraste maximal, esthétique streetwear.
export default function DarkHeader({ sellerName, shopDescription, cartCount, onCartOpen, t }: TemplateHeaderProps) {
  return (
    <header style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="max-w-5xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white truncate">
            {sellerName}
            <span className="align-super text-xs font-normal ms-0.5 opacity-50">®</span>
          </h1>
          {shopDescription && (
            <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{shopDescription}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onCartOpen}
          aria-label={t.cart.title}
          style={{
            backgroundColor: '#111111',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: cartCount > 0 ? '0 0 16px color-mix(in srgb, var(--primary) 55%, transparent)' : 'none',
          }}
          className="relative w-11 h-11 shrink-0 flex items-center justify-center text-white transition-shadow"
        >
          <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {cartCount > 0 && (
            <span
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }}
              className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white flex items-center justify-center rounded-full"
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
