'use client'

import { useState } from 'react'
import Link from 'next/link'

type Plan = {
  name: string
  monthly: number
  annual: number
  desc: string
  badge?: string
  features: string[]
  cta: string
  highlighted: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 39,
    annual: 31,
    desc: 'Pour débuter et tester',
    features: ['150 commandes / mois', '1 utilisateur', '5 livreurs', '200 SMS / mois', 'Lien de commande public', 'Support email'],
    cta: 'Commencer gratuitement',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthly: 79,
    annual: 63,
    desc: 'Pour les vendeurs actifs',
    badge: 'Le plus populaire',
    features: [
      'Commandes illimitées',
      '2 utilisateurs',
      '15+ livreurs',
      'SMS illimités',
      'Analytics avancés',
      'Export CSV',
      'Support WhatsApp prioritaire',
    ],
    cta: 'Choisir Pro',
    highlighted: true,
  },
  {
    name: 'Business',
    monthly: 149,
    annual: 119,
    desc: 'Pour les équipes qui scalent',
    features: [
      'Tout Pro inclus',
      '5 utilisateurs',
      'Multi-boutiques',
      'Accès API',
      'Rapport fiscal',
      'Support dédié',
    ],
    cta: 'Choisir Business',
    highlighted: false,
  },
]

export default function PricingToggle() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-24 sm:py-32 px-4 sm:px-6 bg-[#F5F5F4]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-3">Tarifs</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Des tarifs simples et transparents
          </h2>
          <p className="mt-4 text-lg text-gray-500">Sans engagement. Changez de plan quand vous voulez.</p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!annual ? 'text-[#1C1917]' : 'text-gray-400'}`}>Mensuel</span>
            <button
              onClick={() => setAnnual(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-[#16A34A]' : 'bg-gray-200'}`}
              aria-label="Basculer annuel/mensuel"
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  annual ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-[#1C1917]' : 'text-gray-400'}`}>
              Annuel
              <span className="ml-1.5 text-xs font-bold text-[#16A34A] bg-green-50 px-2 py-0.5 rounded-full">-20%</span>
            </span>
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
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap bg-[#16A34A] text-white">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <p className={`font-bold text-sm mb-0.5 ${plan.highlighted ? 'text-green-300' : 'text-gray-500'}`}>
                  {plan.name}
                </p>
                <p className={`text-xs mb-3 ${plan.highlighted ? 'text-green-200' : 'text-gray-400'}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{annual ? plan.annual : plan.monthly}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-green-200' : 'text-gray-400'}`}>DT / mois</span>
                </div>
                {annual && (
                  <p className={`text-xs mt-1 ${plan.highlighted ? 'text-green-300' : 'text-green-600'}`}>
                    Facturé annuellement
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                      <circle cx="8" cy="8" r="7" fill={plan.highlighted ? 'rgba(74,222,128,0.15)' : '#DCFCE7'} />
                      <path d="M5 8L7 10L11 6" stroke={plan.highlighted ? '#4ADE80' : '#16A34A'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={plan.highlighted ? 'text-green-50' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlighted
                    ? 'bg-[#16A34A] hover:bg-green-500 text-white'
                    : 'bg-[#0B5E46] hover:bg-green-900 text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
