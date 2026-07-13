'use client'

import { ArrowRight } from 'lucide-react'
import type { TemplateCartBarProps } from '../types'

// Identité Mode : fond blanc, bordure fine, bouton outline — pas de shadow ni de couleur.
export default function ModeCartBar({ totals, t, onOpenCart, onCheckout }: TemplateCartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up bg-white border-t border-gray-200">
      <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenCart}
            className="min-h-[44px] touch-manipulation text-start text-xs font-medium uppercase tracking-wider text-gray-700"
          >
            {t.cart.itemsCount(totals.totalItems)} — {totals.totalPrice} DT
          </button>
          <button
            type="button"
            onClick={onCheckout}
            className="min-h-[40px] touch-manipulation flex items-center gap-2 border border-gray-900 text-gray-900 font-semibold px-4 py-1.5 text-xs uppercase tracking-widest transition-colors hover:bg-gray-900 hover:text-white"
          >
            {t.cart.checkout}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
