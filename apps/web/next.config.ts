import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

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

  // Tree-shake le SDK dans les bundles non-affectés
  disableLogger: true,

  // Upload des source maps uniquement en CI / production
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  automaticVercelMonitors: false,
})
