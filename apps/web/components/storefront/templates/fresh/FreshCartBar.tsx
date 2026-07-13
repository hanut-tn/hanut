'use client'

import type { TemplateCartBarProps } from '../types'

// Identité Fresh : gradient coloré, emoji, bouton blanc, ambiance festive.
export default function FreshCartBar({ totals, t, onOpenCart, onCheckout }: TemplateCartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
        className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button type="button" onClick={onOpenCart} className="flex items-center gap-2 min-h-[44px] touch-manipulation text-start">
            <span className="text-lg" aria-hidden>🛒</span>
            <span className="text-sm font-bold text-white">
              {t.cart.itemsCount(totals.totalItems)} · {totals.totalPrice} DT
            </span>
          </button>
          <button
            type="button"
            onClick={onCheckout}
            style={{ color: 'var(--primary)' }}
            className="min-h-[40px] touch-manipulation flex items-center gap-1.5 bg-white font-bold rounded-full px-4 py-1.5 text-sm transition-transform active:scale-95"
          >
            {t.cart.checkout} <span aria-hidden>✨</span>
          </button>
        </div>
      </div>
    </div>
  )
}
