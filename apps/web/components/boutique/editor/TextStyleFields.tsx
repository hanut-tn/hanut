'use client'

import { TEXT_WEIGHT_VALUES, type StorefrontTextStyle, type TextWeight } from '@hanut/types'
import ColorField from './ColorField'
import DimensionField from '../ui/DimensionField'

type Props = {
  value: StorefrontTextStyle
  presets: string[]
  onChange: (patch: Partial<StorefrontTextStyle>) => void
}

const WEIGHT_KEYS = Object.keys(TEXT_WEIGHT_VALUES) as TextWeight[]

/** Champs communs à un `StorefrontTextStyle` (couleur + graisse) — réutilisé
 * par les sections/popovers Nom produit et Prix produit. */
export default function TextStyleFields({ value, presets, onChange }: Props) {
  return (
    <div className="space-y-4">
      <ColorField label="Couleur" value={value.color} presets={presets} onChange={hex => onChange({ color: hex })} />
      <DimensionField
        label="Taille exacte"
        value={value.size}
        min={10}
        max={32}
        inputType="number"
        onChange={size => onChange({ size })}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Graisse</label>
        <div className="flex gap-2 flex-wrap">
          {WEIGHT_KEYS.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ weight: key })}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                value.weight === key
                  ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534]'
                  : 'border-[#E7E5E4] text-[#78716C] hover:border-gray-300'
              }`}
            >
              {TEXT_WEIGHT_VALUES[key].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
