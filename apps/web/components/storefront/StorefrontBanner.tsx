'use client'

import Image from 'next/image'
import { MapPin } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  shopName: string
  shopDescription: string | null
  bannerUrl: string | null
  t: StorefrontDict
}

function Avatar({ shopName, size }: { shopName: string; size: 'md' | 'lg' }) {
  const initial = shopName.trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className={`rounded-full bg-white text-brand-600 font-bold flex items-center justify-center shrink-0 shadow-md ${
        size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-14 h-14 text-xl ring-4 ring-white'
      }`}
    >
      {initial}
    </div>
  )
}

export default function StorefrontBanner({ shopName, shopDescription, bannerUrl, t }: Props) {
  if (bannerUrl) {
    return (
      <div className="bg-white border-b border-gray-100">
        <div className="relative h-48 sm:h-64 w-full">
          <Image
            src={bannerUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-5">
          <div className="flex items-end gap-4 -mt-7">
            <Avatar shopName={shopName} size="md" />
            <div className="min-w-0 pb-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{shopName}</h1>
            </div>
          </div>
          {shopDescription && (
            <p className="text-sm text-gray-500 mt-2">{shopDescription}</p>
          )}
          <span className="inline-flex items-center gap-1.5 mt-2.5 bg-brand-50 text-brand-700 border border-brand-100 text-xs font-medium px-3 py-1 rounded-full">
            <MapPin className="w-3 h-3" />
            {t.shop.deliveryBadge}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-700">
      <div className="max-w-5xl mx-auto py-8 px-6 flex items-center gap-4">
        <Avatar shopName={shopName} size="lg" />
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
