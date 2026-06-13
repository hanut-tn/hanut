import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import { validateEnv } from './lib/env'

validateEnv()

const nextConfig: NextConfig = {
  transpilePackages: ['@hanut/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // HSTS uniquement sur les routes protégées — évite de bloquer
        // les previews Vercel et les tests locaux en HTTP.
        source: '/(dashboard|billing|api)(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // CSP en mode enforced — bloque les violations et collecte les rapports.
        // 'unsafe-inline' requis pour Next.js 15 (scripts d'hydratation inline).
        // report-uri conservé pour détecter les régressions après mises à jour.
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
              "frame-src https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "report-uri /api/csp-report",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'hanut',
  project: 'javascript-nextjs',

  // Source maps uploadés silencieusement à chaque build
  silent: !process.env.CI,

  // Désactive le tunnel (on n'a pas de /monitoring route)
  tunnelRoute: undefined,

  // Upload des source maps uniquement si le token est disponible
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
