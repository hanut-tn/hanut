'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useLang } from '@/lib/i18n/use-lang'
import { storefrontTranslations } from '@/lib/i18n/storefront'
import {
  addItemToCart, cartTotals, type CartItem, type StorefrontProduct,
} from '@/lib/storefront/cart'
import ProductGrid from './ProductGrid'
import StorefrontBanner from './StorefrontBanner'
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
  bannerUrl: string | null
  products: StorefrontProduct[]
}

export default function StorefrontShell({ sellerSlug, sellerName, shopDescription, bannerUrl, products }: Props) {
  const { t, isRtl, toggleLang } = useLang(storefrontTranslations)
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<Step>('catalog')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)

  const totals = cartTotals(cart)

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
    setCart(prevCart => prevCart.filter(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return false
      if (product.hasVariants) {
        const variant = product.variants.find(v => v.label === item.variantLabel)
        return Boolean(variant && variant.qty > 0)
      }
      return product.stock > 0
    }))
    showToast(t.otpExtra.cartUpdatedAfterStock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const showCartUi = step === 'catalog'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={`min-h-screen bg-gray-50 ${isRtl ? 'font-arabic' : ''}`}>
      {/* Navbar Hanut sticky */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center shrink-0" aria-label="Hanut">
            <Image src="/logo-horizontal.svg" alt="Hanut" width={84} height={27} unoptimized />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="text-xs font-medium text-gray-500 border border-gray-200 rounded-full px-2.5 py-1 min-h-[32px] touch-manipulation transition-colors hover:bg-gray-50 hover:text-[#1C1917]"
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
                  <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#16A34A] text-white text-[10px] font-bold flex items-center justify-center">
                    {totals.totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bannière boutique */}
      {step === 'catalog' && (
        <StorefrontBanner
          shopName={sellerName}
          shopDescription={shopDescription}
          bannerUrl={bannerUrl}
          t={t}
        />
      )}

      {/* Contenu */}
      <main className={`max-w-5xl mx-auto ${showCartUi && cart.length > 0 ? 'pb-28' : 'pb-10'}`}>
        {step === 'catalog' && (
          <ProductGrid
            products={products}
            t={t}
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
          />
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
          onCheckout={() => { setIsCartOpen(false); setStep('checkout') }}
        />
      )}

      {/* Tiroir panier */}
      {isCartOpen && showCartUi && (
        <CartDrawer
          items={cart}
          totals={totals}
          t={t}
          isRtl={isRtl}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onCheckout={() => { setIsCartOpen(false); setStep('checkout') }}
        />
      )}

      {/* Modal sélection variante */}
      {selectedProduct && (
        <ProductQuickModal
          product={selectedProduct}
          cart={cart}
          t={t}
          isRtl={isRtl}
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

      {/* Footer */}
      <footer className="py-6 text-center border-t border-gray-100 bg-white">
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <Image src="/icon-16.png" alt="" width={16} height={16} unoptimized style={{ borderRadius: '3px' }} />
            Propulsé par Hanut
          </Link>
          <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Confidentialité
          </Link>
        </div>
      </footer>
    </div>
  )
}
