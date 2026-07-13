'use client'

import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Luxe : serif, ambiance feutrée. Comportement logo/bannière
// unifié avec les 3 autres templates : bannière → image pleine largeur
// avec le nom en overlay ; sans bannière → bandeau dégradé couleur
// principale avec logo (si présent) + nom. Sans logo, rien n'est affiché
// à sa place (pas d'avatar de repli). Toggle langue groupé avec le bouton
// panier dans le même coin, très discret (opacity réduite), pour éviter
// toute collision entre les deux boutons.
export default function LuxeHeader({ sellerName, shopDescription, logoUrl, bannerUrl, cartCount, onCartOpen, lang, onLangToggle, t }: TemplateHeaderProps) {
  function TopActions() {
    return (
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onLangToggle}
          className="text-xs text-white/50 hover:text-white/90 transition-opacity"
        >
          {lang === 'fr' ? 'عربي' : 'FR'}
        </button>
        <button
          type="button"
          onClick={onCartOpen}
          aria-label={t.cart.title}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          className="relative w-10 h-10 flex items-center justify-center text-white"
        >
          <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.25} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-0.5 bg-white text-gray-900 text-[9px] font-bold flex items-center justify-center rounded-full">
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
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white text-center">
          <h1 className="text-xl font-semibold truncate">{sellerName}</h1>
          {shopDescription && <p className="text-sm opacity-80 mt-0.5 italic truncate">{shopDescription}</p>}
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
      <div className="flex flex-col items-center text-center gap-2 max-w-md mx-auto">
        {logoUrl && (
          <div className="relative overflow-hidden rounded-2xl shrink-0" style={{ width: '56px', height: '56px' }}>
            <Image src={logoUrl} alt={sellerName} fill sizes="56px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{sellerName}</h1>
          {shopDescription && <p className="text-sm opacity-80 mt-0.5 italic truncate">{shopDescription}</p>}
        </div>
      </div>
    </header>
  )
}
