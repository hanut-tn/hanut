'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import type { CartItem } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import { useFocusTrap } from '@/lib/use-focus-trap'

type Props = {
  items: CartItem[]
  totals: { totalItems: number; totalPrice: number }
  t: StorefrontDict
  isRtl: boolean
  onClose: () => void
  onUpdateQuantity: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  onCheckout: () => void
}

export default function CartDrawer({
  items, totals, t, isRtl, onClose, onUpdateQuantity, onRemove, onCheckout,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const prevBody = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevBody }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[100]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      {/* Bottom sheet mobile / panneau latéral desktop */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-2xl bg-white shadow-2xl sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:w-full sm:max-w-md sm:rounded-none ${isRtl ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} ${isRtl ? 'font-arabic' : ''}`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E7E5E4] px-4 py-3.5 sm:px-5">
          <h2 id="cart-drawer-title" className="font-semibold text-[#1C1917]">
            {t.cart.title} {items.length > 0 && <span className="text-[#78716C] font-normal">({totals.totalItems})</span>}
          </h2>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] w-9 h-9 touch-manipulation flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lignes */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
              <p className="font-medium text-[#1C1917]">{t.cart.empty}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 text-sm font-medium text-[#16A34A] hover:underline"
              >
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#E7E5E4]">
              {items.map(item => {
                const cap = Math.min(item.maxQty, 99)
                return (
                  <li key={item.key} className="flex gap-3 px-4 py-3.5 sm:px-5">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#F0FDF4] shrink-0 flex items-center justify-center">
                      {item.productImage ? (
                        <Image src={item.productImage} alt={item.productName} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 text-[#78716C] opacity-40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1C1917] truncate">{item.productName}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-[#78716C]">{item.variantLabel}</p>
                      )}
                      <p className="text-sm font-bold text-brand-600 mt-0.5">
                        {item.productPrice * item.quantity} DT
                        {item.quantity > 1 && (
                          <span className="text-xs font-normal text-[#78716C]"> ({item.productPrice} DT × {item.quantity})</span>
                        )}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          className="w-8 h-8 touch-manipulation rounded-md border border-[#D6D3D1] flex items-center justify-center text-[#44403C] hover:border-[#16A34A] hover:text-[#16A34A] transition-colors disabled:opacity-40"
                          aria-label={`${t.quick.decreaseQty} — ${item.productName}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-[#1C1917] tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= cap}
                          onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                          className="w-8 h-8 touch-manipulation rounded-md border border-[#D6D3D1] flex items-center justify-center text-[#44403C] hover:border-[#16A34A] hover:text-[#16A34A] transition-colors disabled:opacity-40"
                          aria-label={`${t.quick.increaseQty} — ${item.productName}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.key)}
                          className="ms-auto w-8 h-8 touch-manipulation rounded-md flex items-center justify-center text-[#78716C] hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={t.cart.remove}
                          title={t.cart.remove}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-[#E7E5E4] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5 space-y-3">
            <p className="text-xs text-[#78716C]">{t.cart.codNote}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#78716C]">{t.cart.total}</span>
              <span className="text-xl font-extrabold text-[#0B5E46]">{totals.totalPrice} DT</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="h-12 w-full touch-manipulation bg-[#16A34A] text-white font-bold rounded-lg text-base transition-all duration-150 ease-out hover:bg-[#15803D] active:scale-[0.98]"
            >
              {t.cart.checkout}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
