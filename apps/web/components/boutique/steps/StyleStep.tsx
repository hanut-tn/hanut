'use client'

import { Check } from 'lucide-react'
import { STOREFRONT_TEMPLATES, type StorefrontConfig, type StorefrontTemplate } from '@hanut/types'
import TemplatePreview from './TemplatePreview'

type Props = {
  config: StorefrontConfig
  onChange: (updater: (prev: StorefrontConfig) => StorefrontConfig) => void
}

const TEMPLATE_KEYS = Object.keys(STOREFRONT_TEMPLATES) as StorefrontTemplate[]

export default function StyleStep({ config, onChange }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Choisissez votre style</h2>
      <p className="text-xs text-gray-500 mb-4">Le style définit l&apos;ambiance générale de votre boutique</p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATE_KEYS.map(key => {
          const tmpl = STOREFRONT_TEMPLATES[key]
          const selected = config.template === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(prev => ({ ...prev, template: key }))}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                selected ? 'border-brand-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
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
              {selected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
