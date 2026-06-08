'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { HANUT_CONTACT } from '@/lib/constants'

type Plan = {
  name: string
  monthly: number
  annual: number
  desc: string
  badge?: string
  highlighted: boolean
  features: string[]
  cta: string
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 39,
    annual: 31,
    desc: 'Pour débuter et tester',
    highlighted: false,
    features: [
      '150 commandes / mois',
      '1 utilisateur',
      '5 livreurs',
      '200 SMS / mois',
      'Lien de commande public',
      'Support email',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    name: 'Pro',
    monthly: 79,
    annual: 63,
    desc: 'Pour les vendeurs actifs',
    badge: 'Le plus populaire',
    highlighted: true,
    features: [
      'Commandes illimitées',
      '2 utilisateurs',
      '15+ livreurs',
      'SMS illimités',
      'Fiche client enrichie',
      'Analytics avancés',
      'Export CSV',
      'Support WhatsApp prioritaire',
    ],
    cta: 'Choisir Pro',
  },
  {
    name: 'Business',
    monthly: 149,
    annual: 119,
    desc: 'Pour les équipes qui scalent',
    highlighted: false,
    features: [
      'Tout Pro inclus',
      '5 utilisateurs',
      'Multi-boutiques',
      'Accès API',
      'Rapport fiscal',
      'Support dédié',
    ],
    cta: 'Choisir Business',
  },
]

const COMPARE_ROWS = [
  { label: 'Commandes / mois', values: ['150', 'Illimité', 'Illimité'] },
  { label: 'Utilisateurs', values: ['1', '2', '5'] },
  { label: 'Livreurs', values: ['5', '15+', '15+'] },
  { label: 'SMS', values: ['200 / mois', 'Illimité', 'Illimité'] },
  { label: 'Lien de commande public', values: ['✓', '✓', '✓'] },
  { label: 'Fiche client enrichie', values: ['—', '✓', '✓'] },
  { label: 'Analytics avancés', values: ['—', '✓', '✓'] },
  { label: 'Export CSV', values: ['—', '✓', '✓'] },
  { label: 'Multi-boutiques', values: ['—', '—', '✓'] },
  { label: 'Accès API', values: ['—', '—', '✓'] },
  { label: 'Rapport fiscal', values: ['—', '—', '✓'] },
  { label: 'Support', values: ['Email', 'WhatsApp prioritaire', 'Dédié'] },
]

const FAQ = [
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis vos paramètres. La différence est calculée au prorata.',
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Aucun engagement. En mensuel, vous pouvez annuler à tout moment. En annuel, vous bénéficiez de 20% de réduction et l'abonnement court jusqu'à la fin de l'année.",
  },
  {
    q: 'Comment fonctionne le paiement ?',
    a: 'Paiement par virement bancaire, carte ou mobile money (eDinar, Paymee). Facture envoyée automatiquement à chaque renouvellement.',
  },
  {
    q: 'Puis-je tester avant de payer ?',
    a: "Oui. Vous démarrez sur le plan Starter gratuitement pendant 14 jours. Aucune carte bancaire requise pour l'essai.",
  },
  {
    q: 'Que se passe-t-il si je dépasse mes commandes ?',
    a: "Vous recevez une notification dès que vous approchez de la limite. Vous pouvez upgrader à tout moment. On ne bloque pas vos commandes en cours.",
  },
]

function getPricingWhatsAppUrl(planName: string, price: number): string {
  const message = `Bonjour Hanut, je voudrais m'abonner au plan ${planName} (${price} DT/mois).`
  return `${HANUT_CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
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
          <p className="text-lg text-gray-500 mb-8">Sans engagement. Changez de plan quand vous voulez.</p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!annual ? 'text-[#1C1917]' : 'text-gray-400'}`}>Mensuel</span>
            <button
              onClick={() => setAnnual(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-[#16A34A]' : 'bg-gray-200'}`}
              aria-label="Basculer annuel/mensuel"
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-[#1C1917]' : 'text-gray-400'}`}>
              Annuel
              <span className="ml-1.5 text-xs font-bold text-[#16A34A] bg-green-50 px-2 py-0.5 rounded-full">-20%</span>
            </span>
          </div>
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

                {plan.name === 'Starter' ? (
                  <Link
                    href="/register"
                    className="w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors bg-[#0B5E46] hover:bg-green-900 text-white"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <a
                    href={getPricingWhatsAppUrl(plan.name, annual ? plan.annual : plan.monthly)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? 'bg-[#16A34A] hover:bg-green-500 text-white'
                        : 'bg-[#0B5E46] hover:bg-green-900 text-white'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Choisir ce plan
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
                        {p.name}
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
          <h2 className="text-3xl font-extrabold text-white mb-4">Commencer gratuitement</h2>
          <p className="text-green-200 mb-8">14 jours d&apos;essai. Sans carte bancaire.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#0B5E46] hover:bg-green-50 text-base font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Créer mon compte
          </Link>
        </div>
      </section>
    </div>
  )
}
