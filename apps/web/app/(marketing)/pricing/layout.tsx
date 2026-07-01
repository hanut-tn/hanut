import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs — Hanut',
  description: 'Starter 39 DT et Pro 79 DT par mois. Sans engagement, annulable à tout moment. -20% avec le plan annuel.',
  openGraph: {
    title: 'Tarifs Hanut — À partir de 39 DT/mois',
    description: 'Starter 39 DT et Pro 79 DT par mois. Sans engagement.',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
