import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Livreurs intégrés — Hanut',
  description: 'IntiGo, Navex, Adex, Aramex, BestDelivery et plus — créez une expédition COD en 1 clic depuis votre tableau de bord Hanut.',
  openGraph: {
    title: 'Livreurs intégrés — IntiGo, Navex, Adex, Aramex',
    description: 'IntiGo, Navex, Adex, Aramex, BestDelivery et plus — créez une expédition COD en 1 clic.',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
}

type Carrier = {
  name: string
  desc: string
  coverage: string
  delay: string
  integrated: boolean
}

const CARRIERS: Carrier[] = [
  {
    name: 'IntiGo',
    desc: 'Leader de la livraison express en Tunisie avec un réseau national dense.',
    coverage: 'Nationale',
    delay: '24-48h',
    integrated: true,
  },
  {
    name: 'Navex',
    desc: 'Solution COD spécialisée pour le e-commerce, excellente couverture régionale.',
    coverage: 'Nationale',
    delay: '24-48h',
    integrated: true,
  },
  {
    name: 'Adex',
    desc: 'Livraison fiable avec suivi en temps réel et collecte COD sécurisée.',
    coverage: 'Nationale',
    delay: '24-72h',
    integrated: true,
  },
  {
    name: 'Aramex',
    desc: 'Réseau international avec service national premium et tracking avancé.',
    coverage: 'Nationale + International',
    delay: '24-48h',
    integrated: true,
  },
  {
    name: 'Best Delivery',
    desc: 'Acteur local en plein essor avec des tarifs compétitifs pour le COD.',
    coverage: 'Grand Tunis + régions',
    delay: '48-72h',
    integrated: false,
  },
  {
    name: 'Maystro',
    desc: 'Service de messagerie avec spécialisation sur les petits colis e-commerce.',
    coverage: 'Nationale',
    delay: '48h',
    integrated: false,
  },
  {
    name: 'Jump',
    desc: 'Livraison express same-day sur Tunis et banlieue.',
    coverage: 'Grand Tunis',
    delay: 'Same-day',
    integrated: false,
  },
  {
    name: 'Cogite Express',
    desc: 'Solution logistique complète avec gestion des retours intégrée.',
    coverage: 'Nationale',
    delay: '48-72h',
    integrated: false,
  },
]

const COD_STEPS = [
  {
    num: '01',
    title: 'Le livreur encaisse',
    desc: 'Le livreur collecte le montant COD auprès de votre client à la livraison.',
  },
  {
    num: '02',
    title: 'Hanut tracke',
    desc: 'Le statut COD (en attente, collecté, reversé) est mis à jour automatiquement dans Hanut.',
  },
  {
    num: '03',
    title: 'Vous savez ce qui vous est dû',
    desc: 'Dashboard clair : COD collecté par livreur, en attente de reversement, et déjà reversé.',
  },
]

export default function CarriersPage() {
  const integrated = CARRIERS.filter(c => c.integrated)
  const coming = CARRIERS.filter(c => !c.integrated)

  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-4">Livreurs</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            15+ livreurs tunisiens intégrés
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto">
            Créez une expédition en 1 clic. Le numéro de tracking arrive automatiquement dans Hanut.
          </p>
        </div>
      </section>

      {/* COD Explanation */}
      <section className="py-16 px-4 sm:px-6 bg-[#F5F5F4] border-y border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] mb-3">
              Comment fonctionne le COD avec Hanut ?
            </h2>
            <p className="text-gray-500">Du paiement client jusqu&apos;à votre poche — tout est tracké.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-green-200 via-green-300 to-green-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {COD_STEPS.map((s, i) => (
                <div key={i} className="relative flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-center">
                      <span className="text-2xl font-black text-[#0B5E46]">{s.num}</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#16A34A] rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-[#1C1917] mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrated carriers */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#1C1917] mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            Livreurs intégrés
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
            {integrated.map(c => (
              <div key={c.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-[#1C1917] text-lg">{c.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Intégré
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L6 11M1 6L11 6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {c.coverage}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="#9CA3AF" strokeWidth="1.5"/>
                      <path d="M6 3.5V6L7.5 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {c.delay}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon carriers */}
          <h2 className="text-xl font-bold text-[#1C1917] mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
            Bientôt disponibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {coming.map(c => (
              <div key={c.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 opacity-75">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-[#1C1917] text-lg">{c.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                    Bientôt
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>{c.coverage}</span>
                  <span>·</span>
                  <span>{c.delay}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 bg-[#0B5E46]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            Prêt à créer votre première expédition ?
          </h2>
          <p className="text-green-200 mb-8">Connectez votre compte livreur et créez une expédition en 30 secondes.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#0B5E46] hover:bg-green-50 text-base font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>
    </div>
  )
}
