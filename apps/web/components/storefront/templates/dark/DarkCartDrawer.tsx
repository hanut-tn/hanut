'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateCartDrawerProps } from '../types'

const BORDER = 'rgba(255,255,255,0.1)'

// Identité Dark : panneau noir, bordures blanches discrètes, accents primary lumineux.
export default function DarkCartDrawer({
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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        style={{ backgroundColor: '#0f0f0f', color: '#fff' }}
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col shadow-2xl sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:w-full sm:max-w-md ${isRtl ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} ${isRtl ? 'font-arabic' : ''}`}
      >
        <div className="shrink-0 flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <h2 id="cart-drawer-title" className="font-black uppercase tracking-tight">
            {t.cart.title} {items.length > 0 && <span className="text-white/40 font-normal text-sm">({totals.totalItems})</span>}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white w-9 h-9 touch-manipulation flex items-center justify-center" aria-label="Fermer">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <ShoppingBag className="w-9 h-9 mx-auto mb-3 text-white/15" strokeWidth={1.25} />
              <p className="text-sm text-white/60 uppercase tracking-wide">{t.cart.empty}</p>
              <button type="button" onClick={onClose} style={{ color: 'var(--primary)' }} className="mt-4 text-xs font-bold uppercase tracking-wider">
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: BORDER }}>
              {items.map(item => {
                const cap = Math.min(item.maxQty, 99)
                return (
                  <li key={item.key} className="flex gap-3 px-5 py-4 border-b" style={{ borderColor: BORDER }}>
                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center" style={{ backgroundColor: '#1a1a1a', border: `1px solid ${BORDER}` }}>
                      {item.productImage ? (
                        <Image src={item.productImage} alt={item.productName} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 text-white/20" strokeWidth={1.25} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold uppercase tracking-tight truncate">{item.productName}</p>
                      {item.variantLabel && <p className="text-xs text-white/40">{item.variantLabel}</p>}
                      <p style={{ color: 'var(--primary)' }} className="text-sm font-bold mt-0.5">
                        <span aria-hidden>◈</span> {item.productPrice * item.quantity} DT
                        {item.quantity > 1 && <span className="font-normal text-white/40"> ({item.productPrice} DT × {item.quantity})</span>}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          style={{ borderColor: BORDER }}
                          className="w-7 h-7 touch-manipulation border flex items-center justify-center text-white/70 disabled:opacity-30 hover:border-white"
                          aria-label={`${t.quick.decreaseQty} — ${item.productName}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= cap}
                          onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                          style={{ borderColor: BORDER }}
                          className="w-7 h-7 touch-manipulation border flex items-center justify-center text-white/70 disabled:opacity-30 hover:border-white"
                          aria-label={`${t.quick.increaseQty} — ${item.productName}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.key)}
                          className="ms-auto w-7 h-7 touch-manipulation flex items-center justify-center text-white/30 hover:text-red-500"
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
            <p className="text-xs text-white/40">{t.cart.codNote}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{t.cart.total}</span>
              <span style={{ color: 'var(--primary)', textShadow: '0 0 12px color-mix(in srgb, var(--primary) 45%, transparent)' }} className="text-xl font-black">
                {totals.totalPrice} DT
              </span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', boxShadow: '0 0 20px color-mix(in srgb, var(--primary) 40%, transparent)' }}
              className="h-12 w-full touch-manipulation text-white font-bold uppercase tracking-wider transition-transform active:scale-[0.98]"
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
