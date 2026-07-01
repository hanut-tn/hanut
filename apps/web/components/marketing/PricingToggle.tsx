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
  features: string[]
  cta: string
  highlighted: boolean
  comingSoon?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 39,
    desc: 'Pour débuter et tester',
    features: [
      '100 commandes / mois',
      'Catalogue produits illimité',
      'Lien de commande public /order',
      'Suivi commande client /track',
      'Gestion stock en temps réel',
      'Fiche client',
      'Gestion livraisons COD (5 transporteurs)',
      'Analytics 30 jours',
      'Support WhatsApp',
    ],
    cta: 'Démarrer la démo Pro',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthly: 79,
    desc: 'Pour les vendeurs actifs',
    badge: 'Recommandé',
    features: [
      'Commandes illimitées',
      'Analytics 180 jours + comparaison période',
      'Historique mouvements stock',
      'Fiche client CRM (tags et notes)',
      'Export CSV commandes et analytics',
      'Top produits, clients et villes',
      'Équipe jusqu\'à 3 membres',
      'Support prioritaire WhatsApp',
    ],
    cta: 'Choisir Pro',
    highlighted: true,
  },
  {
    name: 'Business',
    monthly: 0,
    desc: 'En cours de préparation',
    badge: 'Bientôt disponible',
    features: [
      'Aperçu : multi-boutiques',
      'Aperçu : accès API',
      'Aperçu : équipe illimitée',
      'Aperçu : rapport fiscal',
    ],
    cta: 'Être notifié',
    highlighted: false,
    comingSoon: true,
  },
]

function getPricingWhatsAppUrl(planName: string, price: number): string {
  const message = `Bonjour Hanut, je voudrais m'abonner au plan ${planName} (${price} DT/mois).`
  return `${HANUT_CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`
}

function BusinessWaitlistInline() {
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
    return <p className="text-center text-sm text-gray-500 py-2">Vous serez notifié dès l&apos;ouverture du plan Business.</p>
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

export default function PricingToggle() {
  return (
    <section id="pricing" className="py-24 sm:py-32 px-4 sm:px-6 bg-[#F5F5F4]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-3">Tarifs</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Des tarifs simples et transparents
          </h2>
          <p className="mt-4 text-lg text-gray-500">Sans engagement. Changez de plan quand vous voulez.</p>
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-[#0B5E46] text-sm font-medium px-4 py-1.5 rounded-full mt-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Lancement en Tunisie · Démo Pro 14 jours · Aucune carte bancaire
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
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
                {plan.comingSoon ? null : (
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
                <BusinessWaitlistInline />
              ) : plan.name === 'Starter' ? (
                <Link
                  href="/register"
                  className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors bg-[#0B5E46] hover:bg-green-900 text-white`}
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
      </div>
    </section>
  )
}
