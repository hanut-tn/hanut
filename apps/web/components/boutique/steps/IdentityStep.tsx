'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { ImagePlus, Sunset, Lock } from 'lucide-react'
import type { ShopInfo } from '@/app/(dashboard)/boutique/actions'

type Props = {
  shopInfo: ShopInfo
  onChange: (updater: (prev: ShopInfo) => ShopInfo) => void
  logoUploading: boolean
  bannerUploading: boolean
  onLogoFile: (file: File) => void
  onBannerFile: (file: File) => void
  plan: 'starter' | 'pro' | 'business'
}

export default function IdentityStep({ shopInfo, onChange, logoUploading, bannerUploading, onLogoFile, onBannerFile, plan }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const isLocked = plan === 'starter'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Votre identité</h2>
        <p className="text-xs text-gray-500">Ces informations apparaissent en haut de votre boutique</p>
      </div>

      <div>
        <label htmlFor="identity-shop-name" className="text-xs font-medium text-gray-700 block mb-1">
          Nom de la boutique
        </label>
        <input
          id="identity-shop-name"
          type="text"
          value={shopInfo.shop_name ?? ''}
          onChange={e => onChange(prev => ({ ...prev, shop_name: e.target.value }))}
          placeholder="Ex: Boutique Sarra"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          maxLength={100}
        />
      </div>

      <div>
        <label htmlFor="identity-shop-description" className="text-xs font-medium text-gray-700 block mb-1">
          Description courte <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          id="identity-shop-description"
          value={shopInfo.shop_description ?? ''}
          onChange={e => onChange(prev => ({ ...prev, shop_description: e.target.value }))}
          placeholder="Ex: Mode femme et accessoires, livraison partout en Tunisie"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          rows={3}
          maxLength={300}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          {(shopInfo.shop_description ?? '').length}/300 caractères
        </p>
      </div>

      <div className={isLocked ? 'relative' : undefined}>
        <label className="text-xs font-medium text-gray-700 block mb-1">
          Logo <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        {isLocked && (
          <div className="absolute inset-x-0 top-6 bottom-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
            <span className="flex items-center gap-1 text-xs bg-brand-600 text-white px-2.5 py-1 rounded-full font-medium">
              <Lock className="w-3 h-3" />
              Disponible en Pro
            </span>
          </div>
        )}
        <div className={isLocked ? 'opacity-50 pointer-events-none' : undefined}>
          {shopInfo.logo_url ? (
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-gray-200">
                <Image src={shopInfo.logo_url} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading || isLocked}
                  className="text-xs text-brand-600 hover:underline text-left disabled:opacity-50"
                >
                  {logoUploading ? 'Envoi…' : 'Changer'}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(prev => ({ ...prev, logo_url: null }))}
                  disabled={logoUploading || isLocked}
                  className="text-xs text-red-500 hover:underline text-left disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading || isLocked}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-center hover:border-brand-400 transition-colors disabled:opacity-50"
            >
              <ImagePlus className="w-6 h-6 mx-auto mb-1 text-gray-400" />
              <span className="text-xs text-gray-500 block">{logoUploading ? 'Envoi en cours…' : 'Ajouter un logo'}</span>
              <span className="text-[10px] text-gray-400 block">Format carré recommandé</span>
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onLogoFile(f) }}
          />
        </div>
      </div>

      <div className={isLocked ? 'relative' : undefined}>
        <label className="text-xs font-medium text-gray-700 block mb-1">
          Bannière <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        {isLocked && (
          <div className="absolute inset-x-0 top-6 bottom-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
            <span className="flex items-center gap-1 text-xs bg-brand-600 text-white px-2.5 py-1 rounded-full font-medium">
              <Lock className="w-3 h-3" />
              Disponible en Pro
            </span>
          </div>
        )}
        <div className={isLocked ? 'opacity-50 pointer-events-none' : undefined}>
          {shopInfo.banner_url ? (
            <div>
              <div className="relative w-full h-20 rounded-xl overflow-hidden border border-gray-200 mb-2">
                <Image src={shopInfo.banner_url} alt="" fill sizes="320px" className="object-cover" />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading || isLocked}
                  className="text-xs text-brand-600 hover:underline disabled:opacity-50"
                >
                  {bannerUploading ? 'Envoi…' : 'Changer'}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(prev => ({ ...prev, banner_url: null }))}
                  disabled={bannerUploading || isLocked}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading || isLocked}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-center hover:border-brand-400 transition-colors disabled:opacity-50"
            >
              <Sunset className="w-6 h-6 mx-auto mb-1 text-gray-400" />
              <span className="text-xs text-gray-500 block">{bannerUploading ? 'Envoi en cours…' : 'Ajouter une bannière'}</span>
              <span className="text-[10px] text-gray-400 block">1200×300px recommandé</span>
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onBannerFile(f) }}
          />
        </div>
      </div>
    </div>
  )
}
