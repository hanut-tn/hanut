import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'A tree hydrated but some attributes',
    'bis_register',
  ],
})
