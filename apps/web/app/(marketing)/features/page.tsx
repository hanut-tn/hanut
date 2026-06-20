import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fonctionnalités — Hanut',
  description: 'Commandes WhatsApp, catalogue, livraisons COD, clients et analytics — tout ce dont les vendeurs tunisiens ont besoin dans un seul outil.',
  openGraph: {
    title: 'Fonctionnalités Hanut — Commandes, Catalogue, Livraisons COD',
    description: 'Commandes WhatsApp, catalogue, livraisons COD, clients et analytics — tout dans un seul outil.',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
}

function MockupShell({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-[#F5F5F4] px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <div className="w-3 h-3 bg-red-300 rounded-full" />
        <div className="w-3 h-3 bg-yellow-300 rounded-full" />
        <div className="w-3 h-3 bg-green-400 rounded-full" />
        <span className="ml-3 text-xs text-gray-400 font-mono truncate">{url}</span>
      </div>
      {children}
    </div>
  )
}

function OrdersMockup() {
  const orders = [
    { name: 'Fatima K.', product: 'Robe fleurie S', amount: 85, status: 'Confirmée', cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
    { name: 'Sara A.', product: 'Crème hydratante', amount: 45, status: 'Livrée', cls: 'bg-green-100 text-green-700' },
    { name: 'Hamza T.', product: 'Nike Air Force 42', amount: 185, status: 'Expédiée', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
    { name: 'Inès B.', product: 'Parfum Oud Rose', amount: 120, status: 'En attente', cls: 'bg-orange-100 text-orange-700' },
  ]
  return (
    <MockupShell url="hanut.tn/orders">
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 bg-white">
        <div>
          <p className="font-bold text-gray-900 text-sm">Commandes</p>
          <p className="text-xs text-gray-400">4 commandes aujourd&apos;hui</p>
        </div>
        <span className="text-xs bg-[#16A34A] text-white px-3 py-1.5 rounded-lg font-semibold">+ Nouvelle</span>
      </div>
      <div className="divide-y divide-gray-50">
        {orders.map((o, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3 bg-white hover:bg-gray-50 transition-colors">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-green-50 text-[#0B5E46]">
              {o.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{o.name}</p>
              <p className="text-xs text-gray-400 truncate">{o.product}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-gray-900">{o.amount} DT</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.cls}`}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  )
}

function LinkMockup() {
  return (
    <MockupShell url="hanut.tn/order/ma-boutique">
      <div className="p-5 space-y-4 bg-white">
        <div className="text-center pb-3 border-b border-gray-100">
          <Image src="/logo-icone.svg" alt="Hanut" width={48} height={58} className="mx-auto mb-2.5" unoptimized />
          <p className="font-bold text-gray-900 text-sm">Boutique Yasmine</p>
          <p className="text-xs text-gray-400 mt-0.5">Tunis, Tunisie</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Choisissez votre produit</p>
          <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-700">Robe fleurie — 85 DT</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>
        <div className="space-y-2.5">
          <input readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50" placeholder="Votre nom complet" />
          <input readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50" placeholder="+216 XX XXX XXX" />
          <input readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50" placeholder="Adresse de livraison" />
        </div>
        <button className="w-full bg-[#16A34A] text-white text-xs font-semibold py-2.5 rounded-xl">
          Commander — 85 DT
        </button>
      </div>
    </MockupShell>
  )
}

function CatalogMockup() {
  const products = [
    { name: 'Robe fleurie S/M/L', price: 85, stock: 12, alert: false },
    { name: 'Crème hydratante 200ml', price: 45, stock: 3, alert: true },
    { name: 'Nike Air Force 1', price: 185, stock: 7, alert: false },
    { name: 'Parfum Oud Rose 50ml', price: 120, stock: 0, alert: true },
  ]
  return (
    <MockupShell url="hanut.tn/catalog">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <p className="font-bold text-gray-900 text-sm">Catalogue</p>
        <span className="text-xs bg-[#16A34A] text-white px-3 py-1.5 rounded-lg font-semibold">+ Produit</span>
      </div>
      <div className="divide-y divide-gray-50">
        {products.map((p, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3 bg-white">
            <div className="w-9 h-9 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-400 font-bold">{p.price} DT</p>
            </div>
            <div className="text-right shrink-0">
              {p.stock === 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Rupture</span>
              ) : p.alert ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Stock bas ({p.stock})</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{p.stock} en stock</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  )
}

function DeliveryMockup() {
  return (
    <MockupShell url="hanut.tn/deliveries/new">
      <div className="p-5 space-y-4 bg-white">
        <p className="text-sm font-bold text-gray-900">Créer une expédition</p>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Choisir le livreur</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'IntiGo', active: true },
              { name: 'Navex', active: false },
              { name: 'Adex', active: false },
              { name: 'Aramex', active: false },
            ].map(c => (
              <div
                key={c.name}
                className={`border rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-colors ${
                  c.active ? 'border-[#16A34A] bg-green-50 text-[#0B5E46]' : 'border-gray-200 text-gray-500'
                }`}
              >
                {c.name}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0B5E46] rounded-lg flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-[#0B5E46]">Expédition créée</p>
            <p className="text-xs text-green-700 font-mono mt-0.5">TN-8821-2026</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center">Numéro de suivi à renseigner dans Hanut</p>
      </div>
    </MockupShell>
  )
}

function CustomerMockup() {
  return (
    <MockupShell url="hanut.tn/customers/fatima">
      <div className="p-5 space-y-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#0B5E46] font-bold text-base shrink-0">FK</div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Fatima Khalil</p>
            <p className="text-xs text-gray-400 font-mono">+216 55 123 456</p>
            <div className="flex gap-1 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">VIP</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Fidèle</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Commandes', value: '14' },
            { label: 'CA livré', value: '1,240 DT' },
            { label: 'Taux livraison', value: '93%' },
            { label: 'Produit préféré', value: 'Robe fleurie' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[10px] text-gray-400">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{s.value}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Notes internes</p>
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-gray-600">
            Préfère la livraison le matin. Client fidèle depuis 2 ans.
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

function AnalyticsMockup() {
  const bars = [42, 65, 38, 78, 55, 90, 48, 72, 85, 60, 95, 70]
  const max = Math.max(...bars)
  return (
    <MockupShell url="hanut.tn/analytics">
      <div className="p-5 space-y-4 bg-white">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-extrabold text-gray-900">12,450</p>
            <p className="text-xs text-gray-400 mt-0.5">CA ce mois (DT)</p>
            <span className="text-xs text-green-600 font-semibold mt-1 block">+23%</span>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">87%</p>
            <p className="text-xs text-gray-400 mt-0.5">Taux livraison</p>
            <span className="text-xs text-green-600 font-semibold mt-1 block">+5pts</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">CA / jour (30 derniers jours)</p>
          <div className="flex items-end gap-1 h-14">
            {bars.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${(v / max) * 100}%`, background: v === max ? '#16A34A' : '#DCFCE7' }}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-gray-50 pt-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Top produit</p>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#16A34A] rounded-full flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-900">Robe fleurie</p>
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

function CheckIcon({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill={highlighted ? 'rgba(74,222,128,0.2)' : '#DCFCE7'} />
      <path d="M5 8L7 10L11 6" stroke={highlighted ? '#4ADE80' : '#16A34A'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SECTIONS = [
  {
    tag: 'Commandes',
    title: 'Toutes vos commandes en un seul endroit',
    desc: 'Saisissez une commande en 30 secondes. Suivez chaque statut — confirmée, expédiée, livrée — en temps réel. Fini les carnets et les commandes oubliées.',
    points: [
      'Statuts : En attente, Confirmée, Expédiée, Livrée, Retournée',
      'Création depuis le dashboard ou via formulaire public',
      'Confirmation en 1 clic',
    ],
    mockup: 'orders',
  },
  {
    tag: 'Lien de commande',
    title: 'Votre formulaire de commande personnel',
    desc: 'Un lien unique hanut.tn/order/votre-boutique à partager dans votre bio Instagram, statut WhatsApp, description TikTok. Le client remplit, la commande arrive directement dans Hanut.',
    points: [
      'Page mobile-first optimisée pour la conversion',
      'Catalogue en temps réel',
      'Lien de suivi généré pour le client',
    ],
    mockup: 'link',
  },
  {
    tag: 'Catalogue & Stock',
    title: 'Ne survandez plus jamais',
    desc: 'Ajoutez vos produits avec variantes (taille, couleur), le stock est décrémenté automatiquement à chaque commande. Soyez alerté avant d\'être à court.',
    points: [
      'Variantes illimitées (taille, couleur, etc.)',
      'Alerte stock bas personnalisable',
      'Photos produit et description',
    ],
    mockup: 'catalog',
  },
  {
    tag: 'Livraisons COD',
    title: '5 transporteurs tunisiens supportés',
    desc: 'Gérez vos expéditions chez IntiGo, Navex, Adex, Aramex ou Best Delivery directement depuis Hanut. Intégration API en cours pour la création automatique de colis et le statut en temps réel.',
    points: [
      'COD tracké : encaissé / en attente / reversé',
      'Frais de livraison trackés par expédition',
      'Suivi COD reversé par transporteur',
    ],
    mockup: 'delivery',
  },
  {
    tag: 'Clients',
    title: 'Connaissez vos meilleurs clients',
    desc: 'Fiche client enrichie avec historique complet des commandes, tags personnalisables (VIP, Fidèle...), notes internes, et produit préféré calculé automatiquement.',
    points: [
      'Tags personnalisables (VIP, Fidèle, À risque...)',
      'CA et taux de livraison par client',
      'Notes internes et historique complet',
    ],
    mockup: 'customer',
  },
  {
    tag: 'Analytics',
    title: 'Comprenez vos ventes et vos COD',
    desc: 'CA quotidien, hebdomadaire, mensuel. Suivi des frais de livraison, COD en attente et taux de livraison par transporteur. Top produits et villes.',
    points: [
      'Analytics 30 à 180 jours selon le plan',
      'COD en attente par livreur',
      'Top clients et produits par valeur',
    ],
    mockup: 'analytics',
  },
]

function SectionMockup({ type }: { type: string }) {
  if (type === 'orders') return <OrdersMockup />
  if (type === 'link') return <LinkMockup />
  if (type === 'catalog') return <CatalogMockup />
  if (type === 'delivery') return <DeliveryMockup />
  if (type === 'customer') return <CustomerMockup />
  return <AnalyticsMockup />
}

export default function FeaturesPage() {
  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-4">Fonctionnalités</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            Tout ce dont vous avez besoin pour gérer votre business
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto">
            6 modules pensés pour les vendeurs tunisiens qui vendent via WhatsApp et Instagram.
          </p>
        </div>
      </section>

      {/* 6 alternating sections */}
      <section className="pb-24 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-24 sm:space-y-32">
          {SECTIONS.map((s, i) => (
            <div
              key={s.tag}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs font-bold text-[#16A34A] bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest mb-5">
                  {s.tag}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] leading-tight mb-4">
                  {s.title}
                </h2>
                <p className="text-base text-gray-500 leading-relaxed mb-6">{s.desc}</p>
                <ul className="space-y-2.5">
                  {s.points.map(p => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckIcon />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full max-w-md lg:max-w-none">
                <SectionMockup type={s.mockup} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-[#0B5E46]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Prêt à tester toutes ces fonctionnalités ?
          </h2>
          <p className="text-green-200 mb-8">Démo Pro 14 jours · Sans carte bancaire · Accès complet dès l&apos;inscription.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#0B5E46] hover:bg-green-50 text-base font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Commencer la démo
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
