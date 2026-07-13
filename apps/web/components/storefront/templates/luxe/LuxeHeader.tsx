'use client'

import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Luxe : tout centré, crème, avatar rond avec bordure fine, nom en
// serif, séparateur fin. Le panier est une icône discrète en haut à droite.
export default function LuxeHeader({ sellerName, shopDescription, logoUrl, bannerUrl, cartCount, onCartOpen, t }: TemplateHeaderProps) {
  return (
    <header className="relative" style={{ backgroundColor: 'var(--page-bg, #faf8f5)' }}>
      <button
        type="button"
        onClick={onCartOpen}
        aria-label={t.cart.title}
        className="absolute top-4 end-4 z-10 w-9 h-9 flex items-center justify-center"
        style={{ color: 'var(--text-primary, #1a1a1a)' }}
      >
        <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.25} />
        {cartCount > 0 && (
          <span
            style={{ backgroundColor: 'var(--primary)' }}
            className="absolute top-1 right-0.5 w-1.5 h-1.5 rounded-full"
          />
        )}
      </button>

      {bannerUrl && (
        <div className="relative w-full h-40">
          <Image src={bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0" style={{ backgroundColor: 'color-mix(in srgb, var(--page-bg, #faf8f5) 30%, transparent)' }} />
        </div>
      )}

      <div className="max-w-md mx-auto px-6 py-10 flex flex-col items-center text-center">
        <div
          className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 -mt-16"
          style={{
            border: '1px solid color-mix(in srgb, var(--text-primary, #1a1a1a) 20%, transparent)',
            backgroundColor: 'var(--card-bg, #fff)',
            marginTop: bannerUrl ? '-2.5rem' : 0,
          }}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span
              style={{ color: 'var(--primary)', fontFamily: 'var(--font-family)' }}
              className="w-full h-full flex items-center justify-center text-2xl font-semibold"
            >
              {sellerName.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        <h1
          style={{ color: 'var(--text-primary, #1a1a1a)', fontFamily: 'var(--font-family)' }}
          className="mt-4 text-2xl font-semibold"
        >
          {sellerName}
        </h1>

        {shopDescription && (
          <p
            style={{ color: 'var(--text-secondary, #6b5e4e)', fontFamily: 'var(--font-family)' }}
            className="mt-2 text-sm italic max-w-xs"
          >
            {shopDescription}
          </p>
        )}

        <div className="mt-4 w-20 h-px" style={{ backgroundColor: 'var(--primary)' }} />
      </div>
    </header>
  )
}
