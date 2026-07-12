'use client'

import { X } from 'lucide-react'
import { COLOR_PRESETS } from '@hanut/types'
import ColorField from '../editor/ColorField'
import IdentitySection from '../editor/IdentitySection'

type Props = {
  shopName: string
  shopDescription: string
  logoUrl: string | null
  logoUploading: boolean
  bannerUrl: string | null
  bannerUploading: boolean
  accountName: string
  onShopNameChange: (value: string) => void
  onShopDescriptionChange: (value: string) => void
  onLogoFile: (file: File) => void
  onLogoRemove: () => void
  onBannerFile: (file: File) => void
  onBannerRemove: () => void
  headerColor: string
  onHeaderColorChange: (hex: string) => void
  onClose: () => void
}

/** Panneau flottant fixe (pas un popover positionné) — édition du header de la boutique. */
export default function HeaderPanel({
  shopName, shopDescription, logoUrl, logoUploading, bannerUrl, bannerUploading, accountName,
  onShopNameChange, onShopDescriptionChange, onLogoFile, onLogoRemove, onBannerFile, onBannerRemove,
  headerColor, onHeaderColorChange, onClose,
}: Props) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed left-6 top-20 z-50 w-72 max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100"
    >
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white rounded-t-2xl">
        <span className="font-semibold text-sm text-gray-900">Header de la boutique</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <IdentitySection
          shopName={shopName}
          shopDescription={shopDescription}
          logoUrl={logoUrl}
          logoUploading={logoUploading}
          bannerUrl={bannerUrl}
          bannerUploading={bannerUploading}
          accountName={accountName}
          onShopNameChange={onShopNameChange}
          onShopDescriptionChange={onShopDescriptionChange}
          onLogoFile={onLogoFile}
          onLogoRemove={onLogoRemove}
          onBannerFile={onBannerFile}
          onBannerRemove={onBannerRemove}
        />

        <div className={bannerUrl ? 'opacity-40 pointer-events-none' : ''}>
          <ColorField
            label="Couleur du header"
            value={headerColor}
            presets={COLOR_PRESETS.primary}
            onChange={onHeaderColorChange}
          />
          {bannerUrl && (
            <p className="text-xs text-gray-400 mt-1">Ignorée tant qu&apos;une bannière est définie.</p>
          )}
        </div>
      </div>
    </div>
  )
}
