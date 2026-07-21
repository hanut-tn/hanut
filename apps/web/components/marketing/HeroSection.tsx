import Link from 'next/link'

// ─── Mockup boutique animée (repris de l'ancien Hero, adapté au fond noir) ────

function HeroPhoneMockup() {
  return (
    <div
      className="relative mx-auto w-[15.5rem] max-w-full rotate-2 rounded-[3rem] shadow-[0_28px_70px_rgba(0,0,0,0.55)] sm:w-[19rem] sm:rotate-3 lg:w-[21rem]"
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
          .hero-notification {
            opacity: 0;
            transform: translateY(-14px);
            animation: heroNotification 7.2s ease-in-out infinite;
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
          @keyframes heroNotification {
            0%, 2% { opacity: 0; transform: translateY(-14px); }
            8%, 26% { opacity: 1; transform: translateY(0); }
            33%, 100% { opacity: 0; transform: translateY(-14px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-catalog,
            .hero-added-button,
            .hero-tap-product,
            .hero-tap-cart,
            .hero-order-sheet,
            .hero-tracking-page,
            .hero-tracking-pulse,
            .hero-notification {
              animation: none;
            }
            .hero-added-button,
            .hero-tap-product,
            .hero-tap-cart,
            .hero-order-sheet,
            .hero-tracking-page,
            .hero-notification {
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

        {/* Notification "Nouvelle commande !" */}
        <g className="hero-notification">
          <rect x="59" y="86" width="272" height="46" rx="16" fill="#111827" />
          <circle cx="86" cy="109" r="12" fill="#16A34A" />
          <path d="M80 109L84 113L93 103" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="106" y="104" fontSize="12" fontWeight="800" fill="#FFFFFF">Nouvelle commande !</text>
          <text x="106" y="119" fontSize="10" fontWeight="500" fill="#9CA3AF">Boutique Sarra · à l&apos;instant</text>
        </g>

        <g className="hero-catalog">
          <rect x="57" y="94" width="276" height="56" rx="22" fill="#F0FDF4" />
          <circle cx="85" cy="122" r="18" fill="#16A34A" />
          <text x="85" y="128" textAnchor="middle" fontSize="18" fontWeight="800" fill="#FFFFFF">S</text>
          <text x="112" y="117" fontSize="16" fontWeight="800" fill="#1C1917">Boutique Sarra</text>
          <text x="112" y="136" fontSize="11" fontWeight="500" fill="#78716C">Mode estivale &amp; accessoires</text>
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

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-4 py-16 sm:px-6 sm:py-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            Lancement en Tunisie · 14 jours Pro offerts
          </div>

          <h1 className="font-playfair text-[2.75rem] leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Finis les commandes
            <span className="relative ml-3 inline-block">
              <span className="text-white/30 line-through decoration-red-500/70 decoration-4">perdues</span>
            </span>
            <br />
            <span className="italic text-brand-400">dans les DMs.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/60 sm:text-xl lg:mx-0">
            Hanut transforme votre Instagram en vraie boutique en ligne.
            Vos clients commandent. Vous gérez. Tout simplement.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-brand-500 hover:shadow-[0_0_30px_rgba(22,163,74,0.4)]"
            >
              Créer ma boutique — c&apos;est gratuit
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/40 lg:justify-start">
            <span>✓ 14 jours Pro offerts</span>
            <span>✓ Aucune carte bancaire</span>
            <span>✓ 2 minutes pour démarrer</span>
          </div>
        </div>

        <div className="relative hidden sm:block">
          <HeroPhoneMockup />
        </div>
      </div>

      {/* Repère observé par la Navbar pour basculer entre logo/liens blancs
          (au-dessus du hero noir) et la variante claire (une fois ce point
          scrollé au-delà de la barre de nav fixe). */}
      <div id="hero-sentinel" className="pointer-events-none absolute bottom-0 h-px w-full" aria-hidden="true" />
    </section>
  )
}
