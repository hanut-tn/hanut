import type { Metadata } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import { headers } from 'next/headers'
import { CspNonceProvider } from '@/components/providers/CspNonceProvider'
import './globals.css'

// Self-hébergée par next/font (pas d'appel réseau à l'exécution, compatible
// avec la CSP à nonce déjà en place). Chargée pour tout le site : le
// formulaire de commande et le suivi de commande basculent dessus via la
// classe .font-arabic quand l'utilisateur choisit l'arabe.
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  // www, pas l'apex : hanut.tn redirige (308) vers www.hanut.tn, une
  // redirection que les crawlers de preview de lien (WhatsApp, etc.) ne
  // suivent pas toujours de façon fiable pour récupérer og-image.png.
  metadataBase: new URL('https://www.hanut.tn'),
  title: 'Hanut — Votre boutique en ligne, sans site web',
  description: 'Créez votre boutique en ligne en 5 minutes. Partagez un lien, vos clients commandent directement. Gestion des commandes, stock et livraisons COD en Tunisie.',
  authors: [{ name: 'Hanut', url: 'https://www.hanut.tn' }],
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
    <html lang="fr" className={notoSansArabic.variable}>
      <body>
        <CspNonceProvider nonce={nonce}>
          {children}
        </CspNonceProvider>
      </body>
    </html>
  )
}
