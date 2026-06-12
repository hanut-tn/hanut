import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface DemoBannerProps {
  daysLeft: number
}

export default function DemoBanner({ daysLeft }: DemoBannerProps) {
  const urgent = daysLeft <= 4

  const message = daysLeft === 0
    ? 'Ton accès Pro expire aujourd\'hui.'
    : `Ton accès Pro expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`

  return (
    <div className={`border-b px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 ${
      urgent
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className={`flex items-center gap-2 text-sm min-w-0 ${urgent ? 'text-red-800' : 'text-amber-800'}`}>
        <AlertTriangle className={`w-4 h-4 shrink-0 ${urgent ? 'text-red-500' : 'text-amber-500'}`} />
        <span className="truncate">
          <strong>{message}</strong>{' '}
          Choisis ton plan pour continuer.
        </span>
      </div>
      <Link
        href="/billing"
        className={`shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors ${
          urgent ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
        }`}
      >
        Choisir mon plan
      </Link>
    </div>
  )
}
