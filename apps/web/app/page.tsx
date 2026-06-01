'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '📦',
    title: 'Commandes',
    desc: 'Saisissez une commande WhatsApp en 30 secondes. Suivez chaque statut en temps réel, de la confirmation à la livraison.',
    wide: true,
  },
  {
    icon: '🛍️',
    title: 'Catalogue & Stock',
    desc: 'Gérez vos produits, variantes et prix. Recevez des alertes quand le stock est bas.',
    wide: false,
  },
  {
    icon: '🚚',
    title: 'Livraisons',
    desc: 'Créez vos expéditions IntiGo, Navex, Adex et Aramex en un clic depuis Hanut.',
    wide: false,
  },
  {
    icon: '💬',
    title: 'Notifications SMS',
    desc: 'Vos clients reçoivent un SMS automatique avec leur numéro de suivi à chaque étape.',
    wide: false,
  },
  {
    icon: '📊',
    title: 'Analytics',
    desc: 'Visualisez votre CA, votre taux de livraison et vos produits les plus vendus.',
    wide: false,
  },
]

const STEPS = [
  {
    icon: '💬',
    title: 'Tu reçois le DM',
    desc: 'Un client commande via Instagram ou WhatsApp. Tu récupères son numéro et sa commande.',
  },
  {
    icon: '⚡',
    title: 'Tu saisis en 30 sec',
    desc: 'Entrez le téléphone, Hanut retrouve le client. Sélectionnez le produit, confirmez. C\'est tout.',
  },
  {
    icon: '✅',
    title: 'Le livreur part, le client est informé',
    desc: 'L\'expédition est créée chez le transporteur. Le client reçoit un SMS avec son numéro de suivi.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '39',
    features: [
      '50 commandes / mois',
      '20 produits max',
      '1 transporteur',
      'Analytics de base',
      'Support email',
    ],
    cta: 'Commencer',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '79',
    features: [
      '500 commandes / mois',
      'Produits illimités',
      'Tous les transporteurs',
      'SMS automatiques',
      'Analytics avancés',
      'Support prioritaire',
    ],
    cta: 'Choisir Pro',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '149',
    features: [
      'Commandes illimitées',
      'Produits illimités',
      'Multi-utilisateurs (5)',
      'Accès API',
      'Gestionnaire dédié',
      'Onboarding inclus',
    ],
    cta: 'Choisir Business',
    highlighted: false,
  },
]

const TESTIMONIALS = [
  {
    name: 'Yasmine B.',
    role: 'Mode — Tunis',
    avatar: 'YB',
    text: 'Avant je gérais tout sur WhatsApp et j\'oubliais des commandes. Maintenant tout est centralisé et j\'ai zéro perte.',
  },
  {
    name: 'Karim M.',
    role: 'Électronique — Sfax',
    avatar: 'KM',
    text: 'Le suivi de livraison automatique a réduit mes appels clients de 70 %. Mes clients savent où est leur colis sans m\'appeler.',
  },
  {
    name: 'Nour T.',
    role: 'Beauté & Cosmétiques — Sousse',
    avatar: 'NT',
    text: 'J\'ai multiplié mes ventes par 2 en 3 mois, sans changer ma façon de vendre. Hanut gère tout l\'administratif.',
  },
]

const CARRIERS = ['IntiGo', 'Navex', 'Adex', 'Aramex']

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) return null

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <CarrierBand />
        <FeaturesSection />
        <HowItWorks />
        <PricingSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  )
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">Hanut</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-gray-500">
          <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarifs</a>
          <a href="#about" className="hover:text-gray-900 transition-colors">À propos</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-8 border border-green-100">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Conçu pour les vendeurs tunisiens
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          Gérez toutes vos commandes
          <br />
          <span className="text-green-600">WhatsApp en 30 secondes</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Hanut est fait pour les vendeurs qui vendent via DM et WhatsApp —
          sans site e-commerce, sans Excel, sans galère. Commandes, stock,
          livraisons et SMS automatiques en un seul endroit.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-base font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-green-100"
          >
            Commencer gratuitement
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 text-base font-medium px-8 py-3.5 rounded-xl transition-colors"
          >
            Voir une démo
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Carrier Band ─────────────────────────────────────────────────────────────

function CarrierBand() {
  return (
    <div className="border-y border-gray-100 bg-gray-50/80 py-5 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest shrink-0">
          Intégré avec les livreurs tunisiens
        </p>
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {CARRIERS.map(c => (
            <span
              key={c}
              className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-600 shadow-sm"
            >
              {c}
            </span>
          ))}
          <span className="text-sm text-gray-400 font-medium">+ BestDelivery</span>
        </div>
      </div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Un seul outil pour gérer vos commandes, votre stock et vos livraisons de A à Z.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`group rounded-2xl border border-gray-100 p-6 hover:border-green-200 hover:shadow-md hover:shadow-green-50 transition-all ${
                f.wide ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-green-100 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-green-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Comment ça marche
          </h2>
          <p className="text-lg text-gray-500">Trois étapes. Trente secondes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map((step, i) => (
            <div key={i} className="text-center">
              <div className="relative inline-flex mb-5">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-green-100 flex items-center justify-center text-2xl">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Des tarifs simples et transparents
          </h2>
          <p className="text-lg text-gray-500">Sans engagement. Changez de plan quand vous voulez.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`relative flex flex-col rounded-2xl p-7 ${
                plan.highlighted
                  ? 'bg-green-600 text-white shadow-2xl shadow-green-200 ring-0'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-800 text-green-100 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  Le plus populaire
                </span>
              )}

              <div className="mb-6">
                <p className={`font-semibold text-sm mb-2 ${plan.highlighted ? 'text-green-200' : 'text-gray-500'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-green-200' : 'text-gray-400'}`}>
                    DT / mois
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 shrink-0 font-bold ${plan.highlighted ? 'text-green-300' : 'text-green-600'}`}>
                      ✓
                    </span>
                    <span className={plan.highlighted ? 'text-green-50' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlighted
                    ? 'bg-white text-green-700 hover:bg-green-50'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
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

// ─── Testimonials ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
  return (
    <section id="about" className="py-24 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Ils utilisent Hanut
          </h2>
          <p className="text-lg text-gray-500">Des vendeurs tunisiens qui ont changé leur façon de gérer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <span key={j} className="text-green-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-white text-lg">Hanut</span>
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
            <a href="mailto:support@hanut.tn" className="hover:text-white transition-colors">Contact</a>
          </div>

          <p className="text-sm text-gray-500">© 2026 Hanut. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
