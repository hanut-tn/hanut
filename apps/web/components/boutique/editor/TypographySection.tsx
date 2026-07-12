'use client'

import { useEffect } from 'react'
import { STOREFRONT_FONTS, FONT_SIZE_SCALE, type StorefrontFont, type StorefrontFontSize, type StorefrontTypography } from '@hanut/types'
import { loadGoogleFont } from '@/lib/storefront/config'

type Props = {
  typography: StorefrontTypography
  onChange: (patch: Partial<StorefrontTypography>) => void
}

const FONT_KEYS = Object.keys(STOREFRONT_FONTS) as StorefrontFont[]
const SIZE_KEYS = Object.keys(FONT_SIZE_SCALE) as StorefrontFontSize[]

export default function TypographySection({ typography, onChange }: Props) {
  useEffect(() => {
    loadGoogleFont(typography.font)
  }, [typography.font])

  const activeFont = STOREFRONT_FONTS[typography.font]

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="editor-font" className="block text-sm font-medium text-gray-700 mb-1">Police</label>
        <select
          id="editor-font"
          className="input bg-white"
          value={typography.font}
          onChange={e => onChange({ font: e.target.value as StorefrontFont })}
        >
          {FONT_KEYS.map(key => (
            <option key={key} value={key}>{STOREFRONT_FONTS[key].label}</option>
          ))}
        </select>
        <div
          className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-base"
          style={{ fontFamily: activeFont.family }}
        >
          Boutique Sarra — 85 DT
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Taille du texte</label>
        <div className="flex gap-2">
          {SIZE_KEYS.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ size: key })}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                typography.size === key
                  ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534]'
                  : 'border-[#E7E5E4] text-[#78716C] hover:border-gray-300'
              }`}
            >
              {FONT_SIZE_SCALE[key].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
