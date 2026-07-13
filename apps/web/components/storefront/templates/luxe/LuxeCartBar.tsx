'use client'

import type { TemplateCartBarProps } from '../types'

// Identité Luxe : crème, tout centré, bouton outline.
export default function LuxeCartBar({ totals, t, onOpenCart, onCheckout }: TemplateCartBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 animate-slide-up border-t"
      style={{ backgroundColor: 'var(--page-bg, #faf8f5)', borderColor: 'color-mix(in srgb, var(--text-primary, #1a1a1a) 12%, transparent)' }}
    >
      <div className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onOpenCart}
          style={{ color: 'var(--text-primary, #1a1a1a)', fontFamily: 'var(--font-family)' }}
          className="min-h-[32px] touch-manipulation text-xs tracking-wide"
        >
          {t.cart.itemsCount(totals.totalItems)} · {totals.totalPrice} DT
        </button>
        <button
          type="button"
          onClick={onCheckout}
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          className="min-h-[42px] touch-manipulation w-full max-w-xs border px-6 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-colors"
        >
          {t.cart.checkout}
        </button>
      </div>
    </div>
  )
}
