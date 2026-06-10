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

export function checkOrigin(request: OriginRequest): boolean {
  const origin = request.headers?.get('origin')
  const referer = request.headers?.get('referer')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const vercelUrl = process.env.VERCEL_URL
  const publicVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL

  if (!appUrl && !vercelUrl && !publicVercelUrl) return true

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
