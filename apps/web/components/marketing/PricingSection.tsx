import Link from 'next/link'

// Aperçu tarifs de la landing : Starter + Pro uniquement, 5 features max.
// Le détail complet (dont le plan Business à venir) vit sur /pricing.

type Plan = {
  name: string
  monthly: number
  desc: string
  badge?: string
  features: string[]
  highlighted: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 39,
    desc: 'Pour débuter et tester',
    features: [
      '100 commandes / mois',
      'Catalogue produits illimité',
      'Lien de commande public',
      'Livraisons COD (5 transporteurs)',
      'Analytics 30 jours',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    monthly: 79,
    desc: 'Pour les vendeurs actifs',
    badge: 'Recommandé',
    features: [
      'Commandes illimitées',
      'Analytics 180 jours + comparaison',
      'Fiche client CRM (tags et notes)',
      'Export CSV commandes et analytics',
      'Équipe jusqu\'à 3 membres',
    ],
    highlighted: true,
  },
]

export default function PricingToggle() {
  return (
    <section id="pricing" className="py-20 sm:py-32 px-4 sm:px-6 bg-[#F5F5F4]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Tarifs</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Des tarifs simples et transparents
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Sans engagement. Changez de plan quand vous voulez.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col bg-white ${
                plan.highlighted
                  ? 'ring-2 ring-brand-600 shadow-xl'
                  : 'border border-gray-200 shadow-sm'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap bg-brand-600 text-white">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <p className="font-bold text-sm text-gray-500 mb-0.5">{plan.name}</p>
                <p className="text-xs text-gray-400 mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-black text-[#1C1917]">{plan.monthly}</span>
                  <span className="text-sm text-gray-400">DT / mois</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
                      <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
                      <path d="M5 8L7 10L11 6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                <Link
                  href="/register"
                  className="w-full py-3.5 rounded-lg font-semibold text-sm bg-brand-600 text-white transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-500/40 active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  Essayer Pro 14 jours
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="w-full text-center py-3.5 rounded-lg font-semibold text-sm text-brand-600 border border-brand-600 transition-all duration-150 ease-out hover:bg-brand-50 hover:text-brand-700 hover:border-brand-700 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Choisir Starter
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="text-center mt-10 text-sm text-gray-500">
          L&apos;essai gratuit de 14 jours démarre sur le plan Pro ·{' '}
          <Link href="/pricing" className="text-brand-600 font-semibold hover:underline">
            Comparer tous les plans →
          </Link>
        </p>
      </div>
    </section>
  )
}
