'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateCartDrawerProps } from '../types'

// Identité Fresh : coins arrondis généreux, accents colorés, ambiance fun.
export default function FreshCartDrawer({
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
        style={{ backgroundColor: 'var(--card-bg, #fff)', color: 'var(--text-primary, #14532d)' }}
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-[2rem] shadow-2xl sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:w-full sm:max-w-md sm:rounded-none ${isRtl ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} ${isRtl ? 'font-arabic' : ''}`}
      >
        <div className="shrink-0 flex justify-center pt-2.5 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-black/10" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5">
          <h2 id="cart-drawer-title" className="font-extrabold flex items-center gap-1.5">
            🛒 {t.cart.title} {items.length > 0 && <span style={{ color: 'var(--text-secondary, #166534)' }} className="font-normal text-sm">({totals.totalItems})</span>}
          </h2>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
            className="w-9 h-9 touch-manipulation rounded-full flex items-center justify-center transition-transform active:scale-90"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--primary)', opacity: 0.3 }} />
              <p className="font-semibold">{t.cart.empty}</p>
              <button type="button" onClick={onClose} style={{ color: 'var(--primary)' }} className="mt-4 text-sm font-bold">
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="space-y-3 py-2">
              {items.map(item => {
                const cap = Math.min(item.maxQty, 99)
                return (
                  <li
                    key={item.key}
                    style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 5%, transparent)' }}
                    className="flex gap-3 rounded-2xl p-2.5"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, var(--card-bg, #fff))' }}>
                      {item.productImage ? (
                        <Image src={item.productImage} alt={item.productName} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 opacity-40" style={{ color: 'var(--primary)' }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{item.productName}</p>
                      {item.variantLabel && <p style={{ color: 'var(--text-secondary, #166534)' }} className="text-xs">{item.variantLabel}</p>}
                      <p style={{ color: 'var(--primary)' }} className="text-sm font-extrabold mt-0.5">
                        {item.productPrice * item.quantity} DT
                        {item.quantity > 1 && (
                          <span style={{ color: 'var(--text-secondary, #166534)' }} className="font-normal text-xs"> ({item.productPrice} DT × {item.quantity})</span>
                        )}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          style={{ backgroundColor: 'var(--card-bg, #fff)' }}
                          className="w-7 h-7 touch-manipulation rounded-full flex items-center justify-center disabled:opacity-30"
                          aria-label={`${t.quick.decreaseQty} — ${item.productName}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= cap}
                          onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                          style={{ backgroundColor: 'var(--card-bg, #fff)' }}
                          className="w-7 h-7 touch-manipulation rounded-full flex items-center justify-center disabled:opacity-30"
                          aria-label={`${t.quick.increaseQty} — ${item.productName}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.key)}
                          className="ms-auto w-7 h-7 touch-manipulation rounded-full flex items-center justify-center text-red-400 hover:text-red-600"
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
          <div className="shrink-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3">
            <p style={{ color: 'var(--text-secondary, #166534)' }} className="text-xs">{t.cart.codNote}</p>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-secondary, #166534)' }} className="text-sm">{t.cart.total}</span>
              <span style={{ color: 'var(--primary)' }} className="text-xl font-extrabold">{totals.totalPrice} DT</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
              className="h-12 w-full touch-manipulation text-white font-bold rounded-full transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              {t.cart.checkout} <span aria-hidden>✨</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    portalContainer ?? document.body
  )
}
