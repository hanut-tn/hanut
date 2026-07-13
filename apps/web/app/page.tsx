import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Palette, MapPin,
  Truck, Inbox, PackageCheck, Banknote, ShoppingBag, ShoppingCart,
  Check,
  ArrowRight,
} from 'lucide-react'
import MarketingNavbar from '@/components/marketing/Navbar'
import MarketingFooter from '@/components/marketing/Footer'
import PricingSection from '@/components/marketing/PricingSection'
import StickyPhoneShowcase from '@/components/marketing/StickyPhoneShowcase'
import TemplatePreview from '@/components/boutique/steps/TemplatePreview'
import { STOREFRONT_TEMPLATES, type StorefrontTemplate } from '@hanut/types'
import { HANUT_CONTACT } from '@/lib/constants'

// ─── Data ─────────────────────────────────────────────────────────────────────

const CARRIERS = ['IntiGo', 'Navex', 'Adex', 'Aramex', 'Best Delivery']

/** Mockup hero : mini boutique dans un iPhone 15 Pro. */
function HeroStorefrontMockup() {
  return (
    <div
      className="relative mx-auto w-[15.5rem] max-w-full rotate-2 rounded-[3rem] shadow-[0_28px_56px_rgba(0,0,0,0.20)] sm:w-[19rem] sm:rotate-3 lg:w-[21rem]"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 390 760"
        className="block h-auto w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          .hero-catalog {
            animation: heroCatalog 7.2s ease-in-out infinite;
          }
          .hero-added-button {
            opacity: 0;
            animation: heroAddedButton 7.2s ease-in-out infinite;
          }
          .hero-tap-product,
          .hero-tap-cart {
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
          }
          .hero-tap-product {
            animation: heroTapProduct 7.2s ease-out infinite;
          }
          .hero-tap-cart {
            animation: heroTapCart 7.2s ease-out infinite;
          }
          .hero-order-sheet {
            opacity: 0;
            transform: translateY(54px);
            animation: heroOrderSheet 7.2s ease-in-out infinite;
          }
          .hero-tracking-page {
            opacity: 0;
            transform: translateX(28px);
            animation: heroTrackingPage 7.2s ease-in-out infinite;
          }
          .hero-tracking-pulse {
            animation: heroTrackingPulse 7.2s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }
          @keyframes heroCatalog {
            0%, 56% { opacity: 1; }
            64%, 88% { opacity: 0; }
            96%, 100% { opacity: 1; }
          }
          @keyframes heroAddedButton {
            0%, 12% { opacity: 0; }
            17%, 55% { opacity: 1; }
            62%, 100% { opacity: 0; }
          }
          @keyframes heroTapProduct {
            0%, 8% { opacity: 0; transform: scale(0.55); }
            11% { opacity: 0.24; transform: scale(0.85); }
            15% { opacity: 0.16; transform: scale(1.45); }
            20%, 100% { opacity: 0; transform: scale(1.8); }
          }
          @keyframes heroTapCart {
            0%, 31% { opacity: 0; transform: scale(0.55); }
            35% { opacity: 0.24; transform: scale(0.85); }
            40% { opacity: 0.16; transform: scale(1.55); }
            46%, 100% { opacity: 0; transform: scale(1.9); }
          }
          @keyframes heroOrderSheet {
            0%, 30% { opacity: 0; transform: translateY(54px); }
            39%, 53% { opacity: 1; transform: translateY(0); }
            61%, 100% { opacity: 0; transform: translateY(-16px); }
          }
          @keyframes heroTrackingPage {
            0%, 58% { opacity: 0; transform: translateX(28px); }
            67%, 88% { opacity: 1; transform: translateX(0); }
            96%, 100% { opacity: 0; transform: translateX(-12px); }
          }
          @keyframes heroTrackingPulse {
            0%, 64% { transform: scale(1); opacity: 1; }
            72% { transform: scale(1.18); opacity: 0.72; }
            80%, 100% { transform: scale(1); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-catalog,
            .hero-added-button,
            .hero-tap-product,
            .hero-tap-cart,
            .hero-order-sheet,
            .hero-tracking-page,
            .hero-tracking-pulse {
              animation: none;
            }
            .hero-added-button,
            .hero-tap-product,
            .hero-tap-cart,
            .hero-order-sheet,
            .hero-tracking-page {
              opacity: 0;
            }
          }
        `}</style>
        <rect x="27" y="18" width="336" height="724" rx="54" fill="#4A4A4A" />
        <rect x="36" y="27" width="318" height="706" rx="48" fill="#111827" />
        <rect x="43" y="35" width="304" height="690" rx="42" fill="#FFFFFF" />

        <rect x="20" y="160" width="8" height="66" rx="4" fill="#3F3F46" />
        <rect x="20" y="244" width="8" height="92" rx="4" fill="#3F3F46" />
        <rect x="362" y="222" width="8" height="112" rx="4" fill="#3F3F46" />
        <rect x="147" y="52" width="96" height="24" rx="12" fill="#050505" />

        <g className="hero-catalog">
          <rect x="57" y="94" width="276" height="56" rx="22" fill="#F0FDF4" />
          <circle cx="85" cy="122" r="18" fill="#16A34A" />
          <text x="85" y="128" textAnchor="middle" fontSize="18" fontWeight="800" fill="#FFFFFF">S</text>
          <text x="112" y="117" fontSize="16" fontWeight="800" fill="#1C1917">Boutique Sarra</text>
          <text x="112" y="136" fontSize="11" fontWeight="500" fill="#78716C">Mode estivale & accessoires</text>
          <g>
            <path d="M295 117H312L309 135H298L295 117Z" fill="#16A34A" />
            <path d="M300 117C300 111.5 307 111.5 307 117" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
            <circle cx="315" cy="113" r="10" fill="#16A34A" />
            <text x="315" y="117" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFFFFF">2</text>
          </g>

          <rect x="59" y="172" width="126" height="196" rx="18" fill="#FFFFFF" stroke="#E7E5E4" />
          <rect x="72" y="186" width="100" height="88" rx="15" fill="#FFE4E6" />
          <circle cx="112" cy="228" r="24" fill="#FDA4AF" opacity="0.85" />
          <path d="M124 207C142 222 143 248 124 259C107 248 105 222 124 207Z" fill="#FB7185" />
          <text x="73" y="303" fontSize="15" fontWeight="800" fill="#1C1917">Robe été</text>
          <text x="73" y="327" fontSize="17" fontWeight="900" fill="#16A34A">85 DT</text>
          <rect x="73" y="339" width="99" height="17" rx="8.5" fill="#F0FDF4" />
          <text x="122.5" y="351.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#15803D">Ajouter</text>
          <rect className="hero-added-button" x="73" y="339" width="99" height="17" rx="8.5" fill="#16A34A" />
          <text className="hero-added-button" x="122.5" y="351.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFFFFF">Ajouté</text>

          <rect x="205" y="172" width="126" height="196" rx="18" fill="#FFFFFF" stroke="#E7E5E4" />
          <rect x="218" y="186" width="100" height="88" rx="15" fill="#DCFCE7" />
          <circle cx="268" cy="229" r="31" fill="#86EFAC" opacity="0.8" />
          <path d="M246 235C258 207 288 204 298 232C287 258 257 260 246 235Z" fill="#22C55E" />
          <text x="219" y="303" fontSize="15" fontWeight="800" fill="#1C1917">Hijab satin</text>
          <text x="219" y="327" fontSize="17" fontWeight="900" fill="#16A34A">35 DT</text>
          <rect x="219" y="339" width="99" height="17" rx="8.5" fill="#F0FDF4" />
          <text x="268.5" y="351.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#15803D">Ajouter</text>

          <rect x="59" y="389" width="126" height="196" rx="18" fill="#FFFFFF" stroke="#E7E5E4" />
          <rect x="72" y="403" width="100" height="88" rx="15" fill="#FEF3C7" />
          <rect x="96" y="431" width="52" height="38" rx="12" fill="#F59E0B" />
          <path d="M105 431C106 417 139 417 140 431" stroke="#D97706" strokeWidth="6" strokeLinecap="round" />
          <text x="73" y="520" fontSize="15" fontWeight="800" fill="#1C1917">Sac cuir</text>
          <text x="73" y="544" fontSize="17" fontWeight="900" fill="#16A34A">120 DT</text>
          <rect x="73" y="556" width="99" height="17" rx="8.5" fill="#F0FDF4" />
          <text x="122.5" y="568.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#15803D">Ajouter</text>

          <rect x="205" y="389" width="126" height="196" rx="18" fill="#FFFFFF" stroke="#E7E5E4" />
          <rect x="218" y="403" width="100" height="88" rx="15" fill="#DBEAFE" />
          <path d="M239 455C259 437 289 437 306 458C287 471 254 472 239 455Z" fill="#60A5FA" />
          <path d="M242 457H308" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <text x="219" y="520" fontSize="15" fontWeight="800" fill="#1C1917">Sneakers</text>
          <text x="219" y="544" fontSize="17" fontWeight="900" fill="#16A34A">75 DT</text>
          <rect x="219" y="556" width="99" height="17" rx="8.5" fill="#F0FDF4" />
          <text x="268.5" y="568.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#15803D">Ajouter</text>

          <rect x="57" y="627" width="276" height="68" rx="24" fill="#16A34A" />
          <text x="83" y="667" fontSize="17" fontWeight="800" fill="#FFFFFF">2 articles · 120 DT</text>
          <circle cx="303" cy="661" r="18" fill="#FFFFFF" />
          <path d="M295 661H310M310 661L304 655M310 661L304 667" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          <circle className="hero-tap-product" cx="122" cy="348" r="24" fill="#16A34A" />
          <circle className="hero-tap-product" cx="122" cy="348" r="24" fill="none" stroke="#16A34A" strokeWidth="3" />
          <circle className="hero-tap-cart" cx="303" cy="661" r="26" fill="#FFFFFF" />
          <circle className="hero-tap-cart" cx="303" cy="661" r="26" fill="none" stroke="#FFFFFF" strokeWidth="3" />
        </g>

        <g className="hero-order-sheet">
          <rect x="57" y="475" width="276" height="144" rx="26" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2" />
          <circle cx="91" cy="511" r="18" fill="#16A34A" />
          <path d="M82 511L88 517L101 503" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="121" y="506" fontSize="16" fontWeight="900" fill="#1C1917">Commande confirmée</text>
          <text x="121" y="528" fontSize="11" fontWeight="600" fill="#78716C">Adresse et téléphone validés</text>
          <rect x="76" y="550" width="238" height="45" rx="15" fill="#16A34A" />
          <text x="112" y="578" fontSize="14" fontWeight="900" fill="#FFFFFF">Voir le suivi</text>
          <path d="M274 572H295M295 572L287 564M295 572L287 580" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g className="hero-tracking-page">
          <rect x="43" y="86" width="304" height="610" rx="34" fill="#FFFFFF" />
          <rect x="57" y="100" width="276" height="74" rx="24" fill="#F0FDF4" />
          <text x="77" y="131" fontSize="13" fontWeight="700" fill="#15803D">Suivi commande</text>
          <text x="77" y="154" fontSize="20" fontWeight="900" fill="#1C1917">#247</text>
          <rect x="258" y="122" width="51" height="25" rx="12.5" fill="#16A34A" />
          <text x="283.5" y="139" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFFFF">LIVE</text>

          <line x1="91" y1="230" x2="91" y2="407" stroke="#BBF7D0" strokeWidth="5" strokeLinecap="round" />
          <circle cx="91" cy="230" r="13" fill="#16A34A" />
          <path d="M84 230L89 235L99 224" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="121" y="226" fontSize="16" fontWeight="900" fill="#1C1917">Confirmée</text>
          <text x="121" y="248" fontSize="11" fontWeight="600" fill="#78716C">Votre commande est reçue</text>

          <circle className="hero-tracking-pulse" cx="91" cy="318" r="13" fill="#16A34A" />
          <text x="121" y="314" fontSize="16" fontWeight="900" fill="#1C1917">En livraison</text>
          <text x="121" y="336" fontSize="11" fontWeight="600" fill="#78716C">Le livreur est en route</text>

          <circle cx="91" cy="407" r="13" fill="#FFFFFF" stroke="#D6D3D1" strokeWidth="4" />
          <text x="121" y="403" fontSize="16" fontWeight="900" fill="#1C1917">Livraison</text>
          <text x="121" y="425" fontSize="11" fontWeight="600" fill="#78716C">Paiement COD à la réception</text>

          <rect x="70" y="486" width="250" height="112" rx="22" fill="#FAFAF9" stroke="#E7E5E4" />
          <text x="90" y="522" fontSize="14" fontWeight="800" fill="#1C1917">Robe été</text>
          <text x="272" y="522" textAnchor="end" fontSize="13" fontWeight="800" fill="#1C1917">85 DT</text>
          <text x="90" y="552" fontSize="14" fontWeight="800" fill="#1C1917">Hijab satin</text>
          <text x="272" y="552" textAnchor="end" fontSize="13" fontWeight="800" fill="#1C1917">35 DT</text>
          <line x1="90" y1="570" x2="300" y2="570" stroke="#E7E5E4" strokeWidth="2" />
          <text x="90" y="590" fontSize="15" fontWeight="900" fill="#1C1917">Total</text>
          <text x="272" y="590" textAnchor="end" fontSize="15" fontWeight="900" fill="#16A34A">120 DT</text>
        </g>

        <rect x="146" y="712" width="98" height="4" rx="2" fill="#D6D3D1" />
      </svg>
    </div>
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
    <div className="min-h-screen bg-white text-[#1C1917]">
      <LandingAnimationStyles />
      <MarketingNavbar />
      <main>
        <Hero />
        <CarrierBand />
        <BoutiqueIdentitySection />
        <StickyPhoneShowcase />
        <EarlyAdoptersSection />
        <PricingSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  )
}

function LandingAnimationStyles() {
  return (
    <style>{`
      @keyframes landingFlow {
        0% { transform: translateX(0); opacity: 0; }
        12%, 82% { opacity: 1; }
        100% { transform: translateX(calc(100% - 1rem)); opacity: 0; }
      }
      @keyframes landingFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes landingScan {
        0% { transform: translateX(-110%); opacity: 0; }
        20%, 70% { opacity: 0.6; }
        100% { transform: translateX(110%); opacity: 0; }
      }
      @keyframes landingStepGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.18); }
        50% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
      }
      @keyframes trackingProgress {
        0%, 24% { width: 33%; }
        34%, 58% { width: 66%; }
        70%, 100% { width: 100%; }
      }
      @keyframes trackingConfirmed {
        0%, 25% { opacity: 1; transform: translateY(0); }
        31%, 100% { opacity: 0; transform: translateY(-6px); }
      }
      @keyframes trackingShipping {
        0%, 34% { opacity: 0; transform: translateY(6px); }
        40%, 58% { opacity: 1; transform: translateY(0); }
        66%, 100% { opacity: 0; transform: translateY(-6px); }
      }
      @keyframes trackingDelivered {
        0%, 70% { opacity: 0; transform: translateY(6px); }
        74%, 100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes trackingStepTwo {
        0%, 28% { background: #E7E5E4; color: transparent; border-color: #E7E5E4; }
        38%, 100% { background: #16A34A; color: #FFFFFF; border-color: #16A34A; }
      }
      @keyframes trackingStepThree {
        0%, 62% { background: #FFFFFF; color: transparent; border-color: #D6D3D1; }
        74%, 100% { background: #16A34A; color: #FFFFFF; border-color: #16A34A; }
      }
      @keyframes trackingThanks {
        0%, 66% { opacity: 0; transform: translateY(14px) scale(0.98); }
        78%, 100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes trackingScreenSlide {
        0%, 68% { transform: translateY(0); }
        78%, 100% { transform: translateY(-4.4rem); }
      }
      .landing-flow-dot {
        animation: landingFlow 5.8s ease-in-out infinite;
      }
      .landing-float {
        animation: landingFloat 6s ease-in-out infinite;
      }
      .landing-scan {
        animation: landingScan 4.8s ease-in-out infinite;
      }
      .landing-step-glow {
        animation: landingStepGlow 2.8s ease-in-out infinite;
      }
      .tracking-progress {
        animation: trackingProgress 7.2s ease-in-out infinite;
      }
      .tracking-status-confirmed {
        animation: trackingConfirmed 7.2s ease-in-out infinite;
      }
      .tracking-status-shipping {
        animation: trackingShipping 7.2s ease-in-out infinite;
      }
      .tracking-status-delivered {
        animation: trackingDelivered 7.2s ease-in-out infinite;
      }
      .tracking-step-two {
        animation: trackingStepTwo 7.2s ease-in-out infinite;
      }
      .tracking-step-three {
        animation: trackingStepThree 7.2s ease-in-out infinite;
      }
      .tracking-thanks {
        animation: trackingThanks 7.2s ease-in-out infinite;
      }
      .tracking-screen-content {
        animation: trackingScreenSlide 7.2s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .landing-flow-dot,
        .landing-float,
        .landing-scan,
        .landing-step-glow,
        .tracking-progress,
        .tracking-status-confirmed,
        .tracking-status-shipping,
        .tracking-status-delivered,
        .tracking-step-two,
        .tracking-step-three,
        .tracking-thanks,
        .tracking-screen-content {
          animation: none;
        }
        .tracking-status-confirmed,
        .tracking-status-shipping {
          opacity: 0;
        }
        .tracking-status-delivered,
        .tracking-thanks {
          opacity: 1;
        }
        .tracking-progress {
          width: 100%;
        }
        .tracking-screen-content {
          transform: translateY(-4.4rem);
        }
      }
    `}</style>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBF8_100%)] px-4 pb-14 pt-10 sm:px-6 sm:pb-24 sm:pt-24">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(22,163,74,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,163,74,0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_74%)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-5 lg:gap-16">
        <div className="min-w-0 text-center lg:col-span-3 lg:text-left">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-brand-100 bg-white px-3.5 py-2 shadow-sm sm:mb-8 sm:px-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 sm:text-sm">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Boutique · Commandes · Clients
            </span>
          </div>

          <h1 className="mx-auto mb-5 max-w-[21rem] text-[2.35rem] font-extrabold leading-[1.02] text-[#1C1917] sm:mb-6 sm:max-w-none sm:text-5xl lg:mx-0 lg:text-6xl">
            <span className="block">Votre boutique en ligne.</span>
            <span className="block">
              Vos commandes{' '}
              <span className="relative inline-block text-brand-600">
                <span className="relative z-10">centralisées</span>
                <span className="absolute -bottom-1 left-0 h-3 w-full rounded-full bg-brand-100 sm:h-4" aria-hidden="true" />
              </span>.
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-[21rem] text-base leading-relaxed text-neutral-500 sm:mb-10 sm:max-w-xl sm:text-xl lg:mx-0">
            Créez une boutique personnalisée en 2 minutes. Vos clients commandent
            directement depuis un lien. Gérez commandes, stock et livraisons depuis
            un seul tableau de bord.
          </p>

          <div className="mx-auto mb-8 hidden w-full max-w-[21rem] grid-cols-1 gap-3 sm:mb-10 sm:grid sm:max-w-xl sm:grid-cols-3 lg:mx-0">
            {[
              { icon: Palette, label: 'Boutique avec votre identité' },
              { icon: ShoppingCart, label: 'Commandes en temps réel' },
              { icon: Truck, label: 'Livraisons COD simplifiées' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white/90 px-3 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm lg:justify-start"
              >
                <item.icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <MobileHeroPreview />

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
            <Link
              href="/register"
              className="inline-flex min-h-[52px] w-full max-w-[21rem] items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition-all duration-150 ease-out hover:scale-[1.03] hover:bg-brand-700 hover:ring-2 hover:ring-brand-500/40 hover:ring-offset-1 active:scale-[0.97] sm:w-auto sm:max-w-none sm:px-8 sm:py-4 sm:text-lg"
            >
              <span className="sm:hidden">Créer ma boutique</span>
              <span className="hidden sm:inline">Créer ma boutique gratuitement</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-[52px] w-full max-w-[21rem] items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-3.5 text-base font-semibold text-neutral-800 shadow-sm transition-all hover:border-brand-200 hover:text-brand-700 hover:shadow-md sm:w-auto sm:max-w-none sm:px-6 sm:py-4"
            >
              Voir une démo
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <p className="mt-5 inline-flex items-center justify-center gap-2 text-xs font-medium text-neutral-600 sm:text-sm lg:justify-start">
            <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Essai Pro 14 jours · Aucune carte bancaire
          </p>
        </div>

        <div className="relative hidden sm:block lg:col-span-2">
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

function MobileHeroPreview() {
  return (
    <div className="mx-auto mb-8 max-w-[21rem] sm:hidden" aria-hidden="true">
      <div className="overflow-hidden rounded-[1.35rem] border border-brand-100 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-brand-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">S</span>
            <div className="text-left">
              <p className="text-sm font-black text-[#1C1917]">Boutique Sarra</p>
              <p className="text-[11px] font-semibold text-neutral-500">Lien public actif</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-brand-700 shadow-sm">LIVE</span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3">
          {[
            ['Robe été', '85 DT', 'bg-rose-50 text-rose-400'],
            ['Hijab satin', '35 DT', 'bg-brand-50 text-brand-500'],
          ].map(([name, price, cls]) => (
            <div key={name} className="rounded-xl border border-neutral-100 bg-white p-2 text-left shadow-sm">
              <div className={`mb-2 flex h-16 items-center justify-center rounded-lg ${cls}`}>
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="truncate text-xs font-black text-[#1C1917]">{name}</p>
              <p className="text-xs font-black text-brand-700">{price}</p>
            </div>
          ))}
        </div>

        <div className="mx-3 mb-3 rounded-xl bg-brand-600 px-4 py-3 text-white shadow-lg shadow-brand-600/15">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">2 articles · 120 DT</span>
            <ShoppingCart className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <div className="text-left">
            <p className="text-sm font-black text-[#1C1917]">Commande reçue</p>
            <p className="text-[11px] font-semibold text-neutral-500">Client, adresse et articles prêts.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Carrier Band ─────────────────────────────────────────────────────────────

function CarrierBand() {
  return (
    <div className="border-y border-neutral-100 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-[#FAFAF9] p-3 text-left sm:bg-transparent sm:p-0 lg:justify-start">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-[#1C1917]">Livraison COD prête pour la Tunisie</p>
            <p className="text-sm leading-snug text-neutral-500">Transporteurs, suivi et montants à collecter au même endroit.</p>
          </div>
        </div>
        <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 lg:justify-end">
          {CARRIERS.map((c, i) => (
            <span
              key={c}
              className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold ${
                i === 0
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Identité boutique ────────────────────────────────────────────────────────

const IDENTITY_TEMPLATES: StorefrontTemplate[] = ['mode', 'luxe', 'fresh', 'dark']

function BoutiqueIdentitySection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
          <Palette className="h-4 w-4" aria-hidden="true" />
          Personnalisation
        </span>
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-[#1C1917] sm:text-4xl lg:text-5xl">
          Une boutique qui vous ressemble
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-neutral-500">
          Choisissez parmi 4 identités visuelles complètes.
          Changez de style en un clic.
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-5 sm:grid-cols-4">
          {IDENTITY_TEMPLATES.map((key) => {
            const tmpl = STOREFRONT_TEMPLATES[key]
            return (
              <div key={key} className="rounded-2xl border border-neutral-200 bg-[#FAFAF9] p-4 shadow-sm">
                <div className="overflow-hidden rounded-xl border border-neutral-100 shadow-sm">
                  <TemplatePreview template={key} primaryColor="#16A34A" />
                </div>
                <p className="mt-3 text-sm font-black text-[#1C1917]">{tmpl.label}</p>
                <p className="text-xs font-semibold text-neutral-500">{tmpl.description}</p>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-sm font-semibold text-neutral-500">
          4 templates · Couleur personnalisée · Logo · Bannière
        </p>
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
    <section id="about" className="bg-white px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Construit pour la Tunisie
            </span>
            <h2 className="text-3xl font-extrabold leading-tight text-[#1C1917] sm:text-4xl lg:text-5xl">
              Rejoignez les premiers vendeurs tunisiens
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-neutral-500">
              Hanut combine ce qu&apos;aucun outil tunisien ne combine : une boutique en
              ligne professionnelle + une gestion complète de vos commandes, clients
              et livraisons COD.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['5', 'transporteurs'],
                ['14j', 'essai Pro'],
                ['0', 'carte bancaire'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-2xl font-black text-brand-700">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {EARLY_BENEFITS.map((b, i) => (
              <div key={b.title} className="rounded-lg border border-neutral-200 bg-[#FAFAF9] p-5">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                    <b.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-black text-brand-700">0{i + 1}</span>
                      <p className="font-extrabold leading-snug text-[#1C1917]">{b.title}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-500">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/20 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-brand-700 hover:ring-2 hover:ring-brand-600/30 hover:ring-offset-2 active:scale-[0.98] sm:w-auto"
            >
              Créer ma boutique gratuitement
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CTA Section ─────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="bg-[#10261D] px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06]">
        <div className="grid grid-cols-1 gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_0.8fr] lg:p-14">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-brand-700">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Lancez votre boutique
            </span>
            <h2 className="max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              Votre boutique est prête en 5 minutes.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-50/80">
              Créez votre compte, ajoutez vos produits, partagez votre lien.
              Vos premiers clients peuvent commander aujourd&apos;hui.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-black text-[#10261D] transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-brand-50 hover:ring-2 hover:ring-white/40 hover:ring-offset-2 hover:ring-offset-[#10261D] active:scale-[0.98] sm:w-auto"
              >
                Créer ma boutique gratuitement
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href={`mailto:${HANUT_CONTACT.email}`}
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-8 py-4 text-base font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Parler à Hanut
              </a>
            </div>
            <p className="mt-5 text-sm font-medium text-brand-50/70">
              Essai Pro 14 jours · Aucune carte bancaire · Annulation libre
            </p>
          </div>

          <div className="grid content-center gap-3">
            {[
              ['1', 'Ajoutez vos produits'],
              ['2', 'Partagez votre lien'],
              ['3', 'Recevez vos commandes'],
            ].map(([num, label]) => (
              <div key={label} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.08] p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-sm font-black text-white">
                  {num}
                </span>
                <p className="font-bold text-white">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
