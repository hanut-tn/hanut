'use client'

import { useEffect, useId, useState } from 'react'

type Props = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  inputType: 'slider' | 'number' | 'both'
  onChange: (value: number) => void
}

/**
 * Slider (valeurs continues) et/ou champ numérique (précision exacte),
 * synchronisés sur la même valeur.
 *
 * Le slider clampe nativement (min/max du `<input type="range">`). Le champ
 * texte, lui, ne clampe qu'à la validation (blur / Entrée) — pas à chaque
 * frappe : si on clampait en direct, taper "150" avec min=100 clamperait déjà
 * le "1" à 100 et bloquerait la saisie d'un nombre à plusieurs chiffres dont
 * le préfixe est hors bornes. Un état local (`draft`) porte donc la saisie en
 * cours ; il se resynchronise sur `value` si celle-ci change de l'extérieur
 * (ex: via le slider en mode "both").
 */
export default function DimensionField({ label, value, min, max, step = 1, unit = 'px', inputType, onChange }: Props) {
  const inputId = useId()
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  function commit(raw: string) {
    const n = Number(raw)
    if (Number.isNaN(n)) {
      setDraft(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, n))
    setDraft(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>
        {inputType === 'slider' && (
          <span className="text-xs text-gray-400 tabular-nums">{value}{unit}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {(inputType === 'slider' || inputType === 'both') && (
          <input
            id={inputType === 'slider' ? inputId : undefined}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="flex-1 accent-[#16A34A]"
          />
        )}
        {(inputType === 'number' || inputType === 'both') && (
          <div className="flex items-center gap-1 shrink-0">
            <input
              id={inputType === 'number' ? inputId : undefined}
              type="number"
              min={min}
              max={max}
              step={step}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
              className="input w-16 text-center font-mono text-sm py-1.5"
            />
            <span className="text-xs text-gray-400">{unit}</span>
          </div>
        )}
      </div>
    </div>
  )
}
