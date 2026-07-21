'use client'

import { useState } from 'react'
import { ShoppingBag, ShoppingCart } from 'lucide-react'
import { STOREFRONT_TEMPLATES, type StorefrontTemplate } from '@hanut/types'
import IPhoneFrame from './IPhoneFrame'

const DEMO_TEMPLATES: StorefrontTemplate[] = ['mode', 'luxe', 'fresh', 'dark']

const DEMO_PRODUCTS = [
  { name: 'Robe été', price: '85 DT', bg: '#FFE4E6' },
  { name: 'Hijab satin', price: '35 DT', bg: '#DCFCE7' },
  { name: 'Sac cuir', price: '120 DT', bg: '#FEF3C7' },
  { name: 'Sneakers', price: '75 DT', bg: '#DBEAFE' },
]

function DemoBoutiqueScreen({ template }: { template: StorefrontTemplate }) {
  const tmpl = STOREFRONT_TEMPLATES[template]
  const headerBg = tmpl.headerStyle === 'gradient' ? tmpl.previewHeader
    : tmpl.headerStyle === 'dark' ? '#000000'
      : '#f5f0e8'
  const headerText = tmpl.headerStyle === 'cream' ? '#1a1a1a' : '#ffffff'

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: tmpl.pageBg }}>
      <div
        className="flex items-center justify-between px-5 pb-4 pt-12"
        style={{ backgroundColor: headerBg }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
            style={{ backgroundColor: tmpl.previewHeader, color: '#ffffff' }}
          >
            S
          </span>
          <div>
            <p className="text-sm font-black" style={{ color: headerText, fontFamily: tmpl.fontFamily }}>
              Boutique Sarra
            </p>
            <p className="text-[10px] font-semibold opacity-70" style={{ color: headerText }}>
              Mode &amp; accessoires
            </p>
          </div>
        </div>
        <ShoppingCart className="h-5 w-5" style={{ color: headerText }} aria-hidden="true" />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 p-3">
        {DEMO_PRODUCTS.map((p) => (
          <div
            key={p.name}
            className="overflow-hidden border"
            style={{
              backgroundColor: tmpl.cardBg,
              borderRadius: tmpl.cardRadius,
              borderColor: 'rgba(0,0,0,0.06)',
              boxShadow: tmpl.cardShadow,
            }}
          >
            <div className="flex h-16 items-center justify-center" style={{ backgroundColor: p.bg }}>
              <ShoppingBag className="h-6 w-6 text-neutral-400" aria-hidden="true" />
            </div>
            <div className="p-2">
              <p className="truncate text-[11px] font-bold" style={{ color: tmpl.textPrimary, fontFamily: tmpl.fontFamily }}>
                {p.name}
              </p>
              <p className="text-xs font-black" style={{ color: tmpl.previewHeader }}>{p.price}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-3 mb-8 rounded-2xl px-4 py-3 text-white" style={{ backgroundColor: tmpl.previewHeader }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black">2 articles · 120 DT</span>
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function LiveDemoSection() {
  const [activeTemplate, setActiveTemplate] = useState<StorefrontTemplate>('fresh')

  return (
    <section className="bg-[#faf8f5] px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Personnalisation
        </span>
        <h2 className="font-playfair mt-3 text-4xl text-[#1C1917] sm:text-5xl">
          Votre boutique.<br />
          <span className="italic text-brand-600">Votre identité.</span>
        </h2>
        <p className="mx-auto mb-12 mt-4 max-w-lg text-neutral-500">
          4 identités visuelles complètes. Changez de style en un clic.
          Votre boutique, votre marque.
        </p>

        <div className="relative mb-10 flex justify-center">
          <div className="relative">
            <div
              className="absolute inset-0 scale-75 rounded-full opacity-25 blur-3xl transition-colors duration-300"
              style={{ backgroundColor: STOREFRONT_TEMPLATES[activeTemplate].previewHeader }}
              aria-hidden="true"
            />
            <IPhoneFrame className="relative">
              <DemoBoutiqueScreen template={activeTemplate} />
            </IPhoneFrame>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {DEMO_TEMPLATES.map((key) => {
            const tmpl = STOREFRONT_TEMPLATES[key]
            const isActive = activeTemplate === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTemplate(key)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive ? 'scale-105 shadow-lg' : 'opacity-60 hover:opacity-80'
                }`}
                style={isActive
                  ? { backgroundColor: tmpl.previewHeader, color: '#ffffff' }
                  : { backgroundColor: '#f3f4f6', color: '#374151' }}
              >
                {tmpl.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
