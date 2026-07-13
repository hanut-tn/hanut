'use client'

import Image from 'next/image'
import { ShoppingBag, Sparkles } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Fresh : coloré, vivant, avatar avec ring, badge livraison, panier
// avec badge "bounce" — l'énergie d'une marque cosmétique moderne.
export default function FreshHeader({ sellerName, shopDescription, logoUrl, bannerUrl, cartCount, onCartOpen, t }: TemplateHeaderProps) {
  return (
    <header
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, var(--card-bg, #fff) 60%, color-mix(in srgb, var(--primary) 12%, var(--card-bg, #fff)) 100%)' }}
    >
      {bannerUrl && (
        <div className="relative w-full h-36">
          <Image src={bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 py-6 flex items-center gap-4">
        <div
          className="relative w-16 h-16 rounded-full overflow-hidden shrink-0"
          style={{ boxShadow: '0 0 0 3px var(--card-bg, #fff), 0 0 0 5px var(--primary)' }}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span style={{ backgroundColor: 'var(--primary)', color: '#fff' }} className="w-full h-full flex items-center justify-center text-xl font-bold">
              {sellerName.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 style={{ color: 'var(--text-primary, #14532d)' }} className="text-xl font-extrabold truncate flex items-center gap-1.5">
            {sellerName} <span aria-hidden>✨</span>
          </h1>
          {shopDescription && (
            <p style={{ color: 'var(--text-secondary, #166534)' }} className="text-sm mt-0.5 truncate">
              {shopDescription}
            </p>
          )}
          <span
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}
            className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          >
            <Sparkles className="w-3 h-3" />
            {t.shop.deliveryBadge}
          </span>
        </div>

        <button
          type="button"
          onClick={onCartOpen}
          aria-label={t.cart.title}
          style={{ backgroundColor: 'var(--primary)' }}
          className="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-90"
        >
          <ShoppingBag className="w-[18px] h-[18px]" />
          {cartCount > 0 && (
            <span
              style={{ backgroundColor: '#fff', color: 'var(--primary)' }}
              className="absolute -top-1 -end-1 min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce"
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
