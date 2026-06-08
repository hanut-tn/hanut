'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
      <AlertTriangle className="w-12 h-12 text-red-500" />
      <p className="text-[#1C1917] font-semibold text-lg">
        Une erreur est survenue
      </p>
      <p className="text-[#78716C] text-sm text-center max-w-sm">
        Notre équipe a été notifiée automatiquement.
        Vous pouvez réessayer ou revenir plus tard.
      </p>
      <button
        onClick={reset}
        className="bg-[#16A34A] hover:bg-[#15803D] text-white px-6 py-2.5 rounded-lg text-sm font-medium"
      >
        Réessayer
      </button>
    </div>
  )
}
