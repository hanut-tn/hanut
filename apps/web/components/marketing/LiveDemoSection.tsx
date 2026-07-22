'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { STOREFRONT_TEMPLATES, type StorefrontTemplate } from '@hanut/types'
import IPhoneFrame from './IPhoneFrame'
import { BagIllustration, HijabIllustration, PerfumeIllustration, SneakerIllustration } from './ProductIllustrations'

const DEMO_TEMPLATES: StorefrontTemplate[] = ['mode', 'luxe', 'fresh', 'dark']

// Couleur de marque par défaut (DEFAULT_STOREFRONT_CONFIG.primary_color) —
// dans le vrai storefront, var(--primary) est choisie par le vendeur et est
// indépendante du template. On la fixe ici pour isoler ce que CHAQUE
// template change réellement (typographie, forme des cartes, boutons),
// plutôt que de confondre "template" et "couleur" comme le faisait la
// version précédente (qui rendait le header du Dark en noir plein — un
// header réel, sans bannière, est TOUJOURS un dégradé de couleur primaire,
// quel que soit le template).
const PRIMARY = '#16a34a'
const PRIMARY_DARK = '#15803d'
const HEADER_GRADIENT = `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`

const DEMO_PRODUCTS = [
  { name: 'Parfum Rose', price: '85 DT', Icon: PerfumeIllustration, freshBg: '#FFE4E6', freshIcon: '#E11D48' },
  { name: 'Hijab satin', price: '35 DT', Icon: HijabIllustration, freshBg: '#DCFCE7', freshIcon: '#16A34A' },
  { name: 'Sac cuir', price: '120 DT', Icon: BagIllustration, freshBg: '#FEF3C7', freshIcon: '#D97706' },
  { name: 'Sneakers', price: '75 DT', Icon: SneakerIllustration, freshBg: '#DBEAFE', freshIcon: '#2563EB' },
] as const

function DemoHeader({ template }: { template: StorefrontTemplate }) {
  if (template === 'fresh') {
    return (
      <div className="relative px-5 pb-4 pt-12" style={{ background: HEADER_GRADIENT }}>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/25 text-sm font-black text-white">S</span>
          <div>
            <p className="flex items-center gap-1 text-sm font-extrabold text-white">
              Boutique Sarra <span aria-hidden="true">✨</span>
            </p>
            <p className="text-[10px] font-semibold text-white/80">Mode estivale &amp; accessoires</p>
          </div>
        </div>
        <ShoppingCart className="absolute right-4 top-12 h-5 w-5 text-white" aria-hidden="true" />
      </div>
    )
  }
  if (template === 'dark') {
    return (
      <div className="relative px-5 pb-4 pt-12" style={{ background: HEADER_GRADIENT }}>
        <p className="text-base font-black uppercase tracking-tight text-white">
          Boutique Sarra<span className="align-super text-[9px] font-normal opacity-50">®</span>
        </p>
        <p className="mt-0.5 text-[10px] text-white/70">Mode estivale &amp; accessoires</p>
        <ShoppingCart className="absolute right-4 top-12 h-5 w-5 text-white" aria-hidden="true" />
      </div>
    )
  }
  if (template === 'luxe') {
    return (
      <div className="relative flex flex-col items-center px-5 pb-4 pt-12 text-center" style={{ background: HEADER_GRADIENT }}>
        <p className="font-playfair text-base text-white">Boutique Sarra</p>
        <p className="mt-0.5 text-[10px] italic text-white/70">Mode estivale &amp; accessoires</p>
        <ShoppingCart className="absolute right-4 top-12 h-5 w-5 text-white" aria-hidden="true" />
      </div>
    )
  }
  return (
    <div className="relative px-5 pb-4 pt-12" style={{ background: HEADER_GRADIENT }}>
      <p className="text-base font-bold uppercase tracking-widest text-white">Boutique Sarra</p>
      <p className="mt-0.5 text-[10px] text-white/80">Mode estivale &amp; accessoires</p>
      <ShoppingCart className="absolute right-4 top-12 h-5 w-5 text-white" aria-hidden="true" />
    </div>
  )
}

// Grille produits fidèle à chaque vrai ProductCard (voir
// components/storefront/templates/<template>/<Template>ProductCard.tsx).

function ModeDemoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {DEMO_PRODUCTS.map((p) => (
        <div key={p.name} className="flex flex-col">
          <div className="relative flex aspect-square w-full items-center justify-center bg-[#f5f5f5]">
            <p.Icon color="#A8A29E" className="h-10 w-10" />
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <p className="truncate text-[11px] text-neutral-500">{p.name}</p>
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold text-neutral-900">{p.price}</p>
              <span className="shrink-0 border border-neutral-900 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-widest text-neutral-900">
                Ajouter
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LuxeDemoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {DEMO_PRODUCTS.map((p) => (
        <div key={p.name} className="flex flex-col items-center overflow-hidden bg-white text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="relative flex aspect-[3/4] w-full items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, #16a34a 6%, white)' }}>
            <p.Icon color={PRIMARY} className="h-9 w-9" />
          </div>
          <div className="flex w-full flex-col items-center gap-1 px-2 py-2">
            <p className="font-playfair truncate text-[11px] text-[#1a1a1a]">{p.name}</p>
            <p className="text-[10px] text-[#6b5e4e]">{p.price}</p>
            <span className="mt-1 w-full border px-2 py-1 text-center text-[7px] uppercase tracking-widest" style={{ borderColor: PRIMARY, color: PRIMARY }}>
              Ajouter
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function FreshDemoGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 p-3">
      {DEMO_PRODUCTS.map((p) => (
        <div key={p.name} className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: '0 4px 14px rgba(22,163,74,0.14)' }}>
          <div className="relative flex aspect-square w-full items-center justify-center" style={{ backgroundColor: p.freshBg }}>
            <p.Icon color={p.freshIcon} className="h-10 w-10" />
          </div>
          <div className="px-2 pb-2 pt-1.5">
            <p className="truncate text-[11px] font-bold text-[#14532d]">{p.name}</p>
            <p className="mt-0.5 text-xs font-black" style={{ color: PRIMARY }}>{p.price}</p>
            <div className="mt-1.5 rounded-full py-1 text-center text-[8px] font-bold text-white" style={{ background: HEADER_GRADIENT }}>
              + Ajouter
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DarkDemoGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 p-3">
      {DEMO_PRODUCTS.map((p) => (
        <div key={p.name} className="overflow-hidden rounded-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="relative flex aspect-square w-full items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <p.Icon color="rgba(255,255,255,0.55)" className="h-9 w-9" />
          </div>
          <div className="px-2 pb-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="truncate text-[10px] font-black uppercase tracking-tight text-white">{p.name}</p>
            <p className="mt-1 text-xs font-bold" style={{ color: PRIMARY, textShadow: `0 0 8px color-mix(in srgb, ${PRIMARY} 50%, transparent)` }}>
              <span aria-hidden="true">◈</span> {p.price}
            </p>
            <div className="mt-1.5 border py-1 text-center text-[7px] font-bold uppercase tracking-wider text-white" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
              Ajouter
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DemoCartBar({ template }: { template: StorefrontTemplate }) {
  if (template === 'fresh') {
    return (
      <div className="mx-3 mb-6 flex items-center justify-between rounded-full px-4 py-3" style={{ background: HEADER_GRADIENT }}>
        <span className="text-xs font-bold text-white">🛒 2 articles · 120 DT</span>
        <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white" aria-hidden="true">✨</span>
      </div>
    )
  }
  if (template === 'dark') {
    return (
      <div className="px-4 py-3" style={{ backgroundColor: '#0a0a0a', borderTop: `1px solid color-mix(in srgb, ${PRIMARY} 40%, transparent)` }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: PRIMARY }}>
            <span aria-hidden="true">◈</span> 2 items · 120 DT
          </span>
          <span className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: HEADER_GRADIENT }}>
            Checkout →
          </span>
        </div>
      </div>
    )
  }
  if (template === 'luxe') {
    return (
      <div className="flex flex-col items-center gap-1.5 border-t px-4 py-3" style={{ backgroundColor: '#faf8f5', borderColor: 'rgba(26,26,26,0.12)' }}>
        <span className="font-playfair text-[10px] text-[#1a1a1a]">2 articles · 120 DT</span>
        <span className="w-full max-w-[10rem] border px-3 py-1.5 text-center text-[8px] uppercase tracking-widest" style={{ borderColor: PRIMARY, color: PRIMARY }}>
          Commander
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-700">2 art. — 120 DT</span>
      <span className="border border-neutral-900 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-neutral-900">
        Commander →
      </span>
    </div>
  )
}

function DemoBoutiqueScreen({ template }: { template: StorefrontTemplate }) {
  const tmpl = STOREFRONT_TEMPLATES[template]
  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: tmpl.pageBg }}>
      <DemoHeader template={template} />
      <div className="flex-1 overflow-hidden">
        {template === 'mode' && <ModeDemoGrid />}
        {template === 'luxe' && <LuxeDemoGrid />}
        {template === 'fresh' && <FreshDemoGrid />}
        {template === 'dark' && <DarkDemoGrid />}
      </div>
      <DemoCartBar template={template} />
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
