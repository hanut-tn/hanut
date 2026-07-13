'use client'

import { ShoppingCart, ArrowRight } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  totals: { totalItems: number; totalPrice: number }
  t: StorefrontDict
  onOpenCart: () => void
  onCheckout: () => void
}

export default function CartBar({ totals, t, onOpenCart, onCheckout }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div style={{ backgroundColor: 'var(--primary)' }} className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-2.5 min-h-[44px] touch-manipulation text-start"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-white" />
              <span style={{ color: 'var(--primary)' }} className="absolute -top-2 -end-2 min-w-[16px] h-4 px-0.5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center">
                {totals.totalItems}
              </span>
            </div>
            <span className="text-sm font-semibold text-white">
              {t.cart.itemsCount(totals.totalItems)} · {totals.totalPrice} DT
            </span>
          </button>
          <button
            type="button"
            onClick={onCheckout}
            style={{ color: 'var(--primary)' }}
            className="min-h-[40px] touch-manipulation flex items-center gap-2 bg-white font-semibold rounded-lg px-4 py-1.5 text-sm transition-all duration-150 ease-out hover:bg-gray-50 active:scale-[0.97]"
          >
            {t.cart.checkout}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
