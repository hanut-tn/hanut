'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/use-lang'
import { storefrontTranslations } from '@/lib/i18n/storefront'
import { DEFAULT_STOREFRONT_CONFIG, type Category, type StorefrontConfig } from '@hanut/types'
import { buildCssVariables, loadTemplateFont } from '@/lib/storefront/config'
import { getTemplateComponents } from './templates'
import {
  addItemToCart, cartTotals, reconcileCartWithProducts, type CartItem, type StorefrontProduct,
} from '@/lib/storefront/cart'
import CheckoutForm, { type CheckoutData } from './CheckoutForm'
import OtpStep from './OtpStep'
import OrderConfirmation, { type OrderResult } from './OrderConfirmation'

type Step = 'catalog' | 'checkout' | 'otp' | 'confirmation'

type Props = {
  sellerSlug: string
  sellerName: string
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl?: string | null
  products: StorefrontProduct[]
  categories: Category[]
  config?: StorefrontConfig
  /** Masque la navbar Hanut — utilisé pour l'aperçu en direct intégré au dashboard. */
  hideTopBar?: boolean
  /**
   * Barre de branding Hanut discrète en haut de la boutique — visible pour
   * le plan Starter, masquée pour Pro/Business. `true` par défaut : seule
   * la page publique `/s/[slug]` connaît le plan réel du vendeur et passe
   * la valeur calculée ; l'aperçu dashboard n'a pas encore cette donnée.
   */
  showHanutBranding?: boolean
  /** Aperçu dashboard : apparence 100% fidèle, mais bloque le passage à un vrai checkout (OTP/commande réels). */
  previewMode?: boolean
  /**
   * Aperçu dashboard uniquement : le cadre "iPhone" a une largeur CSS fixe
   * (ex: 300px) mais reste rendu dans le vrai viewport du navigateur — les
   * classes Tailwind responsives (`sm:`, `lg:`) réagissent à CE viewport,
   * pas à la largeur du cadre, donc `sm:grid-cols-3`/`lg:grid-cols-4`
   * s'activaient à tort sur un écran desktop large, écrasant la grille dans
   * les 300px du téléphone. Force la variante de grille sans breakpoints
   * quand true.
   */
  forceMobileLayout?: boolean
}

// StorefrontShell est le seul orchestrateur : il possède tout l'état métier
// (panier, étape, recherche, filtres) et délègue le rendu visuel aux
// composants du template actif (voir ./templates). Un composant de template
// ne reçoit jamais `config` — tout le style passe par les CSS vars posées
// ici via buildCssVariables, donc changer de template ne change jamais la
// logique, seulement l'apparence.
export default function StorefrontShell({
  sellerSlug, sellerName, shopDescription, logoUrl, bannerUrl = null, products, categories,
  config = DEFAULT_STOREFRONT_CONFIG, hideTopBar = false, showHanutBranding = true, previewMode = false, forceMobileLayout = false,
}: Props) {
  const { t, lang, isRtl, toggleLang } = useLang(storefrontTranslations)
  const router = useRouter()
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTemplateFont(config.template)
  }, [config.template])

  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<Step>('catalog')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)

  const totals = cartTotals(cart)

  // Chips catégories : uniquement celles ayant au moins un produit en stock.
  const availableCategories = categories.filter(c =>
    products.some(p => p.stock > 0 && p.categoryIds.includes(c.id))
  )
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredProducts = products.filter(p => {
    const matchesCategory = categoryFilter === 'all' || p.categoryIds.includes(categoryFilter)
    const matchesSearch = !normalizedQuery
      || p.name.toLowerCase().includes(normalizedQuery)
      || (p.description?.toLowerCase().includes(normalizedQuery) ?? false)
    return matchesCategory && matchesSearch
  })
  const hasNoResults = filteredProducts.filter(p => p.stock > 0).length === 0 && (normalizedQuery !== '' || categoryFilter !== 'all')

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast(msg)
    toastRef.current = setTimeout(() => setToast(null), 2000)
  }

  // Persistance panier/checkout : si le client rafraîchit pendant l'OTP, on
  // restaure son panier et ses infos plutôt que de le renvoyer au catalogue.
  const sessionKey = `hanut_checkout_${sellerSlug}`

  useEffect(() => {
    const saved = sessionStorage.getItem(sessionKey)
    if (!saved) return
    try {
      const { cart: savedCart, step: savedStep, checkoutData: savedData, savedAt } = JSON.parse(saved) as {
        cart?: CartItem[]
        step?: Step
        checkoutData?: CheckoutData | null
        savedAt?: number
      }
      if (!savedAt || Date.now() - savedAt > 10 * 60 * 1000) {
        sessionStorage.removeItem(sessionKey)
        return
      }
      if (savedCart && savedCart.length > 0) setCart(savedCart)
      if (savedData) setCheckoutData(savedData)
      if (savedStep === 'otp' && savedData) {
        setStep('otp')
        showToast(t.checkoutExtra.sessionRestored)
      }
    } catch {
      sessionStorage.removeItem(sessionKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step === 'checkout' || step === 'otp') {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        cart,
        step,
        checkoutData,
        savedAt: Date.now(),
      }))
    }
    if (step === 'confirmation') {
      sessionStorage.removeItem(sessionKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, step, checkoutData])

  function addToCart(item: Omit<CartItem, 'key'>) {
    const result = addItemToCart(cart, item)
    if (result.error === 'cart_full') {
      showToast(t.cart.cartFull)
      return false
    }
    if (result.error === 'max_stock') {
      showToast(t.cart.maxStock)
      return false
    }
    setCart(result.items)
    if (result.clamped) showToast(t.cart.maxStock)
    else showToast(t.shop.added)
    return true
  }

  function updateQuantity(key: string, quantity: number) {
    setCart(items =>
      items.map(i => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(quantity, Math.min(i.maxQty, 99))) } : i))
    )
  }

  function removeItem(key: string) {
    setCart(items => {
      const next = items.filter(i => i.key !== key)
      if (next.length === 0) setIsCartOpen(false)
      return next
    })
  }

  function handleOrderSuccess(result: { orderId: string; trackingToken: string }) {
    setOrderResult({
      orderId: result.orderId,
      trackingToken: result.trackingToken,
      lines: cart.map(i => ({
        name: i.productName,
        variant: i.variantLabel,
        quantity: i.quantity,
        lineTotal: i.productPrice * i.quantity,
      })),
      total: totals.totalPrice,
    })
    setCart([])
    setStep('confirmation')
  }

  function resetForNewOrder() {
    setOrderResult(null)
    setCheckoutData(null)
    setStep('catalog')
  }

  // 409 verify-otp = stock épuisé pendant la saisie : on rafraîchit le
  // catalogue serveur et on purge les lignes devenues indisponibles dès que
  // les produits à jour arrivent (cf. effet ci-dessous, déclenché par le
  // changement de référence de `products`).
  const stockConflictRef = useRef(false)

  function handleStockConflict() {
    setStep('catalog')
    setIsCartOpen(true)
    stockConflictRef.current = true
    router.refresh()
  }

  useEffect(() => {
    if (!stockConflictRef.current) return
    stockConflictRef.current = false
    setCart(prevCart => reconcileCartWithProducts(prevCart, products))
    showToast(t.otpExtra.cartUpdatedAfterStock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const showCartUi = step === 'catalog'

  function goToCheckout() {
    if (previewMode) {
      showToast(t.shop.previewCheckoutDisabled)
      return
    }
    setIsCartOpen(false)
    setStep('checkout')
  }

  function handleQuickAdd(product: StorefrontProduct) {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.image_url,
      productPrice: product.price,
      variantLabel: null,
      quantity: 1,
      maxQty: product.stock,
    })
  }

  const {
    Header, SearchBar, CategoryBar, ProductCard, CartBar, CartDrawer, ProductModal, gridClass, gridClassMobile,
  } = getTemplateComponents(config.template)

  return (
    <div
      ref={shellRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={buildCssVariables(config)}
      className={`w-full min-h-screen overflow-x-hidden ${isRtl ? 'font-arabic' : ''}`}
    >
      {/* Barre de branding Hanut — masquée en aperçu dashboard, et pour les
          plans Pro/Business sur la boutique publique. Le toggle langue vit
          désormais dans le header de chaque template, pas ici. */}
      {!hideTopBar && showHanutBranding && (
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-10">
          <Link href="/" target="_blank" className="flex items-center gap-1.5" aria-label="Hanut">
            <span className="text-sm font-bold text-brand-600">🛍️ Hanut</span>
          </Link>
        </div>
      )}

      {/* En-tête boutique — visuel du template, porte aussi l'accès au panier et au toggle langue */}
      {step === 'catalog' && (
        <Header
          sellerName={sellerName}
          shopDescription={shopDescription}
          logoUrl={logoUrl}
          bannerUrl={bannerUrl}
          cartCount={totals.totalItems}
          onCartOpen={() => setIsCartOpen(true)}
          lang={lang}
          onLangToggle={toggleLang}
          t={t}
        />
      )}

      {/* Recherche — visuel du template */}
      {step === 'catalog' && products.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <SearchBar value={searchQuery} onChange={setSearchQuery} t={t} />
        </div>
      )}

      {/* Catégories — visuel du template, positionnement sticky géré ici */}
      {step === 'catalog' && availableCategories.length > 0 && (
        <div className={`sticky z-20 ${!hideTopBar && showHanutBranding ? 'top-10' : 'top-0'}`}>
          <CategoryBar categories={availableCategories} selected={categoryFilter} onSelect={setCategoryFilter} t={t} />
        </div>
      )}

      {/* Contenu */}
      <main className={`max-w-5xl mx-auto ${showCartUi && cart.length > 0 ? 'pb-28' : 'pb-10'}`}>
        {step === 'catalog' ? (
          hasNoResults ? (
            <div className="px-4 py-16 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="font-semibold">{t.search.noResultsTitle}</p>
              {normalizedQuery && (
                <p style={{ color: 'var(--text-secondary)' }} className="text-sm mt-1">{t.search.noResultsFor(searchQuery.trim())}</p>
              )}
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setCategoryFilter('all') }}
                className="mt-4 text-sm font-medium hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                {t.search.resetButton}
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-4 py-20 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="font-semibold text-lg">{t.shop.emptyTitle}</p>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm mt-1">{t.shop.emptyDesc}</p>
            </div>
          ) : (
            <div className={forceMobileLayout ? gridClassMobile : gridClass}>
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  t={t}
                  onSelect={setSelectedProduct}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )
        ) : null}

        {step === 'checkout' && (
          <CheckoutForm
            sellerSlug={sellerSlug}
            cart={cart}
            totalPrice={totals.totalPrice}
            initialData={checkoutData}
            t={t}
            onBack={() => setStep('catalog')}
            onEditCart={() => { setStep('catalog'); setIsCartOpen(true) }}
            onSent={data => {
              setCheckoutData(data)
              setStep('otp')
            }}
          />
        )}

        {step === 'otp' && checkoutData && (
          <OtpStep
            sellerSlug={sellerSlug}
            cart={cart}
            checkoutData={checkoutData}
            t={t}
            onBack={() => setStep('checkout')}
            onStockConflict={handleStockConflict}
            onSuccess={handleOrderSuccess}
          />
        )}

        {step === 'confirmation' && orderResult && (
          <OrderConfirmation
            result={orderResult}
            sellerName={sellerName}
            lang={lang}
            t={t}
            onNewOrder={resetForNewOrder}
          />
        )}
      </main>

      {/* Barre panier sticky — visuel du template */}
      {showCartUi && cart.length > 0 && (
        <CartBar totals={totals} t={t} onOpenCart={() => setIsCartOpen(true)} onCheckout={goToCheckout} />
      )}

      {/* Tiroir panier — visuel du template */}
      {isCartOpen && showCartUi && (
        <CartDrawer
          items={cart}
          totals={totals}
          t={t}
          isRtl={isRtl}
          portalContainer={shellRef.current}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onCheckout={goToCheckout}
        />
      )}

      {/* Modal sélection variante — visuel du template */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          cart={cart}
          t={t}
          isRtl={isRtl}
          portalContainer={shellRef.current}
          onClose={() => setSelectedProduct(null)}
          onAdd={item => {
            const ok = addToCart(item)
            if (ok) setSelectedProduct(null)
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2">
          <div className="rounded-full bg-[#1C1917] px-4 py-2 text-sm text-white shadow-lg whitespace-nowrap">{toast}</div>
        </div>
      )}

      {/* Footer — toujours présent (marketing gratuit), lien cliquable pour
          Starter, mention discrète et non cliquable pour Pro/Business. */}
      <footer className="py-6 text-center border-t border-gray-100 bg-white">
        <div className="flex items-center justify-center gap-4">
          {showHanutBranding ? (
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#78716C] hover:text-gray-600 transition-colors">
              <Image src="/icon-16.png" alt="" width={16} height={16} unoptimized style={{ borderRadius: '3px' }} />
              Propulsé par Hanut
            </Link>
          ) : (
            <span className="text-xs" style={{ color: 'color-mix(in srgb, var(--text-secondary) 50%, transparent)' }}>
              Propulsé par Hanut
            </span>
          )}
          <Link href="/privacy" className="text-xs text-[#78716C] hover:text-gray-600 transition-colors">
            Confidentialité
          </Link>
        </div>
      </footer>
    </div>
  )
}
