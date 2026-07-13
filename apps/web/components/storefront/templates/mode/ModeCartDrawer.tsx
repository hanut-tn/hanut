'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateCartDrawerProps } from '../types'

// Identité Mode : angles droits, panneau plein écran mobile / latéral
// desktop, séparateurs fins, aucune couleur hors accent primary.
export default function ModeCartDrawer({
  items, totals, t, isRtl, portalContainer, onClose, onUpdateQuantity, onRemove, onCheckout,
}: TemplateCartDrawerProps) {
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
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col bg-white shadow-2xl sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:w-full sm:max-w-md ${isRtl ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} ${isRtl ? 'font-arabic' : ''}`}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-3.5 sm:px-5">
          <h2 id="cart-drawer-title" className="text-xs font-bold uppercase tracking-widest text-gray-900">
            {t.cart.title} {items.length > 0 && <span className="text-gray-400 font-normal">({totals.totalItems})</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 w-9 h-9 touch-manipulation flex items-center justify-center transition-colors" aria-label="Fermer">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto mb-3 text-gray-200" strokeWidth={1.25} />
              <p className="text-sm text-gray-500">{t.cart.empty}</p>
              <button type="button" onClick={onClose} className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-900 hover:underline">
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(item => {
                const cap = Math.min(item.maxQty, 99)
                return (
                  <li key={item.key} className="flex gap-3 px-4 py-3.5 sm:px-5">
                    <div className="relative w-14 h-14 bg-[#f5f5f5] shrink-0 flex items-center justify-center">
                      {item.productImage ? (
                        <Image src={item.productImage} alt={item.productName} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 text-gray-300" strokeWidth={1.25} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">{item.productName}</p>
                      {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                      <p className="text-sm font-bold text-gray-900 mt-0.5">
                        {item.productPrice * item.quantity} DT
                        {item.quantity > 1 && (
                          <span className="font-normal text-gray-400"> ({item.productPrice} DT × {item.quantity})</span>
                        )}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          className="w-7 h-7 touch-manipulation border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:border-gray-900"
                          aria-label={`${t.quick.decreaseQty} — ${item.productName}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= cap}
                          onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                          className="w-7 h-7 touch-manipulation border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:border-gray-900"
                          aria-label={`${t.quick.increaseQty} — ${item.productName}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.key)}
                          className="ms-auto w-7 h-7 touch-manipulation flex items-center justify-center text-gray-300 hover:text-red-600"
                          aria-label={t.cart.remove}
                          title={t.cart.remove}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 border-t border-gray-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5 space-y-3">
            <p className="text-xs text-gray-400">{t.cart.codNote}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t.cart.total}</span>
              <span className="text-lg font-bold text-gray-900">{totals.totalPrice} DT</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="h-12 w-full touch-manipulation bg-gray-900 text-white font-semibold text-sm uppercase tracking-widest transition-transform active:scale-[0.98]"
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
