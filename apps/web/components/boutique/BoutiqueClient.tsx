'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Check, Palette, Grid2x2, Grid3x3, List, Smartphone, Monitor, ExternalLink, Store,
} from 'lucide-react'
import {
  STOREFRONT_THEMES, PRESET_COLORS, DEFAULT_STOREFRONT_CONFIG,
  type StorefrontTheme, type StorefrontLayout, type StorefrontConfig, type Category,
} from '@hanut/types'
import type { ShopBrandingInput } from '@/app/(dashboard)/settings/actions'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'
import { isValidHexColor } from '@/lib/storefront/colors'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import ThemePreviewSvg from './ThemePreviewSvg'

type Seller = {
  name: string
  slug: string | null
  shopName: string | null
  shopDescription: string | null
  logoUrl: string | null
}

type Props = {
  seller: Seller
  initialConfig: StorefrontConfig
  appUrl: string
  previewProducts: StorefrontProduct[]
  previewCategories: Category[]
  updateShopBranding: (input: ShopBrandingInput) => Promise<{ error?: string }>
  updateStorefrontConfig: (config: Partial<StorefrontConfig>) => Promise<{ error?: string }>
}

type Tab = 'personnaliser' | 'apercu'
type Msg = { type: 'success' | 'error'; text: string }

const THEME_KEYS = Object.keys(STOREFRONT_THEMES) as StorefrontTheme[]

const LAYOUT_OPTIONS: { key: StorefrontLayout; label: string; icon: React.ElementType }[] = [
  { key: 'grid-2', label: '2 colonnes', icon: Grid2x2 },
  { key: 'grid-3', label: '3 colonnes', icon: Grid3x3 },
  { key: 'list',   label: 'Liste',      icon: List },
]

export default function BoutiqueClient({
  seller, initialConfig, appUrl, previewProducts, previewCategories, updateShopBranding, updateStorefrontConfig,
}: Props) {
  const [tab, setTab] = useState<Tab>('personnaliser')
  const [isPending, startTransition] = useTransition()

  // Style
  const [theme, setTheme] = useState<StorefrontTheme>(initialConfig.theme ?? DEFAULT_STOREFRONT_CONFIG.theme)
  const [primaryColor, setPrimaryColor] = useState(initialConfig.primary_color ?? DEFAULT_STOREFRONT_CONFIG.primary_color)
  const [hexInput, setHexInput] = useState(initialConfig.primary_color ?? DEFAULT_STOREFRONT_CONFIG.primary_color)
  const [layout, setLayout] = useState<StorefrontLayout>(initialConfig.layout ?? DEFAULT_STOREFRONT_CONFIG.layout)

  // Infos boutique
  const [shopName, setShopName] = useState(seller.shopName ?? '')
  const [shopDescription, setShopDescription] = useState(seller.shopDescription ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(seller.logoUrl)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [msg, setMsg] = useState<Msg | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')

  const liveConfig: StorefrontConfig = useMemo(
    () => ({ theme, primary_color: primaryColor, layout }),
    [theme, primaryColor, layout]
  )

  const orderLinkFull = seller.slug ? `${appUrl.replace(/\/$/, '')}/s/${seller.slug}` : null

  function handleHexChange(value: string) {
    setHexInput(value)
    const withHash = value.startsWith('#') ? value : `#${value}`
    if (isValidHexColor(withHash)) setPrimaryColor(withHash)
  }

  function handlePreset(hex: string) {
    setPrimaryColor(hex)
    setHexInput(hex)
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
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  function handleSave() {
    setMsg(null)
    startTransition(async () => {
      const [configResult, brandingResult] = await Promise.all([
        updateStorefrontConfig({ theme, primary_color: primaryColor, layout }),
        updateShopBranding({ shopName, shopDescription, logoUrl }),
      ])
      const error = configResult?.error ?? brandingResult?.error
      if (error) {
        setMsg({ type: 'error', text: error })
        return
      }
      setMsg({ type: 'success', text: 'Boutique mise à jour avec succès.' })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-brand-600" />
            Ma boutique
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">Personnalisez l&apos;apparence de votre boutique publique.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E7E5E4]">
        {([
          { key: 'personnaliser' as Tab, label: 'Personnaliser', icon: Palette },
          { key: 'apercu' as Tab, label: 'Aperçu', icon: Smartphone },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 min-h-[44px] text-sm font-medium transition-colors ${
              tab === key
                ? 'text-[#166534] border-b-2 border-[#16A34A] -mb-px'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'personnaliser' && (
        <div className="space-y-6 max-w-3xl">
          {/* Style */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Style</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_KEYS.map(key => {
                const t = STOREFRONT_THEMES[key]
                const selected = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`text-left rounded-xl border-2 overflow-hidden transition-colors ${
                      selected ? 'border-[#16A34A]' : 'border-[#E7E5E4] hover:border-gray-300'
                    }`}
                  >
                    <ThemePreviewSvg themeKey={key} primaryColor={primaryColor} />
                    <div className="px-2.5 py-2 flex items-center justify-between bg-white">
                      <span className="text-xs font-semibold text-gray-900">{t.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-[#16A34A]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Couleur */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Couleur principale</h2>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handlePreset(c.value)}
                  title={c.label}
                  aria-label={c.label}
                  style={{ backgroundColor: c.value }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    primaryColor.toLowerCase() === c.value.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                  }`}
                >
                  {primaryColor.toLowerCase() === c.value.toLowerCase() && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 max-w-[220px]">
              <div className="w-9 h-9 rounded-lg border border-[#E7E5E4] shrink-0" style={{ backgroundColor: isValidHexColor(hexInput.startsWith('#') ? hexInput : `#${hexInput}`) ? primaryColor : '#fff' }} />
              <input
                className="input font-mono"
                value={hexInput}
                onChange={e => handleHexChange(e.target.value)}
                placeholder="#16a34a"
                maxLength={7}
              />
            </div>
            {!isValidHexColor(hexInput.startsWith('#') ? hexInput : `#${hexInput}`) && (
              <p className="text-xs text-red-600">Code hex invalide (ex: #16a34a).</p>
            )}
          </div>

          {/* Disposition */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Disposition des produits</h2>
            <div className="flex gap-2">
              {LAYOUT_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayout(key)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    layout === key
                      ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534]'
                      : 'border-[#E7E5E4] text-[#78716C] hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Informations boutique */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Informations</h2>

            <div>
              <label htmlFor="boutique-shop-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la boutique
              </label>
              <input
                id="boutique-shop-name"
                className="input"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder={seller.name || 'Ma boutique'}
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1">
                Laissez vide pour afficher le nom de votre compte ({seller.name}).
              </p>
            </div>

            <div>
              <label htmlFor="boutique-shop-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                id="boutique-shop-description"
                className="input resize-none"
                rows={2}
                value={shopDescription}
                onChange={e => setShopDescription(e.target.value)}
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
                      onClick={() => setLogoUrl(null)}
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
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
              />
            </div>
          </div>

          {msg && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              msg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {msg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || logoUploading || !isValidHexColor(primaryColor)}
              className="btn-primary"
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      )}

      {tab === 'apercu' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#78716C]">Voici comment vos clients voient votre boutique.</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-[#E7E5E4] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  aria-label="Aperçu mobile"
                  className={`p-2 transition-colors ${previewDevice === 'mobile' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  aria-label="Aperçu desktop"
                  className={`p-2 transition-colors ${previewDevice === 'desktop' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
              {orderLinkFull && (
                <a
                  href={orderLinkFull}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir dans un nouvel onglet
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-center bg-[#F5F5F4] rounded-2xl p-4 sm:p-8">
            <div
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#E7E5E4] transition-all"
              style={{
                width: previewDevice === 'mobile' ? 390 : '100%',
                maxWidth: previewDevice === 'mobile' ? 390 : 900,
                height: 700,
              }}
            >
              <div className="w-full h-full overflow-y-auto">
                <StorefrontShell
                  sellerSlug={seller.slug ?? ''}
                  sellerName={shopName || seller.name}
                  shopDescription={shopDescription || null}
                  logoUrl={logoUrl}
                  products={previewProducts}
                  categories={previewCategories}
                  config={liveConfig}
                  hideTopBar
                />
              </div>
            </div>
          </div>

          {!seller.slug && (
            <p className="text-sm text-center text-amber-600">
              Créez d&apos;abord votre lien de boutique dans{' '}
              <Link href="/settings?tab=lien" className="underline font-medium">Paramètres</Link> pour activer l&apos;aperçu complet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
