'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Search } from 'lucide-react'
import { useLang } from '@/lib/i18n/use-lang'
import { storefrontTranslations } from '@/lib/i18n/storefront'
import { DEFAULT_STOREFRONT_CONFIG, type Category, type StorefrontConfig, type EditTarget, type PopoverPosition } from '@hanut/types'
import { buildCssVariables, loadGoogleFont } from '@/lib/storefront/config'
import {
  addItemToCart, cartTotals, reconcileCartWithProducts, type CartItem, type StorefrontProduct,
} from '@/lib/storefront/cart'
import ProductGrid from './ProductGrid'
import StorefrontHeader from './StorefrontHeader'
import StorefrontSearchBar from './StorefrontSearchBar'
import ProductQuickModal from './ProductQuickModal'
import CartBar from './CartBar'
import CartDrawer from './CartDrawer'
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
  /** Aperçu dashboard : apparence 100% fidèle, mais bloque le passage à un vrai checkout (OTP/commande réels). */
  previewMode?: boolean
  /** Éditeur visuel WYSIWYG : clic sur un élément → ouvre son panneau de modification au lieu de son action normale. */
  editMode?: boolean
  onEditTargetChange?: (target: EditTarget, position?: PopoverPosition) => void
}

export default function StorefrontShell({
  sellerSlug, sellerName, shopDescription, logoUrl, bannerUrl = null, products, categories,
  config = DEFAULT_STOREFRONT_CONFIG, hideTopBar = false, previewMode = false,
  editMode = false, onEditTargetChange,
}: Props) {
  const { t, lang, isRtl, toggleLang } = useLang(storefrontTranslations)
  const router = useRouter()
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGoogleFont(config.typography.font)
  }, [config.typography.font])

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

  // Catch-all "fond" : ignore les clics qui tombent sur un contrôle
  // interactif (recherche, chips catégorie, panier...) ou sur un élément
  // déjà pris en charge par un handler dédié (carte/bouton, via [data-edit]).
  // Le header et le bouton "Ajouter" font stopPropagation() eux-mêmes avant
  // que ce handler ne s'exécute — cette exclusion est une sécurité
  // supplémentaire, pas le mécanisme principal d'évitement du conflit.
  function handleBackgroundClick(e: React.MouseEvent) {
    if (!editMode) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, textarea, [data-edit]')) return
    onEditTargetChange?.({ type: 'background' }, { top: e.clientY, left: e.clientX })
  }

  return (
    <div
      ref={shellRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={buildCssVariables(config)}
      onClick={editMode ? handleBackgroundClick : undefined}
      className={`min-h-screen ${isRtl ? 'font-arabic' : ''} ${editMode ? 'cursor-default' : ''}`}
    >
      {/* Bandeau mode édition */}
      {editMode && (
        <div className="sticky top-0 z-40 bg-blue-500 text-white text-xs text-center py-1.5 font-medium">
          ✏️ Mode édition — cliquez sur un élément pour le modifier
        </div>
      )}

      {/* Navbar Hanut sticky */}
      {!hideTopBar && (
        <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center shrink-0" aria-label="Hanut">
              <Image src="/logo-horizontal.svg" alt="Hanut" width={84} height={27} unoptimized />
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleLang}
                style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
                className="font-medium text-gray-500 border border-gray-200 rounded-full px-2.5 py-1 min-h-[32px] touch-manipulation transition-colors hover:bg-gray-50 hover:text-[#1C1917]"
              >
                {t.common.langToggle}
              </button>
              {showCartUi && (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  aria-label={t.cart.title}
                  className="relative min-h-[38px] min-w-[38px] touch-manipulation flex items-center justify-center rounded-lg border border-gray-200 text-[#1C1917] hover:bg-gray-50 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {totals.totalItems > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
                      {totals.totalItems}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* En-tête boutique */}
      {step === 'catalog' && (
        <div
          onClick={editMode ? (e) => {
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            onEditTargetChange?.({ type: 'header' }, { top: rect.top, left: rect.left })
          } : undefined}
          className={editMode ? 'cursor-pointer ring-2 ring-transparent hover:ring-blue-400 hover:ring-offset-2 transition-all rounded-sm' : undefined}
        >
          <StorefrontHeader
            shopName={sellerName}
            shopDescription={shopDescription}
            logoUrl={logoUrl}
            bannerUrl={bannerUrl}
            t={t}
          />
        </div>
      )}

      {/* Recherche */}
      {step === 'catalog' && products.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <StorefrontSearchBar value={searchQuery} onChange={setSearchQuery} t={t} />
        </div>
      )}

      {/* Barre de filtres catégories */}
      {step === 'catalog' && availableCategories.length > 0 && (
        <div className={`sticky z-20 ${hideTopBar ? 'top-0' : 'top-14'} bg-gray-50/95 backdrop-blur border-b border-gray-100`}>
          <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
              className={`shrink-0 min-h-[32px] touch-manipulation rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                categoryFilter === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-white text-[#78716C] border border-gray-200'
              }`}
            >
              {t.shop.categoryAll}
            </button>
            {availableCategories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
                className={`shrink-0 min-h-[32px] touch-manipulation rounded-full px-3.5 py-1.5 font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === c.id ? 'bg-[var(--primary)] text-white' : 'bg-white text-[#78716C] border border-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenu */}
      <main className={`max-w-5xl mx-auto ${showCartUi && cart.length > 0 ? 'pb-28' : 'pb-10'}`}>
        {step === 'catalog' && hasNoResults ? (
          <div className="px-4 py-16 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
            <p style={{ fontSize: 'calc(1rem * var(--font-size-scale, 1))' }} className="font-semibold text-[#1C1917]">
              {t.search.noResultsTitle}
            </p>
            {normalizedQuery && (
              <p style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }} className="text-[#78716C] mt-1">
                {t.search.noResultsFor(searchQuery.trim())}
              </p>
            )}
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setCategoryFilter('all') }}
              className="mt-4 font-medium hover:underline"
              style={{ color: 'var(--primary)', fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
            >
              {t.search.resetButton}
            </button>
          </div>
        ) : step === 'catalog' && (
          <div
            onClick={editMode ? (e) => {
              const card = (e.target as HTMLElement).closest('[data-edit="card"]')
              if (!card) return
              e.stopPropagation()
              const rect = card.getBoundingClientRect()
              onEditTargetChange?.({ type: 'card' }, { top: rect.top, left: rect.right + 8 })
            } : undefined}
          >
            <ProductGrid
              products={filteredProducts}
              t={t}
              layout={config.layout}
              editMode={editMode}
              buttonText={config.button.text}
              onSelect={setSelectedProduct}
              onQuickAdd={product =>
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
              onEditTargetChange={onEditTargetChange}
            />
          </div>
        )}

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

      {/* Barre panier sticky */}
      {showCartUi && cart.length > 0 && (
        <CartBar
          totals={totals}
          t={t}
          onOpenCart={() => setIsCartOpen(true)}
          onCheckout={goToCheckout}
        />
      )}

      {/* Tiroir panier */}
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

      {/* Modal sélection variante */}
      {selectedProduct && (
        <ProductQuickModal
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
          <div
            style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
            className="rounded-full bg-[#1C1917] px-4 py-2 text-white shadow-lg whitespace-nowrap"
          >
            {toast}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center border-t border-gray-100 bg-white">
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
            className="inline-flex items-center gap-1.5 text-[#78716C] hover:text-gray-600 transition-colors"
          >
            <Image src="/icon-16.png" alt="" width={16} height={16} unoptimized style={{ borderRadius: '3px' }} />
            Propulsé par Hanut
          </Link>
          <Link
            href="/privacy"
            style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
            className="text-[#78716C] hover:text-gray-600 transition-colors"
          >
            Confidentialité
          </Link>
        </div>
      </footer>
    </div>
  )
}
