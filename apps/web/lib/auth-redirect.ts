import { isLocalOrigin, isVercelDeploymentOrigin, normalizeOrigin } from '@/lib/safe-origin'

// hanut.tn redirige (308) vers www.hanut.tn au niveau du domaine — utiliser
// directement www évite ce saut de redirection, non fiable pour les <img>
// dans les clients email et inutile pour les liens cliqués.
const DEFAULT_PRODUCTION_ORIGIN = 'https://www.hanut.tn'

export function getAppOrigin(fallbackOrigin?: string): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)

  // NEXT_PUBLIC_APP_URL configurée sur un vrai domaine (ni localhost, ni un
  // domaine Vercel auto-généré) : c'est la source de vérité explicite,
  // elle gagne toujours.
  if (configuredOrigin && !isLocalOrigin(configuredOrigin) && !isVercelDeploymentOrigin(configuredOrigin)) {
    return configuredOrigin
  }

  // Sinon (config absente, pointant sur localhost en dev, ou elle-même
  // mal configurée sur un domaine Vercel) : faire confiance à l'origine de
  // la requête en cours si elle est utilisable — permet le test en LAN
  // (téléphone sur le même réseau) sans forcer un lien localhost inutile.
  // Jamais d'URL de déploiement Vercel auto-générée.
  const requestOrigin = normalizeOrigin(fallbackOrigin)
  if (requestOrigin && !isVercelDeploymentOrigin(requestOrigin)) return requestOrigin

  if (configuredOrigin && !isVercelDeploymentOrigin(configuredOrigin)) return configuredOrigin

  // Dernier recours : le domaine de production en dur. Mieux vaut ça
  // qu'une URL *.vercel.app illisible ou qui expirera au prochain déploiement.
  return DEFAULT_PRODUCTION_ORIGIN
}

export function buildAuthCallbackUrl(
  nextPath: '/accept-invitation' | '/dashboard' | '/reset-password',
  fallbackOrigin?: string,
): string {
  const callbackUrl = new URL('/api/auth/callback', getAppOrigin(fallbackOrigin))
  if (nextPath !== '/dashboard') {
    callbackUrl.searchParams.set('next', nextPath)
  }
  return callbackUrl.toString()
}

export function buildAuthEmailActionUrl(
  params: {
    tokenHash: string
    type: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change'
    nextPath: '/accept-invitation' | '/dashboard' | '/reset-password'
  },
  fallbackOrigin?: string,
): string {
  const callbackUrl = new URL('/api/auth/callback', getAppOrigin(fallbackOrigin))
  callbackUrl.searchParams.set('token_hash', params.tokenHash)
  callbackUrl.searchParams.set('type', params.type)
  if (params.nextPath !== '/dashboard') {
    callbackUrl.searchParams.set('next', params.nextPath)
  }
  return callbackUrl.toString()
}
