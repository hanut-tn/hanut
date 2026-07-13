import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

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
      'Boutique 1 template (Mode)',
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
      '4 templates + logo et bannière',
      'Boutique sans branding Hanut',
      'Analytics 180 jours + comparaison',
      'Équipe jusqu\'à 3 membres',
    ],
    highlighted: true,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-[#FAFAF9] px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="lg:sticky lg:top-24">
          <span className="mb-5 inline-flex rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm font-bold text-brand-700 shadow-sm">
            Tarifs
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-[#1C1917] sm:text-4xl">
            Simple à lancer. Facile à garder.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-500">
            Commencez avec l’essai Pro, gardez le plan adapté à votre volume.
            Aucun engagement, aucune carte bancaire au démarrage.
          </p>
          <div className="mt-7 space-y-3">
            {['Essai Pro 14 jours', 'Annulation libre', 'Support pour démarrer'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-semibold text-neutral-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[1.5rem] p-7 ${
                plan.highlighted
                  ? 'bg-[#10261D] text-white shadow-2xl shadow-neutral-900/20'
                  : 'border border-neutral-200 bg-white text-[#1C1917] shadow-sm'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-7 rounded-full bg-brand-500 px-4 py-1 text-xs font-black text-white">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <p className={`mb-1 text-sm font-black ${plan.highlighted ? 'text-brand-100' : 'text-brand-700'}`}>{plan.name}</p>
                <p className={`mb-5 text-sm ${plan.highlighted ? 'text-white/70' : 'text-neutral-500'}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-black">{plan.monthly}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-neutral-500'}`}>DT / mois</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? 'bg-white text-brand-700' : 'bg-brand-50 text-brand-700'}`}>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className={plan.highlighted ? 'text-white/75' : 'text-neutral-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                <Link
                  href="/register"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3.5 text-sm font-black text-[#10261D] transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-brand-50 active:scale-[0.98]"
                >
                  Essayer Pro 14 jours
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="w-full rounded-lg border border-brand-600 py-3.5 text-center text-sm font-bold text-brand-700 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-brand-50 active:scale-[0.98]"
                >
                  Choisir Starter
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-neutral-500 md:col-start-2">
          L&apos;essai gratuit démarre sur le plan Pro ·{' '}
          <Link href="/pricing" className="text-brand-600 font-semibold hover:underline">
            Comparer tous les plans →
          </Link>
        </p>
      </div>
    </section>
  )
}
