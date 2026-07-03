import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Package, Users, Link2, MapPin, FileSpreadsheet, Smartphone,
  MessageCircle, ClipboardCheck, Truck, Inbox, PackageCheck, Banknote,
} from 'lucide-react'
import MarketingNavbar from '@/components/marketing/Navbar'
import MarketingFooter from '@/components/marketing/Footer'
import PricingSection from '@/components/marketing/PricingSection'
import { HANUT_CONTACT } from '@/lib/constants'

// ─── Data ─────────────────────────────────────────────────────────────────────

const CARRIERS = ['IntiGo', 'Navex', 'Adex', 'Aramex', 'Best Delivery']

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Vous recevez le message WhatsApp',
    desc: 'Un client commande via Instagram ou WhatsApp. Vous récupérez son numéro et sa demande.',
  },
  {
    icon: ClipboardCheck,
    title: 'Vous saisissez la commande en 30 sec',
    desc: "Entrez le téléphone — Hanut retrouve le client. Sélectionnez le produit, confirmez. C'est tout.",
  },
  {
    icon: Truck,
    title: 'Le livreur part, le client peut suivre',
    desc: "Créez la livraison dans Hanut avec le transporteur choisi. Le client peut suivre sa commande sur sa page dédiée.",
  },
]


// ─── Mockups ──────────────────────────────────────────────────────────────────

function MockupShell({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden" aria-hidden="true">
      <div className="bg-[#F5F5F4] px-4 py-3 flex items-center gap-2 border-b border-neutral-100">
        <div className="w-3 h-3 bg-red-300 rounded-full" />
        <div className="w-3 h-3 bg-yellow-300 rounded-full" />
        <div className="w-3 h-3 bg-green-400 rounded-full" />
        <span className="ml-3 text-xs text-neutral-400 font-mono">{url}</span>
      </div>
      {children}
    </div>
  )
}

function DashboardMockup() {
  const recent = [
    { name: 'Amine R.', product: 'Samsung S23', amount: 720, status: 'En cours', cls: 'bg-blue-100 text-blue-700' },
    { name: 'Nour B.', product: 'Sac à main cuir', amount: 95, status: 'Livré', cls: 'bg-brand-100 text-brand-700' },
    { name: 'Rania T.', product: 'Parfum Oud', amount: 65, status: 'Confirmée', cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  ]
  return (
    <MockupShell url="hanut.tn/dashboard">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-brand-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-brand-700">24</p>
            <p className="text-xs text-brand-600 mt-0.5">Commandes</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-blue-700">3,240</p>
            <p className="text-xs text-blue-600 mt-0.5">CA (DT)</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-orange-700">7</p>
            <p className="text-xs text-orange-600 mt-0.5">À livrer</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-400 mb-2">Dernières commandes</p>
          <div className="divide-y divide-neutral-50 border border-neutral-100 rounded-xl overflow-hidden">
            {recent.map((o, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 bg-white">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-brand-50 text-[#0B5E46]">
                  {o.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 truncate">{o.name}</p>
                  <p className="text-xs text-neutral-400 truncate">{o.product}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-neutral-900">{o.amount} DT</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.cls}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

function OrdersMockup() {
  const orders = [
    { name: 'Fatima K.', product: 'iPhone 14 Pro', amount: 580, status: 'En cours', cls: 'bg-blue-100 text-blue-700' },
    { name: 'Mehdi B.', product: 'Air Force 1 Blanc', amount: 185, status: 'Livré', cls: 'bg-green-100 text-green-700' },
    { name: 'Sara A.', product: 'MAC Lipstick Ruby', amount: 45, status: 'Confirmée', cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
    { name: 'Hamza T.', product: 'Nike Hoodie XL', amount: 120, status: 'Expédiée', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  ]
  return (
    <MockupShell url="hanut.tn/orders">
      <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100">
        <div>
          <p className="font-bold text-neutral-900 text-sm">Commandes</p>
          <p className="text-xs text-neutral-400">4 en attente</p>
        </div>
        <span className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-semibold">+ Nouvelle</span>
      </div>
      <div className="divide-y divide-neutral-50">
        {orders.map((o, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-brand-50 text-[#0B5E46]">
              {o.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">{o.name}</p>
              <p className="text-xs text-neutral-400 truncate">{o.product}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-neutral-900">{o.amount} DT</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.cls}`}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  )
}

function DeliveriesMockup() {
  return (
    <MockupShell url="hanut.tn/deliveries">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-green-700">3,240</p>
            <p className="text-xs text-green-600 mt-0.5">COD collecté</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-blue-700">12</p>
            <p className="text-xs text-blue-600 mt-0.5">Expédiées</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-neutral-700">98</p>
            <p className="text-xs text-neutral-500 mt-0.5">Frais (DT)</p>
          </div>
        </div>
        {[
          { carrier: 'IntiGo', code: 'TN-8821', status: 'Expédiée', cod: 580, active: true },
          { carrier: 'Navex', code: 'NX-4402', status: 'COD collecté', cod: 185, active: false },
        ].map((d, i) => (
          <div key={i} className="border border-neutral-100 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0B5E46] rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-neutral-900">{d.carrier}</p>
                <p className="text-xs text-neutral-400 font-mono">{d.code}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${
                d.active ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>{d.status}</span>
            </div>
            <p className="text-sm font-bold text-neutral-900 shrink-0">{d.cod} DT</p>
          </div>
        ))}
      </div>
    </MockupShell>
  )
}

function AnalyticsMockup() {
  const bars = [42, 65, 38, 78, 55, 90, 48, 72, 85, 60, 95, 70]
  const max = Math.max(...bars)
  return (
    <MockupShell url="hanut.tn/analytics">
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-extrabold text-neutral-900">12,450</p>
            <p className="text-xs text-neutral-400 mt-0.5">CA ce mois (DT)</p>
            <span className="text-xs text-green-600 font-semibold mt-1 block">+23% vs dernier mois</span>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-neutral-900">87%</p>
            <p className="text-xs text-neutral-400 mt-0.5">Taux livraison</p>
            <span className="text-xs text-green-600 font-semibold mt-1 block">+5pts</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-400 mb-2">Commandes / jour</p>
          <div className="flex items-end gap-1 h-16">
            {bars.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${(v / max) * 100}%`,
                  background: v === max ? '#16A34A' : '#DCFCE7', // fausses données de graphique, hors périmètre tokens UI
                }}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-neutral-50 pt-3">
          <p className="text-xs font-semibold text-neutral-400 mb-2">Top produit</p>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutral-900">iPhone 14 Pro</p>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-1">
                <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>
            <p className="text-xs font-bold text-neutral-900 shrink-0">3,480 DT</p>
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Hanut — Gérez vos commandes WhatsApp et Instagram',
  description: "L'outil de gestion pour vendeurs tunisiens. Commandes, stock, livraisons COD et clients — tout dans un seul tableau de bord. Sans site e-commerce.",
  keywords: 'gestion commandes tunisie, whatsapp vendeur, COD tunisie, livraison tunisie, intigo navex',
  openGraph: {
    title: 'Hanut — Gérez vos commandes WhatsApp et Instagram',
    description: "L'outil fait pour les vendeurs tunisiens qui vendent via WhatsApp et Instagram.",
    url: 'https://hanut.tn',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
    images: [{ url: 'https://hanut.tn/og-image.png', width: 1200, height: 628, alt: 'Hanut — Gérez vos commandes WhatsApp et Instagram' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hanut — Gérez vos commandes WhatsApp et Instagram',
    description: "L'outil fait pour les vendeurs tunisiens qui vendent via WhatsApp et Instagram.",
    images: ['https://hanut.tn/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <MarketingNavbar />
      <main>
        <Hero />
        <CarrierBand />
        <FeaturesSection />
        <HowItWorks />
        <EarlyAdoptersSection />
        <PricingSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-24 px-4 sm:px-6">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-50 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-10 -left-20 w-64 h-64 bg-brand-100 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-16">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-[#0B5E46] text-sm font-semibold px-4 py-1.5 rounded-full mb-8 border border-brand-100">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Lancement en Tunisie
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1C1917] leading-[1.08] tracking-tight mb-6">
            Gérez vos commandes
            <br />
            <span className="text-brand-600">WhatsApp et Instagram</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            Saisissez une commande en 30 secondes. Stock et livraisons COD restent synchronisés dans un seul tableau de bord.
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-5">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-500/40 active:scale-[0.97]"
            >
              Essayer Pro 14 jours
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 text-base font-semibold transition-colors"
            >
              Voir les fonctionnalités
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <p className="text-sm text-neutral-600 mt-6">
            Plan Pro gratuit 14 jours · Aucune carte bancaire · Annulation libre
          </p>
        </div>

        <div className="relative w-full max-w-md mx-auto lg:max-w-none">
          <div
            className="absolute -inset-3 sm:-inset-6 bg-brand-50/60 rounded-3xl -rotate-2 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Carrier Band ─────────────────────────────────────────────────────────────

function CarrierBand() {
  return (
    <div className="border-y border-neutral-100 bg-white py-5 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest shrink-0">
          Transporteurs pris en charge
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {CARRIERS.map(c => (
            <span key={c} className="px-4 py-1.5 bg-[#F5F5F4] border border-neutral-200 rounded-full text-sm font-semibold text-neutral-600">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      tag: 'Commandes',
      headline: 'Toutes vos commandes WhatsApp en un seul endroit',
      body: "Saisissez une commande en 30 secondes. Suivez chaque statut — confirmé, en cours, livré — en temps réel. Fini les carnets et les commandes oubliées.",
      mockup: <OrdersMockup />,
    },
    {
      tag: 'Livraisons',
      headline: 'Gérez vos livraisons COD avec IntiGo, Navex et plus',
      body: "Sélectionnez votre transporteur, ajoutez le lien de suivi et gérez tout votre COD depuis Hanut. Intégration API en cours — création de colis et statut automatique directement depuis Hanut.",
      mockup: <DeliveriesMockup />,
    },
    {
      tag: 'Analytics',
      headline: 'Suivez votre CA, vos COD et vos meilleurs produits',
      body: 'Visualisez vos revenus par jour, semaine ou mois. Identifiez vos produits stars, vos villes les plus actives et votre taux de livraison réussie.',
      mockup: <AnalyticsMockup />,
    },
  ]

  return (
    <section id="features" className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Fonctionnalités</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight">
            Votre plateforme tout-en-un
          </h2>
          <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
            Un seul outil pour gérer vos commandes, votre stock et vos livraisons de A à Z.
          </p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {features.map((f, i) => (
            <div
              key={i}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-widest mb-5">
                  {f.tag}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] leading-tight mb-4">
                  {f.headline}
                </h3>
                <p className="text-base text-neutral-500 leading-relaxed mb-6">{f.body}</p>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 text-brand-600 font-semibold text-sm hover:underline"
                >
                  En savoir plus
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
              <div className="flex-1 w-full max-w-md lg:max-w-none">{f.mockup}</div>
            </div>
          ))}
        </div>

        <SecondaryFeaturesGrid />
      </div>
    </section>
  )
}

const SECONDARY_FEATURES = [
  {
    icon: Package,
    title: 'Stock en temps réel',
    desc: 'Chaque commande met le stock à jour. Alerte en cas de rupture.',
  },
  {
    icon: Users,
    title: 'Fiches clients',
    desc: 'Historique, tags et notes sur chacun de vos clients.',
  },
  {
    icon: Link2,
    title: 'Lien de commande public',
    desc: 'Vos clients commandent seuls via votre lien hanut.tn.',
  },
  {
    icon: MapPin,
    title: 'Suivi client',
    desc: 'Une page de suivi dédiée pour chaque commande expédiée.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Export CSV',
    desc: 'Exportez commandes et analytics en un clic.',
  },
  {
    icon: Smartphone,
    title: 'Pensé pour le mobile',
    desc: 'Gérez tout depuis votre téléphone, où que vous soyez.',
  },
]

function SecondaryFeaturesGrid() {
  return (
    <div className="mt-24 sm:mt-32">
      <div className="text-center mb-12">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
          Et tout ce qu&apos;il faut autour
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {SECONDARY_FEATURES.map(f => (
          <div key={f.title} className="bg-neutral-50 rounded-2xl p-6">
            <div className="inline-flex items-center justify-center bg-brand-50 rounded-lg p-2 mb-4">
              <f.icon className="w-6 h-6 text-brand-600" aria-hidden="true" />
            </div>
            <p className="font-bold text-[#1C1917] mb-1.5">{f.title}</p>
            <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-[#F5F5F4]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Comment ça marche</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            De la commande au COD en 3 étapes
          </h2>
          <p className="mt-4 text-lg text-neutral-500">Simple, rapide, centralisé.</p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-md border border-neutral-100 flex items-center justify-center">
                    <s.icon className="w-9 h-9 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#1C1917] mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Early Adopters ───────────────────────────────────────────────────────────

const EARLY_BENEFITS = [
  {
    icon: Inbox,
    title: 'Fini les commandes perdues dans les DMs',
    desc: 'Chaque commande est enregistrée, suivie et retrouvable en 2 secondes.',
  },
  {
    icon: PackageCheck,
    title: 'Stock toujours à jour',
    desc: 'Plus de vente sans stock : chaque commande met le stock à jour automatiquement.',
  },
  {
    icon: Banknote,
    title: 'COD suivi automatiquement',
    desc: 'Vous savez exactement combien chaque livreur vous doit, en permanence.',
  },
]

function EarlyAdoptersSection() {
  return (
    <section id="about" className="py-24 sm:py-32 px-4 sm:px-6 bg-[#FAFAF9]">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Communauté</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight mb-4">
          Rejoignez les premiers vendeurs tunisiens
        </h2>
        <p className="text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed">
          Hanut est en lancement actif en Tunisie. Gérez vos commandes plus vite,
          sans changer votre façon de vendre.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-14 text-left">
          {EARLY_BENEFITS.map(b => (
            <div key={b.title} className="bg-neutral-50 rounded-2xl p-6">
              <div className="inline-flex items-center justify-center bg-brand-50 rounded-lg p-2 mb-4">
                <b.icon className="w-6 h-6 text-brand-600" aria-hidden="true" />
              </div>
              <p className="font-bold text-[#1C1917] mb-1.5 leading-snug">{b.title}</p>
              <p className="text-sm text-neutral-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        <Link
          href="/register"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 text-white text-base font-semibold px-8 py-4 rounded-lg transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-600/40 active:scale-[0.97]"
        >
          Essayer Pro 14 jours
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </section>
  )
}

// ─── CTA Section ─────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-[#0B5E46]">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          Prêt à gérer votre business comme un pro ?
        </h2>
        <p className="text-brand-200 text-lg mb-10 leading-relaxed">
          Essayez Hanut gratuitement dès aujourd&apos;hui.
        </p>
        <Link
          href="/register"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0B5E46] text-lg font-bold px-8 py-4 rounded-lg transition-all duration-150 ease-out hover:bg-brand-50 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-white/40 active:scale-[0.97]"
        >
          Essayer Pro 14 jours
        </Link>
        <p className="text-sm text-brand-200/80 mt-6">
          Plan Pro gratuit 14 jours · Aucune carte bancaire ·{' '}
          <a
            href={`${HANUT_CONTACT.whatsappUrl}?text=${encodeURIComponent('Bonjour Hanut, je voudrais une démonstration.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white transition-colors"
          >
            Demander une démo WhatsApp
          </a>
        </p>
      </div>
    </section>
  )
}
