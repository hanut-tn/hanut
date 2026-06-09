import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface DemoBannerProps {
  daysLeft: number
}

export default function DemoBanner({ daysLeft }: DemoBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 text-amber-800 text-sm min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
        <span className="truncate">
          Ton accès Pro expire dans{' '}
          <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>.{' '}
          Choisis ton plan pour continuer.
        </span>
      </div>
      <Link
        href="/billing"
        className="shrink-0 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Choisir mon plan
      </Link>
    </div>
  )
}
