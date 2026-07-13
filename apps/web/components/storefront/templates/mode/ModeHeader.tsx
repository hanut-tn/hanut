'use client'

import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import type { TemplateHeaderProps } from '../types'

// Identité Mode : ultra-compact, une seule ligne, angles droits, aucune
// fioriture. Pas d'avatar ni de description — juste le nom et le panier.
// Défile avec le contenu (pas sticky) : seule la barre Hanut générique
// (StorefrontShell) reste épinglée en haut, pour éviter tout conflit
// d'empilement entre deux éléments sticky à top:0.
export default function ModeHeader({ sellerName, logoUrl, bannerUrl, cartCount, onCartOpen, t }: TemplateHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100">
      {bannerUrl && (
        <div className="relative w-full h-32 sm:h-40">
          <Image src={bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
        </div>
      )}
      <div className="flex items-center justify-between px-4 h-14 gap-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl && (
            <div className="relative w-7 h-7 shrink-0 overflow-hidden bg-white">
              <Image src={logoUrl} alt="" fill sizes="28px" className="object-cover" />
            </div>
          )}
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-900 truncate">
            {sellerName}
          </span>
        </div>
        <button
          type="button"
          onClick={onCartOpen}
          aria-label={t.cart.title}
          className="relative w-9 h-9 shrink-0 flex items-center justify-center text-gray-900"
        >
          <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {cartCount > 0 && (
            <span className="absolute top-0.5 right-0 min-w-[15px] h-[15px] px-0.5 bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
