'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

interface SentryUserProviderProps {
  sellerId: string
  plan: string
  children: React.ReactNode
}

export function SentryUserProvider({ sellerId, plan, children }: SentryUserProviderProps) {
  useEffect(() => {
    Sentry.setUser({ id: sellerId })
    Sentry.setTag('plan', plan)
    return () => {
      Sentry.setUser(null)
    }
  }, [sellerId, plan])

  return <>{children}</>
}
