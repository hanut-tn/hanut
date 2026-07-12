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

function Avatar({ shopName, logoUrl, size }: { shopName: string; logoUrl: string | null; size: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-16 h-16' : 'w-14 h-14 ring-4 ring-white'
  const fontSize = size === 'lg' ? 'calc(1.5rem * var(--font-size-scale, 1))' : 'calc(1.25rem * var(--font-size-scale, 1))'

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
      style={{ color: 'var(--primary)', fontSize }}
      className={`rounded-full bg-white font-bold flex items-center justify-center shrink-0 shadow-md ${sizeClasses}`}
    >
      {initial}
    </div>
  )
}

function HeaderContent({ shopName, shopDescription, logoUrl, t, onBanner }: Props & { onBanner: boolean }) {
  return (
    <div className="max-w-5xl mx-auto py-8 px-6 flex items-center gap-4">
      <Avatar shopName={shopName} logoUrl={logoUrl} size="lg" />
      <div className="min-w-0">
        <h1 style={{ fontSize: 'calc(1.5rem * var(--font-size-scale, 1))' }} className="font-bold text-white truncate">
          {shopName}
        </h1>
        {shopDescription && (
          <p style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }} className="text-white/85 mt-1">
            {shopDescription}
          </p>
        )}
        <span
          style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
          className={`inline-flex items-center gap-1.5 mt-2 text-white px-3 py-1 rounded-full ${onBanner ? 'bg-black/30' : 'bg-white/20'}`}
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
          <HeaderContent shopName={shopName} shopDescription={shopDescription} logoUrl={logoUrl} t={t} onBanner />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(to right, var(--primary), var(--primary-dark))' }}>
      <HeaderContent shopName={shopName} shopDescription={shopDescription} logoUrl={logoUrl} t={t} onBanner={false} />
    </div>
  )
}
