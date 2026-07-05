import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Package, Users, Link2, MapPin,
  Truck, Inbox, PackageCheck, Banknote, ShoppingBag, ShoppingCart,
  TrendingUp, PackagePlus, Bell, MessageCircle, Check, Plus,
} from 'lucide-react'
import MarketingNavbar from '@/components/marketing/Navbar'
import MarketingFooter from '@/components/marketing/Footer'
import PricingSection from '@/components/marketing/PricingSection'
import { HANUT_CONTACT } from '@/lib/constants'

// ─── Data ─────────────────────────────────────────────────────────────────────

const CARRIERS = ['IntiGo', 'Navex', 'Adex', 'Aramex', 'Best Delivery']

const DEMO_PRODUCTS = [
  { name: 'Robe été', price: 85, bg: 'bg-rose-50', icon: 'text-rose-300' },
  { name: 'Hijab satin', price: 35, bg: 'bg-brand-50', icon: 'text-brand-300' },
  { name: 'Sac cuir', price: 120, bg: 'bg-amber-50', icon: 'text-amber-300' },
  { name: 'Sneakers', price: 75, bg: 'bg-blue-50', icon: 'text-blue-300' },
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

/** Cadre téléphone épuré pour les mockups mobiles. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-[260px] sm:w-[290px] rounded-[2.2rem] bg-neutral-900 p-[6px] shadow-2xl"
      aria-hidden="true"
    >
      <div className="rounded-[1.85rem] overflow-hidden bg-white">
        <div className="flex justify-center pt-2 pb-1 bg-white">
          <div className="w-14 h-1.5 bg-neutral-200 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  )
}

function MiniProductCard({ product, compact }: { product: (typeof DEMO_PRODUCTS)[number]; compact?: boolean }) {
  return (
    <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
      <div className={`${product.bg} ${compact ? 'h-14' : 'h-20'} flex items-center justify-center`}>
        <ShoppingBag className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} ${product.icon}`} />
      </div>
      <div className={compact ? 'p-1.5' : 'p-2'}>
        <p className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-semibold text-neutral-900 truncate`}>{product.name}</p>
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-brand-600`}>{product.price} DT</p>
        {!compact && (
          <div className="mt-1.5 bg-brand-600 text-white rounded-md py-1 flex items-center justify-center gap-1 text-[10px] font-semibold">
            <Plus className="w-2.5 h-2.5" />
            Ajouter
          </div>
        )}
      </div>
    </div>
  )
}

function StorefrontCartBar({ compact }: { compact?: boolean }) {
  return (
    <div className={`bg-[#0B5E46] text-white flex items-center justify-between ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'}`}>
      <span className={`flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-[11px]'} font-semibold`}>
        <span className="relative">
          <ShoppingCart className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span className={`absolute -top-1.5 -right-1.5 bg-white text-[#0B5E46] rounded-full font-bold flex items-center justify-center ${compact ? 'w-2.5 h-2.5 text-[6px]' : 'w-3 h-3 text-[7px]'}`}>
            2
          </span>
        </span>
        2 articles · 120 DT
      </span>
      <span className={`bg-white text-[#0B5E46] rounded-md font-bold ${compact ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'}`}>
        Commander →
      </span>
    </div>
  )
}

function StorefrontHeader({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-neutral-100 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'}`}>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`bg-[#0B5E46] text-white rounded-full font-bold flex items-center justify-center shrink-0 ${compact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]'}`}>
          S
        </span>
        <span className={`font-bold text-neutral-900 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>Boutique Sarra</span>
      </span>
      <span className="relative shrink-0">
        <ShoppingCart className={`text-neutral-500 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
        <span className={`absolute -top-1.5 -right-1.5 bg-brand-600 text-white rounded-full font-bold flex items-center justify-center ${compact ? 'w-2.5 h-2.5 text-[6px]' : 'w-3 h-3 text-[7px]'}`}>
          2
        </span>
      </span>
    </div>
  )
}

/** Mockup compact pour la hero : boutique dans un téléphone. */
function HeroStorefrontMockup() {
  return (
    <PhoneFrame>
      <StorefrontHeader compact />
      <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#FAFAF9]">
        {DEMO_PRODUCTS.map(p => (
          <MiniProductCard key={p.name} product={p} compact />
        ))}
      </div>
      <StorefrontCartBar compact />
    </PhoneFrame>
  )
}

/** Mockup détaillé pour la section mini boutique. */
function DetailedStorefrontMockup() {
  return (
    <PhoneFrame>
      <StorefrontHeader />
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#FAFAF9]">
        {DEMO_PRODUCTS.map(p => (
          <MiniProductCard key={p.name} product={p} />
        ))}
      </div>
      <StorefrontCartBar />
    </PhoneFrame>
  )
}

/** Mockup page de suivi : timeline + articles. */
function TrackingMockup() {
  const steps = [
    { label: 'Commande confirmée', time: 'Aujourd’hui, 14:02', state: 'done' as const },
    { label: 'En cours de livraison', time: 'IntiGo · TN-8821', state: 'current' as const },
    { label: 'Livrée', time: '', state: 'pending' as const },
  ]
  return (
    <PhoneFrame>
      <div className="px-3 py-2.5 border-b border-neutral-100">
        <p className="text-[10px] text-neutral-400">Suivi de commande</p>
        <p className="text-xs font-bold text-neutral-900 font-mono">#247A31B8</p>
      </div>
      <div className="p-3 space-y-0">
        {steps.map((s, i) => (
          <div key={s.label} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              {s.state === 'done' ? (
                <span className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              ) : s.state === 'current' ? (
                <span className="w-4 h-4 rounded-full border-2 border-brand-600 bg-brand-50 shrink-0 animate-pulse" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-neutral-200 shrink-0" />
              )}
              {i < steps.length - 1 && (
                <span className={`w-0.5 h-6 my-0.5 ${s.state === 'done' ? 'bg-brand-300' : 'bg-neutral-200'}`} />
              )}
            </div>
            <div className="pb-2">
              <p className={`text-[11px] leading-4 ${
                s.state === 'current' ? 'font-bold text-[#0B5E46]'
                : s.state === 'done' ? 'font-semibold text-neutral-900'
                : 'text-neutral-400'
              }`}>
                {s.label}
              </p>
              {s.time && <p className="text-[9px] text-neutral-400 mt-0.5">{s.time}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-100 p-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-neutral-500">Robe été × 1</span>
          <span className="font-semibold text-neutral-900">85 DT</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-neutral-500">Hijab satin × 1</span>
          <span className="font-semibold text-neutral-900">35 DT</span>
        </div>
        <div className="flex justify-between text-[11px] pt-1 border-t border-neutral-100">
          <span className="font-semibold text-neutral-900">Total</span>
          <span className="font-bold text-[#0B5E46]">120 DT</span>
        </div>
      </div>
    </PhoneFrame>
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
              <Truck className="w-4 h-4 text-white" />
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
  title: 'Hanut — Vendez sur WhatsApp et Instagram avec votre mini boutique',
  description: 'Créez votre boutique en ligne en 5 minutes. Partagez un lien, vos clients commandent directement. Gestion des commandes, stock et livraisons COD en Tunisie.',
  keywords: 'vente whatsapp tunisie, boutique instagram tunisie, gestion commandes COD, mini boutique en ligne, hanut',
  openGraph: {
    title: 'Hanut — Vendez sur WhatsApp et Instagram avec votre mini boutique',
    description: 'Partagez un lien, vos clients commandent directement. Commandes, stock et livraisons COD dans un seul tableau de bord.',
    url: 'https://www.hanut.tn',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
    images: [{ url: 'https://www.hanut.tn/og-image.png', width: 1200, height: 628, alt: 'Hanut — Votre mini boutique WhatsApp et Instagram' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hanut — Vendez sur WhatsApp et Instagram avec votre mini boutique',
    description: 'Partagez un lien, vos clients commandent directement. Commandes, stock et livraisons COD dans un seul tableau de bord.',
    images: ['https://www.hanut.tn/og-image.png'],
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
        <StorefrontSection />
        <TrackingSection />
        <FeaturesSection />
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

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 items-center gap-12 lg:gap-16">
        <div className="text-center lg:text-left lg:col-span-3">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-[#0B5E46] text-sm font-semibold px-4 py-1.5 rounded-full mb-8 border border-brand-100">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Lancement en Tunisie
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1C1917] leading-[1.08] tracking-tight mb-6">
            Vos clients commandent
            <br />
            <span className="text-brand-600">directement depuis WhatsApp</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            Partagez un lien. Vos clients choisissent leurs produits, confirment leur
            adresse et passent commande en 2 minutes. Vous gérez tout depuis un seul
            tableau de bord.
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-5">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-500/40 active:scale-[0.97]"
            >
              Créer ma boutique gratuitement
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 text-base font-semibold transition-colors"
            >
              Voir comment ça marche
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <p className="text-sm text-neutral-600 mt-6">
            Essai Pro 14 jours · Aucune carte bancaire
          </p>
        </div>

        <div className="relative lg:col-span-2">
          <div
            className="absolute inset-x-8 top-8 bottom-0 bg-brand-50/60 rounded-3xl -rotate-2 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative">
            <HeroStorefrontMockup />
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

// ─── Mini boutique ────────────────────────────────────────────────────────────

const STOREFRONT_STEPS = [
  {
    icon: PackagePlus,
    title: 'Créez vos produits sur Hanut',
    desc: 'Ajoutez photos, prix, variantes et stock en quelques clics.',
  },
  {
    icon: Link2,
    title: 'Partagez le lien dans votre bio',
    desc: 'hanut.tn/s/votre-boutique — un seul lien pour tout votre catalogue.',
  },
  {
    icon: Inbox,
    title: 'Les commandes arrivent automatiquement',
    desc: 'Chaque commande apparaît dans votre dashboard avec les infos client.',
  },
]

function StorefrontSection() {
  return (
    <section id="how" className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Mini boutique</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight">
            Votre boutique en ligne en 30 secondes
          </h2>
          <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
            Pas de site web à créer. Un lien à partager. Vos clients commandent directement.
          </p>
        </div>

        {/* Flux 3 étapes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 mb-20">
          {STOREFRONT_STEPS.map((s, i) => (
            <div key={i} className="relative flex flex-col items-center text-center px-4">
              <span
                className="absolute -top-8 text-[7rem] leading-none font-extrabold text-brand-50 select-none pointer-events-none"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="relative w-16 h-16 bg-white rounded-2xl shadow-md border border-neutral-100 flex items-center justify-center mb-5">
                <s.icon className="w-7 h-7 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="relative text-base font-bold text-[#1C1917] mb-2">{s.title}</h3>
              <p className="relative text-sm text-neutral-500 leading-relaxed max-w-[260px]">{s.desc}</p>
              {i < STOREFRONT_STEPS.length - 1 && (
                <svg
                  className="hidden md:block absolute top-6 -right-4 text-brand-200"
                  width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                >
                  <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Mockup boutique détaillé */}
        <div className="relative max-w-md mx-auto">
          <div
            className="absolute -inset-x-10 inset-y-6 bg-brand-50/60 rounded-3xl rotate-2 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative">
            <DetailedStorefrontMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Suivi de commande ────────────────────────────────────────────────────────

const TRACKING_BENEFITS = [
  {
    icon: Bell,
    title: 'Notification automatique',
    desc: 'Le client reçoit son lien de suivi dès que la commande est confirmée.',
  },
  {
    icon: MapPin,
    title: 'Statut en temps réel',
    desc: 'Confirmée, en livraison, livrée — toujours à jour, sans rien faire.',
  },
  {
    icon: MessageCircle,
    title: 'Moins de messages',
    desc: 'Fini les DMs « c’est où ma commande ? » qui vous font perdre du temps.',
  },
]

function TrackingSection() {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-[#F5F5F4]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 mb-16">
          <div className="flex-1 text-center lg:text-left">
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Suivi client</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight mb-4">
              Vos clients suivent leur commande en temps réel
            </h2>
            <p className="text-lg text-neutral-500 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Plus de messages « c&apos;est où ma commande ? ». Un lien de suivi envoyé
              automatiquement à chaque commande.
            </p>
          </div>
          <div className="flex-1 w-full">
            <TrackingMockup />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TRACKING_BENEFITS.map(b => (
            <div key={b.title} className="bg-white rounded-2xl p-6 border border-neutral-100">
              <div className="inline-flex items-center justify-center bg-brand-50 rounded-lg p-2 mb-4">
                <b.icon className="w-6 h-6 text-brand-600" aria-hidden="true" />
              </div>
              <p className="font-bold text-[#1C1917] mb-1.5">{b.title}</p>
              <p className="text-sm text-neutral-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      tag: 'Commandes',
      headline: 'Toutes vos commandes en un seul endroit',
      body: "Celles de votre boutique arrivent seules. Celles de WhatsApp se saisissent en 30 secondes. Suivez chaque statut — confirmé, en cours, livré — en temps réel.",
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
    icon: ShoppingBag,
    title: 'Mini boutique',
    desc: 'Un lien, un catalogue, vos clients commandent seuls.',
  },
  {
    icon: Inbox,
    title: 'Gestion des commandes',
    desc: 'Toutes vos commandes centralisées, quel que soit le canal.',
  },
  {
    icon: Package,
    title: 'Stock en temps réel',
    desc: 'Par produit et par variante, mis à jour automatiquement.',
  },
  {
    icon: Truck,
    title: 'Suivi de livraison',
    desc: 'Vos clients savent où est leur commande, sans vous écrire.',
  },
  {
    icon: Users,
    title: 'Gestion clients',
    desc: 'Historique complet de chaque client, tags et notes.',
  },
  {
    icon: TrendingUp,
    title: 'Analytics',
    desc: 'Vos meilleurs produits, votre chiffre d’affaires, vos villes actives.',
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
          Créer ma boutique gratuitement
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
          Votre boutique est prête en 5 minutes
        </h2>
        <p className="text-brand-200 text-lg mb-10 leading-relaxed">
          Créez votre compte, ajoutez vos produits, partagez votre lien.
          Vos premiers clients peuvent commander aujourd&apos;hui.
        </p>
        <Link
          href="/register"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0B5E46] text-lg font-bold px-8 py-4 rounded-lg transition-all duration-150 ease-out hover:bg-brand-50 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-white/40 active:scale-[0.97]"
        >
          Créer ma boutique gratuitement →
        </Link>
        <p className="text-sm text-brand-200/80 mt-6">
          Essai Pro 14 jours · Aucune carte bancaire · Annulation libre ·{' '}
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
