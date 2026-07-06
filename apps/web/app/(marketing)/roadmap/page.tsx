import type { Metadata } from 'next'
import { HANUT_CONTACT } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Roadmap — Hanut',
  description: 'Les fonctionnalités à venir sur Hanut. On construit avec les vendeurs tunisiens.',
}

type RoadmapItem = {
  title: string
  desc: string
  eta?: string
}

const DONE: RoadmapItem[] = [
  {
    title: 'Dashboard commandes',
    desc: 'Cycle de vie COD complet : Nouvelle, Confirmée, Expédiée, Livrée, Retournée. Historique des statuts.',
  },
  {
    title: 'Catalogue & stock avec variantes',
    desc: 'Produits avec variantes (taille, couleur), stock décrémenté automatiquement à chaque commande, historique des mouvements.',
  },
  {
    title: 'Lien de commande public /s',
    desc: 'Formulaire mobile-first partageable sur Instagram, WhatsApp, TikTok. Commandes reçues directement dans Hanut.',
  },
  {
    title: 'Suivi commande client /track',
    desc: 'Page publique de suivi accessible par les clients avec un lien dédié et sécurisé.',
  },
  {
    title: 'Fiche client & CRM',
    desc: 'Historique complet des commandes, notes internes, CA et taux de livraison par client.',
  },
  {
    title: 'Gestion livraisons COD',
    desc: '5 transporteurs supportés : IntiGo, Navex, Adex, Aramex, Best Delivery. Suivi COD collecté / reversé.',
  },
  {
    title: 'Analytics 180 jours',
    desc: 'CA, tendances, comparaison avec la période précédente, top produits, clients et villes.',
  },
  {
    title: 'Export CSV',
    desc: 'Export des commandes et des données analytics en CSV.',
  },
  {
    title: 'Gestion équipe multi-utilisateurs',
    desc: 'Invitation de membres avec rôles Admin, Opérateur, Lecture seule. Journal d\'activité non modifiable.',
  },
  {
    title: 'Application mobile (en cours)',
    desc: 'Le dashboard web est déjà adapté au mobile, avec navigation mobile et écrans optimisés pour les vendeurs sur téléphone.',
  },
]

const IN_DEV: RoadmapItem[] = [
  {
    title: 'Intégration API transporteurs',
    desc: 'Création de colis et statut automatique directement depuis Hanut.',
    eta: 'T3 2026',
  },
  {
    title: 'Notifications SMS client',
    desc: 'Confirmation de commande et lien de suivi envoyés au client.',
    eta: 'T3 2026',
  },
  {
    title: 'Application mobile Expo',
    desc: 'Notifications push à chaque nouvelle commande, gestion complète depuis votre téléphone.',
    eta: 'T4 2026',
  },
]

const PLANNED: RoadmapItem[] = [
  {
    title: 'Offre avancée',
    desc: 'Multi-boutiques, équipe illimitée, accès API, rapport fiscal. En cours de préparation.',
  },
  {
    title: 'Intégration paiement en ligne',
    desc: 'Konnect / Flouci pour les vendeurs qui veulent proposer le paiement digital en complément du COD.',
  },
  {
    title: 'Marketplace Hanut',
    desc: 'Vision long terme : connecter les vendeurs Hanut à une marketplace dédiée.',
  },
]

function StatusBadge({ status }: { status: 'done' | 'dev' | 'soon' | 'planned' }) {
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
        <path d="M2 5L4 7L8 3" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Livré
    </span>
  )
  if (status === 'dev') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
      En développement
    </span>
  )
  if (status === 'soon') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
      Bientôt
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      Prévu
    </span>
  )
}

function RoadmapCard({ item, status }: { item: RoadmapItem; status: 'done' | 'dev' | 'soon' | 'planned' }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-shadow hover:shadow-md ${
      status === 'done' ? 'border-green-100' :
      status === 'dev' ? 'border-blue-100' :
      status === 'soon' ? 'border-orange-100' :
      'border-gray-100'
    }`}>
      <StatusBadge status={status} />
      <h3 className="font-bold text-[#1C1917] mt-3 mb-1.5">{item.title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
      {item.eta && (
        <p className="text-xs text-blue-600 font-semibold mt-3">
          Prévu pour {item.eta}
        </p>
      )}
    </div>
  )
}

export default function RoadmapPage() {
  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-4">Roadmap</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            Ce qui arrive bientôt sur Hanut
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            On construit Hanut avec les vendeurs tunisiens. Voilà ce qui est fait et ce qui arrive.
          </p>
        </div>
      </section>

      {/* Roadmap */}
      <section className="pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">

          {/* Déjà disponible */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <h2 className="font-bold text-[#1C1917]">Déjà disponible</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DONE.map(item => (
                <RoadmapCard key={item.title} item={item} status="done" />
              ))}
            </div>
          </div>

          {/* En cours / Prévu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* En développement */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="font-bold text-[#1C1917]">En développement</h2>
              </div>
              <div className="space-y-4">
                {IN_DEV.map(item => (
                  <RoadmapCard key={item.title} item={item} status="dev" />
                ))}
              </div>
            </div>

            {/* Prévu */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                <h2 className="font-bold text-[#1C1917]">Prévu</h2>
              </div>
              <div className="space-y-4">
                {PLANNED.map(item => (
                  <RoadmapCard key={item.title} item={item} status="planned" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="py-16 px-4 sm:px-6 bg-[#F5F5F4] border-t border-gray-200">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-2xl font-bold text-[#1C1917] mb-3">
            Une fonctionnalité que vous voulez voir ?
          </p>
          <p className="text-gray-500 mb-6">
            Dites-le nous sur WhatsApp. On prend chaque suggestion au sérieux.
          </p>
          <a
            href={`${HANUT_CONTACT.whatsappUrl}?text=${encodeURIComponent('Bonjour Hanut, je voudrais suggérer une fonctionnalité : ')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-150 ease-out hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-[#25D366]/40 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.115 1.522 5.847L0 24l6.347-1.498A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.007-1.37l-.359-.213-3.72.877.894-3.629-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            Nous contacter sur WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}
