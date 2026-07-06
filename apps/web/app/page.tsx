import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Package, Users, Link2, MapPin,
  Truck, Inbox, PackageCheck, Banknote, ShoppingBag, ShoppingCart,
  TrendingUp, PackagePlus, Bell, MessageCircle, Check, Plus,
  ArrowRight,
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

/** Mockup hero : mini boutique dans un iPhone 15 Pro. */
function HeroStorefrontMockup() {
  return (
    <div
      className="relative mx-auto w-[17rem] sm:w-[19rem] lg:w-[21rem] rotate-3 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.22)]"
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

/** Mockup page de suivi : timeline + articles. */
function TrackingMockup() {
  return (
    <div className="relative mx-auto aspect-[390/844] w-[15rem] sm:w-[16.5rem] lg:w-[17.5rem]" aria-hidden="true">
      <div className="absolute -left-1 top-[18%] h-[8%] w-2 rounded-l-md bg-[#3F3F46]" />
      <div className="absolute -left-1 top-[29%] h-[12%] w-2 rounded-l-md bg-[#3F3F46]" />
      <div className="absolute -right-1 top-[27%] h-[13%] w-2 rounded-r-md bg-[#3F3F46]" />

      <div className="h-full rounded-[3rem] bg-[#4A4A4A] p-[3px] shadow-[0_28px_68px_rgba(0,0,0,0.32)]">
        <div className="h-full rounded-[2.8rem] bg-[#111827] p-[6px]">
          <div className="relative h-full overflow-hidden rounded-[2.35rem] bg-white">
            <div className="absolute left-1/2 top-3 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
            <div className="tracking-screen-content">

            <div className="bg-[linear-gradient(180deg,#F0FDF4_0%,#FFFFFF_82%)] px-4 pb-4 pt-12">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-brand-700">Suivi commande</p>
                  <p className="mt-1 font-mono text-lg font-black text-[#1C1917]">#247</p>
                </div>
                <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[9px] font-black text-white">
                  LIVE
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-brand-100 bg-white p-3.5 shadow-sm">
                <div className="relative h-12">
                  <div className="tracking-status-confirmed absolute inset-0">
                    <p className="text-base font-black text-[#1C1917]">Commande confirmée</p>
                    <p className="mt-1 text-[11px] font-semibold text-neutral-500">Votre commande est bien reçue.</p>
                  </div>
                  <div className="tracking-status-shipping absolute inset-0 opacity-0">
                    <p className="text-base font-black text-[#1C1917]">En cours de livraison</p>
                    <p className="mt-1 text-[11px] font-semibold text-neutral-500">Le livreur est en route vers vous.</p>
                  </div>
                  <div className="tracking-status-delivered absolute inset-0 opacity-0">
                    <p className="text-base font-black text-brand-700">Commande livrée</p>
                    <p className="mt-1 text-[11px] font-semibold text-neutral-500">Livraison terminée avec succès.</p>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div className="tracking-progress h-full rounded-full bg-brand-600" />
                </div>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                  <p className="text-xs font-black text-[#1C1917]">Confirmée</p>
                  <p className="text-[11px] font-semibold text-neutral-500">Aujourd’hui · 14:02</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="tracking-step-two flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-200 bg-neutral-200 text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                  <p className="text-xs font-black text-[#1C1917]">En livraison</p>
                  <p className="text-[11px] font-semibold text-neutral-500">IntiGo · TN-8821</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="tracking-step-three flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 bg-white text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                  <p className="text-xs font-black text-[#1C1917]">Livrée</p>
                  <p className="text-[11px] font-semibold text-neutral-500">Paiement COD reçu.</p>
                </div>
              </div>
            </div>

            <div className="mx-4 rounded-2xl border border-neutral-100 bg-[#FAFAF9] p-3.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-neutral-500">Robe été × 1</span>
                <span className="font-black text-[#1C1917]">85 DT</span>
              </div>
              <div className="mt-2 flex justify-between text-[11px]">
                <span className="font-semibold text-neutral-500">Hijab satin × 1</span>
                <span className="font-black text-[#1C1917]">35 DT</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-xs">
                <span className="font-black text-[#1C1917]">Total</span>
                <span className="font-black text-brand-700">120 DT</span>
              </div>
            </div>

            <div className="tracking-thanks mx-4 mb-5 mt-3 rounded-2xl bg-brand-600 p-3.5 text-white opacity-0 shadow-xl shadow-brand-900/20">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-700">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-black">Votre commande a été livrée.</p>
                  <p className="mt-1 text-[11px] font-medium text-white/80">Merci pour votre confiance.</p>
                </div>
              </div>
            </div>
            </div>

            <div className="absolute bottom-3 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-neutral-200" />
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-white text-[#1C1917]">
      <LandingAnimationStyles />
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
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBF8_100%)] pt-16 pb-16 sm:pt-24 sm:pb-24 px-4 sm:px-6">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(22,163,74,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,163,74,0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_74%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 items-center gap-12 lg:gap-16">
        <div className="text-center lg:text-left lg:col-span-3">
          <div className="mb-8 inline-flex items-center overflow-hidden rounded-full border border-brand-100 bg-white shadow-sm">
            <span className="inline-flex items-center gap-2 bg-brand-50 px-3.5 py-2 text-sm font-bold text-brand-700">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Mini boutique
            </span>
            <span className="px-3.5 py-2 text-sm font-semibold text-neutral-600">
              Commandes + clients
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1C1917] leading-[1.04] mb-6">
            Votre boutique en ligne,
            <br />
            <span className="relative inline-block text-brand-600">
              <span className="relative z-10">sans site web</span>
              <span className="absolute -bottom-1 left-0 h-4 w-full rounded-full bg-brand-100" aria-hidden="true" />
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            Partagez un lien. Vos clients choisissent leurs produits, confirment leur
            adresse et passent commande en 2 minutes. Gérez commandes et clients
            au même endroit.
          </p>

          <div className="mx-auto mb-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3 lg:mx-0">
            {[
              { icon: Link2, label: 'Un lien à partager' },
              { icon: ShoppingCart, label: 'Commandes directes' },
              { icon: Users, label: 'Clients centralisés' },
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

          <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 text-white text-lg font-semibold px-8 py-4 rounded-lg shadow-lg shadow-brand-600/20 transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-500/40 active:scale-[0.97]"
            >
              Créer ma boutique gratuitement
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-4 text-base font-semibold text-neutral-800 shadow-sm transition-all hover:border-brand-200 hover:text-brand-700 hover:shadow-md"
            >
              Voir comment ça marche
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <p className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-medium text-neutral-600 lg:justify-start">
            <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
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
    <div className="border-y border-neutral-100 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex items-center justify-center gap-3 text-center lg:justify-start lg:text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-[#1C1917]">Livraison COD prête pour la Tunisie</p>
            <p className="text-sm text-neutral-500">Transporteurs, suivi et montants à collecter au même endroit.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-end">
          {CARRIERS.map((c, i) => (
            <span
              key={c}
              className={`rounded-lg border px-4 py-2 text-sm font-bold ${
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

// ─── Mini boutique ────────────────────────────────────────────────────────────

const STOREFRONT_STEPS = [
  {
    icon: PackagePlus,
    title: 'Ajoutez tout votre catalogue',
    desc: 'Photos, prix, variantes et stock: vos produits sont organisés dans Hanut.',
    visual: <CatalogBuilderVisual />,
  },
  {
    icon: ShoppingBag,
    title: 'Votre mini boutique est prête',
    desc: 'Le client ouvre votre lien, voit vos produits et ajoute ce qu’il veut au panier.',
    visual: <PublicStorefrontVisual />,
  },
  {
    icon: Inbox,
    title: 'Le client confirme sa commande',
    desc: 'Nom, téléphone, adresse et articles arrivent propres dans votre dashboard.',
    visual: <CheckoutFormVisual />,
  },
]

function CatalogBuilderVisual() {
  return (
    <div className="relative h-64 overflow-hidden rounded-xl bg-[#F8FBF8] p-4">
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-700">Catalogue Hanut</p>
            <p className="text-sm font-black text-[#1C1917]">Produits</p>
          </div>
          <span className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-black text-white">+ Produit</span>
        </div>
        <div className="space-y-2 p-3">
          {DEMO_PRODUCTS.map((product, i) => (
            <div key={product.name} className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white p-2">
              <div className={`${product.bg} flex h-11 w-11 shrink-0 items-center justify-center rounded-lg`}>
                <ShoppingBag className={`h-5 w-5 ${product.icon}`} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#1C1917]">{product.name}</p>
                <p className="text-[10px] font-semibold text-neutral-500">{i + 2} variantes · stock OK</p>
              </div>
              <p className="text-xs font-black text-brand-700">{product.price} DT</p>
            </div>
          ))}
        </div>
      </div>
      <div className="landing-scan pointer-events-none absolute inset-y-0 left-0 w-20 bg-white/60 blur-xl" aria-hidden="true" />
    </div>
  )
}

function PublicStorefrontVisual() {
  return (
    <div className="relative h-64 overflow-hidden rounded-xl bg-[#F8FBF8] p-4">
      <div className="mx-auto max-w-[210px] rounded-[1.75rem] bg-[#1C1917] p-1.5 shadow-xl">
        <div className="overflow-hidden rounded-[1.4rem] bg-white">
          <StorefrontHeader compact />
          <div className="grid grid-cols-2 gap-1.5 bg-[#FAFAF9] p-2">
            {DEMO_PRODUCTS.map((product) => (
              <MiniProductCard key={product.name} product={product} compact />
            ))}
          </div>
          <StorefrontCartBar compact />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 shadow-lg">
        <ShoppingCart className="h-4 w-4 text-brand-700" aria-hidden="true" />
        <span className="text-xs font-black text-[#1C1917]">2 articles</span>
      </div>
    </div>
  )
}

function CheckoutFormVisual() {
  return (
    <div className="relative h-64 overflow-hidden rounded-xl bg-[#F8FBF8] p-4">
      <div className="mx-auto max-w-[260px] rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-700">Commande</p>
            <p className="text-sm font-black text-[#1C1917]">Vos informations</p>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-black text-brand-700">120 DT</span>
        </div>
        {[
          ['Nom complet', 'Sarra Ben Ali'],
          ['Téléphone', '22 345 678'],
          ['Adresse', 'Rue de Marseille, Tunis'],
        ].map(([label, value]) => (
          <div key={label} className="mb-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase text-neutral-400">{label}</p>
            <p className="text-xs font-bold text-[#1C1917]">{value}</p>
          </div>
        ))}
        <div className="mt-3 rounded-lg bg-brand-600 py-2 text-center text-xs font-black text-white">
          Confirmer la commande
        </div>
      </div>
      <div className="absolute -bottom-5 right-6 rounded-xl border border-brand-100 bg-white p-3 shadow-xl">
        <Check className="h-5 w-5 text-brand-700" aria-hidden="true" />
      </div>
    </div>
  )
}

function StorefrontSection() {
  return (
    <section id="how" className="bg-white px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Mini boutique publique
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-[#1C1917] sm:text-4xl lg:text-5xl">
            De votre catalogue à la commande, tout est fluide.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-neutral-500">
            Hanut connecte le travail du vendeur et l’expérience du client:
            produits, boutique, formulaire et commande propre.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-32 hidden h-1 rounded-full bg-brand-100 md:block" aria-hidden="true">
            <span className="landing-flow-dot absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-brand-600 shadow-lg shadow-brand-600/30" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STOREFRONT_STEPS.map((step, i) => (
              <article key={step.title} className="relative overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-neutral-900/5">
                <div className="relative">
                  {step.visual}
                  <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-brand-700 shadow-sm">
                    {i + 1}
                  </span>
                </div>
                <div className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 landing-step-glow">
                    <step.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-extrabold leading-tight text-[#1C1917]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-500">{step.desc}</p>
                </div>
              </article>
            ))}
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
    <section className="bg-[#10261D] px-4 py-24 text-white sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="relative order-2 lg:order-1">
            <div className="pointer-events-none absolute inset-y-10 left-1/2 w-64 -translate-x-1/2 rounded-full bg-brand-400/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <TrackingMockup />
            </div>
          </div>

          <div className="order-1 text-center lg:order-2 lg:text-left">
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-brand-100">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Suivi client automatique
            </span>
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl lg:mx-0 lg:text-5xl">
              Moins de messages. Plus de confiance.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-brand-50/80 lg:mx-0">
              Chaque client reçoit un lien clair pour suivre sa commande. Vous gardez le
              contrôle du statut sans répondre dix fois à la même question.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-4">
              {TRACKING_BENEFITS.map(b => (
                <div key={b.title} className="rounded-lg border border-white/10 bg-white/[0.08] p-5 text-left">
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700">
                      <b.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-extrabold text-white">{b.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-brand-50/75">{b.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: Inbox,
      tag: 'Commandes',
      headline: 'Toutes vos commandes en un seul endroit',
      body: "Celles de votre boutique arrivent seules. Celles de WhatsApp se saisissent en 30 secondes. Suivez chaque statut — confirmé, en cours, livré — en temps réel.",
      proof: '4 commandes en attente',
      bullets: ['Infos client complètes', 'Statuts propres', 'Recherche rapide'],
      mockup: <OrdersMockup />,
    },
    {
      icon: Truck,
      tag: 'Livraisons',
      headline: 'Gérez vos livraisons COD avec IntiGo, Navex et plus',
      body: "Sélectionnez votre transporteur, ajoutez le lien de suivi et gérez tout votre COD depuis Hanut. Intégration API en cours — création de colis et statut automatique directement depuis Hanut.",
      proof: 'COD suivi par livreur',
      bullets: ['Lien de suivi', 'Montants collectés', 'Transporteurs tunisiens'],
      mockup: <DeliveriesMockup />,
    },
    {
      icon: TrendingUp,
      tag: 'Analytics',
      headline: 'Suivez votre CA, vos COD et vos meilleurs produits',
      body: 'Visualisez vos revenus par jour, semaine ou mois. Identifiez vos produits stars, vos villes les plus actives et votre taux de livraison réussie.',
      proof: '+23% ce mois',
      bullets: ['CA par période', 'Top produits', 'Taux livraison'],
      mockup: <AnalyticsMockup />,
    },
  ]

  return (
    <section id="features" className="bg-[#FAFAF9] px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm font-bold text-brand-700 shadow-sm">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              Tableau de bord Hanut
            </span>
            <h2 className="max-w-3xl text-3xl font-extrabold leading-tight text-[#1C1917] sm:text-4xl lg:text-5xl">
              Le back-office qui garde votre vente propre.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-neutral-500">
            Commandes, clients, stock, livraison et chiffres: tout est relié. Hanut
            évite les oublis et rend votre boutique plus professionnelle.
          </p>
        </div>

        <div className="space-y-8">
          {features.map((f, i) => (
            <div
              key={f.tag}
              className="grid grid-cols-1 items-center gap-10 border-t border-neutral-200 py-14 last:border-b lg:grid-cols-2 lg:gap-16"
            >
              <div className={`min-w-0 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
                    <f.icon className="h-4 w-4" aria-hidden="true" />
                    {f.tag}
                  </span>
                  <span className="rounded-lg bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-700">
                    {f.proof}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold leading-tight text-[#1C1917] sm:text-3xl">
                  {f.headline}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-neutral-500">{f.body}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {f.bullets.map((bullet) => (
                    <span key={bullet} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700">
                      <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                      {bullet}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`w-full min-w-0 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>{f.mockup}</div>
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
    <div className="mt-20 sm:mt-24">
      <div className="mb-10 flex flex-col gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <h3 className="text-2xl font-extrabold text-[#1C1917] sm:text-3xl">
            Les détails qui font gagner du temps
          </h3>
          <p className="mt-2 text-neutral-500">Tout ce qui évite les erreurs quand les commandes accélèrent.</p>
        </div>
        <Link href="/features" className="inline-flex items-center justify-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
          Voir toutes les fonctionnalités
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECONDARY_FEATURES.map(f => (
          <div key={f.title} className="group rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-neutral-900/5">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-brand-50 p-2 transition-colors group-hover:bg-brand-600">
              <f.icon className="h-5 w-5 text-brand-600 transition-colors group-hover:text-white" aria-hidden="true" />
            </div>
            <p className="mb-1.5 font-extrabold text-[#1C1917]">{f.title}</p>
            <p className="text-sm leading-relaxed text-neutral-500">{f.desc}</p>
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
    <section id="about" className="bg-white px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Construit pour la Tunisie
            </span>
            <h2 className="text-3xl font-extrabold leading-tight text-[#1C1917] sm:text-4xl lg:text-5xl">
              Votre façon de vendre ne change pas. Votre gestion devient sérieuse.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-neutral-500">
              Beaucoup de vendeurs vendent déjà via Instagram, Facebook, TikTok ou téléphone.
              Hanut ajoute la couche qui manque: boutique, commandes, clients et COD.
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
