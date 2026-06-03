'use client'

import { useEffect, useState } from 'react'

export function usePendingOrdersCount() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let mounted = true

    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/orders/pending-count')
        if (!response.ok) return

        const data = await response.json()
        if (mounted) {
          setPendingCount(data.count ?? 0)
        }
      } catch {
        // Le badge ne doit jamais bloquer la navigation si le réseau échoue.
      }
    }

    fetchPendingCount()
    const interval = window.setInterval(fetchPendingCount, 60_000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  return pendingCount
}
