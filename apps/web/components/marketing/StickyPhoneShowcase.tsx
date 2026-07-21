'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Check,
  Link2,
  Moon,
  Palette,
  ShoppingBag,
  Sunrise,
  Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import IPhoneFrame from './IPhoneFrame'

type StepId = 'editor' | 'share' | 'order' | 'dashboard' | 'delivery' | 'analytics'

type ShowcaseStep = {
  id: StepId
  time: string
  title: string
  subtitle: string
  emotion: string
  icon: LucideIcon
}

const STEPS: ShowcaseStep[] = [
  {
    id: 'editor',
    time: '2 minutes',
    title: 'Votre boutique est prête.',
    subtitle: 'Choisissez votre style. Ajoutez vos produits. Partagez votre lien.',
    emotion: 'Facilité',
    icon: Palette,
  },
  {
    id: 'share',
    time: '1 lien',
    title: 'Un lien. Dans votre bio. C’est tout.',
    subtitle: 'hanut.tn/s/votre-boutique — partagez-le partout.',
    emotion: 'Liberté',
    icon: Link2,
  },
  {
    id: 'order',
    time: '23h47',
    title: 'Votre client commande pendant que vous dormez.',
    subtitle: 'La commande arrive. Le stock se met à jour. Vous ne faites rien.',
    emotion: 'Magie',
    icon: Moon,
  },
  {
    id: 'dashboard',
    time: 'Le matin',
    title: 'Tout est là. Rien n’est perdu.',
    subtitle: '12 nouvelles commandes. Stock à jour. Clients centralisés.',
    emotion: 'Soulagement',
    icon: Sunrise,
  },
  {
    id: 'delivery',
    time: '1 clic',
    title: 'La livraison, sans vous battre avec le livreur.',
    subtitle: 'Suivez vos expéditions chez 5 transporteurs tunisiens.',
    emotion: 'Contrôle',
    icon: Truck,
  },
  {
    id: 'analytics',
    time: 'Ce mois-ci',
    title: 'Vous savez enfin ce qui marche.',
    subtitle: 'Top produits, chiffre d’affaires, santé des livraisons.',
    emotion: 'Puissance',
    icon: BarChart3,
  },
]

const STEP_INDEX: Record<StepId, string> = {
  editor: '01',
  share: '02',
  order: '03',
  dashboard: '04',
  delivery: '05',
  analytics: '06',
}

export default function StickyPhoneShowcase() {
  const [active, setActive] = useState<StepId>('editor')
  const stepRefs = useRef<Record<StepId, HTMLElement | null>>({
    editor: null,
    share: null,
    order: null,
    dashboard: null,
    delivery: null,
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
            <h2 className="font-playfair mx-auto max-w-[22rem] text-[2rem] leading-tight text-[#1C1917] sm:max-w-3xl sm:text-4xl lg:mx-0 lg:text-5xl">
              De votre produit à la livraison, sans rien perdre.
            </h2>
          </div>
          <p className="mx-auto mt-4 max-w-[22rem] text-base leading-relaxed text-neutral-500 sm:text-lg lg:mx-0 lg:mt-0">
            Le téléphone reste le fil conducteur : à chaque étape, l’écran montre exactement
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

                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold text-brand-700">{step.time}</p>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                        {step.emotion}
                      </span>
                    </div>
                    <h3 className="font-playfair mt-3 text-xl leading-tight text-[#1C1917] sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
                      {step.subtitle}
                    </p>
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
                    <p className="text-xs font-black uppercase text-brand-700">{activeStep.emotion}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-500">{STEP_INDEX[activeStep.id]} / 06</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <ActiveIcon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
              </div>
              <IPhoneFrame>
                <div key={active} className="phone-screen-enter h-full">
                  {active === 'editor' && <EditorScreen />}
                  {active === 'share' && <ShareScreen />}
                  {active === 'order' && <OrderScreen />}
                  {active === 'dashboard' && <DashboardScreen />}
                  {active === 'delivery' && <DeliveryScreen />}
                  {active === 'analytics' && <AnalyticsScreen />}
                </div>
              </IPhoneFrame>
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

function PhoneHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-5 pb-4 pt-12">
      <p className="text-[10px] font-black uppercase text-brand-700">{subtitle}</p>
      <p className="mt-1 text-lg font-black text-[#1C1917]">{title}</p>
    </div>
  )
}

function EditorScreen() {
  const templates = [
    { name: 'Mode', selected: true, bg: 'bg-white', border: 'border-neutral-300', text: 'text-neutral-900' },
    { name: 'Luxe', selected: false, bg: 'bg-[#faf8f5]', border: 'border-neutral-200', text: 'text-neutral-700' },
    { name: 'Fresh', selected: false, bg: 'bg-brand-50', border: 'border-neutral-200', text: 'text-brand-700' },
    { name: 'Dark', selected: false, bg: 'bg-neutral-900', border: 'border-neutral-700', text: 'text-white' },
  ]
  return (
    <div className="h-full bg-[#FAFAF9]">
      <PhoneHeader title="Ma boutique" subtitle="Éditeur" />
      <div className="px-4">
        <p className="mb-2 text-xs font-black uppercase text-neutral-400">Choisissez un style</p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {templates.map((t) => (
            <div key={t.name} className={`overflow-hidden rounded-xl border-2 ${t.selected ? 'border-brand-600' : t.border}`}>
              <div className={`flex h-12 items-center justify-center ${t.bg}`}>
                <span className={`text-[9px] font-black ${t.text}`}>{t.name}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-black uppercase text-neutral-400">Couleur</p>
          <div className="flex items-center gap-2">
            {['bg-brand-600', 'bg-rose-400', 'bg-amber-400', 'bg-blue-400', 'bg-neutral-800'].map((c, i) => (
              <span key={c} className={`h-6 w-6 rounded-full ${c} ${i === 0 ? 'ring-2 ring-offset-2 ring-brand-600' : ''}`} />
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-brand-600 py-3 text-center text-sm font-black text-white">
          Enregistrer
        </div>
      </div>
    </div>
  )
}

function ShareScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Link2 className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-black uppercase text-neutral-400">Votre lien public</p>
      <p className="mt-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 font-mono text-sm font-bold text-brand-700">
        hanut.tn/s/boutique-sarra
      </p>
      <div className="mt-6 grid w-full grid-cols-2 gap-2">
        <div className="rounded-xl border border-neutral-100 bg-[#FAFAF9] p-3">
          <p className="text-[11px] font-black text-[#1C1917]">Bio Instagram</p>
          <p className="mt-1 text-[10px] font-semibold text-neutral-500">Collé dans le profil</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-[#FAFAF9] p-3">
          <p className="text-[11px] font-black text-[#1C1917]">Statut WhatsApp</p>
          <p className="mt-1 text-[10px] font-semibold text-neutral-500">Partagé en story</p>
        </div>
      </div>
    </div>
  )
}

function OrderScreen() {
  return (
    <div className="h-full bg-[#0d1117] px-5 pt-14">
      <p className="text-[10px] font-black uppercase tracking-wide text-white/40">23:47 · en ligne</p>
      <div className="mt-5 rounded-2xl border border-brand-500/30 bg-white p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white">
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-[#1C1917]">Nouvelle commande !</p>
            <p className="text-[11px] font-semibold text-neutral-500">Boutique Sarra · à l&apos;instant</p>
          </div>
        </div>
        <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-xs">
          <span className="font-semibold text-neutral-500">Robe été × 1</span>
          <span className="font-black text-[#1C1917]">85 DT</span>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] font-semibold text-white/40">
        Stock mis à jour automatiquement.
      </p>
    </div>
  )
}

function DashboardScreen() {
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
        <p className="text-xs font-semibold text-white/70">Ce matin</p>
        <p className="mt-1 text-2xl font-black">12 commandes</p>
      </div>
    </div>
  )
}

function DeliveryScreen() {
  return (
    <div className="h-full overflow-hidden bg-white">
      <div className="sticky-tracking-content">
        <div className="bg-[linear-gradient(180deg,#F0FDF4_0%,#FFFFFF_82%)] px-4 pb-4 pt-12">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-brand-700">Livraison COD</p>
              <p className="mt-1 font-mono text-lg font-black text-[#1C1917]">TN-8821</p>
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
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
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
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
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
