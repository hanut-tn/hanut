import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 10_000) {
      return new Response(null, { status: 204 })
    }

    const report = await request.json() as Record<string, unknown>
    const violation = report['csp-report'] ?? report

    // Ignorer les violations provenant des extensions navigateur
    const blockedUri = String((violation as Record<string, unknown>)['blocked-uri'] ?? '')
    if (
      blockedUri.startsWith('chrome-extension://') ||
      blockedUri.startsWith('moz-extension://') ||
      blockedUri === 'eval'
    ) {
      return new Response(null, { status: 204 })
    }

    console.warn('[CSP Violation]', JSON.stringify(violation))

    Sentry.captureMessage('CSP Violation', {
      level: 'warning',
      extra: { violation },
    })
  } catch {
    // Ignorer les erreurs de parsing — les rapports CSP peuvent avoir des formats variables
  }

  return new Response(null, { status: 204 })
}
