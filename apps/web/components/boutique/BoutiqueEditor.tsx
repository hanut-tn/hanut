'use client'

import { useMemo, useState, useTransition } from 'react'
import { Store, Pencil, Smartphone } from 'lucide-react'
import { DEFAULT_STOREFRONT_CONFIG, type Category, type StorefrontConfig, type StorefrontColors, type StorefrontTypography, type StorefrontCards, type StorefrontLayout } from '@hanut/types'
import type { ShopBrandingInput } from '@/app/(dashboard)/settings/actions'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'
import { mergeStorefrontConfig, type StorefrontConfigPatch } from '@/lib/storefront/config'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import EditorPanel from './EditorPanel'
import PreviewToolbar from './PreviewToolbar'

type Seller = {
  name: string
  slug: string | null
  shopName: string | null
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl: string | null
}

type Props = {
  seller: Seller
  initialConfig: StorefrontConfig
  appUrl: string
  previewProducts: StorefrontProduct[]
  previewCategories: Category[]
  updateShopBranding: (input: ShopBrandingInput) => Promise<{ error?: string }>
  updateStorefrontConfig: (config: StorefrontConfigPatch) => Promise<{ error?: string }>
}

type MobileTab = 'edit' | 'preview'
type Msg = { type: 'success' | 'error'; text: string }

export default function BoutiqueEditor({
  seller, initialConfig, appUrl, previewProducts, previewCategories, updateShopBranding, updateStorefrontConfig,
}: Props) {
  const [config, setConfig] = useState<StorefrontConfig>(() => mergeStorefrontConfig(DEFAULT_STOREFRONT_CONFIG, initialConfig))
  const [isPending, startTransition] = useTransition()

  const [shopName, setShopName] = useState(seller.shopName ?? '')
  const [shopDescription, setShopDescription] = useState(seller.shopDescription ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(seller.logoUrl)
  const [logoUploading, setLogoUploading] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(seller.bannerUrl)
  const [bannerUploading, setBannerUploading] = useState(false)

  const [msg, setMsg] = useState<Msg | null>(null)
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile')
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit')

  const previewUrl = seller.slug ? `${appUrl.replace(/\/$/, '')}/s/${seller.slug}` : null

  function patchColors(patch: Partial<StorefrontColors>) {
    setConfig(c => mergeStorefrontConfig(c, { colors: patch }))
  }
  function patchTypography(patch: Partial<StorefrontTypography>) {
    setConfig(c => mergeStorefrontConfig(c, { typography: patch }))
  }
  function patchCards(patch: Partial<StorefrontCards>) {
    setConfig(c => mergeStorefrontConfig(c, { cards: patch }))
  }
  function setLayout(layout: StorefrontLayout) {
    setConfig(c => mergeStorefrontConfig(c, { layout }))
  }

  async function handleLogoFile(file: File) {
    setMsg(null)
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: "L'image ne doit pas dépasser 5 Mo." })
      return
    }
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { url, error } = await uploadProductImage(fd)
      if (error || !url) throw new Error(error ?? "Échec de l'upload")
      setLogoUrl(url)
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleBannerFile(file: File) {
    setMsg(null)
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: "L'image ne doit pas dépasser 5 Mo." })
      return
    }
    setBannerUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { url, error } = await uploadProductImage(fd)
      if (error || !url) throw new Error(error ?? "Échec de l'upload")
      setBannerUrl(url)
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setBannerUploading(false)
    }
  }

  function handleSave() {
    setMsg(null)
    startTransition(async () => {
      const [configResult, brandingResult] = await Promise.all([
        updateStorefrontConfig(config),
        updateShopBranding({ shopName, shopDescription, logoUrl, bannerUrl }),
      ])
      const error = configResult?.error ?? brandingResult?.error
      if (error) {
        setMsg({ type: 'error', text: error })
        return
      }
      setMsg({ type: 'success', text: 'Boutique mise à jour avec succès.' })
    })
  }

  const previewShell = useMemo(() => (
    <StorefrontShell
      sellerSlug={seller.slug ?? ''}
      sellerName={shopName || seller.name}
      shopDescription={shopDescription || null}
      logoUrl={logoUrl}
      bannerUrl={bannerUrl}
      products={previewProducts}
      categories={previewCategories}
      config={config}
      hideTopBar
      previewMode
    />
  ), [seller.slug, seller.name, shopName, shopDescription, logoUrl, bannerUrl, previewProducts, previewCategories, config])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-6 h-6 text-brand-600" />
          Ma boutique
        </h1>
        <p className="text-sm text-[#78716C] mt-0.5">Personnalisez l&apos;apparence de votre boutique publique — les changements s&apos;affichent en direct.</p>
      </div>

      {/* Onglets Modifier / Aperçu — mobile uniquement */}
      <div className="flex md:hidden gap-0 border-b border-[#E7E5E4]">
        {([
          { key: 'edit' as MobileTab, label: 'Modifier', icon: Pencil },
          { key: 'preview' as MobileTab, label: 'Aperçu', icon: Smartphone },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 min-h-[44px] text-sm font-medium transition-colors ${
              mobileTab === key
                ? 'text-[#166534] border-b-2 border-[#16A34A] -mb-px'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden flex flex-col md:flex-row h-[75vh] min-h-[560px]">
        {/* Panneau éditeur */}
        <div className={`w-full md:w-80 shrink-0 md:border-r border-[#E7E5E4] flex-col min-h-0 ${mobileTab === 'edit' ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex-1 overflow-y-auto">
            <EditorPanel
              shopName={shopName}
              shopDescription={shopDescription}
              logoUrl={logoUrl}
              logoUploading={logoUploading}
              bannerUrl={bannerUrl}
              bannerUploading={bannerUploading}
              accountName={seller.name}
              onShopNameChange={setShopName}
              onShopDescriptionChange={setShopDescription}
              onLogoFile={handleLogoFile}
              onLogoRemove={() => setLogoUrl(null)}
              onBannerFile={handleBannerFile}
              onBannerRemove={() => setBannerUrl(null)}
              colors={config.colors}
              onColorsChange={patchColors}
              typography={config.typography}
              onTypographyChange={patchTypography}
              cards={config.cards}
              onCardsChange={patchCards}
              layout={config.layout}
              onLayoutChange={setLayout}
            />
          </div>
          <div className="shrink-0 border-t border-[#E7E5E4] p-4 space-y-3">
            {msg && (
              <div className={`rounded-lg px-3 py-2 text-xs ${
                msg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {msg.text}
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || logoUploading || bannerUploading}
              className="btn-primary w-full"
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>

        {/* Aperçu live */}
        <div className={`flex-1 flex-col min-w-0 min-h-0 bg-[#F5F5F4] ${mobileTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
          <PreviewToolbar viewMode={viewMode} onViewModeChange={setViewMode} previewUrl={previewUrl} />
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 sm:p-8">
            <div
              style={{ width: viewMode === 'mobile' ? 390 : '100%', maxWidth: viewMode === 'mobile' ? 390 : 900 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#E7E5E4] transition-all duration-300 h-full"
            >
              <div className="w-full h-full overflow-y-auto">
                {previewShell}
              </div>
            </div>
          </div>
          {!seller.slug && (
            <p className="shrink-0 text-xs text-center text-amber-600 px-4 pb-3">
              Créez d&apos;abord votre lien de boutique dans Paramètres pour activer l&apos;aperçu complet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
