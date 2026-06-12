type OriginRequest = Request | {
  headers: { get(name: string): string | null }
  url?: string
}

function toOrigin(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = value.includes('://') ? value : `https://${value}`
    return new URL(url).origin
  } catch {
    return null
  }
}

function isLocalhostOrigin(value: string | null): boolean {
  if (!value) return false
  try {
    const { hostname, protocol } = new URL(value)
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export function checkOrigin(request: OriginRequest): boolean {
  const origin = request.headers?.get('origin')
  const referer = request.headers?.get('referer')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const vercelUrl = process.env.VERCEL_URL
  const publicVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL

  if (!appUrl && !vercelUrl && !publicVercelUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[CSRF] NEXT_PUBLIC_APP_URL absent en production — ' +
        'protection CSRF désactivée. Configurer la variable immédiatement.'
      )
      return false
    }
    // Dev local sans env var : accepter localhost uniquement
    const devOrigin = toOrigin(origin)
      ?? toOrigin(referer)
      ?? toOrigin('url' in request ? request.url : null)
    return isLocalhostOrigin(devOrigin)
  }

  const allowedOrigins = new Set([
    toOrigin(appUrl),
    toOrigin(vercelUrl),
    toOrigin(publicVercelUrl),
    toOrigin('url' in request ? request.url : null),
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter((value): value is string => Boolean(value)))

  const originHeader = toOrigin(origin)
  if (originHeader) return allowedOrigins.has(originHeader)

  const refererHeader = toOrigin(referer)
  return refererHeader ? allowedOrigins.has(refererHeader) : false
}
