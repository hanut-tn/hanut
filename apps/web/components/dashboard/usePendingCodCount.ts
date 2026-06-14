'use client'

import { useEffect, useState } from 'react'

export function usePendingCodCount(enabled = true) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setPendingCount(0)
      return
    }

    let mounted = true
    let controller: AbortController | null = null

    const fetchCount = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch('/api/deliveries/pending-cod-count', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) return
        const data = await response.json()
        if (mounted) setPendingCount(data.count ?? 0)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Le badge ne doit jamais bloquer la navigation si le réseau échoue.
      }
    }

    fetchCount()
    const interval = window.setInterval(fetchCount, 60_000)

    return () => {
      mounted = false
      controller?.abort()
      window.clearInterval(interval)
    }
  }, [enabled])

  return pendingCount
}
