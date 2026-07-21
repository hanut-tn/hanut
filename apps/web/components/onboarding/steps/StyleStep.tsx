'use client'

import { useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { STOREFRONT_TEMPLATES, PRESET_COLORS, type StorefrontTemplate } from '@hanut/types'
import TemplatePreview from '@/components/boutique/steps/TemplatePreview'
import { saveStyleStep } from '@/app/(onboarding)/setup/actions'

type Props = {
  template: StorefrontTemplate
  primaryColor: string
  plan: 'starter' | 'pro' | 'business'
  onNext: (values: { template: StorefrontTemplate; primary_color: string }) => void
  onSkip: () => void
  onBack: () => void
}

const TEMPLATE_KEYS = Object.keys(STOREFRONT_TEMPLATES) as StorefrontTemplate[]
const STARTER_TEMPLATES: StorefrontTemplate[] = ['mode']

export default function StyleStep({ template, primaryColor, plan, onNext, onSkip, onBack }: Props) {
  const [selected, setSelected] = useState<StorefrontTemplate>(template)
  const [color, setColor] = useState(primaryColor)
  const [isLoading, setIsLoading] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    setIsLoading(true)
    setError(null)
    const result = await saveStyleStep({ template: selected, primary_color: color })
    setIsLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onNext({ template: selected, primary_color: color })
  }

  async function handleSkip() {
    setIsSkipping(true)
    await onSkip()
    setIsSkipping(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Choisissez votre style</h2>
        <p className="text-gray-500 mt-2">L&apos;ambiance visuelle de votre boutique</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEMPLATE_KEYS.map(key => {
          const tmpl = STOREFRONT_TEMPLATES[key]
          const isSelected = selected === key
          const isLocked = plan === 'starter' && !STARTER_TEMPLATES.includes(key)
          return (
            <button
              key={key}
              type="button"
              disabled={isLocked}
              onClick={() => setSelected(key)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                isLocked ? 'border-gray-200 opacity-60 cursor-not-allowed'
                  : isSelected ? 'border-brand-500 shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <TemplatePreview template={key} primaryColor={color} />
              <div className="p-2.5" style={{ backgroundColor: tmpl.pageBg }}>
                <p className="text-xs font-bold" style={{ color: tmpl.textPrimary }}>
                  {tmpl.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: tmpl.textSecondary }}>
                  {tmpl.description}
                </p>
              </div>
              {isLocked && (
                <div className="absolute inset-0 flex items-end justify-center pb-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                    <Lock className="w-2.5 h-2.5" />
                    Pro
                  </span>
                </div>
              )}
              {isSelected && !isLocked && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className={plan === 'starter' ? 'opacity-50 pointer-events-none' : undefined}>
        <p className="text-sm font-medium text-gray-700 mb-3">Votre couleur principale</p>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_COLORS.map(({ value }) => (
            <button
              key={value}
              type="button"
              disabled={plan === 'starter'}
              onClick={() => setColor(value)}
              aria-label={value}
              className={`aspect-square rounded-xl transition-all ${
                color.toLowerCase() === value.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>
      </div>
      {plan === 'starter' && (
        <p className="text-xs text-gray-500 -mt-4">
          Templates additionnels et couleur personnalisée disponibles sur le{' '}
          <a href="/billing" className="text-brand-600 font-medium hover:underline">plan Pro</a>.
        </p>
      )}

      {error && (
        <p className="text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleNext}
          disabled={isLoading || isSkipping}
          className="btn-primary w-full py-3.5 rounded-2xl disabled:opacity-50"
        >
          {isLoading ? 'Enregistrement...' : 'Continuer →'}
        </button>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 py-2">
            ← Retour
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading || isSkipping}
            className="text-sm text-gray-400 hover:text-gray-600 py-2 disabled:opacity-50"
          >
            {isSkipping ? 'Enregistrement...' : 'Passer cette étape'}
          </button>
        </div>
      </div>
    </div>
  )
}
