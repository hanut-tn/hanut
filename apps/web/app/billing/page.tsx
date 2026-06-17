import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Abonnement — Hanut',
  robots: { index: false, follow: false },
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserContext } from '@/lib/get-context'
import { HANUT_CONTACT } from '@/lib/constants'

const WHATSAPP_BASE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`
  : HANUT_CONTACT.whatsappUrl

function whatsappUrl(plan: 'starter' | 'pro') {
  const messages = {
    starter: 'Bonjour, je souhaite activer le plan Starter (39 DT/mois) pour mon compte Hanut.',
    pro: 'Bonjour, je souhaite activer le plan Pro (79 DT/mois) pour mon compte Hanut.',
  }
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(messages[plan])}`
}

const STARTER_FEATURES = [
  '100 commandes / mois',
  'Catalogue produits illimité',
  'Lien public /order/[slug]',
  'Suivi commande client /track',
  'Gestion stock en temps réel',
  'Fiche client',
  'Gestion livraisons COD (5 transporteurs)',
  'Analytics 30 jours',
  'Support WhatsApp',
]

const PRO_FEATURES = [
  'Commandes illimitées',
  'Tout le Starter inclus',
  'Historique mouvements stock',
  'Tags et notes clients (CRM)',
  'Analytics 180 jours + comparaison',
  'Top produits, clients et villes',
  'Export CSV commandes et analytics',
  'Équipe jusqu\'à 3 membres',
  'Support WhatsApp prioritaire',
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
      <path d="M5 8L7 10L11 6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIconWhite() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill="rgba(74,222,128,0.2)" />
      <path d="M5 8L7 10L11 6" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function BillingPage() {
  const context = await getUserContext()
  if (!context) redirect('/login')
  if (!context.demoExpired) redirect('/dashboard')

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] mb-2">
          {context.subscriptionStatus === 'active'
            ? 'Ton abonnement a expiré'
            : 'Ta période d\'essai est terminée'}
        </h2>
        <p className="text-gray-500">
          Choisis le plan qui correspond à ton activité pour continuer à utiliser Hanut.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Starter */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col">
          <div className="mb-5">
            <p className="font-bold text-sm text-gray-500 mb-0.5">Starter</p>
            <p className="text-xs text-gray-400 mb-3">Pour débuter et tester</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-[#1C1917]">39</span>
              <span className="text-sm text-gray-400">DT / mois</span>
            </div>
          </div>
          <ul className="space-y-2.5 flex-1 mb-7">
            {STARTER_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <a
            href={whatsappUrl('starter')}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center py-3 rounded-xl font-semibold text-sm bg-[#0B5E46] hover:bg-green-900 text-white transition-colors"
          >
            Choisir Starter
          </a>
        </div>

        {/* Pro — mis en avant */}
        <div className="relative bg-[#0B5E46] text-white rounded-2xl shadow-2xl p-7 flex flex-col">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap bg-[#16A34A] text-white">
            Recommandé
          </span>
          <div className="mb-5">
            <p className="font-bold text-sm text-green-300 mb-0.5">Pro</p>
            <p className="text-xs text-green-200 mb-3">Pour les vendeurs actifs</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">79</span>
              <span className="text-sm text-green-200">DT / mois</span>
            </div>
          </div>
          <ul className="space-y-2.5 flex-1 mb-7">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-green-50">
                <CheckIconWhite />
                {f}
              </li>
            ))}
          </ul>
          <a
            href={whatsappUrl('pro')}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center py-3 rounded-xl font-semibold text-sm bg-[#16A34A] hover:bg-green-500 text-white transition-colors"
          >
            Choisir Pro
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        {context.subscriptionStatus === 'active' ? 'Renouvellement sous 24h' : 'Activation sous 24h'} · Paiement par virement ou en main propre ·{' '}
        <Link href="/login" className="underline hover:text-gray-600">
          Se déconnecter
        </Link>
      </p>
    </div>
  )
}
