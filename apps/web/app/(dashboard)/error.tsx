'use client'

import { AlertTriangle } from 'lucide-react'

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertTriangle className="w-12 h-12 text-red-500" />
      <p className="font-semibold text-[#1C1917]">Une erreur est survenue</p>
      <p className="text-sm text-[#78716C]">Impossible de charger cette page</p>
      <button
        onClick={reset}
        className="bg-[#16A34A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
