'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Pencil, MousePointerClick, X, Smartphone, Monitor, ExternalLink } from 'lucide-react'
import {
  DEFAULT_STOREFRONT_CONFIG,
  type Category, type StorefrontConfig, type StorefrontColors, type StorefrontTypography,
  type StorefrontCards, type StorefrontButton, type StorefrontSearch, type StorefrontChips,
  type StorefrontCartBar, type StorefrontTextStyle, type StorefrontHeader, type StorefrontLayout,
  type EditTarget, type PopoverPosition,
} from '@hanut/types'
import type { ShopBrandingInput } from '@/app/(dashboard)/settings/actions'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'
import { mergeStorefrontConfig, type StorefrontConfigPatch } from '@/lib/storefront/config'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import EditorPanel from './EditorPanel'
import HeaderPanel from './panels/HeaderPanel'
import CardPanel from './panels/CardPanel'
import ButtonPanel from './panels/ButtonPanel'
import BackgroundPanel from './panels/BackgroundPanel'
import SearchPanel from './panels/SearchPanel'
import ChipsPanel from './panels/ChipsPanel'
import CartBarPanel from './panels/CartBarPanel'
import ProductNamePanel from './panels/ProductNamePanel'
import ProductPricePanel from './panels/ProductPricePanel'
import TypographyPanel from './panels/TypographyPanel'
import LayoutPanel from './panels/LayoutPanel'

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
  const [isEditorOpen, setIsEditorOpen] = useState(true)

  // Éditeur visuel WYSIWYG : clic sur un élément de l'aperçu → panneau contextuel.
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null)

  const previewUrl = seller.slug ? `${appUrl.replace(/\/$/, '')}/s/${seller.slug}` : null

  function handleEditTargetChange(target: EditTarget, position?: PopoverPosition) {
    setEditTarget(target)
    if (position) setPopoverPosition(position)
  }

  function toggleEditMode() {
    setIsEditMode(prev => {
      if (!prev) setIsEditorOpen(false) // évite le cumul avec le panneau "Personnaliser"
      return !prev
    })
    setEditTarget(null)
  }

  // Escape ferme le panneau contextuel actif.
  useEffect(() => {
    if (!editTarget) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditTarget(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editTarget])

  function patchColors(patch: Partial<StorefrontColors>) {
    setConfig(c => mergeStorefrontConfig(c, { colors: patch }))
  }
  function patchTypography(patch: Partial<StorefrontTypography>) {
    setConfig(c => mergeStorefrontConfig(c, { typography: patch }))
  }
  function patchCards(patch: Partial<StorefrontCards>) {
    setConfig(c => mergeStorefrontConfig(c, { cards: patch }))
  }
  function patchButton(patch: Partial<StorefrontButton>) {
    setConfig(c => mergeStorefrontConfig(c, { button: patch }))
  }
  function patchSearch(patch: Partial<StorefrontSearch>) {
    setConfig(c => mergeStorefrontConfig(c, { search: patch }))
  }
  function patchChips(patch: Partial<StorefrontChips>) {
    setConfig(c => mergeStorefrontConfig(c, { chips: patch }))
  }
  function patchCartBar(patch: Partial<StorefrontCartBar>) {
    setConfig(c => mergeStorefrontConfig(c, { cartBar: patch }))
  }
  function patchProductName(patch: Partial<StorefrontTextStyle>) {
    setConfig(c => mergeStorefrontConfig(c, { productName: patch }))
  }
  function patchProductPrice(patch: Partial<StorefrontTextStyle>) {
    setConfig(c => mergeStorefrontConfig(c, { productPrice: patch }))
  }
  function patchHeader(patch: Partial<StorefrontHeader>) {
    setConfig(c => mergeStorefrontConfig(c, { header: patch }))
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
      editMode={isEditMode}
      onEditTargetChange={handleEditTargetChange}
    />
  ), [seller.slug, seller.name, shopName, shopDescription, logoUrl, bannerUrl, previewProducts, previewCategories, config, isEditMode])

  const editorPanel = (
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
      search={config.search}
      onSearchChange={patchSearch}
      chips={config.chips}
      onChipsChange={patchChips}
      cartBar={config.cartBar}
      onCartBarChange={patchCartBar}
      productName={config.productName}
      onProductNameChange={patchProductName}
      productPrice={config.productPrice}
      onProductPriceChange={patchProductPrice}
      layout={config.layout}
      onLayoutChange={setLayout}
    />
  )

  return (
    // Compense le padding du <main> du layout dashboard pour occuper toute la
    // largeur/hauteur disponible — l'éditeur est un outil plein écran, pas
    // une carte dans le flux normal du dashboard.
    <div className="-m-4 sm:-m-6 -mb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] md:-mb-6 flex flex-col h-[calc(100dvh-3.5rem)]">
      {/* Navbar fixe de l'éditeur */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <Link href="/catalog" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Boutique
        </Link>
        <span className="font-semibold text-gray-900 hidden sm:block">Ma boutique</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || logoUploading || bannerUploading}
          className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {msg && (
        <div
          className={`shrink-0 px-4 py-2 text-sm text-center ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 border-b border-green-200'
              : 'bg-red-50 text-red-700 border-b border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}
      {!seller.slug && (
        <p className="shrink-0 text-xs text-center text-amber-700 bg-amber-50 border-b border-amber-100 px-4 py-2">
          Créez d&apos;abord votre lien de boutique dans Paramètres pour activer l&apos;aperçu complet.
        </p>
      )}

      {/* Zone aperçu plein écran + overlay éditeur */}
      <div className="relative flex-1 overflow-hidden bg-[#F5F5F4]">
        {/* Aperçu — pleine page */}
        <div className="absolute inset-0 overflow-auto">
          <div
            style={{ width: viewMode === 'mobile' ? '390px' : '100%' }}
            className="mx-auto min-h-full bg-white shadow-sm transition-all duration-300"
          >
            {previewShell}
          </div>
        </div>

        {/* Overlay éditeur flottant — desktop */}
        <div
          className={`hidden md:flex absolute bottom-6 left-6 z-30 w-72 max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex-col overflow-hidden transition-all duration-300 ${
            isEditorOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="font-semibold text-sm text-gray-900">Personnaliser</span>
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              aria-label="Fermer l'éditeur"
              className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {editorPanel}
          </div>
        </div>

        {/* Bouton ouvrir l'éditeur — desktop */}
        {!isEditorOpen && (
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="hidden md:inline-flex absolute bottom-6 left-6 z-30 items-center gap-2 bg-white text-gray-900 px-4 py-3 rounded-2xl shadow-2xl border border-gray-100 font-medium text-sm hover:shadow-xl transition-shadow"
          >
            <Pencil className="w-4 h-4" />
            Personnaliser
          </button>
        )}

        {/* Bottom sheet éditeur — mobile */}
        <div
          className={`md:hidden fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col transition-transform duration-300 ${
            isEditorOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsEditorOpen(false)}
            aria-label="Fermer l'éditeur"
            className="flex justify-center pt-3 pb-2 shrink-0"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </button>
          <div className="overflow-y-auto flex-1">
            {editorPanel}
          </div>
        </div>

        {/* Bouton ouvrir l'éditeur — mobile (FAB) */}
        {!isEditorOpen && (
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-3 rounded-2xl shadow-2xl border border-gray-100 font-medium text-sm"
          >
            <Pencil className="w-4 h-4" />
            Personnaliser
          </button>
        )}

        {/* Toolbar aperçu — bas droite */}
        <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleEditMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium transition-all ${
              isEditMode
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
            }`}
          >
            {isEditMode ? <X className="w-4 h-4" /> : <MousePointerClick className="w-4 h-4" />}
            {isEditMode ? "Quitter l'édition" : 'Modifier'}
          </button>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              aria-label="Aperçu mobile"
              className={`px-3 py-2.5 transition-colors ${viewMode === 'mobile' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              aria-label="Aperçu desktop"
              className={`px-3 py-2.5 transition-colors ${viewMode === 'desktop' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ouvrir la boutique dans un nouvel onglet"
              className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Clic en dehors → ferme le panneau contextuel actif */}
        {isEditMode && editTarget && (
          <div className="fixed inset-0 z-40" onClick={() => setEditTarget(null)} />
        )}

        {isEditMode && renderPanel()}
      </div>
    </div>
  )

  function renderPanel() {
    if (!editTarget) return null
    const onClose = () => setEditTarget(null)

    switch (editTarget.type) {
      case 'header':
        return (
          <HeaderPanel
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
            headerColor={config.colors.primary}
            onHeaderColorChange={hex => patchColors({ primary: hex })}
            header={config.header}
            onHeaderDimensionsChange={patchHeader}
            onClose={onClose}
          />
        )
      case 'card':
        if (!popoverPosition) return null
        return (
          <CardPanel
            cards={config.cards}
            cardBg={config.colors.cardBg}
            onCardsChange={patchCards}
            onCardBgChange={hex => patchColors({ cardBg: hex })}
            position={popoverPosition}
            onClose={onClose}
          />
        )
      case 'button':
        if (!popoverPosition) return null
        return (
          <ButtonPanel
            primaryColor={config.colors.primary}
            onPrimaryColorChange={hex => patchColors({ primary: hex })}
            button={config.button}
            onButtonChange={patchButton}
            position={popoverPosition}
            onClose={onClose}
          />
        )
      case 'background':
        if (!popoverPosition) return null
        return (
          <BackgroundPanel
            pageBg={config.colors.pageBg}
            onChange={hex => patchColors({ pageBg: hex })}
            position={popoverPosition}
            onClose={onClose}
          />
        )
      case 'search':
        if (!popoverPosition) return null
        return <SearchPanel search={config.search} onChange={patchSearch} position={popoverPosition} onClose={onClose} />
      case 'chips':
        if (!popoverPosition) return null
        return <ChipsPanel chips={config.chips} onChange={patchChips} position={popoverPosition} onClose={onClose} />
      case 'cartBar':
        if (!popoverPosition) return null
        return <CartBarPanel cartBar={config.cartBar} onChange={patchCartBar} position={popoverPosition} onClose={onClose} />
      case 'productName':
        if (!popoverPosition) return null
        return <ProductNamePanel productName={config.productName} onChange={patchProductName} position={popoverPosition} onClose={onClose} />
      case 'productPrice':
        if (!popoverPosition) return null
        return <ProductPricePanel productPrice={config.productPrice} onChange={patchProductPrice} position={popoverPosition} onClose={onClose} />
      case 'typography':
        return <TypographyPanel typography={config.typography} onChange={patchTypography} onClose={onClose} />
      case 'layout':
        return <LayoutPanel layout={config.layout} onChange={setLayout} onClose={onClose} />
      default:
        return null
    }
  }
}
