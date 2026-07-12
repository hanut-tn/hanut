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
  portalContainer?: HTMLElement | null
  onClose: () => void
  onUpdateQuantity: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  onCheckout: () => void
}

// Bordures/séparateurs neutres mais dérivés du texte du thème (color-mix),
// pour rester visibles sur un `--card-bg` clair comme sombre. Valeur figée
// dans le code (pas d'interpolation) — safe pour le scanner Tailwind.
const THEME_BORDER = 'border-[color:color-mix(in_srgb,var(--text-primary)_15%,transparent)]'
const THEME_BORDER_SOFT = 'border-[color:color-mix(in_srgb,var(--text-primary)_20%,transparent)]'
const THEME_DIVIDE = 'divide-[color:color-mix(in_srgb,var(--text-primary)_10%,transparent)]'
const THEME_HOVER_BG = 'hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]'

export default function CartDrawer({
  items, totals, t, isRtl, portalContainer, onClose, onUpdateQuantity, onRemove, onCheckout,
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
        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-2xl shadow-2xl sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:w-full sm:max-w-md sm:rounded-none ${isRtl ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} ${isRtl ? 'font-arabic' : ''}`}
      >
        {/* Header */}
        <div className={`shrink-0 flex items-center justify-between border-b ${THEME_BORDER} px-4 py-3.5 sm:px-5`}>
          <h2 id="cart-drawer-title" className="font-semibold">
            {t.cart.title} {items.length > 0 && (
              <span
                style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
                className="text-[var(--text-secondary)] font-normal"
              >
                ({totals.totalItems})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className={`text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-9 h-9 touch-manipulation flex items-center justify-center rounded-lg ${THEME_HOVER_BG} transition-colors`}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lignes */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-[var(--text-secondary)] opacity-30" />
              <p className="font-medium">{t.cart.empty}</p>
              <button
                type="button"
                onClick={onClose}
                style={{ color: 'var(--primary)', fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
                className="mt-4 font-medium hover:underline"
              >
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <ul className={`divide-y ${THEME_DIVIDE}`}>
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
                      <p style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }} className="font-semibold truncate">
                        {item.productName}
                      </p>
                      {item.variantLabel && (
                        <p style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }} className="text-[var(--text-secondary)]">
                          {item.variantLabel}
                        </p>
                      )}
                      <p style={{ color: 'var(--primary)', fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }} className="font-bold mt-0.5">
                        {item.productPrice * item.quantity} DT
                        {item.quantity > 1 && (
                          <span
                            style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }}
                            className="font-normal text-[var(--text-secondary)]"
                          >
                            {' '}({item.productPrice} DT × {item.quantity})
                          </span>
                        )}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          className={`w-8 h-8 touch-manipulation rounded-md border ${THEME_BORDER_SOFT} flex items-center justify-center text-[var(--text-secondary)] transition-colors disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)]`}
                          aria-label={`${t.quick.decreaseQty} — ${item.productName}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span
                          style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }}
                          className="w-6 text-center font-bold tabular-nums"
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= cap}
                          onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                          className={`w-8 h-8 touch-manipulation rounded-md border ${THEME_BORDER_SOFT} flex items-center justify-center text-[var(--text-secondary)] transition-colors disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)]`}
                          aria-label={`${t.quick.increaseQty} — ${item.productName}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.key)}
                          className="ms-auto w-8 h-8 touch-manipulation rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 transition-colors"
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
          <div className={`shrink-0 border-t ${THEME_BORDER} p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5 space-y-3`}>
            <p style={{ fontSize: 'calc(0.75rem * var(--font-size-scale, 1))' }} className="text-[var(--text-secondary)]">
              {t.cart.codNote}
            </p>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))' }} className="text-[var(--text-secondary)]">
                {t.cart.total}
              </span>
              <span
                style={{ color: 'var(--primary-dark)', fontSize: 'calc(1.25rem * var(--font-size-scale, 1))' }}
                className="font-extrabold"
              >
                {totals.totalPrice} DT
              </span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              style={{ backgroundColor: 'var(--primary)', fontSize: 'calc(1rem * var(--font-size-scale, 1))' }}
              className="h-12 w-full touch-manipulation text-white font-bold rounded-lg transition-all duration-150 ease-out active:scale-[0.98]"
            >
              {t.cart.checkout}
            </button>
          </div>
        )}
      </div>
    </div>,
    portalContainer ?? document.body
  )
}
