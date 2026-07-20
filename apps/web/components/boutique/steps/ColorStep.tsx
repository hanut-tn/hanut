'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { PRESET_COLORS, type StorefrontConfig } from '@hanut/types'
import { isValidHexColor } from '@/lib/storefront/colors'

type Props = {
  config: StorefrontConfig
  onChange: (updater: (prev: StorefrontConfig) => StorefrontConfig) => void
  plan: 'starter' | 'pro' | 'business'
}

export default function ColorStep({ config, onChange, plan }: Props) {
  const [customHex, setCustomHex] = useState(config.primary_color)
  const isLocked = plan === 'starter'

  function applyColor(hex: string) {
    if (isLocked) return
    setCustomHex(hex)
    onChange(prev => ({ ...prev, primary_color: hex }))
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Votre couleur principale</h2>
      <p className="text-xs text-gray-500 mb-4">
        Cette couleur s&apos;applique sur les boutons, le header et les accents de votre boutique
      </p>

      {isLocked && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
            <Lock className="w-3 h-3" />
            Personnalisation avancée disponible en Pro
          </p>
          <p className="text-[10px] text-amber-700 mt-0.5">
            Sur le plan Starter, votre boutique utilise la couleur Hanut par défaut.
          </p>
          <a href="/billing" className="text-[10px] text-brand-600 font-medium hover:underline">
            Passer en Pro →
          </a>
        </div>
      )}

      <div className={isLocked ? 'opacity-50 pointer-events-none' : ''}>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESET_COLORS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              disabled={isLocked}
              onClick={() => applyColor(value)}
              title={label}
              aria-label={label}
              className={`aspect-square rounded-xl transition-all ${
                config.primary_color.toLowerCase() === value.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>

        <div className="border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-2">Couleur personnalisée</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={isLocked}
              value={isValidHexColor(config.primary_color) ? config.primary_color : '#16a34a'}
              onChange={e => applyColor(e.target.value)}
              aria-label="Sélecteur de couleur natif"
              className="w-10 h-10 rounded-lg cursor-pointer border-0"
            />
            <input
              type="text"
              disabled={isLocked}
              value={customHex}
              onChange={e => {
                if (isLocked) return
                const val = e.target.value
                setCustomHex(val)
                if (isValidHexColor(val)) onChange(prev => ({ ...prev, primary_color: val }))
              }}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"
              placeholder="#16a34a"
              maxLength={7}
            />
          </div>
          {!isValidHexColor(customHex) && (
            <p className="text-xs text-red-600 mt-1.5">Code hex invalide (ex: #16a34a).</p>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Aperçu</p>
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: config.primary_color }}
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  )
}
