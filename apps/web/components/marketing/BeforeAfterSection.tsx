import { Check, X } from 'lucide-react'

const BEFORE_AFTER = [
  { before: 'Screenshots WhatsApp empilés', after: 'Dashboard centralisé' },
  { before: 'Carnet de notes perdu', after: 'Stock mis à jour automatiquement' },
  { before: '« C’est où ma commande ? »', after: 'Lien de suivi automatique' },
  { before: 'Excel chaotique', after: 'Analytics en temps réel' },
  { before: '3h de gestion par jour', after: 'Moins de 30 minutes' },
  { before: 'Commandes perdues dans les DMs', after: 'Zéro commande perdue' },
]

export default function BeforeAfterSection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-playfair text-center text-4xl text-[#1C1917] sm:text-5xl">
          Avant Hanut. Après Hanut.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-neutral-500">
          La différence entre perdre des commandes et les gérer toutes.
        </p>

        <div className="mt-14 grid grid-cols-1 overflow-hidden rounded-3xl border border-neutral-100 shadow-xl sm:grid-cols-2">
          <div className="bg-neutral-50 p-6 sm:p-8">
            <div className="mb-6 text-xs font-bold uppercase tracking-widest text-red-500">
              Avant Hanut
            </div>
            {BEFORE_AFTER.map((item) => (
              <div key={item.before} className="mb-4 flex items-start gap-3 last:mb-0">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-neutral-500 line-through">
                  {item.before}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-100 bg-white p-6 sm:border-l sm:border-t-0 sm:p-8">
            <div className="mb-6 text-xs font-bold uppercase tracking-widest text-brand-600">
              Avec Hanut
            </div>
            {BEFORE_AFTER.map((item) => (
              <div key={item.after} className="mb-4 flex items-start gap-3 last:mb-0">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                <span className="text-sm font-medium leading-relaxed text-[#1C1917]">
                  {item.after}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
