const DEFAULT_LOCAL_ORIGIN = 'http://localhost:3000'

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

export function getAppOrigin(fallbackOrigin?: string): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const requestOrigin = normalizeOrigin(fallbackOrigin)
  const productionOrigin = process.env.VERCEL_ENV === 'production'
    ? normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : null

  return (
    (configuredOrigin && !(isLocalOrigin(configuredOrigin) && requestOrigin && !isLocalOrigin(requestOrigin))
      ? configuredOrigin
      : null) ??
    productionOrigin ??
    requestOrigin ??
    normalizeOrigin(process.env.NEXT_PUBLIC_VERCEL_URL) ??
    normalizeOrigin(process.env.VERCEL_URL) ??
    DEFAULT_LOCAL_ORIGIN
  )
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
