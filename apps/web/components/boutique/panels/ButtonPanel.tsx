'use client'

import { X } from 'lucide-react'
import { COLOR_PRESETS, CARD_RADIUS_VALUES, type StorefrontButton, type StorefrontCardRadius } from '@hanut/types'
import type { PopoverPosition } from '@hanut/types'
import ColorField from '../editor/ColorField'

type Props = {
  primaryColor: string
  onPrimaryColorChange: (hex: string) => void
  button: StorefrontButton
  onButtonChange: (patch: Partial<StorefrontButton>) => void
  position: PopoverPosition
  onClose: () => void
}

const PANEL_WIDTH = 272
const PANEL_MAX_HEIGHT = 380
const RADIUS_KEYS = Object.keys(CARD_RADIUS_VALUES) as StorefrontCardRadius[]

export default function ButtonPanel({ primaryColor, onPrimaryColorChange, button, onButtonChange, position, onClose }: Props) {
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
        <span className="font-semibold text-sm text-gray-900">Bouton &quot;Ajouter&quot;</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <ColorField
          label="Couleur"
          value={primaryColor}
          presets={COLOR_PRESETS.primary}
          onChange={onPrimaryColorChange}
        />

        <div>
          <label htmlFor="button-panel-text" className="block text-sm font-medium text-gray-700 mb-1">
            Texte du bouton
          </label>
          <input
            id="button-panel-text"
            className="input"
            value={button.text}
            onChange={e => onButtonChange({ text: e.target.value })}
            maxLength={30}
            placeholder="Ajouter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Coins</label>
          <div className="flex gap-2">
            {RADIUS_KEYS.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => onButtonChange({ radius: key })}
                className={`flex-1 flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                  button.radius === key ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E7E5E4] hover:border-gray-300'
                }`}
              >
                <div className="w-6 h-6 bg-gray-300" style={{ borderRadius: CARD_RADIUS_VALUES[key].css }} />
                <span className={`text-xs font-medium ${button.radius === key ? 'text-[#166534]' : 'text-[#78716C]'}`}>
                  {CARD_RADIUS_VALUES[key].label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
