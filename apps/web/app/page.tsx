import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingNavbar from '@/components/marketing/Navbar'
import MarketingFooter from '@/components/marketing/Footer'
import PricingToggle from '@/components/marketing/PricingToggle'

// ─── Data ─────────────────────────────────────────────────────────────────────

const CARRIERS = ['IntiGo', 'Navex', 'Adex', 'Aramex', 'Best Delivery']

const STEPS = [
  {
    emoji: '💬',
    num: '01',
    title: 'Tu reçois le DM WhatsApp',
    desc: 'Un client commande via Instagram ou WhatsApp. Tu récupères son numéro et sa demande.',
  },
  {
    emoji: '⚡',
    num: '02',
    title: 'Tu saisis la commande en 30 sec',
    desc: "Entre le téléphone — Hanut retrouve le client. Sélectionne le produit, confirme. C'est tout.",
  },
  {
    emoji: '✅',
    num: '03',
    title: 'Le livreur part, le client est informé',
    desc: "L'expédition est créée chez ton transporteur. Le client reçoit un SMS avec son numéro de suivi.",
  },
]

const TESTIMONIALS = [
  {
    quote:
      "Avant je gérais tout sur WhatsApp et j'oubliais des commandes. Maintenant tout est centralisé et j'ai zéro perte.",
    name: 'Yasmine B.',
    role: 'Boutique mode — Tunis',
    avatar: 'YB',
  },
  {
    quote:
      'Le suivi automatique a réduit mes appels clients de 70 %. Mes clients savent où est leur colis sans m\'appeler.',
    name: 'Karim M.',
    role: 'Électronique — Sfax',
    avatar: 'KM',
  },
  {
    quote:
      "J'ai multiplié mes ventes par 2 en 3 mois, sans changer ma façon de vendre. Hanut gère tout l'admin à ma place.",
    name: 'Nour T.',
    role: 'Beauté & Cosmétiques — Sousse',
    avatar: 'NT',
  },
]

// ─── Mockups ──────────────────────────────────────────────────────────────────

function MockupShell({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-[#F5F5F4] px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <div className="w-3 h-3 bg-red-300 rounded-full" />
        <div className="w-3 h-3 bg-yellow-300 rounded-full" />
        <div className="w-3 h-3 bg-green-400 rounded-full" />
        <span className="ml-3 text-xs text-gray-400 font-mono">{url}</span>
      </div>
      {children}
    </div>
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
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="font-bold text-gray-900 text-sm">Commandes</p>
          <p className="text-xs text-gray-400">4 en attente</p>
        </div>
        <button className="text-xs bg-[#16A34A] text-white px-3 py-1.5 rounded-lg font-semibold">+ Nouvelle</button>
      </div>
      <div className="divide-y divide-gray-50">
        {orders.map((o, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-green-50 text-[#0B5E46]">
              {o.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{o.name}</p>
              <p className="text-xs text-gray-400 truncate">{o.product}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-gray-900">{o.amount} DT</p>
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
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-gray-700">98</p>
            <p className="text-xs text-gray-500 mt-0.5">Frais (DT)</p>
          </div>
        </div>
        {[
          { carrier: 'IntiGo', code: 'TN-8821', status: 'Expédiée', cod: 580, active: true },
          { carrier: 'Navex', code: 'NX-4402', status: 'COD collecté', cod: 185, active: false },
        ].map((d, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0B5E46] rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-900">{d.carrier}</p>
                <p className="text-xs text-gray-400 font-mono">{d.code}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${
                d.active ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>{d.status}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 shrink-0">{d.cod} DT</p>
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
            <p className="text-2xl font-extrabold text-gray-900">12,450</p>
            <p className="text-xs text-gray-400 mt-0.5">CA ce mois (DT)</p>
            <span className="text-xs text-green-600 font-semibold mt-1 block">+23% vs dernier mois</span>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">87%</p>
            <p className="text-xs text-gray-400 mt-0.5">Taux livraison</p>
            <span className="text-xs text-green-600 font-semibold mt-1 block">+5pts</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">Commandes / jour</p>
          <div className="flex items-end gap-1 h-16">
            {bars.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${(v / max) * 100}%`,
                  background: v === max ? '#16A34A' : '#DCFCE7',
                }}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-gray-50 pt-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Top produit</p>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#16A34A] rounded-full flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-900">iPhone 14 Pro</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                <div className="bg-[#16A34A] h-1.5 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>
            <p className="text-xs font-bold text-gray-900 shrink-0">3,480 DT</p>
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Hanut — Gérez vos commandes WhatsApp en 30 secondes',
  description: "L'outil de gestion pour vendeurs tunisiens. Commandes, stock, livraisons COD et clients — tout dans un seul tableau de bord. Sans site e-commerce.",
  keywords: 'gestion commandes tunisie, whatsapp vendeur, COD tunisie, livraison tunisie, intigo navex',
  openGraph: {
    title: 'Hanut — Gérez vos commandes WhatsApp en 30 secondes',
    description: "L'outil fait pour les vendeurs tunisiens qui vendent via WhatsApp et Instagram.",
    url: 'https://hanut.tn',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hanut — Gérez vos commandes WhatsApp en 30 secondes',
    description: "L'outil fait pour les vendeurs tunisiens qui vendent via WhatsApp et Instagram.",
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
        <DemoSection />
        <TestimonialsSection />
        <PricingToggle />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-10 sm:pt-28 sm:pb-16 px-4 sm:px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-50 rounded-full opacity-70 blur-3xl" />
        <div className="absolute top-10 -left-20 w-64 h-64 bg-green-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-[#0B5E46] text-sm font-semibold px-4 py-1.5 rounded-full mb-8 border border-green-100">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Conçu pour les vendeurs tunisiens
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-[#1C1917] leading-[1.1] tracking-tight mb-6">
          Gérez toutes vos commandes
          <br />
          <span className="text-[#16A34A]">WhatsApp en 30 secondes</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          L&apos;outil fait pour les vendeurs tunisiens. Commandes, stock, livraisons COD
          {' '}— tout dans un seul tableau de bord.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white text-base font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-green-200"
          >
            Essai gratuit — Sans carte bancaire
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center text-[#1C1917] border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-base font-medium px-8 py-3.5 rounded-xl transition-colors"
          >
            Voir une démo
          </a>
        </div>

        <div className="flex items-center justify-center gap-5 mt-8 flex-wrap">
          {['Sans carte bancaire', 'Annulable à tout moment', 'Support en français'].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 text-sm text-gray-400">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#4ADE80" strokeWidth="1.5"/>
                <path d="M4.5 7L6.5 9L9.5 5" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Carrier Band ─────────────────────────────────────────────────────────────

function CarrierBand() {
  return (
    <div className="border-y border-gray-100 bg-white py-5 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest shrink-0">
          Intégré avec
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {CARRIERS.map(c => (
            <span key={c} className="px-4 py-1.5 bg-[#F5F5F4] border border-gray-200 rounded-full text-sm font-semibold text-gray-600">
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
      headline: 'Créez une expédition en 1 clic chez IntiGo, Navex et plus',
      body: "Sélectionnez votre transporteur, renseignez l'adresse et Hanut crée l'expédition automatiquement. Le client reçoit son numéro de suivi par SMS.",
      mockup: <DeliveriesMockup />,
    },
    {
      tag: 'Analytiques',
      headline: 'Suivez votre CA, vos COD et vos meilleurs produits',
      body: 'Visualisez vos revenus par jour, semaine ou mois. Identifiez vos produits stars, vos villes les plus actives et votre taux de livraison réussie.',
      mockup: <AnalyticsMockup />,
    },
  ]

  return (
    <section id="features" className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-3">Fonctionnalités</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight">
            Votre plateforme tout-en-un
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
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
                <span className="inline-block text-xs font-bold text-[#16A34A] bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest mb-5">
                  {f.tag}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] leading-tight mb-4">
                  {f.headline}
                </h3>
                <p className="text-base text-gray-500 leading-relaxed mb-6">{f.body}</p>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 text-[#16A34A] font-semibold text-sm hover:underline"
                >
                  En savoir plus
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
              <div className="flex-1 w-full max-w-md lg:max-w-none">{f.mockup}</div>
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
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-[#F5F5F4]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-3">Comment ça marche</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            De la commande au COD en 3 étapes
          </h2>
          <p className="mt-4 text-lg text-gray-500">Simple, rapide, automatisé.</p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-green-200 via-green-300 to-green-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-center">
                    <span className="text-3xl">{s.emoji}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#16A34A] rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#1C1917] mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Demo Section ─────────────────────────────────────────────────────────────

function DemoSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-3">Démo</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Voyez Hanut en action
          </h2>
          <p className="mt-4 text-lg text-gray-500">30 secondes pour créer une commande, de A à Z</p>
        </div>
        <div className="relative aspect-video bg-[#0B5E46] rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M11 8L25 16L11 24V8Z" fill="white" />
            </svg>
          </div>
          <p className="text-white/70 text-sm font-medium">Vidéo démo disponible bientôt</p>
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
  return (
    <section id="about" className="py-24 sm:py-32 px-4 sm:px-6 bg-[#FAFAF9]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-3">Témoignages</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">Ils utilisent Hanut</h2>
          <p className="mt-4 text-lg text-gray-500">Des vendeurs tunisiens qui ont changé leur façon de gérer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} width="16" height="16" viewBox="0 0 16 16" fill="#16A34A">
                    <path d="M8 1L10 6H15L11 9L12.5 14L8 11L3.5 14L5 9L1 6H6L8 1Z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[#0B5E46] text-xs font-bold">{t.avatar}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1C1917] text-sm">{t.name}</p>
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

// ─── CTA Section ─────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#0B5E46]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          Prêt à gérer votre business
          <br />
          comme un pro ?
        </h2>
        <p className="text-green-200 text-lg mb-10">
          Rejoignez des centaines de vendeurs tunisiens qui ont simplifié leur gestion.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0B5E46] hover:bg-green-50 text-base font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center text-green-100 border border-green-600 hover:border-green-400 hover:text-white text-base font-medium px-8 py-3.5 rounded-xl transition-colors"
          >
            Demander une démo
          </Link>
        </div>
      </div>
    </section>
  )
}
