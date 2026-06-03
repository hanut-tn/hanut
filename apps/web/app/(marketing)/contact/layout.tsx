import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — Hanut',
  description: "Contactez l'équipe Hanut. Support en français et en arabe. Réponse sous 24h.",
  openGraph: {
    title: 'Contacter Hanut — Support en français et arabe',
    description: "Contactez l'équipe Hanut. Support en français et en arabe.",
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
