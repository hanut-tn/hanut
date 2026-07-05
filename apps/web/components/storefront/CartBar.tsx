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
      <div className="bg-white/95 backdrop-blur border-t border-[#E7E5E4] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-2.5 min-h-[44px] touch-manipulation text-start"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-[#0B5E46]" />
              <span className="absolute -top-2 -end-2 min-w-[16px] h-4 px-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold flex items-center justify-center">
                {totals.totalItems}
              </span>
            </div>
            <span className="text-sm font-semibold text-[#1C1917]">
              {t.cart.itemsCount(totals.totalItems)} · <span className="text-[#0B5E46]">{totals.totalPrice} DT</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onCheckout}
            className="min-h-[44px] touch-manipulation flex items-center gap-2 bg-[#16A34A] text-white font-bold rounded-lg px-5 text-sm transition-all duration-150 ease-out hover:bg-[#15803D] active:scale-[0.97]"
          >
            {t.cart.checkout}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
