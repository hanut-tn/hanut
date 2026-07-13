'use client'

import { useState } from 'react'
import type { Category, StorefrontConfig } from '@hanut/types'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'
import { saveStorefrontData, type ShopInfo } from '@/app/(dashboard)/boutique/actions'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import StyleStep from './steps/StyleStep'
import ColorStep from './steps/ColorStep'
import IdentityStep from './steps/IdentityStep'

type Seller = {
  name: string
  slug: string | null
}

type Props = {
  seller: Seller
  products: StorefrontProduct[]
  categories: Category[]
  initialConfig: StorefrontConfig
  initialShopInfo: ShopInfo
}

type EditorStep = 'style' | 'color' | 'identity'
type Msg = { type: 'success' | 'error'; text: string }

const STEPS: { key: EditorStep; label: string }[] = [
  { key: 'style', label: 'Style' },
  { key: 'color', label: 'Couleur' },
  { key: 'identity', label: 'Identité' },
]

export default function BoutiqueEditor({ seller, products, categories, initialConfig, initialShopInfo }: Props) {
  const [config, setConfig] = useState<StorefrontConfig>(initialConfig)
  const [shopInfo, setShopInfo] = useState<ShopInfo>(initialShopInfo)
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [activeStep, setActiveStep] = useState<EditorStep>('style')
  const [logoUploading, setLogoUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  async function uploadImage(file: File, field: 'logo_url' | 'banner_url') {
    const setUploading = field === 'logo_url' ? setLogoUploading : setBannerUploading
    setMsg(null)
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: "L'image ne doit pas dépasser 5 Mo." })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { url, error } = await uploadProductImage(fd)
      if (error || !url) throw new Error(error ?? "Échec de l'upload")
      setShopInfo(prev => ({ ...prev, [field]: url }))
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setMsg(null)
    setIsSaving(true)
    const result = await saveStorefrontData(config, shopInfo)
    setIsSaving(false)
    if (result.error) {
      setMsg({ type: 'error', text: result.error })
      return
    }
    setMsg({ type: 'success', text: 'Boutique mise à jour avec succès.' })
  }

  return (
    <div className="flex flex-col lg:flex-row h-[80vh] min-h-[600px] rounded-2xl border border-gray-200 overflow-hidden bg-white">

      {/* PANNEAU GAUCHE — éditeur 3 étapes */}
      <div className="w-full lg:w-80 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col">

        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="font-semibold text-gray-900">Ma boutique</h1>
          <p className="text-xs text-gray-500 mt-0.5">Personnalisez votre boutique publique</p>
        </div>

        <div className="flex border-b border-gray-100">
          {STEPS.map(({ key, label }, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveStep(key)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeStep === key
                  ? 'text-brand-600 border-b-2 border-brand-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeStep === 'style' && <StyleStep config={config} onChange={setConfig} />}
          {activeStep === 'color' && <ColorStep config={config} onChange={setConfig} />}
          {activeStep === 'identity' && (
            <IdentityStep
              shopInfo={shopInfo}
              onChange={setShopInfo}
              logoUploading={logoUploading}
              bannerUploading={bannerUploading}
              onLogoFile={file => uploadImage(file, 'logo_url')}
              onBannerFile={file => uploadImage(file, 'banner_url')}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          {msg && (
            <p className={`text-xs text-center ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || logoUploading || bannerUploading}
            className="btn-primary w-full"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {seller.slug && (
            <a
              href={`/s/${seller.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-brand-600 hover:underline"
            >
              Voir ma boutique →
            </a>
          )}
        </div>
      </div>

      {/* PANNEAU DROIT — aperçu live pleine page */}
      <div className="flex-1 bg-gray-100 overflow-auto">
        <div className="min-h-full">
          <StorefrontShell
            sellerSlug={seller.slug ?? ''}
            sellerName={shopInfo.shop_name || seller.name}
            shopDescription={shopInfo.shop_description}
            logoUrl={shopInfo.logo_url}
            bannerUrl={shopInfo.banner_url}
            products={products}
            categories={categories}
            config={config}
            hideTopBar
            previewMode
          />
        </div>
      </div>

    </div>
  )
}
