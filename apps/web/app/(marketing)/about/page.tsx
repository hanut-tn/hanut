import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos — Hanut',
  description: "Hanut est un outil de gestion fait en Tunisie pour les vendeurs tunisiens. Notre mission : simplifier la vente COD via WhatsApp et Instagram.",
  openGraph: {
    title: 'À propos de Hanut — Fait en Tunisie pour les vendeurs tunisiens',
    description: "Hanut est un outil de gestion fait en Tunisie pour les vendeurs tunisiens.",
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
}

const STATS = [
  { value: '7,5M', label: 'transactions e-commerce par semestre en Tunisie', source: 'BCT 2025' },
  { value: '56%', label: 'des paiements en ligne en Tunisie se font en COD', source: 'GIZ 2024' },
  { value: '5', label: 'transporteurs COD intégrés (IntiGo, Navex, Adex, Aramex, Best Delivery)', source: '' },
  { value: '2-5h', label: 'perdues par jour sans outil adapté de gestion', source: 'Enquête vendeurs 2025' },
]

const PROBLEMS = [
  { icon: 'phone', text: 'Commandes reçues par WhatsApp, Instagram, TikTok' },
  { icon: 'notes', text: 'Saisie manuelle dans des carnets ou des groupes WhatsApp' },
  { icon: 'alert', text: 'Commandes oubliées, doublons, stock incohérent' },
  { icon: 'truck', text: 'Suivi livraison manuel sur chaque site livreur' },
  { icon: 'chart', text: 'Impossible de savoir exactement ce qu\'on gagne' },
] as const

type ProblemIconType = (typeof PROBLEMS)[number]['icon']

function ProblemIcon({ type }: { type: ProblemIconType }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (type === 'phone') {
    return <svg {...common}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
  }
  if (type === 'notes') {
    return <svg {...common}><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  }
  if (type === 'alert') {
    return <svg {...common}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
  }
  if (type === 'truck') {
    return <svg {...common}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
  }
  return <svg {...common}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-7" /></svg>
}

export default function AboutPage() {
  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 right-0 w-96 h-96 bg-green-50 rounded-full opacity-60 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto relative">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-4">À propos</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            Fait par des Tunisiens,<br />pour des Tunisiens
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto">
            Hanut est né d&apos;un constat simple : les vendeurs tunisiens méritent les mêmes outils que les grandes boutiques e-commerce, sans la complexité.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 px-4 sm:px-6 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-[#1C1917] mb-4">Le problème qu&apos;on résout</h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                En Tunisie, des dizaines de milliers de vendeurs gèrent leur business via WhatsApp et Instagram.
                Sans outil adapté, ils perdent <strong className="text-[#1C1917]">2 à 5 heures par jour</strong> en saisie manuelle, oublient des commandes, ne savent pas exactement ce qu&apos;ils gagnent.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Les outils e-commerce existants (Shopify, WooCommerce) sont conçus pour des boutiques en ligne avec site web. Ils ne correspondent pas à la réalité des vendeurs tunisiens qui vendent via DM.
              </p>
            </div>
            <div className="flex-1">
              <div className="bg-[#F5F5F4] rounded-2xl p-6 space-y-4">
                {PROBLEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#78716C] shrink-0">
                      <ProblemIcon type={item.icon} />
                    </span>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
            <div className="flex-1">
              <div className="w-12 h-12 bg-green-50 text-[#16A34A] rounded-2xl flex items-center justify-center mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-[#1C1917] mb-4">Notre mission</h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                Donner à chaque vendeur tunisien les outils d&apos;un grand e-commerce, sans la complexité. Un seul tableau de bord pour tout gérer.
              </p>
              <p className="text-gray-500 leading-relaxed mb-6">
                Hanut est conçu spécifiquement pour le marché tunisien : COD, livreurs locaux, support en arabe et français, tarifs adaptés.
              </p>
              <div className="space-y-3">
                {[
                  'Interface en français et arabe',
                  'Intégration avec les livreurs tunisiens',
                  'Tarifs pensés pour le marché local',
                  'Support basé en Tunisie',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
                      <path d="M5 8L7 10L11 6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-[#0B5E46] rounded-2xl p-8 text-white">
                <p className="text-3xl font-black mb-3">&ldquo;</p>
                <p className="text-lg leading-relaxed text-green-50 italic mb-6">
                  Notre vision : que dans 5 ans, chaque vendeur tunisien qui vend via Instagram ait les mêmes données qu&apos;un Amazon Seller.
                </p>
                <p className="text-sm font-semibold text-white leading-relaxed mb-6">
                  Hanut c&apos;est votre boutique en ligne ET votre outil de gestion. Pas l&apos;un ou l&apos;autre. Les deux ensemble.
                </p>
                <div className="flex items-center gap-3">
                  <Image src="/logo-icone-blanc.svg" alt="Hanut" width={40} height={49} unoptimized />
                  <div>
                    <p className="font-semibold text-white text-sm">L&apos;équipe Hanut</p>
                    <p className="text-xs text-green-300">Tunis, Tunisie</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ce qu'on a construit */}
      <section className="py-16 px-4 sm:px-6 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-[#1C1917] text-center mb-10">Ce qu&apos;on a construit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Mini boutique publique avec 4 identités visuelles',
              'Dashboard commandes, stock, clients, livraisons',
              'Gestion COD avec 5 transporteurs tunisiens',
              'Analytics adaptés au marché tunisien',
              'Bilingue français / arabe',
            ].map(item => (
              <div key={item} className="flex items-start gap-3 bg-[#FAFAF9] rounded-xl border border-gray-200 p-4">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
                  <path d="M5 8L7 10L11 6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 sm:px-6 bg-[#F5F5F4] border-y border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-[#1C1917] text-center mb-12">
            Le e-commerce en Tunisie en chiffres
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-center">
                <p className="text-3xl font-black text-[#0B5E46] mb-2">{s.value}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.label}</p>
                {s.source && (
                  <p className="text-[10px] text-gray-300 mt-2">{s.source}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#1C1917] mb-4">Des questions ?</h2>
          <p className="text-gray-500 mb-6">On est disponibles sur WhatsApp pour répondre à toutes vos questions.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-150 ease-out hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-[#16A34A]/40 active:scale-[0.97]"
            >
              Nous contacter
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center text-[#0B5E46] border border-[#16A34A] hover:bg-green-50 hover:border-green-700 hover:text-green-700 font-semibold px-6 py-3 rounded-lg transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
