'use client'

import { useRef } from 'react'

type Props = {
  shopName: string
  shopDescription: string
  logoUrl: string | null
  logoUploading: boolean
  accountName: string
  onShopNameChange: (value: string) => void
  onShopDescriptionChange: (value: string) => void
  onLogoFile: (file: File) => void
  onLogoRemove: () => void
}

export default function IdentitySection({
  shopName, shopDescription, logoUrl, logoUploading, accountName,
  onShopNameChange, onShopDescriptionChange, onLogoFile, onLogoRemove,
}: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="editor-shop-name" className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la boutique
        </label>
        <input
          id="editor-shop-name"
          className="input"
          value={shopName}
          onChange={e => onShopNameChange(e.target.value)}
          placeholder={accountName || 'Ma boutique'}
          maxLength={100}
        />
        <p className="text-xs text-gray-400 mt-1">
          Laissez vide pour afficher le nom de votre compte ({accountName}).
        </p>
      </div>

      <div>
        <label htmlFor="editor-shop-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          id="editor-shop-description"
          className="input resize-none"
          rows={2}
          value={shopDescription}
          onChange={e => onShopDescriptionChange(e.target.value)}
          placeholder="Ex: Parfums et cosmétiques — livraison partout en Tunisie"
          maxLength={300}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Logo <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        {logoUrl ? (
          <div className="flex items-center gap-3">
            <div
              role="img"
              aria-label="Aperçu du logo"
              className="h-16 w-16 shrink-0 rounded-full border border-gray-200 bg-cover bg-center"
              style={{ backgroundImage: `url(${logoUrl})` }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {logoUploading ? 'Envoi…' : 'Changer le logo'}
              </button>
              <button
                type="button"
                onClick={onLogoRemove}
                disabled={logoUploading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="w-full h-20 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand-500/50 hover:text-brand-600 transition-colors disabled:opacity-50"
          >
            {logoUploading ? 'Envoi en cours…' : 'Choisir un logo — carré, 400×400px conseillé'}
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
  )
}
