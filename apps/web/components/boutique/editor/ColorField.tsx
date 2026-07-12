'use client'

import { useId } from 'react'
import { Check } from 'lucide-react'
import { isValidHexColor } from '@/lib/storefront/colors'

type Props = {
  label: string
  value: string
  presets: string[]
  onChange: (hex: string) => void
}

/** Sélecteur de couleur réutilisable : pastilles preset + champ hex + `<input type="color">` natif. */
export default function ColorField({ label, value, presets, onChange }: Props) {
  const inputId = useId()
  const valid = isValidHexColor(value)

  function handleHexChange(raw: string) {
    const withHash = raw.startsWith('#') ? raw : `#${raw}`
    onChange(withHash)
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(hex => {
          const selected = valid && value.toLowerCase() === hex.toLowerCase()
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              title={hex}
              aria-label={hex}
              style={{ backgroundColor: hex }}
              className={`w-7 h-7 rounded-full flex items-center justify-center border border-black/10 transition-transform hover:scale-110 ${
                selected ? 'ring-2 ring-offset-2 ring-gray-900' : ''
              }`}
            >
              {selected && <Check className="w-3.5 h-3.5" style={{ color: isLight(hex) ? '#111827' : '#ffffff' }} />}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative w-9 h-9 shrink-0 rounded-lg border border-gray-200 overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: valid ? value : '#ffffff' }} />
          <input
            type="color"
            value={valid ? value : '#000000'}
            onChange={e => onChange(e.target.value)}
            aria-label={`${label} — sélecteur natif`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <input
          id={inputId}
          className="input font-mono text-sm"
          value={value}
          onChange={e => handleHexChange(e.target.value)}
          placeholder="#16a34a"
          maxLength={7}
        />
      </div>
      {!valid && <p className="text-xs text-red-600">Code hex invalide (ex: #16a34a).</p>}
    </div>
  )
}

function isLight(hex: string): boolean {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}
