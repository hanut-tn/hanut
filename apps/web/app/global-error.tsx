'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', padding: '1.5rem', fontFamily: 'sans-serif' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1C1917' }}>
            Une erreur critique est survenue
          </p>
          <p style={{ fontSize: '0.875rem', color: '#78716C', textAlign: 'center', maxWidth: '24rem' }}>
            Notre équipe a été notifiée. Rechargez la page ou revenez plus tard.
          </p>
          <button
            onClick={reset}
            style={{ background: '#16A34A', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
