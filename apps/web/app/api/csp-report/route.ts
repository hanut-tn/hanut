import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const IGNORED_CSP_URI_PREFIXES = ['chrome-extension://', 'moz-extension://']
const CSP_URI_FIELDS = ['blocked-uri', 'source-file', 'document-uri', 'referrer'] as const

function shouldIgnoreViolation(violation: Record<string, unknown>) {
  const blockedUri = String(violation['blocked-uri'] ?? '')
  if (blockedUri === 'eval') return true

  return CSP_URI_FIELDS.some(field => {
    const value = String(violation[field] ?? '')
    return IGNORED_CSP_URI_PREFIXES.some(prefix => value.startsWith(prefix))
  })
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers)
  try {
    const rateLimit = await checkRateLimit(ip, 'csp_report', 20, 1)
    if (!rateLimit.allowed) {
      return new Response(null, {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.resetIn) },
      })
    }
  } catch {
    return new Response(null, { status: 204 })
  }

  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 10_000) {
      return new Response(null, { status: 204 })
    }

    const report = await request.json() as Record<string, unknown>
    const violation = report['csp-report'] ?? report
    const normalizedViolation = violation as Record<string, unknown>

    // Ignorer les violations provenant des extensions navigateur
    if (shouldIgnoreViolation(normalizedViolation)) {
      return new Response(null, { status: 204 })
    }

    console.warn('[CSP Violation]', JSON.stringify(normalizedViolation))

    Sentry.captureMessage('CSP Violation', {
      level: 'warning',
      extra: { violation: normalizedViolation },
    })
  } catch {
    // Ignorer les erreurs de parsing — les rapports CSP peuvent avoir des formats variables
  }

  return new Response(null, { status: 204 })
}
