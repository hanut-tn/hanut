'use client'

import Image from 'next/image'
import { ShoppingBag, Sparkles } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Fresh : coloré, vivant. Comportement logo/bannière unifié avec
// les 3 autres templates : bannière → image pleine largeur avec le nom en
// overlay ; sans bannière → bandeau dégradé couleur principale avec logo
// (si présent) + nom. Sans logo, rien n'est affiché à sa place (pas
// d'avatar de repli). Toggle langue en pilule colorée, groupé avec le
// bouton panier dans le même coin.
export default function FreshHeader({ sellerName, shopDescription, logoUrl, bannerUrl, cartCount, onCartOpen, lang, onLangToggle, t }: TemplateHeaderProps) {
  function TopActions() {
    return (
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={onLangToggle}
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          className="text-xs font-medium text-white px-2.5 py-1 rounded-full"
        >
          {lang === 'fr' ? 'عربي' : 'FR'}
        </button>
        <button
          type="button"
          onClick={onCartOpen}
          aria-label={t.cart.title}
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
        >
          <ShoppingBag className="w-[18px] h-[18px]" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-white text-gray-900 text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    )
  }

  if (bannerUrl) {
    return (
      <header className="relative w-full" style={{ height: '180px' }}>
        <Image src={bannerUrl} alt={sellerName} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} />
        <TopActions />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h1 className="text-xl font-extrabold truncate flex items-center gap-1.5">
            {sellerName} <span aria-hidden>✨</span>
          </h1>
          {shopDescription && <p className="text-sm opacity-80 mt-0.5 truncate">{shopDescription}</p>}
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/25">
            <Sparkles className="w-3 h-3" />
            {t.shop.deliveryBadge}
          </span>
        </div>
      </header>
    )
  }

  return (
    <header
      className="relative"
      style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', padding: '1.5rem', color: '#ffffff' }}
    >
      <TopActions />
      <div className="flex items-center gap-3 max-w-5xl mx-auto pe-24">
        {logoUrl && (
          <div className="relative overflow-hidden rounded-2xl shrink-0" style={{ width: '56px', height: '56px' }}>
            <Image src={logoUrl} alt={sellerName} fill sizes="56px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold truncate flex items-center gap-1.5">
            {sellerName} <span aria-hidden>✨</span>
          </h1>
          {shopDescription && <p className="text-sm opacity-80 mt-0.5 truncate">{shopDescription}</p>}
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/25">
            <Sparkles className="w-3 h-3" />
            {t.shop.deliveryBadge}
          </span>
        </div>
      </div>
    </header>
  )
}
