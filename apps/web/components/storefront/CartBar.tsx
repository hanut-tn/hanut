'use client'

import { ShoppingCart, ArrowRight } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import type { EditTarget, PopoverPosition } from '@hanut/types'

type Props = {
  totals: { totalItems: number; totalPrice: number }
  t: StorefrontDict
  onOpenCart: () => void
  onCheckout: () => void
  editMode?: boolean
  onEditTargetChange?: (target: EditTarget, position?: PopoverPosition) => void
}

export default function CartBar({ totals, t, onOpenCart, onCheckout, editMode = false, onEditTargetChange }: Props) {
  function openPanel(e: React.MouseEvent) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    onEditTargetChange?.({ type: 'cartBar' }, { top: rect.top - 8, left: rect.left })
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div
        data-edit="cartBar"
        style={{ backgroundColor: 'var(--cartbar-bg, var(--primary))' }}
        className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={editMode ? openPanel : onOpenCart}
            className="flex items-center gap-2.5 min-h-[44px] touch-manipulation text-start"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" style={{ color: 'var(--cartbar-text, #fff)' }} />
              <span
                style={{ color: 'var(--cartbar-bg, var(--primary))', backgroundColor: 'var(--cartbar-text, #fff)' }}
                className="absolute -top-2 -end-2 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center"
              >
                {totals.totalItems}
              </span>
            </div>
            <span
              style={{ fontSize: 'calc(0.875rem * var(--font-size-scale, 1))', color: 'var(--cartbar-text, #fff)' }}
              className="font-semibold"
            >
              {t.cart.itemsCount(totals.totalItems)} · {totals.totalPrice} DT
            </span>
          </button>
          <button
            type="button"
            onClick={editMode ? openPanel : onCheckout}
            style={{
              backgroundColor: 'var(--cartbar-btn-bg, #fff)',
              color: 'var(--cartbar-btn-text, var(--primary))',
              fontSize: 'calc(0.875rem * var(--font-size-scale, 1))',
            }}
            className="min-h-[40px] touch-manipulation flex items-center gap-2 font-semibold rounded-lg px-4 py-1.5 transition-all duration-150 ease-out hover:brightness-95 active:scale-[0.97]"
          >
            {t.cart.checkout}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
