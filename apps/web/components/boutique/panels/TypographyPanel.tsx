'use client'

import { X } from 'lucide-react'
import type { StorefrontTypography } from '@hanut/types'
import TypographySection from '../editor/TypographySection'

type Props = {
  typography: StorefrontTypography
  onChange: (patch: Partial<StorefrontTypography>) => void
  onClose: () => void
}

/** Panneau flottant fixe (comme HeaderPanel) — pas de cible cliquable dédiée dans
 * l'aperçu (voir recap) : accessible depuis le panneau général "Personnaliser". */
export default function TypographyPanel({ typography, onChange, onClose }: Props) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed left-6 top-20 z-50 w-72 max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100"
    >
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white rounded-t-2xl">
        <span className="font-semibold text-sm text-gray-900">Typographie</span>
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
        <TypographySection typography={typography} onChange={onChange} />
      </div>
    </div>
  )
}
