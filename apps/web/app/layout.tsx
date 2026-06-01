import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hanut — Gestion commandes WhatsApp',
  description: 'Gérez vos commandes WhatsApp, votre stock et vos livraisons depuis un seul tableau de bord.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
