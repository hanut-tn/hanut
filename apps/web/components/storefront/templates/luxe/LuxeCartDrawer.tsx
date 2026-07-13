'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateCartDrawerProps } from '../types'

const BORDER = 'color-mix(in srgb, var(--text-primary, #1a1a1a) 15%, transparent)'

// Identité Luxe : crème, serif, boutons outline, ambiance feutrée.
export default function LuxeCartDrawer({
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
        style={{ backgroundColor: 'var(--page-bg, #faf8f5)', color: 'var(--text-primary, #1a1a1a)' }}
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-lg shadow-2xl sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:w-full sm:max-w-md sm:rounded-none ${isRtl ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} ${isRtl ? 'font-arabic' : ''}`}
      >
        <div className="shrink-0 flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <h2 id="cart-drawer-title" style={{ fontFamily: 'var(--font-family)' }} className="text-base font-medium">
            {t.cart.title} {items.length > 0 && <span style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-sm font-normal">({totals.totalItems})</span>}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="w-9 h-9 touch-manipulation flex items-center justify-center" aria-label="Fermer">
            <X className="w-4 h-4" strokeWidth={1.25} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto mb-3 opacity-20" strokeWidth={1} />
              <p style={{ fontFamily: 'var(--font-family)' }} className="text-sm">{t.cart.empty}</p>
              <button type="button" onClick={onClose} style={{ color: 'var(--primary)' }} className="mt-4 text-xs uppercase tracking-wider">
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <ul>
              {items.map(item => {
                const cap = Math.min(item.maxQty, 99)
                return (
                  <li key={item.key} className="flex gap-3 px-5 py-4 border-b" style={{ borderColor: BORDER }}>
                    <div className="relative w-14 h-16 shrink-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 6%, var(--card-bg, #fff))' }}>
                      {item.productImage ? (
                        <Image src={item.productImage} alt={item.productName} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 opacity-30" style={{ color: 'var(--primary)' }} strokeWidth={1} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: 'var(--font-family)' }} className="text-sm truncate">{item.productName}</p>
                      {item.variantLabel && <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-xs italic">{item.variantLabel}</p>}
                      <p className="text-sm font-medium mt-0.5">
                        {item.productPrice * item.quantity} DT
                        {item.quantity > 1 && (
                          <span style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="font-normal text-xs"> ({item.productPrice} DT × {item.quantity})</span>
                        )}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          style={{ borderColor: BORDER }}
                          className="w-7 h-7 touch-manipulation border flex items-center justify-center disabled:opacity-30"
                          aria-label={`${t.quick.decreaseQty} — ${item.productName}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= cap}
                          onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                          style={{ borderColor: BORDER }}
                          className="w-7 h-7 touch-manipulation border flex items-center justify-center disabled:opacity-30"
                          aria-label={`${t.quick.increaseQty} — ${item.productName}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.key)}
                          style={{ color: 'var(--text-secondary, #6b5e4e)' }}
                          className="ms-auto w-7 h-7 touch-manipulation flex items-center justify-center hover:text-red-600"
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
          <div className="shrink-0 border-t p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3" style={{ borderColor: BORDER }}>
            <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-xs">{t.cart.codNote}</p>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-sm">{t.cart.total}</span>
              <span style={{ fontFamily: 'var(--font-family)' }} className="text-xl font-semibold">{totals.totalPrice} DT</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              className="h-12 w-full touch-manipulation border text-sm uppercase tracking-[0.15em] font-medium transition-transform active:scale-[0.98]"
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
