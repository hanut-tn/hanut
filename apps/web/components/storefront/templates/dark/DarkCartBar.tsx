'use client'

import { ArrowRight } from 'lucide-react'
import type { TemplateCartBarProps } from '../types'

// Identité Dark : noir avec bordure lumineuse, symbole "◈", bouton gradient glow.
export default function DarkCartBar({ totals, t, onOpenCart, onCheckout }: TemplateCartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div
        style={{
          backgroundColor: '#0a0a0a',
          borderTop: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
          boxShadow: '0 -4px 24px color-mix(in srgb, var(--primary) 20%, transparent)',
        }}
        className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button type="button" onClick={onOpenCart} className="min-h-[44px] touch-manipulation text-start">
            <span style={{ color: 'var(--primary)' }} className="text-sm font-bold uppercase tracking-wide">
              <span aria-hidden>◈</span> {t.cart.itemsCount(totals.totalItems)} · {totals.totalPrice} DT
            </span>
          </button>
          <button
            type="button"
            onClick={onCheckout}
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', boxShadow: '0 0 16px color-mix(in srgb, var(--primary) 45%, transparent)' }}
            className="min-h-[40px] touch-manipulation flex items-center gap-2 text-white font-bold uppercase tracking-wider px-4 py-1.5 text-xs transition-transform active:scale-95"
          >
            {t.cart.checkout}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
