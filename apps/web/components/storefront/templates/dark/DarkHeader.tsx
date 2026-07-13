'use client'

import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Dark : contraste maximal, uppercase bold. Comportement
// logo/bannière unifié avec les 3 autres templates : bannière → image
// pleine largeur avec le nom en overlay ; sans bannière → bandeau dégradé
// couleur principale avec logo (si présent) + nom. Sans logo, rien n'est
// affiché à sa place (pas d'avatar de repli). Toggle langue discret en
// uppercase, groupé avec le bouton panier dans le même coin.
export default function DarkHeader({ sellerName, shopDescription, logoUrl, bannerUrl, cartCount, onCartOpen, lang, onLangToggle, t }: TemplateHeaderProps) {
  function TopActions() {
    return (
      <div className="absolute top-4 end-4 z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={onLangToggle}
          className="text-[10px] font-bold tracking-widest"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {lang === 'fr' ? 'عربي' : 'FR'}
        </button>
        <button
          type="button"
          onClick={onCartOpen}
          aria-label={t.cart.title}
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            boxShadow: cartCount > 0 ? '0 0 16px color-mix(in srgb, var(--primary) 55%, transparent)' : 'none',
          }}
          className="relative w-10 h-10 flex items-center justify-center text-white transition-shadow"
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
    )
  }

  if (bannerUrl) {
    return (
      <header className="relative w-full" style={{ height: '180px' }}>
        <Image src={bannerUrl} alt={sellerName} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} />
        <TopActions />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h1 className="text-xl font-black uppercase tracking-tight truncate">
            {sellerName}
            <span className="align-super text-xs font-normal ms-0.5 opacity-50">®</span>
          </h1>
          {shopDescription && <p className="text-sm opacity-80 mt-0.5 truncate">{shopDescription}</p>}
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
      <div className="flex items-center gap-3 max-w-5xl mx-auto pe-16">
        {logoUrl && (
          <div className="relative overflow-hidden rounded-2xl shrink-0" style={{ width: '56px', height: '56px' }}>
            <Image src={logoUrl} alt={sellerName} fill sizes="56px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-black uppercase tracking-tight truncate">
            {sellerName}
            <span className="align-super text-xs font-normal ms-0.5 opacity-50">®</span>
          </h1>
          {shopDescription && <p className="text-sm opacity-80 mt-0.5 truncate">{shopDescription}</p>}
        </div>
      </div>
    </header>
  )
}
