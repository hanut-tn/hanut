'use client'

import Image from 'next/image'
import { MapPin } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  shopName: string
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl?: string | null
  t: StorefrontDict
}

function Avatar({ shopName, logoUrl }: { shopName: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white shrink-0 shadow-md">
        <Image src={logoUrl} alt="" fill sizes="64px" className="object-cover" />
      </div>
    )
  }

  const initial = shopName.trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      style={{ color: 'var(--primary)' }}
      className="w-16 h-16 rounded-full bg-white font-bold flex items-center justify-center shrink-0 shadow-md text-2xl"
    >
      {initial}
    </div>
  )
}

function HeaderContent({ shopName, shopDescription, logoUrl, t, textColor, badgeBg }: Props & { textColor: string; badgeBg: string }) {
  return (
    <div className="max-w-5xl mx-auto py-8 px-6 flex items-center gap-4">
      <Avatar shopName={shopName} logoUrl={logoUrl} />
      <div className="min-w-0">
        <h1 style={{ color: textColor }} className="text-2xl font-bold truncate">
          {shopName}
        </h1>
        {shopDescription && (
          <p style={{ color: textColor, opacity: 0.85 }} className="text-sm mt-1">
            {shopDescription}
          </p>
        )}
        <span
          style={{ color: textColor, backgroundColor: badgeBg }}
          className="inline-flex items-center gap-1.5 mt-2 text-xs px-3 py-1 rounded-full"
        >
          <MapPin className="w-3 h-3" />
          {t.shop.deliveryBadge}
        </span>
      </div>
    </div>
  )
}

export default function StorefrontHeader({ shopName, shopDescription, logoUrl, bannerUrl, t }: Props) {
  if (bannerUrl) {
    return (
      <div className="relative w-full h-48 sm:h-64">
        <Image src={bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
        {/* Overlay pour garder le texte lisible quelle que soit l'image */}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-x-0 bottom-0">
          <HeaderContent
            shopName={shopName}
            shopDescription={shopDescription}
            logoUrl={logoUrl}
            t={t}
            textColor="#ffffff"
            badgeBg="rgba(0,0,0,0.3)"
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--header-bg)' }}>
      <HeaderContent
        shopName={shopName}
        shopDescription={shopDescription}
        logoUrl={logoUrl}
        t={t}
        textColor="var(--header-text)"
        badgeBg="color-mix(in srgb, var(--header-text) 20%, transparent)"
      />
    </div>
  )
}
