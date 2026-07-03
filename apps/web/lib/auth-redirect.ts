const DEFAULT_PRODUCTION_ORIGIN = 'https://hanut.tn'

function normalizeOrigin(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.origin
  } catch {
    return null
  }
}

function isLocalOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

// Les URLs de déploiement Vercel auto-générées (*.vercel.app) ne doivent
// jamais apparaître dans un lien envoyé par email — même si elles sont
// techniquement joignables, elles ne sont ni le domaine attendu par
// l'utilisateur ni stables d'un déploiement à l'autre.
function isVercelDeploymentOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    return new URL(origin).hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

export function getAppOrigin(fallbackOrigin?: string): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)

  // NEXT_PUBLIC_APP_URL configurée sur un vrai domaine (pas localhost) :
  // c'est la source de vérité explicite, elle gagne toujours.
  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) return configuredOrigin

  // Sinon (config absente, ou pointant sur localhost en dev) : faire
  // confiance à l'origine de la requête en cours si elle est utilisable —
  // permet le test en LAN (téléphone sur le même réseau) sans forcer un
  // lien localhost inutile. Jamais d'URL de déploiement Vercel auto-générée.
  const requestOrigin = normalizeOrigin(fallbackOrigin)
  if (requestOrigin && !isVercelDeploymentOrigin(requestOrigin)) return requestOrigin

  if (configuredOrigin) return configuredOrigin

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
