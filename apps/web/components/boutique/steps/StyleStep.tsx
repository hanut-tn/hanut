'use client'

import { Check, Lock } from 'lucide-react'
import { STOREFRONT_TEMPLATES, type StorefrontConfig, type StorefrontTemplate } from '@hanut/types'
import TemplatePreview from './TemplatePreview'

type Props = {
  config: StorefrontConfig
  onChange: (updater: (prev: StorefrontConfig) => StorefrontConfig) => void
  plan: 'starter' | 'pro' | 'business'
}

const TEMPLATE_KEYS = Object.keys(STOREFRONT_TEMPLATES) as StorefrontTemplate[]

// Seul le template Mode est disponible sur le plan Starter — cf. audit
// limites de plan. Filet de sécurité côté serveur dans saveStorefrontData.
const STARTER_TEMPLATES: StorefrontTemplate[] = ['mode']

export default function StyleStep({ config, onChange, plan }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Choisissez votre style</h2>
      <p className="text-xs text-gray-500 mb-4">Le style définit l&apos;ambiance générale de votre boutique</p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATE_KEYS.map(key => {
          const tmpl = STOREFRONT_TEMPLATES[key]
          const selected = config.template === key
          const isLocked = plan === 'starter' && !STARTER_TEMPLATES.includes(key)
          return (
            <button
              key={key}
              type="button"
              disabled={isLocked}
              onClick={() => onChange(prev => ({ ...prev, template: key }))}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                isLocked ? 'border-gray-200 opacity-60 cursor-not-allowed'
                  : selected ? 'border-brand-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <TemplatePreview template={key} primaryColor={config.primary_color} />
              <div className="p-2 text-left" style={{ backgroundColor: tmpl.pageBg }}>
                <p className="text-xs font-semibold" style={{ color: tmpl.textPrimary }}>
                  {tmpl.label}
                </p>
                <p className="text-[10px]" style={{ color: tmpl.textSecondary }}>
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
              {selected && !isLocked && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      {plan === 'starter' && (
        <p className="mt-3 text-xs text-gray-500">
          Les templates Luxe, Fresh et Dark sont disponibles sur le{' '}
          <a href="/billing" className="text-brand-600 font-medium hover:underline">plan Pro</a>.
        </p>
      )}
    </div>
  )
}
