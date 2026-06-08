import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  enabled: process.env.NODE_ENV === 'production',

  beforeSend(event) {
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>
      if (data.password) data.password = '[REDACTED]'
      if (data.token) data.token = '[REDACTED]'
      if (data.phone) data.phone = '[REDACTED]'
      if (data.email) data.email = '[REDACTED]'
    }
    return event
  },
})
