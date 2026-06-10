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
