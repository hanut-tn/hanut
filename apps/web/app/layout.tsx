import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CspNonceProvider } from '@/components/providers/CspNonceProvider'
import './globals.css'

export const metadata: Metadata = {
  // www, pas l'apex : hanut.tn redirige (308) vers www.hanut.tn, une
  // redirection que les crawlers de preview de lien (WhatsApp, etc.) ne
  // suivent pas toujours de façon fiable pour récupérer og-image.png.
  metadataBase: new URL('https://www.hanut.tn'),
  title: 'Hanut — Gestion commandes WhatsApp',
  description: 'Gérez vos commandes WhatsApp, votre stock et vos livraisons depuis un seul tableau de bord.',
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 628, alt: 'Hanut — Gérez vos commandes WhatsApp et Instagram' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

// La lecture des headers force le rendu dynamique requis par une CSP à nonce.
// Next.js applique automatiquement le nonce aux scripts du framework ; le
// provider le rend aussi disponible aux scripts tiers comme Turnstile.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="fr">
      <body>
        <CspNonceProvider nonce={nonce}>
          {children}
        </CspNonceProvider>
      </body>
    </html>
  )
}
