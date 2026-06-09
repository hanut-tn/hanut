'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { HANUT_CONTACT } from '@/lib/constants'

type Plan = {
  name: string
  monthly: number
  desc: string
  badge?: string
  highlighted: boolean
  features: string[]
  cta: string
  comingSoon?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 39,
    desc: 'Pour débuter et tester',
    highlighted: false,
    features: [
      'Commandes illimitées',
      'Catalogue produits illimité',
      'Lien de commande public /order',
      'Suivi commande client /track',
      'Gestion stock avec historique des mouvements',
      'Fiche client + CRM basique',
      'Gestion livraisons COD (5 transporteurs)',
      'Dashboard analytics 30 jours',
      'Support WhatsApp',
    ],
    cta: 'Démarrer la démo Pro',
  },
  {
    name: 'Pro',
    monthly: 79,
    desc: 'Pour les vendeurs actifs',
    badge: 'Le plus populaire',
    highlighted: true,
    features: [
      'Tout Starter inclus',
      'Analytics 180 jours + comparaison période',
      'Export CSV commandes et analytics',
      'Équipe jusqu\'à 3 membres',
      'Top produits, clients et villes',
      'Support prioritaire WhatsApp',
    ],
    cta: 'Choisir Pro',
  },
  {
    name: 'Business',
    monthly: 0,
    desc: 'En cours de préparation',
    badge: 'Bientôt disponible',
    highlighted: false,
    comingSoon: true,
    features: [
      'Aperçu : multi-boutiques',
      'Aperçu : accès API',
      'Aperçu : équipe illimitée',
      'Aperçu : rapport fiscal',
    ],
    cta: 'Être notifié',
  },
]

const COMPARE_ROWS = [
  { label: 'Commandes', values: ['Illimitées', 'Illimitées', 'Bientôt'] },
  { label: 'Analytics', values: ['30 jours', '180 jours', 'Bientôt'] },
  { label: 'Équipe', values: ['—', '3 membres', 'Bientôt'] },
  { label: 'Lien de commande public', values: ['✓', '✓', 'Bientôt'] },
  { label: 'Gestion stock', values: ['✓', '✓', 'Bientôt'] },
  { label: 'Livraisons COD', values: ['✓', '✓', 'Bientôt'] },
  { label: 'Export CSV', values: ['—', '✓', 'Bientôt'] },
  { label: 'Top produits / clients / villes', values: ['—', '✓', 'Bientôt'] },
  { label: 'Support', values: ['WhatsApp', 'WhatsApp prioritaire', 'Bientôt'] },
]

const FAQ = [
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis vos paramètres. La différence est calculée au prorata.',
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Aucun engagement. Vous payez mois par mois. Annulation possible à tout moment en nous contactant sur WhatsApp.",
  },
  {
    q: 'Comment fonctionne le paiement ?',
    a: "Le paiement se fait par virement bancaire ou mobile money (eDinar, Paymee). Contactez-nous sur WhatsApp pour activer votre plan. Activation sous 24h garantie.",
  },
  {
    q: "Comment fonctionne la période d'essai ?",
    a: "Toute inscription vous donne automatiquement accès au plan Pro pendant 14 jours, sans carte bancaire. Pas d'action requise — la démo commence dès que vous créez votre compte.",
  },
]

function getPricingWhatsAppUrl(planName: string, price: number): string {
  const message = `Bonjour Hanut, je voudrais m'abonner au plan ${planName} (${price} DT/mois).`
  return `${HANUT_CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`
}

function BusinessWaitlist() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: 'business' }),
      })
    } finally {
      setDone(true)
      setLoading(false)
    }
  }

  if (done) {
    return (
      <p className="text-center text-sm text-gray-500 py-3">Merci ! On vous prévient en priorité dès l&apos;ouverture.</p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="votre@email.com"
        required
        className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-[#0B5E46] hover:bg-green-900 text-white transition-colors disabled:opacity-60"
      >
        {loading ? 'Envoi…' : 'Être notifié en priorité'}
      </button>
    </form>
  )
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-4">Tarifs</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            Des tarifs pensés pour les vendeurs tunisiens
          </h1>
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-[#0B5E46] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Bêta privée · Démo Pro 14 jours · Aucune carte bancaire
          </div>
          <p className="text-lg text-gray-500 mb-8">Sans engagement. Activation accompagnée sur WhatsApp.</p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-16">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-7 flex flex-col transition-all ${
                  plan.highlighted
                    ? 'bg-[#0B5E46] text-white shadow-2xl md:scale-105'
                    : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap ${plan.comingSoon ? 'bg-gray-400 text-white' : 'bg-[#16A34A] text-white'}`}>
                    {plan.badge}
                  </span>
                )}

                <div className="mb-6">
                  <p className={`font-bold text-sm mb-0.5 ${plan.highlighted ? 'text-green-300' : 'text-gray-500'}`}>
                    {plan.name}
                  </p>
                  <p className={`text-xs mb-3 ${plan.highlighted ? 'text-green-200' : 'text-gray-400'}`}>{plan.desc}</p>
                  {plan.comingSoon ? (
                    <p className="text-sm text-gray-400 italic">Prix à venir</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">{plan.monthly}</span>
                      <span className={`text-sm ${plan.highlighted ? 'text-green-200' : 'text-gray-400'}`}>DT / mois</span>
                    </div>
                  )}
                </div>

                {plan.comingSoon && (
                  <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">Aperçu</p>
                )}
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                        <circle cx="8" cy="8" r="7" fill={plan.highlighted ? 'rgba(74,222,128,0.15)' : plan.comingSoon ? '#F3F4F6' : '#DCFCE7'} />
                        <path d="M5 8L7 10L11 6" stroke={plan.highlighted ? '#4ADE80' : plan.comingSoon ? '#9CA3AF' : '#16A34A'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className={plan.highlighted ? 'text-green-50' : plan.comingSoon ? 'text-gray-400' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.comingSoon ? (
                  <BusinessWaitlist />
                ) : plan.name === 'Starter' ? (
                  <Link
                    href="/register"
                    className="w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors bg-[#0B5E46] hover:bg-green-900 text-white"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <a
                    href={getPricingWhatsAppUrl(plan.name, plan.monthly)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? 'bg-[#16A34A] hover:bg-green-500 text-white'
                        : 'bg-[#0B5E46] hover:bg-green-900 text-white'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Choisir Pro
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-16">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[#1C1917]">Comparatif complet</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fonctionnalité</th>
                    {PLANS.map(p => (
                      <th key={p.name} className={`px-6 py-3 text-xs font-semibold uppercase tracking-wide ${p.highlighted ? 'text-[#0B5E46]' : 'text-gray-500'}`}>
                        {p.name}{p.comingSoon ? ' *' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-gray-700 font-medium">{row.label}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className={`px-6 py-3.5 text-center ${v === '—' ? 'text-gray-300' : v === '✓' ? 'text-[#16A34A] font-bold text-base' : 'text-gray-700 font-semibold'}`}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">* Business — Bientôt disponible</p>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1917] text-center mb-8">Questions fréquentes</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-[#1C1917] text-sm">{item.q}</span>
                    <svg
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      className={`shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-[#0B5E46]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Démo gratuite 14 jours sur le plan Pro</h2>
          <p className="text-green-200 mb-8">Sans engagement. Sans carte bancaire. Accès complet au plan Pro dès l&apos;inscription.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#0B5E46] hover:bg-green-50 text-base font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Commencer la démo
          </Link>
        </div>
      </section>
    </div>
  )
}
