import { Lock, MapPin, Smartphone, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TRUST_ITEMS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Lock,
    title: 'Paiement à la livraison',
    desc: 'Toujours. Vos clients ne paient qu\'en recevant leur commande.',
  },
  {
    icon: Smartphone,
    title: 'Vérification OTP',
    desc: 'Chaque commande est validée par code SMS. Zéro fausse commande.',
  },
  {
    icon: Truck,
    title: '5 transporteurs tunisiens',
    desc: 'IntiGo, Navex, Adex, Aramex, Best Delivery. Intégrés nativement.',
  },
  {
    icon: MapPin,
    title: '100% tunisien',
    desc: 'Conçu à Tunis, pour le marché tunisien. En DT.',
  },
]

export default function TrustSection() {
  return (
    <section className="bg-[#faf8f5] px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Confiance</span>
          <h2 className="font-playfair mt-3 text-4xl text-[#1C1917] sm:text-5xl">
            Construit pour la Tunisie
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 font-bold text-[#1C1917]">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
