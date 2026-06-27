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
          {
            // HSTS global. Désactivé hors production pour ne pas bloquer
            // les previews Vercel (HTTP) et les environnements de développement.
            key: 'Strict-Transport-Security',
            value: process.env.VERCEL_ENV === 'production'
              ? 'max-age=63072000; includeSubDomains; preload'
              : 'max-age=0',
          },
        ],
      },
      // La CSP est générée par le middleware (apps/web/middleware.ts) avec un
      // nonce par requête — elle ne doit pas être dupliquée ici.
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

  // Upload des source maps uniquement si le token est disponible.
  // Sans SENTRY_AUTH_TOKEN dans Vercel → disable:true → warnings "could not determine
  // source map reference" disparaissent car l'upload n'est pas tenté.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
})
