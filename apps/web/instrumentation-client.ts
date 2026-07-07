import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  enableLogs: true,
  integrations: [
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

// Chargé depuis le CDN Sentry après l'init plutôt que bundlé : Replay pesait
// à lui seul une bonne partie des ~131 kB du chunk JS partagé par toutes les
// pages, y compris la boutique publique mobile.
if (process.env.NODE_ENV === 'production') {
  Sentry.lazyLoadIntegration('replayIntegration')
    .then(replayIntegration => {
      Sentry.addIntegration(replayIntegration({ maskAllInputs: true, blockAllMedia: false }))
    })
    .catch(() => {})
}
