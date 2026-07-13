import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs Hanut — Boutique en ligne + Gestion commandes Tunisie',
  description: 'Starter 39 DT ou Pro 79 DT. Créez votre boutique, gérez vos commandes et livraisons COD. Essai Pro 14 jours gratuit.',
  openGraph: {
    title: 'Tarifs Hanut — Boutique en ligne + Gestion commandes Tunisie',
    description: 'Starter 39 DT ou Pro 79 DT. Créez votre boutique, gérez vos commandes et livraisons COD. Essai Pro 14 jours gratuit.',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
