import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  enableLogs: true,
  integrations: [
    Sentry.replayIntegration({
      maskAllInputs: true,
      blockAllMedia: false,
    }),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],

  enabled: process.env.NODE_ENV === 'production',

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
  ],

  beforeSend(event) {
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
