'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ClipboardList,
  Inbox,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type StepId = 'catalog' | 'storefront' | 'checkout' | 'tracking' | 'orders' | 'analytics'

type ShowcaseStep = {
  id: StepId
  eyebrow: string
  title: string
  description: string
  bullets: string[]
  icon: LucideIcon
}

const STEPS: ShowcaseStep[] = [
  {
    id: 'catalog',
    eyebrow: 'Catalogue Hanut',
    title: 'Le vendeur met tous ses produits au propre.',
    description: 'Photos, prix, variantes et stock sont organisés dans Hanut. Plus besoin de chercher les infos dans les messages.',
    bullets: ['Produits illimités', 'Variantes et stock', 'Prix prêts à partager'],
    icon: PackagePlus,
  },
  {
    id: 'storefront',
    eyebrow: 'Mini boutique',
    title: 'Le client voit une vraie boutique mobile.',
    description: 'Un seul lien à mettre dans votre bio. Le client ouvre, choisit ses produits et remplit son panier.',
    bullets: ['Lien public', 'Catalogue clair', 'Panier instantané'],
    icon: ShoppingBag,
  },
  {
    id: 'checkout',
    eyebrow: 'Formulaire client',
    title: 'Le client confirme avec ses informations.',
    description: 'Nom, téléphone, adresse, articles et total arrivent proprement. La commande est exploitable tout de suite.',
    bullets: ['Adresse complète', 'Téléphone vérifié', 'Commande structurée'],
    icon: ClipboardList,
  },
  {
    id: 'tracking',
    eyebrow: 'Suivi automatique',
    title: 'Le client suit sa commande sans vous écrire.',
    description: 'Confirmée, en livraison, livrée: le statut change clairement et le client garde confiance.',
    bullets: ['Lien de suivi', 'Statut en temps réel', 'Message de livraison'],
    icon: Bell,
  },
  {
    id: 'orders',
    eyebrow: 'Dashboard commandes',
    title: 'Toutes les commandes arrivent au même endroit.',
    description: 'Vous voyez qui a commandé, quoi livrer, combien collecter et ce qui reste à traiter.',
    bullets: ['Commandes centralisées', 'Clients attachés', 'Statuts visibles'],
    icon: Inbox,
  },
  {
    id: 'analytics',
    eyebrow: 'Pilotage',
    title: 'Vous savez ce qui marche vraiment.',
    description: 'Hanut montre vos meilleurs produits, votre chiffre d’affaires et la santé de vos livraisons.',
    bullets: ['Chiffre d’affaires', 'Top produits', 'Livraison COD'],
    icon: BarChart3,
  },
]

const STEP_INDEX: Record<StepId, string> = {
  catalog: '01',
  storefront: '02',
  checkout: '03',
  tracking: '04',
  orders: '05',
  analytics: '06',
}

export default function StickyPhoneShowcase() {
  const [active, setActive] = useState<StepId>('catalog')
  const stepRefs = useRef<Record<StepId, HTMLElement | null>>({
    catalog: null,
    storefront: null,
    checkout: null,
    tracking: null,
    orders: null,
    analytics: null,
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        const id = visible?.target.getAttribute('data-step') as StepId | null
        if (id) setActive(id)
      },
      {
        rootMargin: '-30% 0px -38% 0px',
        threshold: [0.18, 0.32, 0.48, 0.64, 0.8],
      },
    )

    Object.values(stepRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const activeStep = STEPS.find((step) => step.id === active) ?? STEPS[0]
  const ActiveIcon = activeStep.icon

  return (
    <section id="features" className="bg-[#FAFAF9] px-4 py-14 sm:px-6 sm:py-32">
      <PhoneShowcaseStyles />
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center lg:mb-14 lg:grid lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-8 lg:text-left">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm font-bold text-brand-700 shadow-sm">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Expérience Hanut
            </span>
            <h2 className="mx-auto max-w-[22rem] text-[2rem] font-extrabold leading-tight text-[#1C1917] sm:max-w-3xl sm:text-4xl lg:mx-0 lg:text-5xl">
              Un seul flux, de votre produit à la livraison.
            </h2>
          </div>
          <p className="mx-auto mt-4 max-w-[22rem] text-base leading-relaxed text-neutral-500 sm:text-lg lg:mx-0 lg:mt-0">
            Le téléphone reste le fil conducteur: à chaque étape, l’écran montre exactement
            ce que Hanut apporte au vendeur et au client.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
          <div className="space-y-4 lg:space-y-0">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = active === step.id

              return (
                <article
                  key={step.id}
                  ref={(el) => {
                    stepRefs.current[step.id] = el
                  }}
                  data-step={step.id}
                  className="flex min-h-[auto] flex-col justify-center border-t border-neutral-200 py-5 last:border-b lg:min-h-[68vh] lg:py-16"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActive(step.id)
                      stepRefs.current[step.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className={`group w-full rounded-[1.25rem] border bg-white p-5 text-left shadow-sm transition-all duration-200 sm:rounded-[1.5rem] sm:p-6 ${
                      isActive
                        ? 'border-brand-200 shadow-lg shadow-neutral-900/5 sm:shadow-xl'
                        : 'border-neutral-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-neutral-900/5'
                    }`}
                  >
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        isActive ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
                      }`}>
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="text-3xl font-black leading-none text-brand-50 sm:text-4xl" aria-hidden>
                        {STEP_INDEX[step.id]}
                      </span>
                    </div>

                    <p className="text-sm font-black text-brand-700">{step.eyebrow}</p>
                    <h3 className="mt-3 text-xl font-extrabold leading-tight text-[#1C1917] sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
                      {step.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
                      {step.bullets.map((bullet) => (
                        <span key={bullet} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-700">
                          <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                          {bullet}
                        </span>
                      ))}
                    </div>
                  </button>
                </article>
              )
            })}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="mb-5 rounded-[1.5rem] border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase text-brand-700">{activeStep.eyebrow}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-500">{STEP_INDEX[activeStep.id]} / 06</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <ActiveIcon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
              </div>
              <PhoneFrame active={active} />
              <div className="mt-7 text-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.02] hover:bg-brand-700"
                >
                  Créer ma boutique
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PhoneFrame({ active, compact = false }: { active: StepId; compact?: boolean }) {
  return (
    <div className={`relative mx-auto aspect-[390/844] ${compact ? 'w-[13.5rem] sm:w-[15rem]' : 'w-[17rem] xl:w-[18rem]'}`} aria-hidden="true">
      <div className="absolute -inset-5 rounded-[3.5rem] bg-white/70 shadow-[0_34px_80px_rgba(15,23,42,0.14)]" />
      <div className="absolute -left-[5px] top-[18%] h-[8%] w-[5px] rounded-l-md bg-[#4B5563]" />
      <div className="absolute -left-[5px] top-[29%] h-[12%] w-[5px] rounded-l-md bg-[#4B5563]" />
      <div className="absolute -right-[5px] top-[28%] h-[12%] w-[5px] rounded-r-md bg-[#4B5563]" />

      <div className="relative h-full rounded-[3.15rem] bg-[linear-gradient(135deg,#6B7280_0%,#111827_32%,#020617_68%,#9CA3AF_100%)] p-[2px] shadow-[0_30px_70px_rgba(15,23,42,0.28)]">
        <div className="h-full rounded-[3rem] bg-[linear-gradient(180deg,#1F2937_0%,#030712_100%)] p-[5px]">
          <div className="h-full rounded-[2.68rem] bg-black p-[2px]">
            <div className="relative h-full overflow-hidden rounded-[2.48rem] bg-white ring-1 ring-black/5">
              <div className="absolute left-1/2 top-3 z-30 flex h-6 w-[5.7rem] -translate-x-1/2 items-center justify-center rounded-full bg-black shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0)_100%)]" />
              <div key={active} className="phone-screen-enter h-full">
                {active === 'catalog' && <CatalogScreen />}
                {active === 'storefront' && <StorefrontScreen />}
                {active === 'checkout' && <CheckoutScreen />}
                {active === 'tracking' && <TrackingScreen />}
                {active === 'orders' && <OrdersScreen />}
                {active === 'analytics' && <AnalyticsScreen />}
              </div>
              <div className="absolute bottom-3 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-5 pb-4 pt-12">
      <p className="text-[10px] font-black uppercase text-brand-700">{subtitle}</p>
      <p className="mt-1 text-lg font-black text-[#1C1917]">{title}</p>
    </div>
  )
}

function CatalogScreen() {
  return (
    <div className="h-full bg-[#FAFAF9]">
      <PhoneHeader title="Catalogue" subtitle="Hanut vendeur" />
      <div className="px-4">
        <div className="mb-3 rounded-2xl bg-brand-600 p-4 text-white">
          <p className="text-xs font-bold text-white/75">Produits actifs</p>
          <p className="mt-1 text-3xl font-black">24</p>
        </div>
        <div className="space-y-2">
          {[
            ['Robe été', '85 DT', 'Stock 12', 'bg-rose-50 text-rose-400'],
            ['Hijab satin', '35 DT', 'Stock 34', 'bg-brand-50 text-brand-500'],
            ['Sac cuir', '120 DT', 'Stock 7', 'bg-amber-50 text-amber-400'],
            ['Sneakers', '75 DT', 'Stock 18', 'bg-blue-50 text-blue-400'],
          ].map(([name, price, stock, cls]) => (
            <div key={name} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 shadow-sm">
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${cls}`}>
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#1C1917]">{name}</p>
                <p className="text-xs font-semibold text-neutral-500">{stock}</p>
              </div>
              <p className="text-sm font-black text-brand-700">{price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StorefrontScreen() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 pb-4 pt-12">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">S</span>
          <div>
            <p className="text-sm font-black text-[#1C1917]">Boutique Sarra</p>
            <p className="text-[10px] font-semibold text-neutral-500">Mode & accessoires</p>
          </div>
        </div>
        <span className="relative">
          <ShoppingCart className="h-5 w-5 text-neutral-500" aria-hidden />
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-black text-white">2</span>
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 bg-[#FAFAF9] p-3">
        {[
          ['Robe été', '85 DT', 'bg-rose-50 text-rose-300'],
          ['Hijab satin', '35 DT', 'bg-brand-50 text-brand-300'],
          ['Sac cuir', '120 DT', 'bg-amber-50 text-amber-300'],
          ['Sneakers', '75 DT', 'bg-blue-50 text-blue-300'],
        ].map(([name, price, cls]) => (
          <div key={name} className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
            <div className={`flex h-20 items-center justify-center ${cls}`}>
              <ShoppingBag className="h-7 w-7" aria-hidden />
            </div>
            <div className="p-2">
              <p className="truncate text-[11px] font-black text-[#1C1917]">{name}</p>
              <p className="text-xs font-black text-brand-700">{price}</p>
              <div className="mt-2 rounded-md bg-brand-600 py-1 text-center text-[10px] font-black text-white">Ajouter</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-3 mb-8 rounded-2xl bg-brand-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black">2 articles · 120 DT</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function CheckoutScreen() {
  return (
    <div className="h-full bg-[#FAFAF9]">
      <PhoneHeader title="Commande" subtitle="Formulaire client" />
      <div className="px-4">
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
          {[
            ['Nom complet', 'Sarra Ben Ali'],
            ['Téléphone', '22 345 678'],
            ['Adresse', 'Rue de Marseille, Tunis'],
            ['Ville', 'Tunis'],
          ].map(([label, value]) => (
            <div key={label} className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase text-neutral-400">{label}</p>
              <p className="text-xs font-bold text-[#1C1917]">{value}</p>
            </div>
          ))}
          <div className="mt-4 rounded-xl bg-brand-600 py-3 text-center text-sm font-black text-white">
            Confirmer la commande
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-neutral-500">2 articles</span>
            <span className="font-black text-brand-700">120 DT</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackingScreen() {
  return (
    <div className="h-full overflow-hidden bg-white">
      <div className="sticky-tracking-content">
        <div className="bg-[linear-gradient(180deg,#F0FDF4_0%,#FFFFFF_82%)] px-4 pb-4 pt-12">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-brand-700">Suivi commande</p>
              <p className="mt-1 font-mono text-lg font-black text-[#1C1917]">#247</p>
            </div>
            <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[9px] font-black text-white">LIVE</span>
          </div>
          <div className="mt-4 rounded-2xl border border-brand-100 bg-white p-3.5 shadow-sm">
            <div className="relative h-12">
              <div className="sticky-status-confirmed absolute inset-0">
                <p className="text-base font-black text-[#1C1917]">Commande confirmée</p>
                <p className="mt-1 text-[11px] font-semibold text-neutral-500">Votre commande est bien reçue.</p>
              </div>
              <div className="sticky-status-shipping absolute inset-0 opacity-0">
                <p className="text-base font-black text-[#1C1917]">En cours de livraison</p>
                <p className="mt-1 text-[11px] font-semibold text-neutral-500">Le livreur est en route vers vous.</p>
              </div>
              <div className="sticky-status-delivered absolute inset-0 opacity-0">
                <p className="text-base font-black text-brand-700">Commande livrée</p>
                <p className="mt-1 text-[11px] font-semibold text-neutral-500">Livraison terminée avec succès.</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="sticky-tracking-progress h-full rounded-full bg-brand-600" />
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          {[
            ['Confirmée', 'Aujourd’hui · 14:02', 'done'],
            ['En livraison', 'IntiGo · TN-8821', 'two'],
            ['Livrée', 'Paiement COD reçu.', 'three'],
          ].map(([label, detail, state]) => (
            <div key={label} className="flex items-start gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-white ${
                state === 'done'
                  ? 'border-brand-600 bg-brand-600'
                  : state === 'two'
                    ? 'sticky-step-two border-neutral-200 bg-neutral-200'
                    : 'sticky-step-three border-neutral-300 bg-white'
              }`}>
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                <p className="text-xs font-black text-[#1C1917]">{label}</p>
                <p className="text-[11px] font-semibold text-neutral-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mx-4 rounded-2xl border border-neutral-100 bg-[#FAFAF9] p-3.5">
          <div className="flex justify-between text-[11px]">
            <span className="font-semibold text-neutral-500">Robe été × 1</span>
            <span className="font-black text-[#1C1917]">85 DT</span>
          </div>
          <div className="mt-2 flex justify-between text-[11px]">
            <span className="font-semibold text-neutral-500">Hijab satin × 1</span>
            <span className="font-black text-[#1C1917]">35 DT</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-xs">
            <span className="font-black text-[#1C1917]">Total</span>
            <span className="font-black text-brand-700">120 DT</span>
          </div>
        </div>
        <div className="sticky-thanks mx-4 mb-5 mt-3 rounded-2xl bg-brand-600 p-3.5 text-white opacity-0 shadow-xl shadow-brand-900/20">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-700">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-black">Votre commande a été livrée.</p>
              <p className="mt-1 text-[11px] font-medium text-white/80">Merci pour votre confiance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrdersScreen() {
  return (
    <div className="h-full bg-[#FAFAF9]">
      <PhoneHeader title="Commandes" subtitle="Dashboard Hanut" />
      <div className="space-y-3 px-4">
        {[
          ['Fatima K.', 'Robe été + Hijab', '120 DT', 'Confirmée'],
          ['Mehdi B.', 'Sac cuir', '120 DT', 'En livraison'],
          ['Sarra A.', 'Sneakers', '75 DT', 'Livrée'],
          ['Hamza T.', 'Hijab satin', '35 DT', 'À traiter'],
        ].map(([name, order, total, status]) => (
          <div key={name} className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-black text-brand-700">
                {name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#1C1917]">{name}</p>
                <p className="truncate text-xs font-semibold text-neutral-500">{order}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-[#1C1917]">{total}</p>
                <p className="text-[10px] font-bold text-brand-700">{status}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-4 mt-4 rounded-2xl bg-[#10261D] p-4 text-white">
        <p className="text-xs font-semibold text-white/70">Aujourd’hui</p>
        <p className="mt-1 text-2xl font-black">8 commandes</p>
      </div>
    </div>
  )
}

function AnalyticsScreen() {
  const bars = [38, 54, 42, 72, 60, 86, 68]
  return (
    <div className="h-full bg-white">
      <PhoneHeader title="Analytics" subtitle="Pilotage" />
      <div className="px-4">
        <div className="rounded-2xl bg-[#10261D] p-4 text-white">
          <p className="text-xs font-semibold text-white/70">CA ce mois</p>
          <p className="mt-1 text-3xl font-black">12,450 DT</p>
          <p className="mt-1 text-xs font-bold text-brand-200">+23% vs dernier mois</p>
        </div>
        <div className="mt-4 rounded-2xl border border-neutral-100 bg-[#FAFAF9] p-4">
          <p className="text-xs font-black text-[#1C1917]">Commandes / jour</p>
          <div className="mt-4 flex h-28 items-end gap-2">
            {bars.map((height, i) => (
              <span
                key={i}
                className={`flex-1 rounded-t-lg ${i === 5 ? 'bg-brand-600' : 'bg-brand-100'}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#1C1917]">Top produit</p>
              <p className="mt-1 text-xs font-semibold text-neutral-500">Robe été</p>
            </div>
            <p className="text-sm font-black text-brand-700">3,480 DT</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneShowcaseStyles() {
  return (
    <style>{`
      @keyframes phoneScreenIn {
        from { opacity: 0; transform: translateY(12px) scale(0.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes stickyTrackingProgress {
        0%, 24% { width: 33%; }
        34%, 58% { width: 66%; }
        70%, 100% { width: 100%; }
      }
      @keyframes stickyConfirmed {
        0%, 25% { opacity: 1; transform: translateY(0); }
        31%, 100% { opacity: 0; transform: translateY(-6px); }
      }
      @keyframes stickyShipping {
        0%, 34% { opacity: 0; transform: translateY(6px); }
        40%, 58% { opacity: 1; transform: translateY(0); }
        66%, 100% { opacity: 0; transform: translateY(-6px); }
      }
      @keyframes stickyDelivered {
        0%, 70% { opacity: 0; transform: translateY(6px); }
        74%, 100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes stickyStepTwo {
        0%, 28% { background: #E7E5E4; color: transparent; border-color: #E7E5E4; }
        38%, 100% { background: #16A34A; color: #FFFFFF; border-color: #16A34A; }
      }
      @keyframes stickyStepThree {
        0%, 62% { background: #FFFFFF; color: transparent; border-color: #D6D3D1; }
        74%, 100% { background: #16A34A; color: #FFFFFF; border-color: #16A34A; }
      }
      @keyframes stickyThanks {
        0%, 66% { opacity: 0; transform: translateY(14px) scale(0.98); }
        78%, 100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes stickyTrackingSlide {
        0%, 68% { transform: translateY(0); }
        78%, 100% { transform: translateY(-4.4rem); }
      }
      .phone-screen-enter {
        animation: phoneScreenIn 320ms ease-out both;
      }
      .sticky-tracking-progress {
        animation: stickyTrackingProgress 7.2s ease-in-out infinite;
      }
      .sticky-status-confirmed {
        animation: stickyConfirmed 7.2s ease-in-out infinite;
      }
      .sticky-status-shipping {
        animation: stickyShipping 7.2s ease-in-out infinite;
      }
      .sticky-status-delivered {
        animation: stickyDelivered 7.2s ease-in-out infinite;
      }
      .sticky-step-two {
        animation: stickyStepTwo 7.2s ease-in-out infinite;
      }
      .sticky-step-three {
        animation: stickyStepThree 7.2s ease-in-out infinite;
      }
      .sticky-thanks {
        animation: stickyThanks 7.2s ease-in-out infinite;
      }
      .sticky-tracking-content {
        animation: stickyTrackingSlide 7.2s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .phone-screen-enter,
        .sticky-tracking-progress,
        .sticky-status-confirmed,
        .sticky-status-shipping,
        .sticky-status-delivered,
        .sticky-step-two,
        .sticky-step-three,
        .sticky-thanks,
        .sticky-tracking-content {
          animation: none;
        }
        .sticky-status-confirmed,
        .sticky-status-shipping {
          opacity: 0;
        }
        .sticky-status-delivered,
        .sticky-thanks {
          opacity: 1;
        }
        .sticky-tracking-progress {
          width: 100%;
        }
        .sticky-tracking-content {
          transform: translateY(-4.4rem);
        }
      }
    `}</style>
  )
}
