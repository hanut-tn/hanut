'use client'

import { X } from 'lucide-react'
import type { StorefrontCartBar, PopoverPosition } from '@hanut/types'
import CartBarSection from '../editor/CartBarSection'

type Props = {
  cartBar: StorefrontCartBar
  onChange: (patch: Partial<StorefrontCartBar>) => void
  position: PopoverPosition
  onClose: () => void
}

const PANEL_WIDTH = 272
const PANEL_MAX_HEIGHT = 480

export default function CartBarPanel({ cartBar, onChange, position, onClose }: Props) {
  const top = typeof window === 'undefined'
    ? position.top
    : Math.max(16, Math.min(position.top, window.innerHeight - PANEL_MAX_HEIGHT))
  const left = typeof window === 'undefined'
    ? position.left
    : Math.max(16, Math.min(position.left, window.innerWidth - PANEL_WIDTH - 16))

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ top, left, width: PANEL_WIDTH, maxHeight: PANEL_MAX_HEIGHT }}
      className="fixed z-50 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100"
    >
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white rounded-t-2xl">
        <span className="font-semibold text-sm text-gray-900">Barre panier</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        <CartBarSection cartBar={cartBar} onChange={onChange} />
      </div>
    </div>
  )
}
