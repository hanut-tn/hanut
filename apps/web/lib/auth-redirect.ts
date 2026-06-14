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

export function getAppOrigin(fallbackOrigin?: string): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_VERCEL_URL) ??
    normalizeOrigin(fallbackOrigin) ??
    DEFAULT_LOCAL_ORIGIN
  )
}

export function buildAuthCallbackUrl(
  nextPath: '/dashboard' | '/reset-password',
  fallbackOrigin?: string,
): string {
  const callbackUrl = new URL('/api/auth/callback', getAppOrigin(fallbackOrigin))
  callbackUrl.searchParams.set('next', nextPath)
  return callbackUrl.toString()
}
