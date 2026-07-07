'use client'

import Image from 'next/image'
import { MapPin } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  shopName: string
  shopDescription: string | null
  logoUrl: string | null
  t: StorefrontDict
}

function Avatar({ shopName, logoUrl, size }: { shopName: string; logoUrl: string | null; size: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-14 h-14 text-xl ring-4 ring-white'

  if (logoUrl) {
    return (
      <div className={`relative rounded-full overflow-hidden bg-white shrink-0 shadow-md ${sizeClasses}`}>
        <Image src={logoUrl} alt="" fill sizes="64px" className="object-cover" />
      </div>
    )
  }

  const initial = shopName.trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className={`rounded-full bg-white text-brand-600 font-bold flex items-center justify-center shrink-0 shadow-md ${sizeClasses}`}
    >
      {initial}
    </div>
  )
}

export default function StorefrontHeader({ shopName, shopDescription, logoUrl, t }: Props) {
  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-700">
      <div className="max-w-5xl mx-auto py-8 px-6 flex items-center gap-4">
        <Avatar shopName={shopName} logoUrl={logoUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{shopName}</h1>
          {shopDescription && (
            <p className="text-brand-100 text-sm mt-1">{shopDescription}</p>
          )}
          <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 text-white text-xs px-3 py-1 rounded-full">
            <MapPin className="w-3 h-3" />
            {t.shop.deliveryBadge}
          </span>
        </div>
      </div>
    </div>
  )
}
