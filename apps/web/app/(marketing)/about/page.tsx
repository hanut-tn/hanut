import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos — Hanut',
  description: "Hanut, l'outil de gestion fait par des Tunisiens pour des Tunisiens qui vendent en ligne.",
}

const STATS = [
  { value: '7,5M', label: 'transactions e-commerce par semestre en Tunisie', source: 'BCT 2025' },
  { value: '56%', label: 'des paiements en ligne en Tunisie se font en COD', source: 'GIZ 2024' },
  { value: '15+', label: 'livreurs locaux actifs intégrés dans Hanut', source: '' },
  { value: '2-5h', label: 'perdues par jour sans outil adapté de gestion', source: 'Enquête vendeurs 2025' },
]

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
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-2xl mb-5">😩</div>
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
                {[
                  { emoji: '📱', text: 'Commandes reçues par WhatsApp, Instagram, TikTok' },
                  { emoji: '📓', text: 'Saisie manuelle dans des carnets ou des groupes WhatsApp' },
                  { emoji: '😰', text: 'Commandes oubliées, doublons, stock incohérent' },
                  { emoji: '🚚', text: 'Suivi livraison manuel sur chaque site livreur' },
                  { emoji: '❓', text: 'Impossible de savoir exactement ce qu\'on gagne' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl">{item.emoji}</span>
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
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-2xl mb-5">🎯</div>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#16A34A] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-green-100"
            >
              Nous contacter
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center text-[#0B5E46] border border-green-200 hover:bg-green-50 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
